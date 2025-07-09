class AllJobsController < ApplicationController
  def index
    # Build base query with proper eager loading
    @jobs = Job.includes(:client, :technicians, :tasks)

    # Apply filters using a more efficient approach
    @jobs = apply_job_filters(@jobs)

    # Handle redirect from apply_job_filters
    return if performed?

    # Apply ordering with better performance
    @jobs = @jobs.order(:due_on, :due_time, :priority, created_at: :desc)

    # Calculate pagination values
    page = params[:page].to_i > 0 ? params[:page].to_i : 1
    per_page = params[:per_page].to_i > 0 ? [ params[:per_page].to_i, 50 ].min : 25

    # Get total count for pagination metadata (before applying limit/offset)
    @total_count = @jobs.count

    # Apply pagination
    @jobs = @jobs.limit(per_page).offset((page - 1) * per_page)

    # Calculate pagination metadata
    @pagination = {
      current_page: page,
      per_page: per_page,
      total_pages: (@total_count.to_f / per_page).ceil,
      total_count: @total_count
    }

    # Get all technicians and statuses for filter dropdown (cached)
    @technicians = Rails.cache.fetch("technicians_for_filter", expires_in: 5.minutes) do
      User.where(role: [ :technician, :admin, :owner ]).order(:name).to_a
    end
    @available_statuses = Job.statuses.keys

    render Views::AllJobs::IndexView.new(
      jobs: @jobs,
      page_title: @page_title,
      active_section: @active_section,
      technicians: @technicians,
      available_statuses: @available_statuses,
      current_filter: params[:filter],
      selected_technician_ids: params[:technician_ids] || [],
      selected_statuses: params[:statuses] || [],
      current_user: current_user
    )
  end

  private

  def apply_job_filters(jobs)
    # Apply main filter
    case params[:filter]
    when "mine"
      jobs = jobs.joins(:job_assignments).where(job_assignments: { user_id: current_user.id })
      @page_title = "My Jobs"
      @active_section = :my_jobs
    when "unassigned"
      jobs = jobs.left_joins(:job_assignments).where(job_assignments: { id: nil })
      @page_title = "Unassigned Jobs"
      @active_section = :unassigned
    when "others"
      jobs = jobs.joins(:job_assignments)
                 .where.not(job_assignments: { user_id: current_user.id })
                 .distinct
      @page_title = "Assigned to Others"
      @active_section = :others
    when "closed"
      jobs = jobs.where(status: [ :successfully_completed, :cancelled ])
      @page_title = "Closed Jobs"
      @active_section = :closed
    else
      # All jobs - only for admins
      if current_user.admin? || current_user.owner?
        @page_title = "All Jobs"
        @active_section = :all_jobs
      else
        # Redirect non-admins to their jobs
        redirect_to jobs_path(filter: "mine")
        return jobs
      end
    end

    # Apply additional filters if present
    if params[:technician_ids].present?
      technician_ids = params[:technician_ids].select(&:present?)
      if technician_ids.any?
        jobs = jobs.joins(:job_assignments)
                   .where(job_assignments: { user_id: technician_ids })
                   .distinct
      end
    end

    if params[:statuses].present?
      statuses = params[:statuses].select(&:present?)
      jobs = jobs.where(status: statuses) if statuses.any?
    end

    jobs
  end
end
