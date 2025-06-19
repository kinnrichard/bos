class JobsController < ApplicationController
  before_action :set_client
  before_action :set_job, only: [:show, :edit, :update, :destroy]
  
  def index
    @jobs = @client.jobs.includes(:technicians, :tasks).order(created_at: :desc)
    render Views::Jobs::IndexView.new(client: @client, jobs: @jobs)
  end
  
  def show
    render Views::Jobs::ShowView.new(client: @client, job: @job)
  end
  
  def new
    @job = @client.jobs.build
    @people = @client.people.order(:name)
    @technicians = User.where(role: [:technician, :admin, :superadmin]).order(:name)
    render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians)
  end
  
  def create
    @job = @client.jobs.build(job_params)
    @job.created_by = current_user
    
    if @job.save
      # Assign technicians if any were selected
      if params[:job][:technician_ids].present?
        technician_ids = params[:job][:technician_ids].reject(&:blank?)
        technician_ids.each do |user_id|
          @job.job_assignments.create!(user_id: user_id)
        end
      end
      
      # Associate people if any were selected
      if params[:job][:person_ids].present?
        person_ids = params[:job][:person_ids].reject(&:blank?)
        person_ids.each do |person_id|
          @job.job_people.create!(person_id: person_id)
        end
      end
      
      ActivityLog.create!(
        user: current_user,
        action: 'created',
        loggable: @job,
        metadata: { job_title: @job.title, client_name: @client.name }
      )
      
      redirect_to client_job_path(@client, @job), notice: 'Job was successfully created.'
    else
      @people = @client.people.order(:name)
      @technicians = User.where(role: [:technician, :admin, :superadmin]).order(:name)
      render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians), status: :unprocessable_entity
    end
  end
  
  def edit
    @people = @client.people.order(:name)
    @technicians = User.where(role: [:technician, :admin, :superadmin]).order(:name)
    render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians)
  end
  
  def update
    if @job.update(job_params)
      # Update technician assignments
      if params[:job][:technician_ids]
        @job.job_assignments.destroy_all
        technician_ids = params[:job][:technician_ids].reject(&:blank?)
        technician_ids.each do |user_id|
          @job.job_assignments.create!(user_id: user_id)
        end
      end
      
      # Update people associations
      if params[:job][:person_ids]
        @job.job_people.destroy_all
        person_ids = params[:job][:person_ids].reject(&:blank?)
        person_ids.each do |person_id|
          @job.job_people.create!(person_id: person_id)
        end
      end
      
      ActivityLog.create!(
        user: current_user,
        action: 'updated',
        loggable: @job,
        metadata: { job_title: @job.title, client_name: @client.name }
      )
      
      redirect_to client_job_path(@client, @job), notice: 'Job was successfully updated.'
    else
      @people = @client.people.order(:name)
      @technicians = User.where(role: [:technician, :admin, :superadmin]).order(:name)
      render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians), status: :unprocessable_entity
    end
  end
  
  def destroy
    unless current_user.can_delete?(@job)
      redirect_to client_jobs_path(@client), alert: 'You do not have permission to delete this job.'
      return
    end
    
    job_title = @job.title
    @job.destroy
    
    ActivityLog.create!(
      user: current_user,
      action: 'deleted',
      loggable_type: 'Job',
      loggable_id: @job.id,
      metadata: { job_title: job_title, client_name: @client.name }
    )
    
    redirect_to client_jobs_path(@client), notice: 'Job was successfully deleted.'
  end
  
  private
  
  def set_client
    @client = Client.find(params[:client_id])
  end
  
  def set_job
    @job = @client.jobs.find(params[:id])
  end
  
  def job_params
    params.require(:job).permit(:title, :description, :status, :priority, :start_on_date)
  end
  
  def current_user
    # TODO: Replace with actual current user from authentication
    User.first || User.create!(
      name: 'System User',
      email: 'system@example.com',
      role: :admin
    )
  end
end
