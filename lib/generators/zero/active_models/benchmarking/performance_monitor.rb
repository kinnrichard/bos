# frozen_string_literal: true

require "json"
require "csv"
require_relative "performance_metrics"

module Zero
  module Generators
    module Benchmarking
      # PerformanceMonitor provides comprehensive performance monitoring and reporting
      #
      # This class serves as the central performance monitoring system for ReactiveRecord
      # generation, integrating with benchmarking, caching, and parallel execution systems
      # to provide real-time performance tracking and detailed reporting capabilities.
      #
      # Key Features:
      # - Real-time performance metric collection during generation
      # - Integration with benchmark runner, cache optimizer, and parallel executor
      # - Historical performance tracking and trend analysis
      # - Configurable performance alerts and threshold monitoring
      # - Rich reporting with multiple output formats (JSON, CSV, HTML)
      # - Performance dashboard data generation
      # - Comparative analysis between different execution strategies
      #
      # @example Basic monitoring
      #   monitor = PerformanceMonitor.new
      #   monitor.start_monitoring_session("generation_test")
      #
      #   # Perform generation operations...
      #   result = coordinator.execute
      #   monitor.record_generation_result(result)
      #
      #   monitor.end_monitoring_session
      #   report = monitor.generate_performance_report
      #
      # @example Advanced monitoring with integrations
      #   monitor = PerformanceMonitor.new(
      #     enable_alerts: true,
      #     alert_thresholds: { execution_time: 30.0, memory_usage: 512 }
      #   )
      #
      #   monitor.integrate_with_benchmark_runner(benchmark_runner)
      #   monitor.integrate_with_cache_optimizer(cache_optimizer)
      #   monitor.integrate_with_parallel_executor(parallel_executor)
      #
      class PerformanceMonitor
        attr_reader :current_session, :session_history, :alert_thresholds, :integrations

        # Default monitoring configuration
        DEFAULT_CONFIG = {
          enable_alerts: false,
          alert_thresholds: {
            execution_time: 60.0, # seconds
            memory_usage: 256, # MB
            error_rate: 5.0, # percentage
            cache_hit_rate: 50.0 # percentage
          },
          history_retention_days: 30,
          sampling_interval: 1.0, # seconds
          enable_real_time_monitoring: false,
          persist_data: true,
          data_directory: "/tmp/reactive_record_performance"
        }.freeze

        # Performance alert levels
        ALERT_LEVELS = %i[info warning critical].freeze

        def initialize(config: {})
          @config = DEFAULT_CONFIG.merge(config)
          @alert_thresholds = @config[:alert_thresholds]
          @session_history = []
          @current_session = nil
          @alerts = []
          @integrations = {}

          # Performance data storage
          @performance_data = {
            sessions: [],
            benchmarks: [],
            alerts: [],
            system_metrics: []
          }

          setup_data_persistence if @config[:persist_data]
          initialize_alert_system if @config[:enable_alerts]
        end

        # Start a new monitoring session
        #
        # @param session_name [String] Name/identifier for this monitoring session
        # @param metadata [Hash] Additional session metadata
        # @return [String] Session ID
        def start_monitoring_session(session_name, metadata: {})
          end_monitoring_session if @current_session # End previous session if active

          session_id = generate_session_id
          @current_session = {
            id: session_id,
            name: session_name,
            start_time: Time.current,
            end_time: nil,
            metadata: metadata,
            metrics: initialize_session_metrics,
            events: [],
            alerts: [],
            performance_samples: []
          }

          record_session_event(:session_started, "Monitoring session '#{session_name}' started")

          # Start real-time monitoring if enabled
          start_real_time_monitoring if @config[:enable_real_time_monitoring]

          session_id
        end

        # End the current monitoring session
        #
        # @return [Hash] Final session summary
        def end_monitoring_session
          return nil unless @current_session

          @current_session[:end_time] = Time.current
          @current_session[:duration] = @current_session[:end_time] - @current_session[:start_time]

          # Finalize session metrics
          finalize_session_metrics

          # Stop real-time monitoring
          stop_real_time_monitoring if @real_time_thread

          record_session_event(:session_ended, "Monitoring session ended")

          # Archive session
          session_summary = @current_session.dup
          @session_history << session_summary
          persist_session_data(session_summary) if @config[:persist_data]

          @current_session = nil
          session_summary
        end

        # Record generation operation result
        #
        # @param result [Hash] Generation result from coordinator
        # @param operation_type [Symbol] Type of generation operation
        def record_generation_result(result, operation_type: :generation)
          return unless @current_session

          timestamp = Time.current

          # Extract key metrics from result
          metrics = extract_generation_metrics(result)

          # Record in current session
          @current_session[:events] << {
            type: :generation_completed,
            timestamp: timestamp,
            operation_type: operation_type,
            metrics: metrics,
            result_summary: summarize_generation_result(result)
          }

          # Update session metrics
          update_session_metrics(metrics)

          # Check for performance alerts
          check_performance_alerts(metrics) if @config[:enable_alerts]

          # Record sample for real-time monitoring
          record_performance_sample(timestamp, metrics) if @config[:enable_real_time_monitoring]
        end

        # Record benchmark execution result
        #
        # @param benchmark_result [Hash] Benchmark result from benchmark runner
        def record_benchmark_result(benchmark_result)
          return unless @current_session

          timestamp = Time.current

          @current_session[:events] << {
            type: :benchmark_completed,
            timestamp: timestamp,
            result: benchmark_result,
            summary: {
              scenarios_tested: benchmark_result[:scenarios]&.length || 0,
              overall_improvement: benchmark_result[:summary]&.[](:overall_performance_improvement) || 0.0
            }
          }

          # Store in performance data
          @performance_data[:benchmarks] << {
            session_id: @current_session[:id],
            timestamp: timestamp,
            result: benchmark_result
          }
        end

        # Integrate with benchmark runner for automatic monitoring
        #
        # @param benchmark_runner [BenchmarkRunner] Benchmark runner instance
        def integrate_with_benchmark_runner(benchmark_runner)
          @integrations[:benchmark_runner] = benchmark_runner

          # Hook into benchmark runner events (if supported)
          if benchmark_runner.respond_to?(:on_benchmark_complete)
            benchmark_runner.on_benchmark_complete { |result| record_benchmark_result(result) }
          end
        end

        # Integrate with cache optimizer for cache performance monitoring
        #
        # @param cache_optimizer [CacheOptimizer] Cache optimizer instance
        def integrate_with_cache_optimizer(cache_optimizer)
          @integrations[:cache_optimizer] = cache_optimizer

          record_session_event(:cache_integration, "Integrated with cache optimizer")
        end

        # Integrate with parallel executor for parallelization monitoring
        #
        # @param parallel_executor [ParallelExecutor] Parallel executor instance
        def integrate_with_parallel_executor(parallel_executor)
          @integrations[:parallel_executor] = parallel_executor

          record_session_event(:parallel_integration, "Integrated with parallel executor")
        end

        # Generate comprehensive performance report
        #
        # @param format [Symbol] Report format (:json, :html, :csv)
        # @param include_history [Boolean] Include historical data
        # @return [String] Generated report content
        def generate_performance_report(format: :json, include_history: false)
          report_data = compile_report_data(include_history)

          case format
          when :json
            JSON.pretty_generate(report_data)
          when :html
            generate_html_report(report_data)
          when :csv
            generate_csv_report(report_data)
          else
            raise ArgumentError, "Unsupported report format: #{format}"
          end
        end

        # Generate dashboard data for performance visualization
        #
        # @return [Hash] Dashboard data structure
        def generate_dashboard_data
          current_session_data = @current_session || {}
          recent_sessions = @session_history.last(10)

          {
            current_session: {
              id: current_session_data[:id],
              name: current_session_data[:name],
              duration: calculate_session_duration(current_session_data),
              metrics: current_session_data[:metrics] || {},
              alerts: current_session_data[:alerts] || []
            },
            recent_performance: {
              sessions: recent_sessions.map { |session| summarize_session_for_dashboard(session) },
              trends: calculate_performance_trends(recent_sessions),
              alerts: @alerts.last(20)
            },
            system_health: {
              current_memory_usage: get_current_memory_usage,
              cache_performance: get_cache_performance_summary,
              parallel_execution_stats: get_parallel_execution_summary
            },
            recommendations: generate_performance_recommendations
          }
        end

        # Get real-time performance metrics
        #
        # @return [Hash] Current real-time metrics
        def get_real_time_metrics
          return {} unless @current_session

          {
            session_id: @current_session[:id],
            session_name: @current_session[:name],
            duration: calculate_session_duration(@current_session),
            current_metrics: @current_session[:metrics],
            recent_samples: @current_session[:performance_samples].last(10),
            active_alerts: @current_session[:alerts].select { |alert| alert[:active] }
          }
        end

        # Get performance alerts
        #
        # @param level [Symbol] Filter by alert level (:info, :warning, :critical)
        # @param active_only [Boolean] Only return active alerts
        # @return [Array<Hash>] Performance alerts
        def get_performance_alerts(level: nil, active_only: false)
          alerts = @alerts

          alerts = alerts.select { |alert| alert[:level] == level } if level
          alerts = alerts.select { |alert| alert[:active] } if active_only

          alerts.sort_by { |alert| alert[:timestamp] }.reverse
        end

        # Set custom alert thresholds
        #
        # @param thresholds [Hash] New threshold values
        def set_alert_thresholds(thresholds)
          @alert_thresholds = @alert_thresholds.merge(thresholds)
          record_session_event(:thresholds_updated, "Alert thresholds updated") if @current_session
        end

        # Export performance data
        #
        # @param file_path [String] Export file path
        # @param format [Symbol] Export format (:json, :csv)
        def export_performance_data(file_path, format: :json)
          data = {
            sessions: @session_history,
            performance_data: @performance_data,
            configuration: @config,
            export_timestamp: Time.current.iso8601
          }

          case format
          when :json
            File.write(file_path, JSON.pretty_generate(data))
          when :csv
            export_to_csv(file_path, data)
          else
            raise ArgumentError, "Unsupported export format: #{format}"
          end
        end

        # Import performance data
        #
        # @param file_path [String] Import file path
        # @param merge [Boolean] Merge with existing data or replace
        def import_performance_data(file_path, merge: true)
          return unless File.exist?(file_path)

          data = JSON.parse(File.read(file_path), symbolize_names: true)

          if merge
            @session_history.concat(data[:sessions] || [])

            data[:performance_data]&.each do |key, value|
              @performance_data[key] ||= []
              @performance_data[key].concat(value) if value.is_a?(Array)
            end
          else
            @session_history = data[:sessions] || []
            @performance_data = data[:performance_data] || {}
          end

          # Remove duplicates and sort
          clean_imported_data
        end

        private

        # Initialize session metrics structure
        def initialize_session_metrics
          {
            total_operations: 0,
            total_execution_time: 0.0,
            average_execution_time: 0.0,
            peak_memory_usage: 0.0,
            total_files_generated: 0,
            total_errors: 0,
            cache_hit_rate: 0.0,
            parallel_efficiency: 0.0
          }
        end

        # Extract metrics from generation result
        def extract_generation_metrics(result)
          return {} unless result.is_a?(Hash)

          {
            execution_time: result[:execution_time] || result[:statistics]&.[](:execution_time) || 0.0,
            memory_usage: extract_memory_usage(result),
            files_generated: result[:generated_files]&.length || result[:statistics]&.[](:files_created) || 0,
            models_generated: result[:generated_models]&.length || result[:statistics]&.[](:models_generated) || 0,
            errors: result[:errors]&.length || 0,
            success: result[:success] || false
          }
        end

        # Extract memory usage from result
        def extract_memory_usage(result)
          if result[:statistics] && result[:statistics][:memory_usage]
            result[:statistics][:memory_usage][:peak_memory_mb] || 0.0
          else
            0.0
          end
        end

        # Update session metrics with new data
        def update_session_metrics(metrics)
          session_metrics = @current_session[:metrics]

          session_metrics[:total_operations] += 1
          session_metrics[:total_execution_time] += metrics[:execution_time] || 0.0
          session_metrics[:average_execution_time] = session_metrics[:total_execution_time] / session_metrics[:total_operations]
          session_metrics[:peak_memory_usage] = [ session_metrics[:peak_memory_usage], metrics[:memory_usage] || 0.0 ].max
          session_metrics[:total_files_generated] += metrics[:files_generated] || 0
          session_metrics[:total_errors] += metrics[:errors] || 0
        end

        # Finalize session metrics
        def finalize_session_metrics
          return unless @current_session

          # Calculate final derived metrics
          metrics = @current_session[:metrics]

          # Update cache performance if cache optimizer is integrated
          if @integrations[:cache_optimizer]
            cache_stats = @integrations[:cache_optimizer].cache_efficiency_report
            metrics[:cache_hit_rate] = cache_stats[:overall][:hit_rate]
          end

          # Update parallel execution efficiency if parallel executor is integrated
          if @integrations[:parallel_executor]
            parallel_stats = @integrations[:parallel_executor].performance_statistics
            metrics[:parallel_efficiency] = calculate_parallel_efficiency(parallel_stats)
          end
        end

        # Check for performance alerts
        def check_performance_alerts(metrics)
          alerts = []

          # Check execution time
          if metrics[:execution_time] && metrics[:execution_time] > @alert_thresholds[:execution_time]
            alerts << create_alert(:warning, :execution_time,
              "Execution time (#{metrics[:execution_time].round(2)}s) exceeded threshold (#{@alert_thresholds[:execution_time]}s)")
          end

          # Check memory usage
          if metrics[:memory_usage] && metrics[:memory_usage] > @alert_thresholds[:memory_usage]
            alerts << create_alert(:warning, :memory_usage,
              "Memory usage (#{metrics[:memory_usage].round(2)}MB) exceeded threshold (#{@alert_thresholds[:memory_usage]}MB)")
          end

          # Check error rate
          if @current_session[:metrics][:total_operations] > 0
            error_rate = (@current_session[:metrics][:total_errors].to_f / @current_session[:metrics][:total_operations]) * 100
            if error_rate > @alert_thresholds[:error_rate]
              alerts << create_alert(:critical, :error_rate,
                "Error rate (#{error_rate.round(2)}%) exceeded threshold (#{@alert_thresholds[:error_rate]}%)")
            end
          end

          # Add alerts to session and global alerts
          alerts.each do |alert|
            @current_session[:alerts] << alert
            @alerts << alert
          end
        end

        # Create performance alert
        def create_alert(level, category, message)
          {
            id: generate_alert_id,
            level: level,
            category: category,
            message: message,
            timestamp: Time.current,
            session_id: @current_session[:id],
            active: true
          }
        end

        # Record session event
        def record_session_event(event_type, message, metadata: {})
          return unless @current_session

          @current_session[:events] << {
            type: event_type,
            message: message,
            timestamp: Time.current,
            metadata: metadata
          }
        end

        # Record performance sample for real-time monitoring
        def record_performance_sample(timestamp, metrics)
          return unless @current_session

          sample = {
            timestamp: timestamp,
            execution_time: metrics[:execution_time],
            memory_usage: metrics[:memory_usage],
            cumulative_files: @current_session[:metrics][:total_files_generated],
            cumulative_errors: @current_session[:metrics][:total_errors]
          }

          @current_session[:performance_samples] << sample

          # Keep only recent samples to prevent memory bloat
          if @current_session[:performance_samples].length > 1000
            @current_session[:performance_samples] = @current_session[:performance_samples].last(500)
          end
        end

        # Start real-time monitoring thread
        def start_real_time_monitoring
          return if @real_time_thread

          @real_time_thread = Thread.new do
            loop do
              break unless @current_session

              # Collect system metrics
              collect_system_metrics

              sleep(@config[:sampling_interval])
            end
          end
        end

        # Stop real-time monitoring thread
        def stop_real_time_monitoring
          return unless @real_time_thread

          @real_time_thread.kill if @real_time_thread.alive?
          @real_time_thread = nil
        end

        # Collect system metrics
        def collect_system_metrics
          return unless @current_session

          system_sample = {
            timestamp: Time.current,
            memory_usage: get_current_memory_usage,
            cpu_usage: get_current_cpu_usage,
            gc_stats: GC.stat.dup
          }

          @performance_data[:system_metrics] << {
            session_id: @current_session[:id],
            **system_sample
          }
        end

        # Compile report data
        def compile_report_data(include_history)
          report = {
            generated_at: Time.current.iso8601,
            current_session: @current_session,
            summary: {
              total_sessions: @session_history.length,
              total_operations: @session_history.sum { |s| s[:metrics][:total_operations] },
              average_session_duration: calculate_average_session_duration,
              total_alerts: @alerts.length
            },
            integrations: @integrations.keys,
            configuration: @config
          }

          if include_history
            report[:session_history] = @session_history
            report[:performance_data] = @performance_data
            report[:alerts] = @alerts
          end

          report
        end

        # Generate HTML report
        def generate_html_report(report_data)
          # This would generate an HTML report with charts and visualizations
          # For now, return a basic HTML structure
          <<~HTML
            <!DOCTYPE html>
            <html>
            <head>
              <title>ReactiveRecord Performance Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .metric { background: #f5f5f5; padding: 10px; margin: 10px 0; border-radius: 5px; }
                .alert { background: #ffe6e6; padding: 10px; margin: 5px 0; border-left: 4px solid #ff4444; }
                .summary { background: #e6f3ff; padding: 15px; border-radius: 5px; }
              </style>
            </head>
            <body>
              <h1>ReactiveRecord Performance Report</h1>
              <div class="summary">
                <h2>Summary</h2>
                <p>Generated: #{report_data[:generated_at]}</p>
                <p>Total Sessions: #{report_data[:summary][:total_sessions]}</p>
                <p>Total Operations: #{report_data[:summary][:total_operations]}</p>
                <p>Average Session Duration: #{report_data[:summary][:average_session_duration]&.round(2)}s</p>
              </div>
            #{'  '}
              <h2>Current Session</h2>
              #{format_session_html(report_data[:current_session])}
            #{'  '}
              <h2>Configuration</h2>
              <pre>#{JSON.pretty_generate(report_data[:configuration])}</pre>
            </body>
            </html>
          HTML
        end

        # Generate CSV report
        def generate_csv_report(report_data)
          CSV.generate do |csv|
            # Headers
            csv << [ "Session ID", "Session Name", "Duration", "Total Operations", "Average Execution Time", "Peak Memory", "Files Generated", "Errors" ]

            # Current session
            if report_data[:current_session]
              session = report_data[:current_session]
              csv << format_session_csv_row(session)
            end

            # Historical sessions
            @session_history.each do |session|
              csv << format_session_csv_row(session)
            end
          end
        end

        # Setup data persistence
        def setup_data_persistence
          FileUtils.mkdir_p(@config[:data_directory]) unless Dir.exist?(@config[:data_directory])
        end

        # Persist session data
        def persist_session_data(session)
          return unless @config[:persist_data]

          file_path = File.join(@config[:data_directory], "session_#{session[:id]}.json")
          File.write(file_path, JSON.pretty_generate(session))
        end

        # Initialize alert system
        def initialize_alert_system
          @alerts = []
        end

        # Helper methods for report generation and calculations

        def generate_session_id
          "session_#{Time.current.to_i}_#{rand(1000)}"
        end

        def generate_alert_id
          "alert_#{Time.current.to_i}_#{rand(1000)}"
        end

        def calculate_session_duration(session)
          return 0.0 unless session[:start_time]

          end_time = session[:end_time] || Time.current
          end_time - session[:start_time]
        end

        def calculate_average_session_duration
          return 0.0 if @session_history.empty?

          total_duration = @session_history.sum { |session| session[:duration] || 0.0 }
          total_duration / @session_history.length
        end

        def calculate_parallel_efficiency(parallel_stats)
          return 0.0 unless parallel_stats && parallel_stats[:average_improvement]

          parallel_stats[:average_improvement].to_f
        end

        def get_current_memory_usage
          # Platform-specific memory usage - simplified version
          if RUBY_PLATFORM =~ /darwin/
            `ps -o rss= -p #{Process.pid}`.to_i / 1024.0 # Convert KB to MB
          else
            ObjectSpace.memsize_of_all / 1024.0 / 1024.0 rescue 0.0
          end
        end

        def get_current_cpu_usage
          # Simplified CPU usage - would need more sophisticated implementation
          0.0
        end

        def get_cache_performance_summary
          return {} unless @integrations[:cache_optimizer]

          @integrations[:cache_optimizer].cache_efficiency_report[:overall]
        end

        def get_parallel_execution_summary
          return {} unless @integrations[:parallel_executor]

          @integrations[:parallel_executor].performance_statistics
        end

        def generate_performance_recommendations
          recommendations = []

          # Analyze recent performance and generate recommendations
          if @current_session && @current_session[:metrics][:average_execution_time] > 30
            recommendations << "Consider enabling parallel execution to improve performance"
          end

          if @integrations[:cache_optimizer]
            cache_stats = get_cache_performance_summary
            if cache_stats[:hit_rate] && cache_stats[:hit_rate] < 50
              recommendations << "Low cache hit rate - consider adjusting cache policies"
            end
          end

          recommendations
        end

        def summarize_generation_result(result)
          {
            success: result[:success] || false,
            models_generated: result[:generated_models]&.length || 0,
            files_generated: result[:generated_files]&.length || 0,
            errors: result[:errors]&.length || 0
          }
        end

        def summarize_session_for_dashboard(session)
          {
            id: session[:id],
            name: session[:name],
            duration: session[:duration],
            operations: session[:metrics][:total_operations],
            average_time: session[:metrics][:average_execution_time],
            errors: session[:metrics][:total_errors],
            timestamp: session[:start_time]
          }
        end

        def calculate_performance_trends(sessions)
          return {} if sessions.length < 2

          # Calculate trends over recent sessions
          execution_times = sessions.map { |s| s[:metrics][:average_execution_time] }
          memory_usage = sessions.map { |s| s[:metrics][:peak_memory_usage] }

          {
            execution_time_trend: calculate_trend(execution_times),
            memory_usage_trend: calculate_trend(memory_usage),
            session_count: sessions.length
          }
        end

        def calculate_trend(values)
          return :stable if values.length < 2

          recent_avg = values.last(3).sum / [ values.last(3).length, 1 ].max
          earlier_avg = values.first([ values.length - 3, 3 ].min).sum / [ values.first([ values.length - 3, 3 ].min).length, 1 ].max

          if recent_avg > earlier_avg * 1.1
            :increasing
          elsif recent_avg < earlier_avg * 0.9
            :decreasing
          else
            :stable
          end
        end

        def format_session_html(session)
          return "<p>No current session</p>" unless session

          <<~HTML
            <div class="metric">
              <h3>#{session[:name]} (#{session[:id]})</h3>
              <p>Duration: #{calculate_session_duration(session).round(2)}s</p>
              <p>Operations: #{session[:metrics][:total_operations]}</p>
              <p>Average Execution Time: #{session[:metrics][:average_execution_time].round(4)}s</p>
              <p>Peak Memory: #{session[:metrics][:peak_memory_usage].round(2)}MB</p>
              <p>Files Generated: #{session[:metrics][:total_files_generated]}</p>
              <p>Errors: #{session[:metrics][:total_errors]}</p>
            </div>
          HTML
        end

        def format_session_csv_row(session)
          [
            session[:id],
            session[:name],
            session[:duration]&.round(2),
            session[:metrics][:total_operations],
            session[:metrics][:average_execution_time]&.round(4),
            session[:metrics][:peak_memory_usage]&.round(2),
            session[:metrics][:total_files_generated],
            session[:metrics][:total_errors]
          ]
        end

        def export_to_csv(file_path, data)
          # Implementation for CSV export of all performance data
          CSV.open(file_path, "w") do |csv|
            csv << [ "Type", "Timestamp", "Data" ]

            data[:sessions].each do |session|
              csv << [ "session", session[:start_time], session.to_json ]
            end

            data[:performance_data][:benchmarks].each do |benchmark|
              csv << [ "benchmark", benchmark[:timestamp], benchmark[:result].to_json ]
            end
          end
        end

        def clean_imported_data
          # Remove duplicates and sort data
          @session_history = @session_history.uniq { |session| session[:id] }
          @session_history.sort_by! { |session| session[:start_time] }

          @performance_data.each do |key, value|
            next unless value.is_a?(Array)
            @performance_data[key] = value.uniq { |item| [ item[:session_id], item[:timestamp] ] }
            @performance_data[key].sort_by! { |item| item[:timestamp] }
          end
        end
      end
    end
  end
end
