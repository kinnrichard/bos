# frozen_string_literal: true

require "rails/generators"
require_relative "generation_coordinator"
require_relative "migration"

module Zero
  module Generators
    # Updated ActiveModelsGenerator with Strangler Fig migration support
    #
    # This version of the generator integrates with the migration system to
    # gradually transition from the legacy GenerationCoordinator to the new
    # Pipeline architecture using the Strangler Fig pattern.
    #
    # The generator now uses MigrationAdapter which handles:
    # - Routing between legacy and new systems based on feature flags
    # - Canary testing for validation
    # - Circuit breaker protection with automatic fallback
    # - Rollback capabilities for emergency scenarios
    #
    # To enable migration, replace the original active_models_generator.rb
    # with this file and configure environment variables:
    #
    # export MIGRATION_NEW_PIPELINE_PCT=0        # Start with legacy (0%)
    # export MIGRATION_ENABLE_CANARY=false       # Enable when ready for testing
    # export MIGRATION_CIRCUIT_BREAKER=true      # Enable protection
    #
    class ActiveModelsGenerator < Rails::Generators::Base
      desc "Generate TypeScript ReactiveRecord and ActiveRecord models based on our Rails models (with migration support)"

      source_root File.expand_path("templates", __dir__)

      class_option :dry_run, type: :boolean, default: false,
                   desc: "Show what would be generated without creating files"
      class_option :force, type: :boolean, default: false,
                   desc: "Force generation even if conflicts are detected"
      class_option :table, type: :string,
                   desc: "Generate models for specific table only"
      class_option :exclude_tables, type: :array, default: [],
                   desc: "Tables to exclude from generation"
      class_option :output_dir, type: :string,
                   default: "frontend/src/lib/models",
                   desc: "Custom output directory"
      class_option :skip_prettier, type: :boolean, default: false,
                   desc: "Skip Prettier formatting of generated TypeScript files"
      class_option :verbose, type: :boolean, default: false,
                   desc: "Show detailed output including migration metrics"

      # Migration-specific options (optional, can also be set via environment)
      class_option :migration_percentage, type: :numeric,
                   desc: "Override migration percentage for this execution (0-100)"
      class_option :force_system, type: :string,
                   desc: "Force specific system: 'legacy' or 'new' (bypasses normal routing)"
      class_option :disable_canary, type: :boolean, default: false,
                   desc: "Disable canary testing for this execution"

      def generate_active_models
        say "🚀 Starting ActiveModels TypeScript generation...", :cyan
        say "📊 Rails version: #{Rails.version}", :green
        say "💎 Ruby version: #{RUBY_VERSION}", :green
        say "✅ Using new pipeline (100%)", :yellow

        configure_migration_system

        begin
          # Use MigrationAdapter instead of direct GenerationCoordinator
          adapter = create_migration_adapter

          # Execute generation through migration system
          result = execute_with_migration_adapter(adapter)

          # Report results
          report_generation_results(result)

          # Check for migration-specific information
          report_migration_information(result)

        rescue => e
          handle_generation_error(e)
          raise
        end
      end

      private

      # Configure migration system from environment and options
      def configure_migration_system
        # Load configuration from environment
        Migration.configure_from_environment

        # Apply command-line option overrides
        apply_option_overrides if has_migration_overrides?

        # Validate system health
        validate_migration_system_health
      end

      # Create migration adapter with current options and shell
      def create_migration_adapter
        # Build migration-specific configuration from options
        migration_config = build_migration_config

        Migration.create_adapter(
          options.to_h.symbolize_keys,
          shell,
          migration_config: migration_config
        )
      end

      # Execute generation through migration adapter with error handling
      def execute_with_migration_adapter(adapter)
        if options[:force_system]
          execute_forced_system(adapter)
        else
          adapter.execute
        end
      end

      # Execute with forced system selection
      def execute_forced_system(adapter)
        case options[:force_system].downcase
        when "legacy"
          shell.say "🔄 Forcing legacy system execution", :yellow
          adapter.force_execute_system(:legacy)
        when "new"
          shell.say "🔄 Forcing new system execution", :yellow
          adapter.force_execute_system(:new, bypass_circuit_breaker: true)
        else
          shell.say "❌ Invalid --force-system option: #{options[:force_system]}", :red
          shell.say "   Valid options: 'legacy' or 'new'", :red
          exit 1
        end
      end

      # Report generation results to user
      def report_generation_results(result)
        if result[:success]
          models_count = result[:generated_models]&.length || 0
          files_count = result[:generated_files]&.length || 0
          execution_time = result[:execution_time] || 0

          shell.say "✅ Generated #{models_count} models (#{files_count} files) in #{execution_time}s", :green
        else
          shell.say "❌ Generation failed:", :red
          result[:errors]&.each { |error| shell.say "  - #{error}", :red }
        end
      end

      # Report migration system information
      def report_migration_information(result)
        return unless result[:migration_metadata]

        metadata = result[:migration_metadata]

        # Report which system was used
        system_used = metadata[:used_new_pipeline] ? "new pipeline" : "legacy system"
        shell.say "🔧 Executed via: #{system_used}", :blue

        # Report canary testing information
        if metadata[:was_canary_test]
          shell.say "🧪 Canary test executed (both systems compared)", :blue
        end

        # Report circuit breaker status if relevant
        if metadata[:circuit_breaker_state] == :open
          shell.say "⚠️  Circuit breaker is open - automatically using legacy system", :yellow
        end

        # Show migration percentage if in migration mode
        if metadata[:feature_flag_config]
          percentage = metadata[:feature_flag_config][:new_pipeline_percentage] || 0
          if percentage > 0 && percentage < 100
            shell.say "📊 Migration status: #{percentage}% traffic to new pipeline", :blue
          end
        end
      end

      # Handle generation errors with migration context
      def handle_generation_error(error)
        shell.say "❌ Generation failed with error: #{error.message}", :red

        # Provide migration-specific debugging information
        begin
          migration_status = Migration.current_status

          if migration_status[:circuit_breaker_state] == :open
            shell.say "🔧 Circuit breaker is open - this may indicate new system issues", :yellow
          end

          if migration_status[:rollback_status][:is_rolled_back]
            shell.say "🔧 System is currently in rollback state", :yellow
          end

        rescue => status_error
          shell.say "⚠️  Could not retrieve migration status: #{status_error.message}", :yellow
        end
      end

      # Validate migration system health before proceeding
      def validate_migration_system_health
        return unless should_validate_health?

        begin
          health_result = Migration.health_check

          unless health_result[:overall_health] == :healthy
            shell.say "⚠️  Migration system health: #{health_result[:overall_health]}", :yellow

            if health_result[:overall_health] == :critical
              shell.say "❌ Critical migration system issues detected:", :red
              health_result[:recommendations]&.each do |rec|
                shell.say "   - #{rec}", :red
              end

              shell.say "🔧 Proceeding with legacy system fallback", :yellow
            end
          end

        rescue => health_error
          shell.say "⚠️  Could not check migration system health: #{health_error.message}", :yellow
        end
      end

      # Build migration configuration from command line options
      def build_migration_config
        # GREENFIELD: Default to 100% new pipeline
        config = {
          new_pipeline_percentage: 100,        # Full new pipeline
          enable_canary_testing: false,        # No need to validate when 100% new
          circuit_breaker_enabled: true,       # Keep safety net
          fallback_to_legacy_on_error: true,   # Auto-fallback on errors
          track_performance_metrics: true,
          enable_detailed_logging: options[:verbose] || false,
          auto_rollback_enabled: false         # Manual control
        }

        # Allow overrides
        if options[:migration_percentage]
          config[:new_pipeline_percentage] = options[:migration_percentage].to_i
        end

        if options[:disable_canary]
          config[:enable_canary_testing] = false
        end

        config
      end

      # Apply command-line overrides to migration system
      def apply_option_overrides
        flags = Migration::MigrationFeatureFlags.instance

        if options[:migration_percentage]
          percentage = options[:migration_percentage].to_i
          if percentage >= 0 && percentage <= 100
            flags.update_config(new_pipeline_percentage: percentage)
            shell.say "🔧 Override: Using #{percentage}% new pipeline for this execution", :blue
          else
            shell.say "❌ Invalid migration percentage: #{percentage} (must be 0-100)", :red
            exit 1
          end
        end

        if options[:disable_canary]
          flags.update_config(enable_canary_testing: false)
          shell.say "🔧 Override: Canary testing disabled for this execution", :blue
        end
      end

      # Check if migration overrides are provided
      def has_migration_overrides?
        options[:migration_percentage] || options[:disable_canary] || options[:force_system]
      end

      # Determine if health validation should be performed
      def should_validate_health?
        # Always validate in production-like environments
        return true if Rails.env.production?

        # Validate if migration percentage > 0 (active migration)
        begin
          status = Migration.current_status
          (status[:feature_flags][:new_pipeline_percentage] || 0) > 0
        rescue
          false # Skip validation if status check fails
        end
      end

      # Override Thor's default behavior for non-interactive mode
      def file_collision(destination)
        options[:force] ? :force : super
      end

      # Add migration system diagnostics to help output
      def self.help(shell, subcommand = false)
        super

        shell.say "\nMigration System Status:"

        begin
          status = Migration.current_status
          shell.say "  Current migration: #{status[:feature_flags][:new_pipeline_percentage]}% new pipeline"
          shell.say "  Circuit breaker: #{status[:circuit_breaker_state]}"
          shell.say "  System health: #{status[:system_health]}"
        rescue => e
          shell.say "  Status unavailable: #{e.message}"
        end

        shell.say "\nMigration Options:"
        shell.say "  --migration-percentage N     Override migration percentage (0-100)"
        shell.say "  --force-system SYSTEM        Force 'legacy' or 'new' system"
        shell.say "  --disable-canary             Disable canary testing"
        shell.say "\nEnvironment Variables:"
        shell.say "  MIGRATION_NEW_PIPELINE_PCT   Migration percentage (0-100)"
        shell.say "  MIGRATION_ENABLE_CANARY      Enable canary testing (true/false)"
        shell.say "  MIGRATION_CIRCUIT_BREAKER    Enable circuit breaker (true/false)"
      end
    end
  end
end
