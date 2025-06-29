class Api::V1::JobsController < Api::V1::BaseController
  include Paginatable

  before_action :authenticate_request
  before_action :set_job, only: [ :show, :update, :destroy ]

  # GET /api/v1/jobs
  def index
    jobs = job_scope
                      .includes(:client, :tasks, :technicians)
                      .order(created_at: :desc)

    # Apply filters
    jobs = apply_filters(jobs)

    # Paginate
    jobs = paginate(jobs)

    # Check ETag freshness with filter params as additional keys
    filter_params = params.permit(:scope, :status, :priority, :client_id, :q, :page, :per_page, :include, :from_date, :to_date).to_h
    if stale_check?(jobs, additional_keys: [ filter_params ])
      render json: JobSerializer.new(
        jobs,
        include: params[:include]&.split(","),
        meta: pagination_meta(jobs),
        links: pagination_links(jobs, request.url)
      ).serializable_hash
    end
  end

  # GET /api/v1/jobs/:id
  def show
    # Check ETag freshness for the job
    if stale_check?(@job, additional_keys: [ params[:include] ])
      render json: JobSerializer.new(
        @job,
        include: params[:include]&.split(",")
      ).serializable_hash
    end
  end

  # POST /api/v1/jobs
  def create
    job = Job.new(job_params)
    job.created_by = current_user

    if job.save
      # Add current user as technician if they are one
      if current_user.technician?
        job.technicians << current_user
      end

      render json: JobSerializer.new(job).serializable_hash, status: :created
    else
      render_validation_errors(job.errors)
    end
  end

  # PATCH/PUT /api/v1/jobs/:id
  def update
    if @job.update(job_params)
      render json: JobSerializer.new(@job).serializable_hash
    else
      render_validation_errors(@job.errors)
    end
  end

  # DELETE /api/v1/jobs/:id
  def destroy
    if current_user.can_delete?(@job)
      @job.destroy
      head :no_content
    else
      render_error(
        status: :forbidden,
        code: "FORBIDDEN",
        title: "Access Denied",
        detail: "You do not have permission to delete this job"
      )
    end
  end

  private

  def set_job
    # Use the same permission logic as the index action
    if current_user.admin? || current_user.owner?
      # Admins/owners can access any job
      @job = Job.find(params[:id])
    else
      # Regular users can only access jobs they're assigned to
      @job = current_user.technician_jobs.find(params[:id])
    end
  rescue ActiveRecord::RecordNotFound
    render_error(
      status: :not_found,
      code: "NOT_FOUND",
      title: "Job Not Found",
      detail: "Job with ID #{params[:id]} not found or not accessible"
    )
  end

  def job_params
    params.require(:job).permit(
      :title, :description, :status, :priority,
      :client_id, :due_on, :due_time, :start_on, :start_time
    )
  end

  def apply_filters(scope)
    # Filter by status
    if params[:status].present?
      scope = scope.where(status: params[:status])
    end

    # Filter by priority
    if params[:priority].present?
      scope = scope.where(priority: params[:priority])
    end

    # Filter by client
    if params[:client_id].present?
      if uuid?(params[:client_id])
        scope = scope.where(client_uuid: params[:client_id])
      else
        scope = scope.where(client_id: params[:client_id])
      end
    end

    # Filter by date range
    if params[:from_date].present?
      scope = scope.where("jobs.created_at >= ?", Date.parse(params[:from_date]))
    end

    if params[:to_date].present?
      scope = scope.where("jobs.created_at <= ?", Date.parse(params[:to_date]).end_of_day)
    end

    # Search by title
    if params[:q].present?
      scope = scope.where("jobs.title ILIKE ?", "%#{params[:q]}%")
    end

    scope
  end

  def job_scope
    case params[:scope]
    when "all"
      # All jobs - only for admins/owners
      if current_user.admin? || current_user.owner?
        Job.all
      else
        # Non-admins get their assigned jobs
        current_user.technician_jobs
      end
    when "mine"
      # Explicitly request user's assigned jobs
      current_user.technician_jobs
    else
      # Default: user's assigned jobs (maintains existing behavior)
      current_user.technician_jobs
    end
  end
end
