# frozen_string_literal: true

require_relative "feature_flags"
require_relative "../generation_coordinator"
require_relative "../pipeline/generation_pipeline"

module Zero
  module Generators
    module Migration
      # MigrationAdapter implements the Strangler Fig pattern for gradual migration
      # from GenerationCoordinator to Pipeline architecture.
      #
      # This adapter sits between the caller and both generation systems, routing
      # requests based on feature flags and providing canary testing capabilities
      # to ensure the new system produces equivalent results.
      #
      # Key Responsibilities:
      # - Route generation requests to appropriate system based on feature flags
      # - Execute canary tests by running both systems and comparing results
      # - Provide circuit breaker functionality for automatic rollback
      # - Collect performance metrics and migration statistics
      # - Handle graceful degradation when new system fails
      #
      # @example Basic usage
      #   adapter = MigrationAdapter.new(options, shell)
      #   result = adapter.execute
      #
      # @example With custom feature flags
      #   flags = MigrationFeatureFlags.new(new_pipeline_percentage: 50)
      #   adapter = MigrationAdapter.new(options, shell, feature_flags: flags)
      #   result = adapter.execute
      #
      class MigrationAdapter
        # Migration errors
        class MigrationError < StandardError; end
        class CanaryTestError < MigrationError; end
        class SystemDiscrepancyError < MigrationError; end
        class FallbackError < MigrationError; end

        attr_reader :options, :shell, :feature_flags, :statistics

        # Initialize migration adapter with both generation systems
        #
        # @param options [Hash] Generator options passed to both systems
        # @param shell [Thor::Shell] Shell instance for progress reporting
        # @param feature_flags [MigrationFeatureFlags] Feature flag configuration
        # @param legacy_coordinator [GenerationCoordinator] Legacy system (for testing)
        # @param new_pipeline [Pipeline::GenerationPipeline] New system (for testing)
        def initialize(options, shell = nil, feature_flags: nil, legacy_coordinator: nil, new_pipeline: nil)
          @options = options || {}
          @shell = shell
          @feature_flags = feature_flags || MigrationFeatureFlags.instance
          @statistics = initialize_statistics

          # Initialize both systems (lazy loading for performance)
          @legacy_coordinator = legacy_coordinator
          @new_pipeline = new_pipeline
          @execution_id = SecureRandom.uuid
        end

        # Execute generation with migration adapter logic
        #
        # This is the main entry point that implements the Strangler Fig pattern:
        # 1. Determine which system to use based on feature flags
        # 2. Optionally run canary test (both systems) for comparison
        # 3. Handle errors with fallback to legacy system
        # 4. Collect metrics and update circuit breaker state
        #
        # @return [Hash] Generation results with migration metadata
        def execute
          execution_start_time = Time.current
          table_name = extract_table_name_from_options

          begin
            log_execution_start(table_name)

            # Determine routing strategy
            use_new_pipeline = @feature_flags.use_new_pipeline?(
              table_name: table_name,
              request_context: build_request_context
            )

            run_canary_test = @feature_flags.should_run_canary_test?(table_name: table_name)

            if run_canary_test
              result = execute_canary_test(execution_start_time)
            elsif use_new_pipeline
              result = execute_new_system_with_fallback(execution_start_time)
            else
              result = execute_legacy_system(execution_start_time)
            end

            # Add migration metadata to result
            enhance_result_with_migration_data(result, use_new_pipeline, run_canary_test)

          rescue => e
            handle_execution_error(e, execution_start_time)
          end
        end

        # Alternative interface matching GenerationCoordinator API
        #
        # @param tables [Array<String>] Table names to generate models for
        # @param output_directory [String] Directory to output generated files
        # @return [Hash] Generation results with migration metadata
        def generate_models(tables: [], output_directory: nil)
          # Update options for this specific request
          original_options = @options.dup
          @options[:table] = tables.first if tables.length == 1
          @options[:output_dir] = output_directory if output_directory

          begin
            result = execute
            result
          ensure
            @options = original_options # Restore original options
          end
        end

        # Get service statistics including migration metrics
        #
        # @return [Hash] Comprehensive statistics from both systems
        def collect_service_statistics
          legacy_stats = legacy_coordinator.collect_service_statistics rescue {}
          new_stats = new_pipeline&.statistics rescue {}

          {
            migration_adapter_stats: @statistics,
            feature_flags_state: @feature_flags.configuration_summary,
            performance_metrics: @feature_flags.performance_statistics,
            legacy_system_stats: legacy_stats,
            new_system_stats: new_stats,
            circuit_breaker_state: @feature_flags.circuit_breaker_state
          }
        end

        # Force execution on specific system (for testing and emergency operations)
        #
        # @param system [Symbol] :legacy or :new
        # @param bypass_circuit_breaker [Boolean] Whether to bypass circuit breaker
        # @return [Hash] Generation results
        def force_execute_system(system, bypass_circuit_breaker: false)
          case system
          when :legacy
            execute_legacy_system(Time.current)
          when :new
            if bypass_circuit_breaker || @feature_flags.circuit_breaker_state != :open
              execute_new_system(Time.current)
            else
              raise MigrationError, "Cannot force new system execution: circuit breaker is open"
            end
          else
            raise ArgumentError, "Unknown system: #{system}. Use :legacy or :new"
          end
        end

        private

        def legacy_coordinator
          @legacy_coordinator ||= GenerationCoordinator.new(@options, @shell)
        end

        def new_pipeline
          @new_pipeline ||= Pipeline::GenerationPipeline.new(options: @options)
        end

        def initialize_statistics
          {
            executions_total: 0,
            executions_legacy: 0,
            executions_new: 0,
            executions_canary: 0,
            fallbacks_to_legacy: 0,
            errors_new_system: 0,
            errors_legacy_system: 0,
            canary_discrepancies: 0,
            avg_execution_time_legacy: 0.0,
            avg_execution_time_new: 0.0,
            avg_canary_overhead: 0.0
          }
        end

        def extract_table_name_from_options
          @options[:table] || "unknown"
        end

        def build_request_context
          {
            execution_id: @execution_id,
            timestamp: Time.current,
            dry_run: @options[:dry_run],
            force: @options[:force],
            has_shell: !@shell.nil?
          }
        end

        def execute_canary_test(start_time)
          @statistics[:executions_canary] += 1
          log_canary_test_start if @feature_flags.config.enable_detailed_logging

          # Execute both systems in parallel (with timeout protection)
          legacy_result, new_result = execute_both_systems_with_timeout

          # Compare results
          comparison_result = compare_system_outputs(legacy_result, new_result)

          # Record performance metrics
          record_canary_performance_metrics(legacy_result, new_result, start_time)

          # Determine which result to return
          primary_result = determine_canary_primary_result(legacy_result, new_result, comparison_result)

          # Handle discrepancies if found
          handle_canary_discrepancies(comparison_result) if comparison_result[:has_discrepancies]

          primary_result
        end

        def execute_new_system_with_fallback(start_time)
          @statistics[:executions_new] += 1

          begin
            result = execute_new_system(start_time)

            # Reset circuit breaker on successful execution
            if @feature_flags.circuit_breaker_state == :half_open
              @feature_flags.reset_circuit_breaker!
            end

            result

          rescue => e
            @statistics[:fallbacks_to_legacy] += 1
            @statistics[:errors_new_system] += 1

            # Record error for circuit breaker
            @feature_flags.record_new_pipeline_error(e, build_error_context)

            if @feature_flags.config.fallback_to_legacy_on_error
              log_fallback_to_legacy(e) if @feature_flags.config.enable_detailed_logging
              execute_legacy_system(start_time)
            else
              raise FallbackError, "New pipeline failed and fallback disabled: #{e.message}"
            end
          end
        end

        def execute_legacy_system(start_time)
          @statistics[:executions_legacy] += 1

          begin
            result = legacy_coordinator.execute
            record_execution_metrics(:legacy, start_time, result)
            result
          rescue => e
            @statistics[:errors_legacy_system] += 1
            raise
          end
        end

        def execute_new_system(start_time)
          result = new_pipeline.execute
          record_execution_metrics(:new, start_time, result)
          result
        end

        def execute_both_systems_with_timeout
          timeout_seconds = @feature_flags.config.canary_timeout_seconds

          # Use threads to execute both systems concurrently
          legacy_thread = Thread.new { execute_legacy_system(Time.current) }
          new_thread = Thread.new { execute_new_system(Time.current) }

          # Wait for both with timeout
          legacy_result = wait_for_thread_with_timeout(legacy_thread, timeout_seconds, "legacy")
          new_result = wait_for_thread_with_timeout(new_thread, timeout_seconds, "new")

          [ legacy_result, new_result ]
        end

        def wait_for_thread_with_timeout(thread, timeout, system_name)
          if thread.join(timeout)
            thread.value
          else
            thread.kill
            raise CanaryTestError, "#{system_name.capitalize} system timed out after #{timeout} seconds"
          end
        end

        def compare_system_outputs(legacy_result, new_result)
          comparison = {
            has_discrepancies: false,
            discrepancy_details: [],
            legacy_success: legacy_result[:success],
            new_success: new_result[:success],
            models_match: false,
            files_match: false,
            execution_times: {
              legacy: legacy_result[:execution_time],
              new: new_result[:execution_time]
            }
          }

          # Compare success status
          if legacy_result[:success] != new_result[:success]
            comparison[:has_discrepancies] = true
            comparison[:discrepancy_details] << "Success status differs: legacy=#{legacy_result[:success]}, new=#{new_result[:success]}"
          end

          # Compare generated models count
          legacy_models_count = legacy_result[:generated_models]&.length || 0
          new_models_count = new_result[:generated_models]&.length || 0

          if legacy_models_count != new_models_count
            comparison[:has_discrepancies] = true
            comparison[:discrepancy_details] << "Model count differs: legacy=#{legacy_models_count}, new=#{new_models_count}"
          else
            comparison[:models_match] = true
          end

          # Compare generated files count
          legacy_files_count = legacy_result[:generated_files]&.length || 0
          new_files_count = new_result[:generated_files]&.length || 0

          if legacy_files_count != new_files_count
            comparison[:has_discrepancies] = true
            comparison[:discrepancy_details] << "File count differs: legacy=#{legacy_files_count}, new=#{new_files_count}"
          else
            comparison[:files_match] = true
          end

          # TODO: Add deeper content comparison (file checksums, model structure, etc.)

          comparison
        end

        def determine_canary_primary_result(legacy_result, new_result, comparison)
          # In canary mode, always prefer legacy result unless explicitly configured otherwise
          # This ensures we maintain current behavior while testing new system
          if @feature_flags.config.manual_override == :force_new && new_result[:success]
            new_result
          else
            legacy_result
          end
        end

        def handle_canary_discrepancies(comparison_result)
          @statistics[:canary_discrepancies] += 1

          if @feature_flags.config.alert_on_discrepancies
            log_discrepancy_alert(comparison_result)

            # In development, raise error to catch discrepancies early
            if defined?(Rails) && Rails.env.development?
              raise SystemDiscrepancyError, "Canary test found discrepancies: #{comparison_result[:discrepancy_details].join(', ')}"
            end
          end
        end

        def record_canary_performance_metrics(legacy_result, new_result, start_time)
          total_time = Time.current - start_time

          metrics = {
            legacy_execution_time: legacy_result[:execution_time] || 0.0,
            new_execution_time: new_result[:execution_time] || 0.0,
            canary_overhead: total_time,
            legacy_pipeline_success: legacy_result[:success],
            new_pipeline_success: new_result[:success],
            models_generated_legacy: legacy_result[:generated_models]&.length || 0,
            models_generated_new: new_result[:generated_models]&.length || 0
          }

          @feature_flags.record_performance_metrics(metrics)
          update_adapter_statistics(metrics)
        end

        def record_execution_metrics(system, start_time, result)
          execution_time = result[:execution_time] || (Time.current - start_time)

          case system
          when :legacy
            @statistics[:avg_execution_time_legacy] = update_average(
              @statistics[:avg_execution_time_legacy],
              execution_time,
              @statistics[:executions_legacy]
            )
          when :new
            @statistics[:avg_execution_time_new] = update_average(
              @statistics[:avg_execution_time_new],
              execution_time,
              @statistics[:executions_new]
            )
          end
        end

        def update_adapter_statistics(metrics)
          @statistics[:avg_canary_overhead] = update_average(
            @statistics[:avg_canary_overhead],
            metrics[:canary_overhead],
            @statistics[:executions_canary]
          )
        end

        def update_average(current_avg, new_value, count)
          return new_value if count == 1
          ((current_avg * (count - 1)) + new_value) / count
        end

        def enhance_result_with_migration_data(result, used_new_pipeline, was_canary_test)
          result[:migration_metadata] = {
            used_new_pipeline: used_new_pipeline,
            was_canary_test: was_canary_test,
            execution_id: @execution_id,
            circuit_breaker_state: @feature_flags.circuit_breaker_state,
            feature_flag_config: @feature_flags.configuration_summary
          }

          result
        end

        def handle_execution_error(error, start_time)
          @statistics[:executions_total] += 1
          execution_time = Time.current - start_time

          log_execution_error(error) if @feature_flags.config.enable_detailed_logging

          {
            success: false,
            generated_models: [],
            generated_files: [],
            errors: [ error.message ],
            execution_time: execution_time.round(4),
            migration_metadata: {
              error_type: error.class.name,
              execution_id: @execution_id,
              circuit_breaker_state: @feature_flags.circuit_breaker_state
            }
          }
        end

        def build_error_context
          {
            execution_id: @execution_id,
            table_name: extract_table_name_from_options,
            options: @options.keys,
            timestamp: Time.current
          }
        end

        # Logging methods (implement based on Rails logger or custom logging)

        def log_execution_start(table_name)
          Rails.logger.info "[MigrationAdapter] Starting execution for table: #{table_name} (ID: #{@execution_id})"
        end

        def log_canary_test_start
          Rails.logger.info "[MigrationAdapter] Running canary test (ID: #{@execution_id})"
        end

        def log_fallback_to_legacy(error)
          Rails.logger.warn "[MigrationAdapter] Falling back to legacy system due to error: #{error.message} (ID: #{@execution_id})"
        end

        def log_discrepancy_alert(comparison_result)
          Rails.logger.error "[MigrationAdapter] CANARY DISCREPANCY ALERT: #{comparison_result[:discrepancy_details].join(', ')} (ID: #{@execution_id})"
        end

        def log_execution_error(error)
          Rails.logger.error "[MigrationAdapter] Execution error: #{error.message} (ID: #{@execution_id})"
        end
      end
    end
  end
end
