# frozen_string_literal: true

require "pathname"
require_relative "pipeline/generation_pipeline"
require_relative "generation_context"

module Zero
  module Generators
    # GenerationCoordinator using constructor injection (simplified from ServiceRegistry)
    #
    # This coordinator follows Sandi Metz's principles by using explicit dependencies
    # and delegating the heavy lifting to the GenerationPipeline. It focuses solely
    # on orchestration and user interface concerns.
    #
    # Key Responsibilities:
    # - Thor/Rails generator integration
    # - Progress reporting to shell
    # - Loggable model configuration generation
    # - Index file generation
    # - Results compilation for display
    #
    # @example Basic usage
    #   coordinator = GenerationCoordinator.new(options, shell)
    #   result = coordinator.execute
    #   puts "Generated #{result[:generated_models].count} models"
    #
    class GenerationCoordinator
      # Custom error types for better error handling
      class GenerationError < StandardError; end
      class PipelineError < GenerationError; end

      attr_reader :options, :shell, :generation_pipeline, :statistics

      # Initialize with explicit dependencies
      #
      # @param options [Hash] Generator options (dry_run, force, table, etc.)
      # @param shell [Thor::Shell] Shell instance for progress reporting
      # @param generation_pipeline [Pipeline::GenerationPipeline] Optional pipeline for testing
      def initialize(options, shell = nil, generation_pipeline = nil)
        @options = options || {}
        @shell = shell
        @statistics = {
          execution_time: 0.0,
          models_generated: 0,
          files_created: 0,
          errors_encountered: 0
        }

        @generation_pipeline = generation_pipeline || default_generation_pipeline
      end

      # Execute the complete model generation workflow
      #
      # @return [Hash] Generation results with statistics
      # @raise [GenerationError] If generation fails
      def execute
        execution_start_time = Time.current

        begin
          # Phase 1: Setup
          report_execution_start
          ensure_rails_models_loaded

          # Phase 2: Execute pipeline (does the real work)
          pipeline_result = @generation_pipeline.execute

          # Phase 3: Post-processing
          unless options[:dry_run]
            generate_loggable_configuration_file(pipeline_result)
            generate_index_files(pipeline_result) if pipeline_result[:generated_models]&.any?
          end

          # Phase 4: Results compilation
          compile_final_results(pipeline_result, execution_start_time)

        rescue => e
          @statistics[:errors_encountered] += 1
          handle_execution_error(e, execution_start_time)
        end
      end

      # Alternative interface for direct model generation (primarily for testing)
      #
      # @param tables [Array<String>] Table names to generate models for
      # @param output_directory [String] Directory to output generated files
      # @return [Hash] Generation results
      def generate_models(tables: [], output_directory: nil)
        execution_start_time = Time.current

        begin
          @options[:table] = tables.first if tables.length == 1
          @options[:output_dir] = output_directory if output_directory
          @shell ||= create_mock_shell

          # Create custom pipeline with updated options
          custom_pipeline = Pipeline::GenerationPipeline.new(options: @options)
          pipeline_result = custom_pipeline.execute

          {
            success: pipeline_result[:success],
            generated_files: pipeline_result[:generated_files] || [],
            generated_models: pipeline_result[:generated_models] || [],
            errors: pipeline_result[:errors] || [],
            execution_time: (Time.current - execution_start_time).round(4)
          }

        rescue => e
          @statistics[:errors_encountered] += 1
          {
            success: false,
            generated_files: [],
            generated_models: [],
            errors: [ e.message ],
            execution_time: (Time.current - execution_start_time).round(4)
          }
        end
      end

      # Get pipeline statistics for monitoring
      #
      # @return [Hash] Current pipeline statistics
      def collect_service_statistics
        {
          pipeline_stats: @generation_pipeline.statistics,
          coordinator_stats: @statistics
        }
      end

      private

      # Create default generation pipeline with current options
      #
      # @return [Pipeline::GenerationPipeline] Configured pipeline
      def default_generation_pipeline
        Pipeline::GenerationPipeline.new(options: @options)
      end

      # Ensure Rails models are loaded for proper introspection
      def ensure_rails_models_loaded
        # In Rails 8.0 with Zeitwerk, we only need to eager load the app/models directory
        if defined?(Rails) && !Rails.application.config.eager_load
          Rails.autoloaders.main.eager_load_dir(Rails.root.join("app/models"))
        end
      end

      # Report execution start
      def report_execution_start
        if options[:dry_run]
          shell&.say "🔍 DRY RUN MODE - No files will be created", :yellow
        end
      end

      # Compile final results with statistics
      def compile_final_results(pipeline_result, start_time)
        @statistics[:execution_time] = (Time.current - start_time).round(4)
        @statistics[:models_generated] = pipeline_result[:generated_models]&.length || 0
        @statistics[:files_created] = pipeline_result[:generated_files]&.length || 0

        final_result = {
          success: pipeline_result[:success],
          generated_models: pipeline_result[:generated_models] || [],
          generated_files: pipeline_result[:generated_files] || [],
          errors: pipeline_result[:errors] || [],
          statistics: @statistics,
          execution_time: @statistics[:execution_time]
        }

        # Report results to user
        report_generation_results(final_result)
        display_statistics(final_result)

        final_result
      end

      # Handle execution errors
      def handle_execution_error(error, start_time)
        @statistics[:execution_time] = (Time.current - start_time).round(4)
        error_message = "❌ Generation failed: #{error.message}"
        shell&.say error_message, :red

        if defined?(Rails) && Rails.env.development?
          shell&.say error.backtrace.first(5).join("\n"), :red
        end

        {
          success: false,
          generated_models: [],
          generated_files: [],
          errors: [ error.message ],
          statistics: @statistics,
          execution_time: @statistics[:execution_time]
        }
      end

      # Generate Loggable configuration file
      def generate_loggable_configuration_file(pipeline_result)
        config_content = generate_loggable_config
        file_path = File.join(@options[:output_dir] || "frontend/src/lib/models", "generated-loggable-config.ts")

        # Ensure directory exists
        FileUtils.mkdir_p(File.dirname(file_path))
        File.write(file_path, config_content)

        @statistics[:files_created] += 1
      rescue => e
        shell&.say "❌ Failed to generate Loggable config: #{e.message}", :red
        @statistics[:errors_encountered] += 1
      end

      # Generate index files for model imports
      def generate_index_files(pipeline_result)
        return unless pipeline_result[:generated_models]&.any?

        zero_index_content = generate_zero_index_content(pipeline_result[:generated_models])
        file_path = File.join(@options[:output_dir] || "frontend/src/lib/models", "../zero/index.ts")

        # Ensure directory exists
        FileUtils.mkdir_p(File.dirname(file_path))
        File.write(file_path, zero_index_content)

        @statistics[:files_created] += 1
      rescue => e
        shell&.say "❌ Failed to generate index files: #{e.message}", :red
        @statistics[:errors_encountered] += 1
      end

      # Reporting methods

      def report_generation_results(result)
        if options[:dry_run]
          shell&.say "\n🔍 DRY RUN COMPLETED", :yellow
          shell&.say "Run without --dry-run to actually generate files", :yellow
        end

        if result[:errors]&.any?
          shell&.say "\n❌ Errors encountered:", :red
          result[:errors].each { |error| shell&.say "  - #{error}", :red }
        end
      end

      def display_statistics(result)
        return if options[:dry_run]

        if result[:success]
          shell&.say "\n✅ ReactiveRecord successfully generated #{@statistics[:models_generated]} TypeScript models (#{@statistics[:files_created]} files) in #{@statistics[:execution_time]}s", :green
        else
          shell&.say "\n⚠️ ReactiveRecord completed with errors in #{@statistics[:execution_time]}s", :yellow
        end
      end

      # Mock shell for testing
      def create_mock_shell
        Class.new do
          def say(message, color = nil); end
          def say_status(status, message, color = nil); end
        end.new
      end

      # Loggable configuration generation

      def generate_loggable_config
        loggable_models = detect_loggable_models
        sorted_models = loggable_models.sort_by { |table_name, _| table_name }

        model_entries = sorted_models.map do |table_name, config|
          "  '#{table_name}': { modelName: '#{config[:modelName]}', includesLoggable: true }"
        end.join(",\n")

        <<~TYPESCRIPT
          // 🤖 AUTO-GENERATED LOGGABLE CONFIGURATION
          //
          // ⚠️  DO NOT EDIT THIS FILE DIRECTLY
          // This file is automatically generated by Rails generator
          // Run: rails generate zero:active_models

          export const LOGGABLE_MODELS = {
          #{model_entries}
          } as const;

          export type LoggableModelName = keyof typeof LOGGABLE_MODELS;

          export function isLoggableModel(tableName: string): tableName is LoggableModelName {
            return tableName in LOGGABLE_MODELS;
          }

          export function getLoggableModelInfo(tableName: LoggableModelName) {
            return LOGGABLE_MODELS[tableName];
          }
        TYPESCRIPT
      end

      def detect_loggable_models
        loggable_models = {}

        if defined?(ApplicationRecord)
          ApplicationRecord.descendants.each do |model|
            next unless model.respond_to?(:included_modules)
            next unless defined?(Loggable) && model.included_modules.include?(Loggable)

            loggable_models[model.table_name] = {
              modelName: model.name,
              includesLoggable: true
            }
          end
        end

        loggable_models
      rescue => e
        shell&.say "❌ Error detecting Loggable models: #{e.message}", :red
        {}
      end

      def generate_zero_index_content(generated_models)
        model_import_examples = generated_models.first(3).map do |model|
          class_name = model[:class_name] || model[:table_name]&.singularize&.camelize
          kebab_name = model[:kebab_name] || model[:table_name]&.dasherize
          "// import { #{class_name}, Reactive#{class_name} } from '$lib/models/#{kebab_name}';"
        end.join("\n")

        <<~TYPESCRIPT
          // Zero - Complete export file
          // All Zero client functionality and Epic-008 model integration
          //
          // Auto-generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
          //
          // ⚠️  Do not edit this file manually - it will be regenerated
          // To regenerate: rails generate zero:active_models

          // Zero client initialization and management
          export { initZero, getZero, getZeroAsync, getZeroState, closeZero, reinitializeZero } from './zero-client';

          // Zero schema types
          export { schema, type ZeroClient } from './generated-schema';

          // Epic-008 models are now managed in /lib/models/ instead of legacy .generated files
          // Use the Epic-008 models directly for reliable, reactive data access:
          //
          #{model_import_examples}
          //
          // Legacy .generated.ts files have been removed as part of Epic-008 cleanup.

          // Re-export Zero library types for convenience
          export type { Zero } from '@rocicorp/zero';
        TYPESCRIPT
      end
    end
  end
end
