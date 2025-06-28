class JobsController < ApplicationController
  before_action :set_client
  before_action :authorize_client_access!
  before_action :set_job, only: [ :show, :edit, :update, :destroy ]

  def index
    query_service = JobQueryService.new(client: @client, params: params)

    respond_to do |format|
      format.html do
        @jobs = query_service.call
        render Views::Jobs::IndexView.new(client: @client, jobs: @jobs, current_user: current_user)
      end
      format.json do
        result = query_service.paginated_results
        render json: {
          jobs: result[:jobs].map { |job| job.as_json(include: [ :technicians, :tasks ]) },
          pagination: result[:pagination]
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
    @job.created_by = current_user

    # Prepare view data like show action
    view_data = ViewDataService.job_assignment_data
    sidebar_stats = SidebarStatsService.new(user: current_user, client: @client).calculate
    tasks_tree = []
    task_list_data = { last_status_changes: {}, time_in_progress: {} }

    render Views::Jobs::NewShowView.new(
      client: @client,
      job: @job,
      current_user: current_user,
      available_technicians: view_data[:available_technicians],
      sidebar_stats: sidebar_stats,
      tasks_tree: tasks_tree,
      task_list_data: task_list_data
    )
  end

  def create
    service = JobCreationService.new(
      client: @client,
      user: current_user,
      params: job_params.merge(
        technician_ids: params[:job][:technician_ids],
        person_ids: params[:job][:person_ids]
      )
    )

    if service.call
      @job = service.job
      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), notice: "Job was successfully created." }
        format.json { render json: { status: "success", job: @job.as_json(include: :technicians) }, status: :created }
      end
    else
      @job = service.job || @client.jobs.build(job_params)
      respond_to do |format|
        format.html do
          @people = @client.people.order(:name)
          @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
          flash.now[:alert] = service.errors.join(", ")
          render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
        end
        format.json { render json: { error: service.errors.join(", ") }, status: :unprocessable_entity }
      end
    end
  end

  def edit
    @people = @client.people.order(:name)
    @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
    render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user)
  end

  def update
    service = JobUpdateService.new(
      job: @job,
      user: current_user,
      params: job_params.merge(
        technician_ids: params[:job][:technician_ids],
        person_ids: params[:job][:person_ids]
      )
    )

    if service.call
      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), notice: "Job was successfully updated." }
        format.json { render json: { status: "success", job: @job.as_json(include: :technicians) } }
      end
    else
      respond_to do |format|
        format.html do
          @people = @client.people.order(:name)
          @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
          flash.now[:alert] = service.errors.join(", ")
          render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
        end
        format.json { render json: { status: "error", errors: service.errors }, status: :unprocessable_entity }
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

    unless @job.cancelled?
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
