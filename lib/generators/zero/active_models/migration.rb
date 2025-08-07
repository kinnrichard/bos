# frozen_string_literal: true

# Migration module for Strangler Fig pattern implementation
#
# This module provides a complete Strangler Fig migration system for gradually
# transitioning from the legacy GenerationCoordinator to the new Pipeline architecture.
# It supports zero-downtime deployment, canary testing, automatic rollback, and
# comprehensive monitoring.
#
# Key Components:
# - MigrationAdapter: Routes requests between old and new systems
# - MigrationFeatureFlags: Controls migration behavior with feature flags
# - OutputComparator: Performs deep comparison of system outputs for canary testing
# - RollbackManager: Handles emergency rollback scenarios
#
# @example Basic usage
#   require 'generators/zero/active_models/migration'
#
#   # Initialize with feature flags
#   adapter = Zero::Generators::Migration::MigrationAdapter.new(options, shell)
#   result = adapter.execute
#
# @example Environment-based configuration
#   # Configure from environment variables
#   Zero::Generators::Migration::MigrationFeatureFlags.configure_from_env
#
#   # Use global instance
#   adapter = Zero::Generators::Migration::MigrationAdapter.new(options, shell)
#   result = adapter.execute
#
# @example Manual rollback
#   rollback_manager = Zero::Generators::Migration::RollbackManager.new
#   rollback_manager.execute_emergency_rollback!(
#     reason: "Critical production issue detected",
#     operator: "oncall-engineer"
#   )
#

require_relative "migration/feature_flags"
require_relative "migration/adapter"
require_relative "migration/output_comparator"
require_relative "migration/rollback_manager"

module Zero
  module Generators
    module Migration
      # Migration system version for compatibility tracking
      VERSION = "1.0.0"

      # Configuration defaults for the migration system
      DEFAULT_MIGRATION_CONFIG = {
        # Feature flag defaults
        new_pipeline_percentage: 0,
        enable_canary_testing: false,
        circuit_breaker_enabled: true,
        fallback_to_legacy_on_error: true,

        # Performance and monitoring
        track_performance_metrics: true,
        enable_detailed_logging: false,
        canary_timeout_seconds: 30,

        # Rollback behavior
        auto_rollback_enabled: false,
        error_threshold: 5,
        error_window_seconds: 300
      }.freeze

      class << self
        # Create a fully configured migration adapter
        #
        # @param options [Hash] Generator options
        # @param shell [Thor::Shell] Shell instance for progress reporting
        # @param migration_config [Hash] Migration-specific configuration
        # @return [MigrationAdapter] Configured migration adapter
        def create_adapter(options, shell = nil, migration_config: {})
          # Configure feature flags
          feature_flags = MigrationFeatureFlags.new(
            DEFAULT_MIGRATION_CONFIG.merge(migration_config)
          )

          # Create rollback manager
          rollback_manager = RollbackManager.new(feature_flags: feature_flags)

          # Create and return adapter
          MigrationAdapter.new(
            options,
            shell,
            feature_flags: feature_flags
          )
        end

        # Configure migration system from environment variables
        #
        # This method sets up the global feature flags instance based on
        # environment variables, making it ready for use across the application.
        #
        # Environment variables:
        # - MIGRATION_NEW_PIPELINE_PCT: Percentage of requests to route to new pipeline
        # - MIGRATION_ENABLE_CANARY: Enable canary testing (true/false)
        # - MIGRATION_CIRCUIT_BREAKER: Enable circuit breaker (true/false)
        # - MIGRATION_DETAILED_LOGGING: Enable detailed logging (true/false)
        # - MIGRATION_CANARY_SAMPLE_PCT: Percentage of requests for canary testing
        # - MIGRATION_AUTO_ROLLBACK: Enable automatic rollback (true/false)
        # - MIGRATION_NEW_PIPELINE_TABLES: Comma-separated list of tables to force new pipeline
        # - MIGRATION_MANUAL_OVERRIDE: Manual override (legacy/new)
        #
        def configure_from_environment
          MigrationFeatureFlags.configure_from_env
        end

        # Get current migration status across all components
        #
        # @return [Hash] Comprehensive migration status
        def current_status
          feature_flags = MigrationFeatureFlags.instance
          rollback_manager = RollbackManager.new(feature_flags: feature_flags)

          {
            migration_version: VERSION,
            feature_flags: feature_flags.configuration_summary,
            circuit_breaker_state: feature_flags.circuit_breaker_state,
            rollback_status: rollback_manager.current_status,
            performance_metrics: feature_flags.performance_statistics,
            system_health: assess_system_health(feature_flags, rollback_manager)
          }
        end

        # Perform system health check across migration components
        #
        # @return [Hash] Health check results
        def health_check
          health_results = {
            overall_health: :unknown,
            component_health: {},
            recommendations: [],
            last_check: Time.current
          }

          begin
            # Check feature flags
            feature_flags = MigrationFeatureFlags.instance
            health_results[:component_health][:feature_flags] = check_feature_flags_health(feature_flags)

            # Check rollback manager
            rollback_manager = RollbackManager.new(feature_flags: feature_flags)
            health_results[:component_health][:rollback_manager] = check_rollback_manager_health(rollback_manager)

            # Determine overall health
            component_healths = health_results[:component_health].values
            if component_healths.all? { |health| health[:status] == :healthy }
              health_results[:overall_health] = :healthy
            elsif component_healths.any? { |health| health[:status] == :critical }
              health_results[:overall_health] = :critical
            else
              health_results[:overall_health] = :degraded
            end

            # Generate recommendations
            health_results[:recommendations] = generate_health_recommendations(health_results)

          rescue => e
            health_results[:overall_health] = :critical
            health_results[:error] = e.message
            health_results[:recommendations] = [ "Immediate investigation required due to health check failure" ]
          end

          health_results
        end

        # Execute emergency migration rollback
        #
        # @param reason [String] Reason for emergency rollback
        # @param operator [String] Person/system initiating rollback
        # @return [Hash] Rollback execution results
        def emergency_rollback!(reason:, operator: nil)
          feature_flags = MigrationFeatureFlags.instance
          rollback_manager = RollbackManager.new(feature_flags: feature_flags)

          rollback_manager.execute_emergency_rollback!(
            reason: reason,
            operator: operator
          )
        end

        # Get migration statistics and metrics
        #
        # @return [Hash] Migration statistics
        def statistics
          feature_flags = MigrationFeatureFlags.instance
          rollback_manager = RollbackManager.new(feature_flags: feature_flags)

          {
            performance_metrics: feature_flags.performance_statistics,
            rollback_history: rollback_manager.rollback_history(limit: 20),
            feature_flag_state: feature_flags.configuration_summary,
            circuit_breaker_metrics: {
              state: feature_flags.circuit_breaker_state
              # Additional circuit breaker metrics would be added here
            }
          }
        end

        # Create a canary test comparator with default configuration
        #
        # @param comparison_config [Hash] Comparator configuration
        # @return [OutputComparator] Configured output comparator
        def create_comparator(comparison_config: {})
          OutputComparator.new(comparison_config)
        end

        # Migration system version
        #
        # @return [String] Current migration system version
        def version
          VERSION
        end

        private

        def assess_system_health(feature_flags, rollback_manager)
          circuit_breaker_healthy = feature_flags.circuit_breaker_state != :open
          rollback_state_healthy = rollback_manager.current_status[:state] == :active

          if circuit_breaker_healthy && rollback_state_healthy
            :healthy
          elsif !circuit_breaker_healthy
            :circuit_breaker_open
          elsif !rollback_state_healthy
            :rollback_active
          else
            :unknown
          end
        end

        def check_feature_flags_health(feature_flags)
          begin
            config = feature_flags.configuration_summary

            health_status = {
              status: :healthy,
              details: {},
              issues: []
            }

            # Check for potential issues
            if config[:circuit_breaker_state] == :open
              health_status[:status] = :degraded
              health_status[:issues] << "Circuit breaker is open"
            end

            if config[:error_count] && config[:error_count] > 10
              health_status[:status] = :degraded
              health_status[:issues] << "High error count: #{config[:error_count]}"
            end

            health_status[:details] = config
            health_status

          rescue => e
            {
              status: :critical,
              error: e.message,
              issues: [ "Feature flags health check failed" ]
            }
          end
        end

        def check_rollback_manager_health(rollback_manager)
          begin
            status = rollback_manager.current_status

            health_status = {
              status: :healthy,
              details: status,
              issues: []
            }

            # Check rollback state
            unless [ :active, :rolled_back ].include?(status[:state])
              health_status[:status] = :critical
              health_status[:issues] << "Rollback manager in problematic state: #{status[:state]}"
            end

            # Check rollback frequency
            if status[:rollback_count_today] > 5
              health_status[:status] = :degraded
              health_status[:issues] << "High rollback frequency today: #{status[:rollback_count_today]}"
            end

            health_status

          rescue => e
            {
              status: :critical,
              error: e.message,
              issues: [ "Rollback manager health check failed" ]
            }
          end
        end

        def generate_health_recommendations(health_results)
          recommendations = []

          case health_results[:overall_health]
          when :critical
            recommendations << "Immediate investigation required"
            recommendations << "Consider emergency rollback if in production"
          when :degraded
            recommendations << "Monitor system closely"
            recommendations << "Review error logs and performance metrics"
          when :healthy
            recommendations << "System operating normally"
          end

          # Component-specific recommendations
          health_results[:component_health].each do |component, health|
            if health[:status] != :healthy && health[:issues]
              health[:issues].each do |issue|
                recommendations << "#{component.to_s.humanize}: #{issue}"
              end
            end
          end

          recommendations.uniq
        end
      end

      # Exception classes for migration system
      class MigrationSystemError < StandardError; end
      class ConfigurationError < MigrationSystemError; end
      class HealthCheckError < MigrationSystemError; end
    end
  end
end
