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

      # The Loggable concern will automatically log the creation
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

      # The Loggable concern will automatically log the update
      render json: { success: true }
    else
      render json: { success: false, errors: @scheduled_date_time.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def destroy
    # Store metadata before destruction for logging
    metadata = {
      scheduled_type: @scheduled_date_time.scheduled_type,
      scheduled_date: @scheduled_date_time.scheduled_date,
      job_id: @job.id
    }

    # Log the deletion before destroying (Loggable can't log after destroy)
    @scheduled_date_time.log_action("deleted", user: current_user, metadata: metadata)
    @scheduled_date_time.destroy

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
