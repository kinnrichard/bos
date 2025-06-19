class TasksController < ApplicationController
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :set_client
  before_action :set_job
  before_action :set_task, only: [:update, :destroy]
  
  def create
    @task = @job.tasks.build(task_params)
    
    if @task.save
      respond_to do |format|
        format.json { render json: { status: 'success', task: @task } }
        format.html { redirect_to client_job_path(@client, @job), notice: 'Task was successfully created.' }
      end
    else
      respond_to do |format|
        format.json { render json: { error: @task.errors.full_messages.join(', ') }, status: :unprocessable_entity }
        format.html { redirect_to client_job_path(@client, @job), alert: 'Error creating task.' }
      end
    end
  end
  
  def update
    if @task.update(task_params)
      redirect_to client_job_path(@client, @job), notice: 'Task was successfully updated.'
    else
      render :edit
    end
  end
  
  def destroy
    @task.destroy
    redirect_to client_job_path(@client, @job), notice: 'Task was successfully deleted.'
  end
  
  private
  
  def set_client
    @client = Client.find(params[:client_id])
  end
  
  def set_job
    @job = @client.jobs.find(params[:job_id])
  end
  
  def set_task
    @task = @job.tasks.find(params[:id])
  end
  
  def task_params
    params.require(:task).permit(:title, :status, :assigned_to_id)
  end
  
  def json_request?
    request.format.json?
  end
end