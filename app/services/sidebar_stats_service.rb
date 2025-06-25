# frozen_string_literal: true

class SidebarStatsService
  def initialize(user:, client: nil)
    @user = user
    @client = client
  end

  def calculate
    Rails.cache.fetch(cache_key, expires_in: 1.minute) do
      calculate_stats
    end
  end

  private

  def calculate_stats
    {
      my_jobs: my_jobs_count,
      unassigned: unassigned_count,
      others: others_count,
      closed: closed_count,
      scheduled: scheduled_count
    }
  end

  def base_scope
    @client ? @client.jobs : Job.all
  end

  def active_scope
    base_scope.active
  end

  def my_jobs_count
    active_scope.joins(:job_assignments)
                .where(job_assignments: { user_id: @user.id })
                .count
  end

  def unassigned_count
    active_scope.unassigned.count
  end

  def others_count
    active_scope.assigned_to_others(@user).count
  end

  def closed_count
    base_scope.closed.count
  end

  def scheduled_count
    base_scope.where.not(start_on: nil).count
  end

  def cache_key
    client_part = @client ? "client_#{@client.id}" : "all_clients"
    # Simple time-based cache key that expires after the cache timeout
    # This avoids database queries just to build the cache key
    time_part = (Time.current.to_i / 60) # Changes every minute

    "sidebar_stats/user_#{@user.id}/#{client_part}/#{time_part}"
  end
end
