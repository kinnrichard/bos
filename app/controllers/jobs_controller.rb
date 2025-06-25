class JobsController < ApplicationController
  before_action :set_client
  before_action :authorize_client_access!
  before_action :set_job, only: [ :show, :edit, :update, :destroy ]

  def index
    @jobs = @client.jobs.includes(:technicians, :tasks)

    # Apply search filter if provided
    if params[:q].present?
      @jobs = @jobs.where("title ILIKE ?", "%#{params[:q]}%")
    end

    # Apply status filter if provided
    if params[:status].present?
      @jobs = @jobs.where(status: params[:status])
    end

    @jobs = @jobs.order(Arel.sql("
                           CASE status
                             WHEN 1 THEN 1  -- in_progress
                             WHEN 2 THEN 2  -- paused
                             WHEN 0 THEN 3  -- open (new)
                             WHEN 5 THEN 4  -- successfully_completed
                             WHEN 6 THEN 5  -- cancelled
                             ELSE 6         -- other statuses
                           END,
                           created_at DESC
                         "))

    respond_to do |format|
      format.html { render Views::Jobs::IndexView.new(client: @client, jobs: @jobs, current_user: current_user) }
      format.json do
        # Apply pagination for JSON responses
        per_page = (params[:per_page] || 25).to_i
        per_page = 50 if per_page > 50 # Max 50 per page
        page = (params[:page] || 1).to_i

        @jobs = @jobs.limit(per_page).offset((page - 1) * per_page)
        total_count = @jobs.except(:limit, :offset).count

        render json: {
          jobs: @jobs.as_json(include: [ :technicians, :tasks ]),
          pagination: {
            current_page: page,
            per_page: per_page,
            total_pages: (total_count.to_f / per_page).ceil,
            total_count: total_count
          }
        }
      end
    end
  end

  def show
    respond_to do |format|
      format.html do
        # Prepare view data to avoid queries in views
        view_data = ViewDataService.job_assignment_data
        sidebar_stats = SidebarStatsService.new(user: current_user, client: @client).calculate

        # Get ordered tasks
        sorting_service = TaskSortingService.new(@job)
        tasks_tree = sorting_service.get_ordered_tasks

        # Prepare task list data
        task_list_data = ViewDataService.task_list_data(tasks_tree: tasks_tree)

        render Views::Jobs::ShowView.new(
          client: @client,
          job: @job,
          current_user: current_user,
          available_technicians: view_data[:available_technicians],
          sidebar_stats: sidebar_stats,
          tasks_tree: tasks_tree,
          task_list_data: task_list_data
        )
      end
      format.json { render json: { job: @job.as_json(include: [ :technicians, :tasks ]) } }
    end
  end

  def new
    @job = @client.jobs.build
    @people = @client.people.order(:name)
    @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
    render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user)
  end

  def create
    @job = @client.jobs.build(job_params)
    @job.created_by = current_user

    # Sanitize HTML in title and description
    @job.title = ActionController::Base.helpers.sanitize(@job.title, tags: [])
    @job.description = ActionController::Base.helpers.sanitize(@job.description, tags: []) if @job.description

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
        action: "created",
        loggable: @job,
        metadata: { job_title: @job.title, client_name: @client.name }
      )

      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), notice: "Job was successfully created." }
        format.json { render json: { status: "success", job: @job.as_json(include: :technicians) }, status: :created }
      end
    else
      respond_to do |format|
        format.html do
          @people = @client.people.order(:name)
          @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
          render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
        end
        format.json { render json: { error: @job.errors.full_messages.join(", ") }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @people = @client.people.order(:name)
    @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
    render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user)
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
        action: "updated",
        loggable: @job,
        metadata: { job_title: @job.title, client_name: @client.name }
      )

      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), notice: "Job was successfully updated." }
        format.json { render json: { status: "success", job: @job.as_json(include: :technicians) } }
      end
    else
      respond_to do |format|
        format.html do
          @people = @client.people.order(:name)
          @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
          render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
        end
        format.json { render json: { status: "error", errors: @job.errors.full_messages }, status: :unprocessable_entity }
      end
    end
  end

  def destroy
    unless current_user.can_delete?(@job)
      respond_to do |format|
        format.html { redirect_to client_jobs_path(@client), alert: "You do not have permission to delete this job." }
        format.json { render json: { error: "You do not have permission to delete this job." }, status: :forbidden }
      end
      return
    end

    unless @job.status == "cancelled"
      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), alert: "Jobs must be cancelled before they can be deleted." }
        format.json { render json: { error: "Jobs must be cancelled before they can be deleted." }, status: :unprocessable_entity }
      end
      return
    end

    job_title = @job.title
    @job.destroy

    ActivityLog.create!(
      user: current_user,
      action: "deleted",
      loggable_type: "Job",
      loggable_id: @job.id,
      metadata: { job_title: job_title, client_name: @client.name }
    )

    respond_to do |format|
      format.html { redirect_to client_jobs_path(@client), notice: "Job was successfully deleted." }
      format.json { render json: { status: "success", message: "Job was successfully deleted." } }
    end
  end

  private

  def set_client
    @client = Client.find(params[:client_id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: "Client not found" }, status: :not_found }
    end
  end

  def set_job
    @job = @client.jobs
                  .includes(:technicians, :people, :notes, :scheduled_date_times,
                           tasks: [ :notes, :assigned_to, :activity_logs ])
                  .find(params[:id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: "Job not found" }, status: :not_found }
    end
  end

  def job_params
    params.require(:job).permit(:title, :description, :status, :priority, :due_on, :due_time, :start_on, :start_time, technician_ids: [])
  end
end
