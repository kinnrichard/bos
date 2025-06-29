require "test_helper"

class TechnicianChannelTest < ActionCable::Channel::TestCase
  setup do
    @user = users(:technician)
    @job = jobs(:open_job)
    @job.technicians << @user

    stub_connection current_user: @user
  end

  test "subscribes and broadcasts presence" do
    subscribe job_id: @job.id

    assert subscription.confirmed?
    assert_has_stream "job_#{@job.id}_technicians"

    assert_broadcast_on("job_#{@job.id}_technicians") do |broadcast|
      assert_equal "presence", broadcast["type"]
      assert_equal "joined", broadcast["action"]
      assert_equal @user.id, broadcast["user_id"]
      assert_equal @user.name, broadcast["user_name"]
      assert_in_delta Time.current.to_f, broadcast["timestamp"].to_time.to_f, 1.0
    end
  end

  test "broadcasts presence on unsubscribe" do
    subscribe job_id: @job.id

    unsubscribe

    assert_broadcast_on("job_#{@job.id}_technicians") do |broadcast|
      assert_equal "presence", broadcast["type"]
      assert_equal "left", broadcast["action"]
      assert_equal @user.id, broadcast["user_id"]
      assert_equal @user.name, broadcast["user_name"]
      assert_in_delta Time.current.to_f, broadcast["timestamp"].to_time.to_f, 1.0
    end
  end

  test "sends message" do
    subscribe job_id: @job.id

    message_content = "Need help with this task"

    perform :send_message, job_id: @job.id, content: message_content

    assert_broadcast_on("job_#{@job.id}_technicians") do |broadcast|
      assert_equal "message", broadcast["type"]
      assert_equal @job.id, broadcast["job_id"]
      assert_equal @user.id, broadcast["user_id"]
      assert_equal @user.name, broadcast["user_name"]
      assert_equal message_content, broadcast["content"]
      assert_in_delta Time.current.to_f, broadcast["timestamp"].to_time.to_f, 1.0
    end
  end

  test "broadcasts typing status" do
    subscribe job_id: @job.id

    perform :typing, job_id: @job.id, is_typing: true

    assert_broadcast_on("job_#{@job.id}_technicians", {
      type: "typing",
      job_id: @job.id,
      user_id: @user.id,
      user_name: @user.name,
      is_typing: true
    })
  end

  test "updates location" do
    subscribe job_id: @job.id

    latitude = 40.7128
    longitude = -74.0060
    accuracy = 10

    perform :update_location, {
      job_id: @job.id,
      latitude: latitude,
      longitude: longitude,
      accuracy: accuracy
    }

    assert_broadcast_on("job_#{@job.id}_technicians") do |broadcast|
      assert_equal "location_update", broadcast["type"]
      assert_equal @job.id, broadcast["job_id"]
      assert_equal @user.id, broadcast["user_id"]
      assert_equal @user.name, broadcast["user_name"]
      assert_equal latitude, broadcast["latitude"]
      assert_equal longitude, broadcast["longitude"]
      assert_equal accuracy, broadcast["accuracy"]
      assert_in_delta Time.current.to_f, broadcast["timestamp"].to_time.to_f, 1.0
    end
  end

  test "rejects actions for unauthorized job" do
    other_job = jobs(:urgent_job)
    other_job.technicians.clear

    subscribe job_id: @job.id

    perform :send_message, job_id: other_job.id, content: "Test"

    assert_no_broadcasts("job_#{other_job.id}_technicians")
  end
end
