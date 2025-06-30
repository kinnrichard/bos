require 'rails_helper'

RSpec.describe "Job Cache Invalidation", type: :model do
  let(:job) { create(:job) }
  let(:user) { create(:user) }
  let(:person) { create(:person) }

  describe "touch relationships" do
    it "updates job timestamp when technician assignment changes" do
      original_time = job.updated_at

      # Wait to ensure timestamp difference
      travel 1.second do
        job.job_assignments.create!(user: user)
      end

      expect(job.reload.updated_at).to be > original_time
    end

    it "updates job timestamp when task changes" do
      task = create(:task, job: job)
      original_time = job.reload.updated_at

      travel 1.second do
        task.update!(status: 'in_progress')
      end

      expect(job.reload.updated_at).to be > original_time
    end

    it "updates job timestamp when task is reordered" do
      task = create(:task, job: job, position: 1)
      original_time = job.reload.updated_at

      travel 1.second do
        task.update!(position: 2)
      end

      expect(job.reload.updated_at).to be > original_time
    end

    it "updates job timestamp when person assignment changes" do
      original_time = job.updated_at

      travel 1.second do
        job.job_people.create!(person: person)
      end

      expect(job.reload.updated_at).to be > original_time
    end
  end

  describe "ETag generation" do
    it "generates different ETags after technician changes" do
      # Mock controller context
      controller = Api::V1::JobsController.new
      allow(controller).to receive(:params).and_return({ include: 'technicians' })

      # Get initial ETag
      initial_etag = controller.send(:generate_etag, job, additional_keys: [ 'technicians' ])

      # Change technicians
      travel 1.second do
        job.job_assignments.create!(user: user)
      end

      # Get new ETag
      new_etag = controller.send(:generate_etag, job.reload, additional_keys: [ 'technicians' ])

      expect(new_etag).not_to eq(initial_etag)
    end
  end

  describe "concurrent updates" do
    it "handles race conditions between task and technician updates" do
      task = create(:task, job: job)

      # Simulate concurrent updates
      threads = []
      results = []

      threads << Thread.new do
        travel 0.1.seconds do
          task.update!(status: 'in_progress')
          results << { type: 'task', time: job.reload.updated_at }
        end
      end

      threads << Thread.new do
        travel 0.2.seconds do
          job.job_assignments.create!(user: user)
          results << { type: 'technician', time: job.reload.updated_at }
        end
      end

      threads.each(&:join)

      # Both operations should have updated the job timestamp
      expect(results.size).to eq(2)
      expect(results.all? { |r| r[:time] > job.created_at }).to be true
    end
  end

  describe "cache coherence across operations" do
    let(:task1) { create(:task, job: job, position: 1) }
    let(:task2) { create(:task, job: job, position: 2) }

    it "maintains cache coherence during complex operations" do
      original_time = job.updated_at

      # Perform multiple operations that should all invalidate cache
      travel 1.second do
        # Reorder tasks
        task1.update!(position: 3)

        # Change task status
        task2.update!(status: 'successfully_completed')

        # Add technician
        job.job_assignments.create!(user: user)

        # Add person
        job.job_people.create!(person: person)
      end

      # Job should be touched by all operations
      final_time = job.reload.updated_at
      expect(final_time).to be > original_time

      # All related data should be fresh
      expect(job.tasks.count).to eq(2)
      expect(job.technicians.count).to eq(1)
      expect(job.people.count).to eq(1)
    end
  end
end
