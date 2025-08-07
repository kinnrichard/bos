# frozen_string_literal: true

require "ostruct"

module Zero
  module Generators
    module Migration
      # MigrationFeatureFlags manages feature flags for Strangler Fig migration
      #
      # This class controls the gradual migration from the legacy GenerationCoordinator
      # to the new Pipeline architecture. It provides fine-grained control over which
      # system handles different aspects of generation.
      #
      # Key Responsibilities:
      # - Control routing between old and new systems
      # - Enable canary testing with percentage-based rollouts
      # - Provide circuit breaker functionality for rollbacks
      # - Track migration progress and system health
      #
      # @example Basic usage
      #   flags = MigrationFeatureFlags.new
      #   flags.use_new_pipeline? # => false (safe default)
      #
      #   flags.configure do |config|
      #     config.new_pipeline_percentage = 25
      #     config.enable_canary_testing = true
      #   end
      #
      # @example Environment-based configuration
      #   # In Rails initializer or environment config
      #   MigrationFeatureFlags.configure_from_env
      #
      class MigrationFeatureFlags
        # Configuration errors
        class ConfigurationError < StandardError; end
        class InvalidPercentageError < ConfigurationError; end
        class CircuitBreakerTrippedError < StandardError; end

        # Feature flag configuration
        attr_reader :config

        # Default configuration values
        DEFAULT_CONFIG = {
          # Migration control
          new_pipeline_percentage: 0,        # 0-100: percentage of requests using new pipeline
          use_new_pipeline_for_tables: [],   # Specific tables to always use new pipeline
          fallback_to_legacy_on_error: true, # Fallback behavior on new pipeline errors

          # Canary testing
          enable_canary_testing: false,      # Enable dual execution and comparison
          canary_sample_rate: 100,           # Percentage of requests to run canary tests on
          canary_timeout_seconds: 30,        # Max time to wait for canary comparison

          # Circuit breaker
          circuit_breaker_enabled: true,     # Enable automatic rollback on errors
          error_threshold: 5,                # Number of errors before circuit trips
          error_window_seconds: 300,         # Time window for error counting (5 minutes)
          circuit_recovery_timeout: 600,     # Time before attempting to close circuit (10 minutes)

          # Monitoring and logging
          enable_detailed_logging: false,    # Log all migration decisions and outcomes
          track_performance_metrics: true,   # Collect performance comparison data
          alert_on_discrepancies: false,     # Alert when old/new systems differ

          # Rollback control
          auto_rollback_enabled: false,      # Automatically rollback on circuit breaker trip
          manual_override: nil,              # Manual override: :force_legacy, :force_new, nil

          # Development and testing
          force_canary_mode: false,          # Always run both systems (dev/test only)
          bypass_percentage_for_test: false  # Ignore percentage routing in tests
        }.freeze

        class << self
          # Global instance for application-wide configuration
          #
          # @return [MigrationFeatureFlags] Global feature flags instance
          def instance
            @instance ||= new
          end

          # Configure global instance from environment variables
          #
          # Environment variable mapping:
          # - MIGRATION_NEW_PIPELINE_PCT -> new_pipeline_percentage
          # - MIGRATION_ENABLE_CANARY -> enable_canary_testing
          # - MIGRATION_CIRCUIT_BREAKER -> circuit_breaker_enabled
          # - MIGRATION_DETAILED_LOGGING -> enable_detailed_logging
          #
          def configure_from_env
            instance.configure do |config|
              config.new_pipeline_percentage = ENV.fetch("MIGRATION_NEW_PIPELINE_PCT", 0).to_i
              config.enable_canary_testing = env_boolean("MIGRATION_ENABLE_CANARY", false)
              config.circuit_breaker_enabled = env_boolean("MIGRATION_CIRCUIT_BREAKER", true)
              config.enable_detailed_logging = env_boolean("MIGRATION_DETAILED_LOGGING", false)
              config.canary_sample_rate = ENV.fetch("MIGRATION_CANARY_SAMPLE_PCT", 100).to_i
              config.auto_rollback_enabled = env_boolean("MIGRATION_AUTO_ROLLBACK", false)

              # Parse table list if provided
              if ENV["MIGRATION_NEW_PIPELINE_TABLES"]
                config.use_new_pipeline_for_tables = ENV["MIGRATION_NEW_PIPELINE_TABLES"].split(",").map(&:strip)
              end

              # Manual override
              case ENV["MIGRATION_MANUAL_OVERRIDE"]&.downcase
              when "legacy", "old"
                config.manual_override = :force_legacy
              when "new", "pipeline"
                config.manual_override = :force_new
              end
            end
          end

          private

          def env_boolean(key, default)
            value = ENV[key]
            return default if value.nil?
            %w[true 1 yes on enabled].include?(value.downcase)
          end
        end

        # Initialize feature flags with default configuration
        #
        # @param initial_config [Hash] Initial configuration overrides
        def initialize(initial_config = {})
          @config = OpenStruct.new(DEFAULT_CONFIG.merge(initial_config))
          @circuit_breaker_state = :closed
          @error_count = 0
          @last_error_time = nil
          @circuit_opened_at = nil
          @performance_data = []
          @mutex = Mutex.new

          validate_configuration!
        end

        # Configure feature flags with a block
        #
        # @yield [config] Configuration object
        # @yieldparam config [OpenStruct] Configuration object to modify
        def configure
          yield @config if block_given?
          validate_configuration!
          self
        end

        # Update specific configuration values
        #
        # @param updates [Hash] Configuration updates
        def update_config(updates)
          updates.each { |key, value| @config.send("#{key}=", value) }
          validate_configuration!
        end

        # Determine if new pipeline should be used for a request
        #
        # @param table_name [String] Table name being processed
        # @param request_context [Hash] Additional context for routing decision
        # @return [Boolean] True if new pipeline should be used
        def use_new_pipeline?(table_name: nil, request_context: {})
          return handle_circuit_breaker_state if circuit_breaker_tripped?
          return handle_manual_override if manual_override_active?
          return true if force_new_for_table?(table_name)
          return false if config.new_pipeline_percentage == 0
          return true if config.new_pipeline_percentage == 100

          # Percentage-based routing with consistent hashing for same inputs
          routing_decision = percentage_routing_decision(table_name, request_context)

          log_routing_decision(table_name, routing_decision, request_context) if config.enable_detailed_logging

          routing_decision
        end

        # Determine if canary testing should be performed
        #
        # @param table_name [String] Table name being processed
        # @return [Boolean] True if canary testing should be performed
        def should_run_canary_test?(table_name: nil)
          return true if config.force_canary_mode
          return false unless config.enable_canary_testing
          return false if circuit_breaker_tripped?

          # Sample-based canary testing
          sample_decision = (rand(100) < config.canary_sample_rate)

          log_canary_decision(table_name, sample_decision) if config.enable_detailed_logging

          sample_decision
        end

        # Record an error from the new pipeline
        #
        # @param error [StandardError] Error that occurred
        # @param context [Hash] Error context
        def record_new_pipeline_error(error, context = {})
          @mutex.synchronize do
            @error_count += 1
            @last_error_time = Time.current

            log_error(error, context) if config.enable_detailed_logging

            check_circuit_breaker_threshold
          end
        end

        # Record performance metrics from migration
        #
        # @param metrics [Hash] Performance comparison data
        def record_performance_metrics(metrics)
          return unless config.track_performance_metrics

          @mutex.synchronize do
            @performance_data << {
              timestamp: Time.current,
              **metrics
            }

            # Keep only last 1000 data points to prevent memory bloat
            @performance_data = @performance_data.last(1000) if @performance_data.length > 1000
          end
        end

        # Get current circuit breaker state
        #
        # @return [Symbol] :open, :closed, :half_open
        def circuit_breaker_state
          @mutex.synchronize do
            update_circuit_breaker_state
            @circuit_breaker_state
          end
        end

        # Manually trip the circuit breaker (emergency rollback)
        def trip_circuit_breaker!
          @mutex.synchronize do
            @circuit_breaker_state = :open
            @circuit_opened_at = Time.current

            if config.auto_rollback_enabled
              config.manual_override = :force_legacy
              log_auto_rollback if config.enable_detailed_logging
            end
          end
        end

        # Reset circuit breaker and error counts
        def reset_circuit_breaker!
          @mutex.synchronize do
            @circuit_breaker_state = :closed
            @error_count = 0
            @last_error_time = nil
            @circuit_opened_at = nil
            config.manual_override = nil if config.manual_override == :force_legacy
          end
        end

        # Get performance statistics
        #
        # @return [Hash] Performance statistics
        def performance_statistics
          @mutex.synchronize do
            return {} unless config.track_performance_metrics && @performance_data.any?

            recent_data = @performance_data.last(100)

            {
              total_samples: @performance_data.length,
              recent_samples: recent_data.length,
              avg_legacy_time: calculate_average(recent_data, :legacy_execution_time),
              avg_new_time: calculate_average(recent_data, :new_execution_time),
              avg_canary_overhead: calculate_average(recent_data, :canary_overhead),
              success_rate_new: calculate_success_rate(recent_data, :new_pipeline_success),
              success_rate_legacy: calculate_success_rate(recent_data, :legacy_pipeline_success)
            }
          end
        end

        # Get current configuration summary
        #
        # @return [Hash] Configuration summary for monitoring
        def configuration_summary
          {
            new_pipeline_percentage: config.new_pipeline_percentage,
            canary_testing_enabled: config.enable_canary_testing,
            circuit_breaker_state: circuit_breaker_state,
            error_count: @error_count,
            manual_override: config.manual_override,
            force_new_tables: config.use_new_pipeline_for_tables
          }
        end

        private

        def validate_configuration!
          unless (0..100).include?(config.new_pipeline_percentage)
            raise InvalidPercentageError, "new_pipeline_percentage must be between 0 and 100"
          end

          unless (0..100).include?(config.canary_sample_rate)
            raise InvalidPercentageError, "canary_sample_rate must be between 0 and 100"
          end

          unless config.error_threshold.positive?
            raise ConfigurationError, "error_threshold must be positive"
          end
        end

        def circuit_breaker_tripped?
          circuit_breaker_state == :open
        end

        def manual_override_active?
          !config.manual_override.nil?
        end

        def handle_circuit_breaker_state
          raise CircuitBreakerTrippedError, "Circuit breaker is open, routing to legacy system"
        rescue CircuitBreakerTrippedError
          false # Route to legacy system
        end

        def handle_manual_override
          case config.manual_override
          when :force_new
            true
          when :force_legacy
            false
          else
            false # Safe default
          end
        end

        def force_new_for_table?(table_name)
          return false unless table_name
          config.use_new_pipeline_for_tables.include?(table_name.to_s)
        end

        def percentage_routing_decision(table_name, context)
          # Use consistent hashing to ensure same inputs always get same routing
          hash_input = "#{table_name}-#{context.hash}-#{Date.current.strftime('%Y-%m-%d')}"
          hash_value = hash_input.hash.abs % 100
          hash_value < config.new_pipeline_percentage
        end

        def check_circuit_breaker_threshold
          return unless config.circuit_breaker_enabled
          return unless @error_count >= config.error_threshold
          return unless recent_error_window?

          @circuit_breaker_state = :open
          @circuit_opened_at = Time.current

          log_circuit_breaker_tripped if config.enable_detailed_logging
        end

        def recent_error_window?
          return true unless @last_error_time
          Time.current - @last_error_time <= config.error_window_seconds
        end

        def update_circuit_breaker_state
          return unless @circuit_breaker_state == :open
          return unless @circuit_opened_at

          if Time.current - @circuit_opened_at >= config.circuit_recovery_timeout
            @circuit_breaker_state = :half_open
            @error_count = 0 # Reset error count for half-open state
          end
        end

        def calculate_average(data, field)
          values = data.map { |d| d[field] }.compact
          return 0.0 if values.empty?
          values.sum.to_f / values.length
        end

        def calculate_success_rate(data, field)
          values = data.map { |d| d[field] }.compact
          return 0.0 if values.empty?
          (values.count(true).to_f / values.length * 100).round(2)
        end

        # Logging methods (implement based on Rails logger or custom logging)

        def log_routing_decision(table_name, decision, context)
          Rails.logger.info "[MigrationFlags] Routing decision for #{table_name}: #{decision ? 'NEW' : 'LEGACY'} (context: #{context})"
        end

        def log_canary_decision(table_name, decision)
          Rails.logger.info "[MigrationFlags] Canary testing for #{table_name}: #{decision ? 'ENABLED' : 'DISABLED'}"
        end

        def log_error(error, context)
          Rails.logger.error "[MigrationFlags] New pipeline error: #{error.message} (context: #{context})"
        end

        def log_circuit_breaker_tripped
          Rails.logger.warn "[MigrationFlags] Circuit breaker TRIPPED - routing all traffic to legacy system"
        end

        def log_auto_rollback
          Rails.logger.warn "[MigrationFlags] Auto-rollback activated - forcing legacy system usage"
        end
      end
    end
  end
end
