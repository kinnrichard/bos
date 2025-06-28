class JobsController < ApplicationController
  before_action :set_client
  before_action :authorize_client_access!
  before_action :set_job, only: [ :show, :edit, :update, :destroy ]

  def index
    # Start with base query including necessary associations
    @jobs = @client.jobs.includes(:technicians, :tasks)

    # Apply search filter if provided - using parameterized query for safety
    if params[:q].present?
      search_term = params[:q].strip
      @jobs = @jobs.where("jobs.title ILIKE ?", "%#{search_term}%")
    end

    # Apply status filter if provided - ensure it's a valid status
    if params[:status].present? && Job.statuses.key?(params[:status])
      @jobs = @jobs.where(status: params[:status])
    end

    # Use Ruby sorting instead of complex SQL to avoid N+1 issues with includes
    # This preserves the benefits of includes/preloading
    @jobs = @jobs.to_a.sort_by do |job|
      status_order = {
        "in_progress" => 1,
        "paused" => 2,
        "open" => 3,
        "successfully_completed" => 4,
        "cancelled" => 5
      }
      [ status_order[job.status] || 6, job.created_at ]
    end

    respond_to do |format|
      format.html { render Views::Jobs::IndexView.new(client: @client, jobs: @jobs, current_user: current_user) }
      format.json do
        # Apply pagination for JSON responses
        per_page = (params[:per_page] || 25).to_i
        per_page = 50 if per_page > 50 # Max 50 per page
        page = (params[:page] || 1).to_i

        # Since @jobs is now an array after sorting, handle pagination differently
        total_count = @jobs.length
        start_index = (page - 1) * per_page
        end_index = start_index + per_page
        paginated_jobs = @jobs[start_index...end_index] || []

        render json: {
          jobs: paginated_jobs.map { |job| job.as_json(include: [ :technicians, :tasks ]) },
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
    ActiveRecord::Base.transaction do
      @job = @client.jobs.build(job_params)
      @job.created_by = current_user

      # Sanitize HTML in title and description
      @job.title = ActionController::Base.helpers.sanitize(@job.title, tags: [])
      @job.description = ActionController::Base.helpers.sanitize(@job.description, tags: []) if @job.description

      if @job.save
        # Assign technicians if any were selected
        if params[:job][:technician_ids].present?
          technician_ids = params[:job][:technician_ids].reject(&:blank?).uniq
          technician_ids.each do |user_id|
            @job.job_assignments.create!(user_id: user_id)
          end
        end

        # Associate people if any were selected
        if params[:job][:person_ids].present?
          person_ids = params[:job][:person_ids].reject(&:blank?).uniq
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
        # Transaction will automatically rollback if we reach here
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
  rescue ActiveRecord::RecordInvalid => e
    # Handle any validation errors that might bubble up
    respond_to do |format|
      format.html do
        @people = @client.people.order(:name)
        @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
        flash.now[:alert] = "Failed to create job: #{e.message}"
        render Views::Jobs::NewView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
      end
      format.json { render json: { error: e.message }, status: :unprocessable_entity }
    end
  end

  def edit
    @people = @client.people.order(:name)
    @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
    render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user)
  end

  def update
    ActiveRecord::Base.transaction do
      # Sanitize HTML in title and description before updating
      sanitized_params = job_params
      sanitized_params[:title] = ActionController::Base.helpers.sanitize(sanitized_params[:title], tags: []) if sanitized_params[:title]
      sanitized_params[:description] = ActionController::Base.helpers.sanitize(sanitized_params[:description], tags: []) if sanitized_params[:description]

      if @job.update(sanitized_params)
        # Update technician assignments more efficiently
        if params[:job][:technician_ids]
          technician_ids = params[:job][:technician_ids].reject(&:blank?).uniq

          # Only update if there are changes
          current_tech_ids = @job.job_assignments.pluck(:user_id)
          if current_tech_ids.sort != technician_ids.sort
            @job.job_assignments.destroy_all
            technician_ids.each do |user_id|
              @job.job_assignments.create!(user_id: user_id)
            end
          end
        end

        # Update people associations more efficiently
        if params[:job][:person_ids]
          person_ids = params[:job][:person_ids].reject(&:blank?).uniq

          # Only update if there are changes
          current_person_ids = @job.job_people.pluck(:person_id)
          if current_person_ids.sort != person_ids.sort
            @job.job_people.destroy_all
            person_ids.each do |person_id|
              @job.job_people.create!(person_id: person_id)
            end
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
        # Transaction will automatically rollback
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
  rescue ActiveRecord::RecordInvalid => e
    # Handle any validation errors
    respond_to do |format|
      format.html do
        @people = @client.people.order(:name)
        @technicians = User.where(role: [ :technician, :admin, :owner ]).order(:name)
        flash.now[:alert] = "Failed to update job: #{e.message}"
        render Views::Jobs::EditView.new(client: @client, job: @job, people: @people, technicians: @technicians, current_user: current_user), status: :unprocessable_entity
      end
      format.json { render json: { status: "error", error: e.message }, status: :unprocessable_entity }
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
