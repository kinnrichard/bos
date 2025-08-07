# frozen_string_literal: true

require_relative "../type_mapper"
require_relative "../relationship_processor"
require_relative "../file_manager"
require_relative "../template_renderer"
require_relative "../default_value_converter"
require_relative "../polymorphic_model_analyzer"
require_relative "../generation_context"
require_relative "pipeline"
require_relative "../../../../zero_schema_generator/rails_schema_introspector"
require_relative "stages/schema_analysis_stage"
require_relative "stages/model_generation_stage"
require_relative "stages/typescript_generation_stage"
require_relative "stages/formatting_stage"

module Zero
  module Generators
    module Pipeline
      # GenerationPipeline orchestrates the complete model generation workflow
      # using constructor injection instead of a service registry.
      #
      # This is the main entry point for the simplified architecture following
      # Sandi Metz's principles: explicit dependencies, simple defaults, and
      # no magic service registration.
      #
      # @example Basic usage with defaults
      #   pipeline = GenerationPipeline.new(options: { output_dir: "models" })
      #   result = pipeline.execute
      #
      # @example Custom dependencies
      #   pipeline = GenerationPipeline.new(
      #     type_mapper: CustomTypeMapper.new,
      #     file_writer: FileWriter.new("custom/path"),
      #     options: options
      #   )
      #   result = pipeline.execute
      #
      class GenerationPipeline
        attr_reader :options

        # Initialize pipeline with explicit dependencies
        #
        # @param schema_introspector [Object] Schema introspector for database analysis
        # @param type_mapper [Object] Rails to TypeScript type mapping service
        # @param relationship_processor_factory [Proc] Factory for creating relationship processors
        # @param template_renderer [Object] ERB template rendering service
        # @param file_manager [Object] File writing and formatting service
        # @param default_value_converter [Object] Default value generation service
        # @param polymorphic_analyzer [Object] Polymorphic relationship analysis service
        # @param options [Hash] Generation options (output_dir, dry_run, etc.)
        def initialize(
          schema_introspector: nil,
          type_mapper: nil,
          relationship_processor_factory: nil,
          template_renderer: nil,
          file_manager: nil,
          default_value_converter: nil,
          polymorphic_analyzer: nil,
          options: {}
        )
          @options = options || {}

          # Use provided dependencies or create defaults
          @schema_introspector = schema_introspector || default_schema_introspector
          @type_mapper = type_mapper || default_type_mapper
          @relationship_processor_factory = relationship_processor_factory || default_relationship_processor_factory
          @template_renderer = template_renderer || default_template_renderer
          @file_manager = file_manager || default_file_manager
          @default_value_converter = default_value_converter || default_value_converter_instance
          @polymorphic_analyzer = polymorphic_analyzer || default_polymorphic_analyzer

          @statistics = initialize_statistics
        end

        # Execute the complete generation pipeline
        #
        # @param initial_context [GenerationContext] Optional initial context
        # @return [Hash] Generation results with comprehensive statistics
        def execute(initial_context = nil)
          execution_start_time = Time.current

          begin
            # Build pipeline with injected dependencies
            pipeline = build_pipeline

            # Create or use provided context
            context = initial_context || build_initial_context

            # Execute pipeline stages - first get schema
            schema_context = execute_schema_analysis(pipeline, context)

            # Check if we need to process multiple tables
            if @options[:table].nil? && schema_context.metadata[:full_schema]
              # Process all tables
              execute_all_tables(pipeline, schema_context, execution_start_time)
            else
              # Process single table
              result_context = pipeline.execute(context)
              compile_execution_results(result_context, execution_start_time)
            end

          rescue => e
            @statistics[:errors_encountered] += 1
            handle_execution_error(e, execution_start_time)
          end
        end

        # Generate models for a specific table (direct interface)
        #
        # @param table_name [String] Table name to generate models for
        # @return [Hash] Generation result for the table
        def generate_model_for_table(table_name)
          context = GenerationContext.new(
            table: { name: table_name, columns: [] },
            schema: {},
            options: @options.merge(table: table_name)
          )

          execute(context)
        end

        # Get current statistics
        #
        # @return [Hash] Pipeline execution statistics
        def statistics
          @statistics.dup
        end

        private

        # Build the processing pipeline with stages
        #
        # @return [Pipeline] Configured pipeline instance
        def build_pipeline
          # Create a shared service registry for all stages
          service_registry = build_service_registry

          stages = [
            Stages::SchemaAnalysisStage.new(service_registry),
            Stages::ModelGenerationStage.new(service_registry),
            Stages::TypeScriptGenerationStage.new(service_registry),
            Stages::FormattingStage.new(service_registry)
          ]

          Pipeline.new(stages: stages)
        end

        # Build a service registry that provides all needed services
        def build_service_registry
          pipeline = self

          Class.new do
            def initialize(pipeline)
              @pipeline = pipeline
            end

            def get_service(name)
              case name
              when :schema
                @pipeline.instance_variable_get(:@schema_introspector)
              when :type_mapper
                @pipeline.instance_variable_get(:@type_mapper)
              when :relationship_processor_factory, :relationship_processor
                # Both names map to the same factory
                @pipeline.instance_variable_get(:@relationship_processor_factory)
              when :template_renderer
                @pipeline.instance_variable_get(:@template_renderer)
              when :file_manager
                @pipeline.instance_variable_get(:@file_manager)
              when :default_value_converter
                @pipeline.instance_variable_get(:@default_value_converter)
              when :polymorphic_analyzer, :polymorphic_model_analyzer
                @pipeline.instance_variable_get(:@polymorphic_analyzer)
              when :formatting_service
                # FormattingStage expects a formatting service
                @pipeline.instance_variable_get(:@file_manager)
              when :shell
                # Return a simple shell object for output
                @pipeline.send(:create_simple_shell)
              else
                raise "Unknown service: #{name}"
              end
            end

            def options
              @pipeline.options
            end
          end.new(pipeline)
        end

        # Default dependency implementations

        def default_schema_introspector
          require_relative "../../../../zero_schema_generator/rails_schema_introspector"
          ZeroSchemaGenerator::RailsSchemaIntrospector.new
        end

        def default_type_mapper
          TypeMapper.new(
            custom_mappings: {},
            unknown_type_handler: "unknown"
          )
        end

        def default_relationship_processor_factory
          # Return a factory lambda that creates RelationshipProcessor instances
          ->(relationships, current_table_name) {
            RelationshipProcessor.new(relationships, current_table_name)
          }
        end

        def default_template_renderer
          # Templates are in lib/generators/zero/active_models/templates
          templates_dir = File.expand_path("../templates", File.dirname(__FILE__))
          TemplateRenderer.new(templates_dir)
        end

        def default_file_manager
          output_dir = @options[:output_dir] || "frontend/src/lib/models"
          shell = create_simple_shell

          FileManager.new(
            {
              dry_run: @options[:dry_run] || false,
              skip_prettier: @options[:skip_prettier] || false,
              force: @options[:force] || false
            },
            shell,
            output_dir
          )
        end

        def default_value_converter_instance
          DefaultValueConverter.new
        end

        def default_polymorphic_analyzer
          Zero::ActiveModels::PolymorphicModelAnalyzer.new
        rescue NameError
          # Fallback if class doesn't exist
          Class.new do
            def polymorphic_associations_for_table(_table_name)
              []
            end
          end.new
        end

        # Utility methods

        def build_initial_context
          table_name = @options[:table]

          # Use a placeholder table structure for all-tables processing
          # The SchemaAnalysisStage will populate with actual table data
          table_data = if table_name
            { name: table_name, columns: [] }
          else
            { name: "*", columns: [] }  # "*" indicates all tables
          end

          GenerationContext.new(
            table: table_data,
            schema: {},
            options: @options
          )
        end

        def initialize_statistics
          {
            execution_time: 0.0,
            tables_processed: 0,
            models_generated: 0,
            files_created: 0,
            errors_encountered: 0,
            pipeline_stages: 0
          }
        end

        def compile_execution_results(result_context, start_time)
          @statistics[:execution_time] = (Time.current - start_time).round(4)

          # Extract results from context
          generated_models = result_context.metadata[:generated_models] || []
          generated_files = result_context.metadata[:generated_files] || []
          errors = result_context.metadata[:errors] || []

          @statistics[:models_generated] = generated_models.length
          @statistics[:files_created] = generated_files.length

          {
            success: errors.empty?,
            generated_models: generated_models,
            generated_files: generated_files,
            errors: errors,
            statistics: @statistics,
            context: result_context
          }
        end

        def handle_execution_error(error, start_time)
          @statistics[:execution_time] = (Time.current - start_time).round(4)

          {
            success: false,
            generated_models: [],
            generated_files: [],
            errors: [ error.message ],
            statistics: @statistics,
            error_details: {
              message: error.message,
              backtrace: error.backtrace&.first(5)
            }
          }
        end

        def create_simple_shell
          # Create a simple shell-like object for file operations
          Class.new do
            def say_status(status, message, color = nil)
              puts "[#{status.to_s.upcase}] #{message}"
            end

            def say(message, color = nil)
              puts message
            end
          end.new
        end

        # Execute schema analysis stage only
        def execute_schema_analysis(pipeline, context)
          # Just run the schema analysis stage
          schema_stage = pipeline.stages.find { |s| s.is_a?(Stages::SchemaAnalysisStage) }
          return context unless schema_stage

          schema_stage.process(context)
        end

        # Execute pipeline for all tables
        def execute_all_tables(pipeline, schema_context, start_time)
          full_schema = schema_context.metadata[:full_schema]
          all_generated_models = []
          all_generated_files = []
          all_errors = []

          # Get the non-schema stages for processing individual tables
          processing_stages = pipeline.stages.reject { |s| s.is_a?(Stages::SchemaAnalysisStage) }
          processing_pipeline = Pipeline.new(stages: processing_stages)

          # Process each table
          full_schema[:tables].each do |table_data|
            begin
              # Find relationships for this table
              table_relationships = full_schema[:relationships].find { |r| r[:table] == table_data[:name] } || {
                belongs_to: [],
                has_many: [],
                has_one: [],
                polymorphic: []
              }

              # Create context for this specific table
              table_context = GenerationContext.new(
                table: table_data,
                schema: full_schema,
                options: @options.merge(table: table_data[:name])
              ).with_metadata(
                relationships: table_relationships,
                patterns: full_schema[:patterns][table_data[:name]] || {},
                full_schema: full_schema
              )

              # Process this table through remaining stages
              result = processing_pipeline.execute(table_context)

              # Collect results
              if result.metadata[:generated_content]
                model_info = {
                  table_name: table_data[:name],
                  class_name: table_data[:name].singularize.camelize,
                  kebab_name: table_data[:name].dasherize,
                  content: result.metadata[:generated_content]
                }
                all_generated_models << model_info

                # Track generated files - check both possible metadata keys
                if result.metadata[:generated_files]
                  all_generated_files.concat(result.metadata[:generated_files])
                elsif result.metadata[:typescript_files]
                  all_generated_files.concat(result.metadata[:typescript_files])
                end
              end

            rescue => e
              all_errors << "Table #{table_data[:name]}: #{e.message}"
            end
          end

          # Update statistics
          @statistics[:execution_time] = (Time.current - start_time).round(4)
          @statistics[:models_generated] = all_generated_models.length
          @statistics[:files_created] = all_generated_files.length

          {
            success: all_errors.empty?,
            generated_models: all_generated_models,
            generated_files: all_generated_files,
            errors: all_errors,
            statistics: @statistics
          }
        end
      end
    end
  end
end
