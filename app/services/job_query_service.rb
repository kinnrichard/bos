# frozen_string_literal: true

# Service object for handling job queries and filtering
class JobQueryService
  def initialize(client:, params: {})
    @client = client
    @params = params
  end

  def call
    jobs = base_query
    jobs = apply_search_filter(jobs)
    jobs = apply_status_filter(jobs)
    apply_sorting(jobs)
  end

  def paginated_results
    jobs = call
    page = (@params[:page] || 1).to_i
    per_page = calculate_per_page

    {
      jobs: paginate_array(jobs, page, per_page),
      pagination: {
        current_page: page,
        per_page: per_page,
        total_pages: (jobs.length.to_f / per_page).ceil,
        total_count: jobs.length
      }
    }
  end

  private

  def base_query
    @client.jobs.includes(:technicians, :tasks)
  end

  def apply_search_filter(jobs)
    return jobs unless @params[:q].present?

    search_term = @params[:q].strip
    jobs.where("jobs.title ILIKE ?", "%#{search_term}%")
  end

  def apply_status_filter(jobs)
    return jobs unless @params[:status].present?

    # Convert hyphenated format to underscored format if needed
    status = @params[:status].tr("-", "_")
    return jobs unless Job.statuses.key?(status)

    jobs.where(status: status)
  end

  def apply_sorting(jobs)
    # Convert to array and sort in Ruby to preserve includes benefits
    jobs.to_a.sort_by do |job|
      [ status_sort_order(job.status), job.created_at ]
    end
  end

  def status_sort_order(status)
    {
      "in_progress" => 1,
      "paused" => 2,
      "open" => 3,
      "successfully_completed" => 4,
      "cancelled" => 5
    }[status] || 6
  end

  def calculate_per_page
    per_page = (@params[:per_page] || 25).to_i
    per_page > 50 ? 50 : per_page # Max 50 per page
  end

  def paginate_array(array, page, per_page)
    start_index = (page - 1) * per_page
    end_index = start_index + per_page
    array[start_index...end_index] || []
  end
end
