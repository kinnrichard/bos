class AllJobsController < ApplicationController
  def index
    @jobs = Job.includes(:client, :technicians, :tasks)
    
    # Apply filters
    case params[:filter]
    when 'mine'
      @jobs = @jobs.joins(:job_assignments).where(job_assignments: { user_id: current_user.id })
      @page_title = "My Jobs"
      @active_section = :my_jobs
    when 'unassigned'
      @jobs = @jobs.left_joins(:job_assignments).where(job_assignments: { id: nil })
      @page_title = "Unassigned Jobs"
      @active_section = :unassigned
    when 'others'
      @jobs = @jobs.joins(:job_assignments)
                   .where.not(job_assignments: { user_id: current_user.id })
                   .distinct
      @page_title = "Assigned to Others"
      @active_section = :others
    when 'closed'
      @jobs = @jobs.where(status: ['successfully_completed', 'cancelled'])
      @page_title = "Closed Jobs"
      @active_section = :closed
    else
      # All jobs - only for admins
      if current_user.admin? || current_user.owner?
        @page_title = "All Jobs"
        @active_section = :all_jobs
      else
        # Redirect non-admins to their jobs
        redirect_to jobs_path(filter: 'mine')
        return
      end
    end
    
    # Apply additional filters if present
    if params[:technician_ids].present?
      technician_ids = params[:technician_ids].select(&:present?)
      if technician_ids.any?
        @jobs = @jobs.joins(:job_assignments)
                     .where(job_assignments: { user_id: technician_ids })
                     .distinct
      end
    end
    
    if params[:statuses].present?
      statuses = params[:statuses].select(&:present?)
      @jobs = @jobs.where(status: statuses) if statuses.any?
    end
    
    # Order jobs by due date, then priority, then created date
    @jobs = @jobs.order(Arel.sql('due_on ASC NULLS LAST, due_time ASC NULLS LAST, priority ASC, created_at DESC'))
    
    # Get all technicians and statuses for filter dropdown
    @technicians = User.where(role: [:technician, :admin, :owner]).order(:name)
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
  
end