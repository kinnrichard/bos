class ScheduledDateTimesController < ApplicationController
  before_action :set_job
  before_action :set_scheduled_date_time, only: [ :update, :destroy ]

  def create
    @scheduled_date_time = @job.scheduled_date_times.build(scheduled_date_time_params)

    if @scheduled_date_time.save
      # Assign users if provided
      if params[:scheduled_date_time][:user_ids].present?
        user_ids = params[:scheduled_date_time][:user_ids].reject(&:blank?)
        @scheduled_date_time.user_ids = user_ids
      end

      ActivityLog.create!(
        user: current_user,
        action: "created",
        loggable: @scheduled_date_time,
        metadata: {
          job_id: @job.id,
          scheduled_type: @scheduled_date_time.scheduled_type,
          scheduled_date: @scheduled_date_time.scheduled_date,
          scheduled_time: @scheduled_date_time.scheduled_time
        }
      )

      redirect_to client_job_path(@job.client, @job), notice: "Scheduled date added successfully."
    else
      redirect_to client_job_path(@job.client, @job), alert: "Failed to add scheduled date: #{@scheduled_date_time.errors.full_messages.join(', ')}"
    end
  end

  def update
    if @scheduled_date_time.update(scheduled_date_time_params)
      # Update users if provided
      if params[:scheduled_date_time][:user_ids].present?
        user_ids = params[:scheduled_date_time][:user_ids].reject(&:blank?)
        @scheduled_date_time.user_ids = user_ids
      end

      ActivityLog.create!(
        user: current_user,
        action: "updated",
        loggable: @scheduled_date_time,
        metadata: {
          job_id: @job.id,
          changes: @scheduled_date_time.saved_changes.except("updated_at")
        }
      )

      render json: { success: true }
    else
      render json: { success: false, errors: @scheduled_date_time.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    @scheduled_date_time.destroy

    ActivityLog.create!(
      user: current_user,
      action: "deleted",
      loggable_type: "ScheduledDateTime",
      loggable_id: @scheduled_date_time.id,
      metadata: {
        job_id: @job.id,
        scheduled_type: @scheduled_date_time.scheduled_type,
        scheduled_date: @scheduled_date_time.scheduled_date
      }
    )

    head :ok
  end

  private

  def set_job
    @job = Job.find(params[:job_id])
  end

  def set_scheduled_date_time
    @scheduled_date_time = @job.scheduled_date_times.find(params[:id])
  end

  def scheduled_date_time_params
    params.require(:scheduled_date_time).permit(:scheduled_type, :scheduled_date, :scheduled_time, :notes)
  end
end
