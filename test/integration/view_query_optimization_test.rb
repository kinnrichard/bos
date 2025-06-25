require "test_helper"

class ViewQueryOptimizationTest < ActionDispatch::IntegrationTest
  setup do
    @user = users(:admin)
    @client = clients(:acme)
    @job = jobs(:open_job)
    sign_in_as(@user)
  end

  test "jobs show page does not make queries in views" do
    # Warm up the cache
    get client_job_path(@client, @job)
    assert_response :success

    # Now test that views don't make queries
    queries_in_views = []

    # Monitor queries during view rendering
    ActiveSupport::Notifications.subscribe("sql.active_record") do |name, start, finish, id, payload|
      sql = payload[:sql]
      # Skip schema and transaction queries
      next if sql&.match?(/SCHEMA|TRANSACTION|SAVEPOINT/)

      # Check if we're in a view by looking at the call stack
      caller_locations = caller
      view_location = caller_locations.find { |loc|
        (loc.include?("/app/views/") || loc.include?("/app/components/")) &&
        !loc.include?("/app/services/")
      }
      if view_location
        queries_in_views << { sql: sql, location: view_location }
      end
    end

    # Make the request
    get client_job_path(@client, @job)

    # Unsubscribe from notifications
    ActiveSupport::Notifications.unsubscribe("sql.active_record")

    # Assert no queries were made from views
    if queries_in_views.any?
      puts "\nQueries made from views:"
      queries_in_views.each do |query|
        puts "  SQL: #{query[:sql]}"
        puts "  Location: #{query[:location]}"
      end
    end

    assert queries_in_views.empty?, "Views should not make database queries"
  end

  test "people index page does not make queries in views" do
    # Create some test data
    person = @client.people.create!(name: "Test Person")
    person.contact_methods.create!(contact_type: "email", value: "test@example.com")

    queries_in_views = []

    ActiveSupport::Notifications.subscribe("sql.active_record") do |name, start, finish, id, payload|
      sql = payload[:sql]
      next if sql&.match?(/SCHEMA|TRANSACTION|SAVEPOINT/)

      caller_locations = caller
      if caller_locations.any? { |loc| loc.include?("/app/views/") || loc.include?("/app/components/") }
        queries_in_views << sql
      end
    end

    get client_people_path(@client)

    ActiveSupport::Notifications.unsubscribe("sql.active_record")

    assert queries_in_views.empty?, "People index view should not make database queries"
  end

  test "all jobs page does not make N+1 queries" do
    # Create multiple jobs with associations
    3.times do |i|
      job = @client.jobs.create!(
        title: "Test Job #{i}",
        created_by: @user
      )
      job.job_assignments.create!(user: @user)
    end

    # First request to establish baseline
    query_count = count_queries { get jobs_path }
    assert_response :success

    # Add more jobs
    3.times do |i|
      job = @client.jobs.create!(
        title: "More Test Job #{i}",
        created_by: @user
      )
      job.job_assignments.create!(user: @user)
    end

    # Second request should not have significantly more queries
    query_count2 = count_queries { get jobs_path }
    assert_response :success

    # Allow for some variance but not N+1
    assert query_count2 <= query_count + 2,
      "Query count increased too much (#{query_count} -> #{query_count2}), possible N+1"
  end

  private

  def count_queries(&block)
    count = 0
    counter = ->(name, started, finished, unique_id, payload) {
      count += 1 unless payload[:sql]&.match?(/SCHEMA|TRANSACTION|SAVEPOINT/)
    }

    ActiveSupport::Notifications.subscribed(counter, "sql.active_record", &block)
    count
  end
end
