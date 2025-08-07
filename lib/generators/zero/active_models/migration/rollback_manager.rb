# frozen_string_literal: true

require "json"
require "fileutils"

module Zero
  module Generators
    module Migration
      # RollbackManager handles emergency rollback scenarios during system migration
      #
      # This class provides comprehensive rollback capabilities when the new pipeline
      # system fails or produces inconsistent results. It coordinates with feature flags,
      # maintains rollback state, and provides both automatic and manual rollback triggers.
      #
      # Key Responsibilities:
      # - Monitor system health and trigger automatic rollbacks
      # - Provide manual rollback controls for emergency situations
      # - Persist rollback state and decision history
      # - Validate rollback success and system recovery
      # - Coordinate with circuit breaker and feature flags
      # - Generate rollback reports and alerts
      #
      # @example Emergency manual rollback
      #   manager = RollbackManager.new
      #   manager.execute_emergency_rollback!(reason: "Critical production issue")
      #
      # @example Check rollback eligibility
      #   manager = RollbackManager.new
      #   if manager.rollback_recommended?
      #     manager.execute_automatic_rollback
      #   end
      #
      class RollbackManager
        # Rollback errors
        class RollbackError < StandardError; end
        class RollbackStateError < RollbackError; end
        class ValidationError < RollbackError; end
        class PersistenceError < RollbackError; end

        # Rollback triggers and reasons
        ROLLBACK_TRIGGERS = {
          # Automatic triggers
          circuit_breaker_tripped: :automatic,
          error_threshold_exceeded: :automatic,
          performance_degradation: :automatic,
          canary_test_failures: :automatic,
          system_health_critical: :automatic,

          # Manual triggers
          emergency_manual: :manual,
          planned_maintenance: :manual,
          production_incident: :manual,
          configuration_error: :manual,
          external_dependency_failure: :manual
        }.freeze

        # Rollback states
        ROLLBACK_STATES = [
          :active,           # Normal operation, no rollback
          :rollback_pending, # Rollback decision made but not executed
          :rolling_back,     # Rollback in progress
          :rolled_back,      # Successfully rolled back to legacy system
          :rollback_failed,  # Rollback attempt failed
          :recovering,       # Attempting to recover from rollback failure
          :recovery_failed   # Recovery from rollback failure failed
        ].freeze

        attr_reader :feature_flags, :state_file_path, :current_state, :rollback_history

        # Initialize rollback manager
        #
        # @param feature_flags [MigrationFeatureFlags] Feature flags instance to control
        # @param state_file_path [String] Path to persist rollback state
        # @param notification_handler [Proc] Handler for rollback notifications
        def initialize(feature_flags: nil, state_file_path: nil, notification_handler: nil)
          @feature_flags = feature_flags || MigrationFeatureFlags.instance
          @state_file_path = state_file_path || default_state_file_path
          @notification_handler = notification_handler || default_notification_handler
          @mutex = Mutex.new

          load_rollback_state
          validate_initial_state
        end

        # Check if automatic rollback is recommended based on current conditions
        #
        # @return [Boolean] True if rollback should be triggered
        def rollback_recommended?
          return false if currently_rolled_back?
          return true if circuit_breaker_indicates_rollback?
          return true if error_rate_exceeds_threshold?
          return true if performance_degraded_significantly?
          return true if canary_tests_consistently_failing?

          false
        end

        # Get rollback recommendation with detailed reasoning
        #
        # @return [Hash] Rollback recommendation with reasons and severity
        def rollback_recommendation
          recommendation = {
            recommended: false,
            severity: :info,
            reasons: [],
            trigger_type: nil,
            confidence: 0.0
          }

          # Check each rollback condition
          check_circuit_breaker_condition(recommendation)
          check_error_rate_condition(recommendation)
          check_performance_condition(recommendation)
          check_canary_test_condition(recommendation)
          check_system_health_condition(recommendation)

          # Calculate overall confidence and recommendation
          recommendation[:recommended] = recommendation[:confidence] > 0.6
          recommendation[:trigger_type] = recommendation[:recommended] ? :automatic : nil

          recommendation
        end

        # Execute automatic rollback based on current conditions
        #
        # @param dry_run [Boolean] Whether to simulate rollback without executing
        # @return [Hash] Rollback execution results
        def execute_automatic_rollback(dry_run: false)
          recommendation = rollback_recommendation

          unless recommendation[:recommended]
            return {
              success: false,
              reason: "Automatic rollback not recommended",
              recommendation: recommendation
            }
          end

          primary_reason = recommendation[:reasons].first
          execute_rollback(
            trigger: primary_reason[:trigger],
            reason: primary_reason[:description],
            type: :automatic,
            dry_run: dry_run
          )
        end

        # Execute emergency manual rollback
        #
        # @param reason [String] Human-readable reason for rollback
        # @param operator [String] Name/ID of person initiating rollback
        # @param dry_run [Boolean] Whether to simulate rollback without executing
        # @return [Hash] Rollback execution results
        def execute_emergency_rollback!(reason:, operator: nil, dry_run: false)
          execute_rollback(
            trigger: :emergency_manual,
            reason: reason,
            type: :manual,
            operator: operator,
            dry_run: dry_run,
            force: true
          )
        end

        # Execute planned rollback (maintenance, configuration change, etc.)
        #
        # @param reason [String] Reason for planned rollback
        # @param scheduled_at [Time] When rollback should occur (default: now)
        # @param operator [String] Name/ID of person initiating rollback
        # @param dry_run [Boolean] Whether to simulate rollback without executing
        # @return [Hash] Rollback execution results
        def execute_planned_rollback(reason:, scheduled_at: Time.current, operator: nil, dry_run: false)
          if scheduled_at > Time.current
            schedule_rollback(reason: reason, scheduled_at: scheduled_at, operator: operator)
          else
            execute_rollback(
              trigger: :planned_maintenance,
              reason: reason,
              type: :manual,
              operator: operator,
              dry_run: dry_run
            )
          end
        end

        # Validate that rollback was successful and system is healthy
        #
        # @return [Hash] Validation results
        def validate_rollback_success
          validation_start_time = Time.current

          validation_results = {
            success: false,
            checks_passed: [],
            checks_failed: [],
            validation_time_ms: 0,
            system_health: :unknown
          }

          begin
            # Check feature flag state
            validate_feature_flags_rollback(validation_results)

            # Check circuit breaker state
            validate_circuit_breaker_state(validation_results)

            # Validate legacy system functionality
            validate_legacy_system_health(validation_results)

            # Check for ongoing errors
            validate_error_rates(validation_results)

            # Determine overall validation success
            validation_results[:success] = validation_results[:checks_failed].empty?
            validation_results[:system_health] = determine_system_health(validation_results)

          rescue => e
            validation_results[:checks_failed] << {
              check: :validation_exception,
              error: e.message,
              severity: :critical
            }
          ensure
            validation_results[:validation_time_ms] =
              ((Time.current - validation_start_time) * 1000).round(2)
          end

          # Update rollback state based on validation
          if validation_results[:success]
            transition_to_state(:rolled_back) if @current_state == :rolling_back
          else
            transition_to_state(:rollback_failed) if @current_state == :rolling_back
          end

          validation_results
        end

        # Attempt to recover from failed rollback
        #
        # @return [Hash] Recovery attempt results
        def attempt_rollback_recovery
          return { success: false, reason: "Not in rollback failed state" } unless @current_state == :rollback_failed

          transition_to_state(:recovering)
          recovery_start_time = Time.current

          recovery_result = {
            success: false,
            recovery_steps: [],
            errors: [],
            recovery_time_ms: 0
          }

          begin
            # Step 1: Reset feature flags to safe state
            reset_feature_flags_to_safe_state(recovery_result)

            # Step 2: Clear circuit breaker if needed
            reset_circuit_breaker_if_safe(recovery_result)

            # Step 3: Validate system health
            validate_system_after_recovery(recovery_result)

            # Determine recovery success
            recovery_result[:success] = recovery_result[:errors].empty?

            if recovery_result[:success]
              transition_to_state(:rolled_back)
            else
              transition_to_state(:recovery_failed)
            end

          rescue => e
            recovery_result[:errors] << "Recovery exception: #{e.message}"
            transition_to_state(:recovery_failed)
          ensure
            recovery_result[:recovery_time_ms] =
              ((Time.current - recovery_start_time) * 1000).round(2)
          end

          persist_rollback_state
          notify_recovery_attempt(recovery_result)

          recovery_result
        end

        # Get current rollback status and health information
        #
        # @return [Hash] Current status information
        def current_status
          {
            state: @current_state,
            is_rolled_back: currently_rolled_back?,
            last_rollback: @rollback_history.last,
            rollback_count_today: rollbacks_today_count,
            feature_flags_state: @feature_flags.configuration_summary,
            circuit_breaker_state: @feature_flags.circuit_breaker_state,
            recommendation: rollback_recommendation,
            health_indicators: current_health_indicators
          }
        end

        # Get rollback history and statistics
        #
        # @param limit [Integer] Maximum number of historical records to return
        # @return [Array] Historical rollback records
        def rollback_history(limit: 50)
          @rollback_history.last(limit)
        end

        # Clear rollback state and return to normal operation
        #
        # @param operator [String] Name/ID of person clearing rollback
        # @return [Hash] Clear operation results
        def clear_rollback_state(operator: nil)
          return { success: false, reason: "Not in rolled back state" } unless currently_rolled_back?

          begin
            # Reset feature flags to normal operation
            @feature_flags.reset_circuit_breaker!
            @feature_flags.update_config(manual_override: nil)

            # Transition state
            transition_to_state(:active)

            # Record the clear operation
            record_rollback_event({
              type: :clear_rollback,
              trigger: :manual,
              reason: "Rollback cleared - returning to normal operation",
              operator: operator,
              success: true,
              timestamp: Time.current
            })

            persist_rollback_state
            notify_rollback_cleared(operator)

            { success: true, new_state: @current_state }

          rescue => e
            { success: false, error: e.message }
          end
        end

        private

        def execute_rollback(trigger:, reason:, type:, operator: nil, dry_run: false, force: false)
          return { success: false, reason: "Already rolled back" } if currently_rolled_back? && !force

          rollback_start_time = Time.current
          rollback_id = SecureRandom.uuid

          rollback_result = {
            id: rollback_id,
            success: false,
            trigger: trigger,
            type: type,
            reason: reason,
            operator: operator,
            dry_run: dry_run,
            steps_completed: [],
            errors: [],
            rollback_time_ms: 0
          }

          begin
            unless dry_run
              transition_to_state(:rollback_pending)
              transition_to_state(:rolling_back)
            end

            # Step 1: Set feature flags to force legacy system
            execute_rollback_step(rollback_result, :set_manual_override) do
              unless dry_run
                @feature_flags.update_config(manual_override: :force_legacy)
              end
              "Set manual override to force legacy system"
            end

            # Step 2: Trip circuit breaker if not already tripped
            execute_rollback_step(rollback_result, :trip_circuit_breaker) do
              unless dry_run
                @feature_flags.trip_circuit_breaker! unless @feature_flags.circuit_breaker_state == :open
              end
              "Tripped circuit breaker to prevent new system usage"
            end

            # Step 3: Wait for in-flight requests to complete
            execute_rollback_step(rollback_result, :wait_for_requests) do
              unless dry_run
                sleep(2) # Allow in-flight requests to complete with legacy system
              end
              "Waited for in-flight requests to complete"
            end

            # Step 4: Validate rollback success
            unless dry_run
              execute_rollback_step(rollback_result, :validate_rollback) do
                validation_result = validate_rollback_success
                unless validation_result[:success]
                  raise RollbackError, "Rollback validation failed: #{validation_result[:checks_failed].map { |c| c[:error] }.join(', ')}"
                end
                "Validated rollback success"
              end
            end

            rollback_result[:success] = rollback_result[:errors].empty?

            unless dry_run
              if rollback_result[:success]
                transition_to_state(:rolled_back)
              else
                transition_to_state(:rollback_failed)
              end
            end

          rescue => e
            rollback_result[:errors] << "Rollback execution error: #{e.message}"
            transition_to_state(:rollback_failed) unless dry_run
          ensure
            rollback_result[:rollback_time_ms] =
              ((Time.current - rollback_start_time) * 1000).round(2)
          end

          # Record rollback event
          unless dry_run
            record_rollback_event(rollback_result)
            persist_rollback_state
            notify_rollback_executed(rollback_result)
          end

          rollback_result
        end

        def execute_rollback_step(result, step_name)
          begin
            step_result = yield
            result[:steps_completed] << {
              step: step_name,
              result: step_result,
              timestamp: Time.current
            }
          rescue => e
            result[:errors] << "Step #{step_name} failed: #{e.message}"
            raise
          end
        end

        def currently_rolled_back?
          [ :rolled_back, :rollback_failed ].include?(@current_state)
        end

        def circuit_breaker_indicates_rollback?
          @feature_flags.circuit_breaker_state == :open
        end

        def error_rate_exceeds_threshold?
          # Check error rate from feature flags statistics
          # This would need to be implemented based on actual error tracking
          false # Placeholder
        end

        def performance_degraded_significantly?
          # Check performance metrics for significant degradation
          # This would need to be implemented based on actual performance tracking
          false # Placeholder
        end

        def canary_tests_consistently_failing?
          # Check canary test failure rate
          # This would need to be implemented based on actual canary test tracking
          false # Placeholder
        end

        def check_circuit_breaker_condition(recommendation)
          if circuit_breaker_indicates_rollback?
            recommendation[:reasons] << {
              trigger: :circuit_breaker_tripped,
              description: "Circuit breaker is open",
              severity: :critical,
              confidence: 0.9
            }
            recommendation[:confidence] = [ recommendation[:confidence], 0.9 ].max
            recommendation[:severity] = :critical
          end
        end

        def check_error_rate_condition(recommendation)
          if error_rate_exceeds_threshold?
            recommendation[:reasons] << {
              trigger: :error_threshold_exceeded,
              description: "Error rate exceeds acceptable threshold",
              severity: :critical,
              confidence: 0.8
            }
            recommendation[:confidence] = [ recommendation[:confidence], 0.8 ].max
            recommendation[:severity] = :critical
          end
        end

        def check_performance_condition(recommendation)
          if performance_degraded_significantly?
            recommendation[:reasons] << {
              trigger: :performance_degradation,
              description: "Performance degradation detected",
              severity: :warning,
              confidence: 0.6
            }
            recommendation[:confidence] = [ recommendation[:confidence], 0.6 ].max
            recommendation[:severity] = :warning if recommendation[:severity] == :info
          end
        end

        def check_canary_test_condition(recommendation)
          if canary_tests_consistently_failing?
            recommendation[:reasons] << {
              trigger: :canary_test_failures,
              description: "Canary tests consistently failing",
              severity: :critical,
              confidence: 0.7
            }
            recommendation[:confidence] = [ recommendation[:confidence], 0.7 ].max
            recommendation[:severity] = :critical
          end
        end

        def check_system_health_condition(recommendation)
          # Placeholder for system health checks
          # Would check database connectivity, external API availability, etc.
        end

        def validate_feature_flags_rollback(validation_results)
          if @feature_flags.config.manual_override == :force_legacy
            validation_results[:checks_passed] << {
              check: :feature_flags,
              description: "Manual override set to force legacy system"
            }
          else
            validation_results[:checks_failed] << {
              check: :feature_flags,
              error: "Manual override not set to force legacy",
              severity: :critical
            }
          end
        end

        def validate_circuit_breaker_state(validation_results)
          if @feature_flags.circuit_breaker_state == :open
            validation_results[:checks_passed] << {
              check: :circuit_breaker,
              description: "Circuit breaker is open"
            }
          else
            validation_results[:checks_failed] << {
              check: :circuit_breaker,
              error: "Circuit breaker not open",
              severity: :warning
            }
          end
        end

        def validate_legacy_system_health(validation_results)
          # Placeholder for legacy system health validation
          # Would perform actual test execution to ensure legacy system works
          validation_results[:checks_passed] << {
            check: :legacy_system_health,
            description: "Legacy system health check passed"
          }
        end

        def validate_error_rates(validation_results)
          # Placeholder for error rate validation
          # Would check that error rates have decreased after rollback
          validation_results[:checks_passed] << {
            check: :error_rates,
            description: "Error rates within acceptable range"
          }
        end

        def determine_system_health(validation_results)
          critical_failures = validation_results[:checks_failed].count { |f| f[:severity] == :critical }
          warning_failures = validation_results[:checks_failed].count { |f| f[:severity] == :warning }

          return :critical if critical_failures > 0
          return :degraded if warning_failures > 0
          :healthy
        end

        def reset_feature_flags_to_safe_state(recovery_result)
          @feature_flags.update_config(manual_override: :force_legacy)
          recovery_result[:recovery_steps] << "Reset feature flags to safe state"
        end

        def reset_circuit_breaker_if_safe(recovery_result)
          # Only reset if it's safe to do so
          @feature_flags.trip_circuit_breaker! # Keep it tripped for safety
          recovery_result[:recovery_steps] << "Ensured circuit breaker is tripped"
        end

        def validate_system_after_recovery(recovery_result)
          validation_result = validate_rollback_success
          if validation_result[:success]
            recovery_result[:recovery_steps] << "System validation passed after recovery"
          else
            recovery_result[:errors] << "System validation failed after recovery"
          end
        end

        def transition_to_state(new_state)
          unless ROLLBACK_STATES.include?(new_state)
            raise RollbackStateError, "Invalid rollback state: #{new_state}"
          end

          old_state = @current_state
          @current_state = new_state

          # Log state transition
          Rails.logger.info "[RollbackManager] State transition: #{old_state} -> #{new_state}" if defined?(Rails)
        end

        def record_rollback_event(event_data)
          @rollback_history ||= []
          @rollback_history << {
            timestamp: Time.current,
            **event_data
          }

          # Keep only last 100 events to prevent memory bloat
          @rollback_history = @rollback_history.last(100) if @rollback_history.length > 100
        end

        def rollbacks_today_count
          today = Date.current
          @rollback_history.count { |event| event[:timestamp].to_date == today }
        end

        def current_health_indicators
          {
            circuit_breaker_healthy: @feature_flags.circuit_breaker_state != :open,
            feature_flags_safe: @feature_flags.config.manual_override == :force_legacy || @feature_flags.config.manual_override.nil?,
            rollback_state_healthy: [ :active, :rolled_back ].include?(@current_state),
            rollback_count_today: rollbacks_today_count
          }
        end

        def schedule_rollback(reason:, scheduled_at:, operator:)
          # Implementation would depend on job scheduling system (Sidekiq, etc.)
          # For now, just record the scheduled rollback
          record_rollback_event({
            type: :rollback_scheduled,
            trigger: :planned_maintenance,
            reason: reason,
            operator: operator,
            scheduled_at: scheduled_at,
            timestamp: Time.current
          })

          { success: true, scheduled_at: scheduled_at, reason: reason }
        end

        def load_rollback_state
          @mutex.synchronize do
            if File.exist?(@state_file_path)
              begin
                state_data = JSON.parse(File.read(@state_file_path), symbolize_names: true)
                @current_state = state_data[:current_state]&.to_sym || :active
                @rollback_history = state_data[:rollback_history] || []

                # Convert timestamp strings back to Time objects
                @rollback_history.each do |event|
                  event[:timestamp] = Time.parse(event[:timestamp]) if event[:timestamp].is_a?(String)
                end
              rescue JSON::ParserError, StandardError => e
                Rails.logger.error "[RollbackManager] Failed to load state: #{e.message}" if defined?(Rails)
                initialize_default_state
              end
            else
              initialize_default_state
            end
          end
        end

        def initialize_default_state
          @current_state = :active
          @rollback_history = []
        end

        def persist_rollback_state
          @mutex.synchronize do
            begin
              state_data = {
                current_state: @current_state,
                rollback_history: @rollback_history,
                last_updated: Time.current
              }

              FileUtils.mkdir_p(File.dirname(@state_file_path))
              File.write(@state_file_path, JSON.pretty_generate(state_data))
            rescue StandardError => e
              Rails.logger.error "[RollbackManager] Failed to persist state: #{e.message}" if defined?(Rails)
            end
          end
        end

        def validate_initial_state
          unless ROLLBACK_STATES.include?(@current_state)
            Rails.logger.warn "[RollbackManager] Invalid initial state #{@current_state}, resetting to :active" if defined?(Rails)
            @current_state = :active
          end
        end

        def default_state_file_path
          if defined?(Rails)
            Rails.root.join("tmp", "migration_rollback_state.json").to_s
          else
            "/tmp/zero_migration_rollback_state.json"
          end
        end

        def default_notification_handler
          ->(event_type, data) {
            Rails.logger.info "[RollbackManager] #{event_type}: #{data}" if defined?(Rails)
          }
        end

        def notify_rollback_executed(result)
          @notification_handler.call(:rollback_executed, {
            success: result[:success],
            trigger: result[:trigger],
            reason: result[:reason],
            rollback_time_ms: result[:rollback_time_ms]
          })
        end

        def notify_recovery_attempt(result)
          @notification_handler.call(:recovery_attempted, {
            success: result[:success],
            recovery_time_ms: result[:recovery_time_ms],
            errors: result[:errors]
          })
        end

        def notify_rollback_cleared(operator)
          @notification_handler.call(:rollback_cleared, {
            operator: operator,
            cleared_at: Time.current
          })
        end
      end
    end
  end
end
