# frozen_string_literal: true

require "pathname"
require_relative "../../../zero_schema_generator/rails_schema_introspector"
require_relative "relationship_processor"
require_relative "type_mapper"
require_relative "file_manager"
require_relative "template_renderer"
require_relative "service_registry"

module Zero
  module Generators
    # GenerationCoordinator orchestrates the complete model generation workflow
    #
    # This coordinator implements the separation of concerns pattern by orchestrating
    # all services required for TypeScript model generation while keeping the
    # generator itself minimal and focused on Thor integration.
    #
    # Key Responsibilities:
    # - Schema extraction and filtering coordination
    # - Service initialization and dependency management
    # - Generation workflow orchestration across multiple tables
    # - Error handling and progress reporting coordination
    # - Results compilation and statistics aggregation
    # - Cross-service communication and data flow management
    #
    # Services Coordinated:
    # - RailsSchemaIntrospector: Schema data extraction
    # - RelationshipProcessor: Rails relationship processing
    # - TypeMapper: Rails to TypeScript type mapping
    # - TemplateRenderer: ERB template rendering with caching
    # - FileManager: File operations with semantic comparison
    #
    # @example Basic usage
    #   coordinator = GenerationCoordinator.new(options, shell)
    #   result = coordinator.execute
    #   puts "Generated #{result[:generated_models].count} models"
    #
    # @example Error handling
    #   begin
    #     coordinator.execute
    #   rescue GenerationCoordinator::GenerationError => e
    #     puts "Generation failed: #{e.message}"
    #   end
    #
    class GenerationCoordinator
      # Custom error types for better error handling
      class GenerationError < StandardError; end
      class SchemaExtractionError < GenerationError; end
      class ServiceInitializationError < GenerationError; end
      class ModelGenerationError < GenerationError; end

      attr_reader :options, :shell, :service_registry, :statistics

      # Initialize coordinator with generator options and shell
      #
      # @param options [Hash] Generator options (dry_run, force, table, etc.)
      # @param shell [Thor::Shell] Shell instance for progress reporting
      # @param service_registry [ServiceRegistry] Optional pre-initialized service registry for testing
      def initialize(options, shell = nil, service_registry = nil)
        @options = options || {}
        @shell = shell
        @statistics = {
          execution_time: 0.0,
          tables_processed: 0,
          models_generated: 0,
          files_created: 0,
          errors_encountered: 0,
          services_initialized: 0
        }

        if service_registry
          @service_registry = service_registry
          @statistics[:services_initialized] = @service_registry.initialized_services.count
        else
          initialize_service_registry
        end
      end

      # Execute the complete model generation workflow
      #
      # This is the main orchestration method that coordinates all services
      # to generate TypeScript models from Rails schema data.
      #
      # @return [Hash] Generation results with detailed statistics
      # @raise [GenerationError] If any critical step fails
      #
      # Workflow:
      # 1. Progress reporting and setup
      # 2. Directory structure creation
      # 3. Schema extraction and filtering
      # 4. Model generation for each table
      # 5. Index file generation
      # 6. Results compilation and statistics
      #
      def execute
        execution_start_time = Time.current

        begin
          # Phase 1: Setup and Preparation
          report_execution_start
          setup_output_directories

          # Ensure Rails models are loaded for proper singularization
          # Load models manually to avoid eager_load issues
          if defined?(Rails)
            Dir[Rails.root.join("app/models/**/*.rb")].each do |file|
              begin
                require_dependency file
              rescue LoadError, NameError
                # Skip files that can't be loaded
              end
            end
          end

          # Phase 2: Schema Extraction and Filtering
          schema_data = extract_and_filter_schema

          # Phase 3: Model Generation
          generation_result = generate_models_for_all_tables(schema_data)

          # Phase 4: Generate Loggable Configuration
          generate_loggable_configuration_file unless options[:dry_run]

          # Phase 5: Index File Generation
          generate_index_files(generation_result) unless options[:dry_run]

          # Phase 6: Results Compilation
          compile_final_results(generation_result, execution_start_time)

        rescue => e
          @statistics[:errors_encountered] += 1
          handle_execution_error(e)
        end
      end

      # Generate models for a specific table (used by execute)
      #
      # @param table [Hash] Table schema information
      # @param schema_data [Hash] Complete schema data for relationships
      # @return [Hash] Model generation result for this table
      def generate_model_set(table, schema_data)
        # Find the Rails model for this table to get proper singular name
        rails_model = ApplicationRecord.descendants.find { |m| m.table_name == table[:name] }
        model_name = rails_model ? rails_model.name.underscore : table[:name].singularize
        class_name = model_name.camelize
        kebab_name = model_name.underscore.dasherize

        # Extract relationships and patterns for this table
        relationships = find_relationships_for_table(table[:name], schema_data[:relationships])
        patterns = schema_data[:patterns][table[:name]] || {}

        # Generate all three model files using service coordination
        result = {
          table_name: table[:name],
          model_name: model_name,
          class_name: class_name,
          kebab_name: kebab_name,
          files_generated: [],
          dry_run_files: []
        }

        if options[:dry_run]
          result[:dry_run_files] = [
            "types/#{kebab_name}-data.ts",
            "#{kebab_name}.ts",
            "reactive-#{kebab_name}.ts"
          ]

          report_dry_run_files(result[:dry_run_files])
        else
          # Get services from registry
          file_manager = service_registry.get_service(:file_manager)

          # Generate TypeScript data interface
          data_content = generate_data_interface(table, class_name, relationships)
          data_file_path = file_manager.write_with_formatting("types/#{kebab_name}-data.ts", data_content)
          result[:files_generated] << data_file_path

          # Generate ActiveRecord model
          active_content = generate_active_model(table, class_name, kebab_name, relationships, patterns)
          active_file_path = file_manager.write_with_formatting("#{kebab_name}.ts", active_content)
          result[:files_generated] << active_file_path

          # Generate ReactiveRecord model
          reactive_content = generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
          reactive_file_path = file_manager.write_with_formatting("reactive-#{kebab_name}.ts", reactive_content)
          result[:files_generated] << reactive_file_path

          @statistics[:files_created] += result[:files_generated].length
        end

        # Store model metadata for index generation
        result[:model_metadata] = {
          active_file: "#{kebab_name}.ts",
          reactive_file: "reactive-#{kebab_name}.ts",
          data_file: "types/#{kebab_name}-data.ts"
        }

        @statistics[:models_generated] += 1
        result

      rescue => e
        @statistics[:errors_encountered] += 1
        raise ModelGenerationError, "Failed to generate model for #{table[:name]}: #{e.message}"
      end

      # Alternative interface for direct model generation (primarily for testing)
      #
      # @param tables [Array<String>] Table names to generate models for
      # @param output_directory [String] Directory to output generated files
      # @return [Hash] Generation results with detailed statistics
      def generate_models(tables: [], output_directory: nil)
        execution_start_time = Time.current

        begin
          @options[:table] = tables.first if tables.length == 1
          @options[:output_dir] = output_directory if output_directory

          # Mock shell if not provided for testing
          @shell ||= create_mock_shell

          # Setup and execute generation
          setup_output_directories if output_directory
          schema_data = extract_and_filter_schema
          generation_result = generate_models_for_all_tables(schema_data)

          # Compile results
          {
            success: generation_result[:errors].empty?,
            generated_files: generation_result[:generated_files],
            generated_models: generation_result[:generated_models],
            errors: generation_result[:errors],
            execution_time: (Time.current - execution_start_time).round(4),
            service_statistics: collect_service_statistics
          }

        rescue => e
          @statistics[:errors_encountered] += 1
          {
            success: false,
            generated_files: [],
            generated_models: [],
            errors: [ e.message ],
            execution_time: (Time.current - execution_start_time).round(4),
            service_statistics: collect_service_statistics
          }
        end
      end

      # Collect comprehensive statistics from all services
      #
      # @return [Hash] Aggregated statistics from registry and individual services
      def collect_service_statistics
        {
          registry_stats: service_registry.statistics,
          service_stats: aggregate_service_statistics,
          generation_stats: @statistics
        }
      end

      # Ensure all required services are initialized
      #
      # @return [Hash] Initialization results
      def ensure_services_initialized
        result = service_registry.initialize_all_services
        @statistics[:services_initialized] = service_registry.initialized_services.count
        result
      end

      # Compile final execution results with comprehensive statistics
      #
      # @param generation_result [Hash] Results from model generation phase
      # @param start_time [Time] Execution start time for duration calculation
      # @return [Hash] Complete execution results with all statistics
      def compile_results(generation_result, start_time)
        @statistics[:execution_time] = (Time.current - start_time).round(4)

        # Aggregate service statistics
        service_stats = aggregate_service_statistics

        {
          # Generation Results
          generated_models: generation_result[:generated_models],
          generated_files: generation_result[:generated_files],
          skipped_tables: generation_result[:skipped_tables],
          errors: generation_result[:errors],

          # Execution Statistics
          execution_statistics: @statistics,

          # Service Performance
          service_performance: service_stats,

          # Summary Metrics
          summary: {
            total_models: generation_result[:generated_models].length,
            total_files: generation_result[:generated_files].length,
            total_errors: generation_result[:errors].length,
            execution_time: @statistics[:execution_time],
            success_rate: calculate_success_rate(generation_result)
          }
        }
      end

      private

      # Initialize service registry with optimized service management
      #
      # @raise [ServiceInitializationError] If service registry fails to initialize
      def initialize_service_registry
        begin
          # Initialize ServiceRegistry with environment-specific settings
          environment = Rails.env if defined?(Rails)
          @service_registry = ServiceRegistry.new(
            environment: environment,
            enable_caching: enable_caching_for_environment?,
            validate_services: true
          )

          # Pre-initialize configuration service and update with generator options
          config_service = @service_registry.get_service(:configuration)
          config_service.update_from_generator_options(@options)

          # Clear FileManager so it gets recreated with updated configuration
          @service_registry.clear_service_cache(:file_manager)

          # Initialize other services after configuration is updated
          @service_registry.get_service(:schema)
          @service_registry.get_service(:file_manager)
          @service_registry.get_service(:template_renderer)
          @service_registry.get_service(:type_mapper)

          @statistics[:services_initialized] = @service_registry.initialized_services.count

        rescue => e
          raise ServiceInitializationError, "Failed to initialize service registry: #{e.message}"
        end
      end

      # Report execution start with environment context
      def report_execution_start
        shell&.say "Generating ReactiveRecord models in TypeScript based on Rails models...", :green

        if options[:dry_run]
          shell&.say "🔍 DRY RUN MODE - No files will be created", :yellow
        end
      end

      # Setup output directory structure
      def setup_output_directories
        config_service = service_registry.get_service(:configuration)
        file_manager = service_registry.get_service(:file_manager)

        # Use the updated configuration values (already processed by update_from_generator_options)
        base_path = config_service.base_output_dir
        types_path = config_service.types_dir

        file_manager.ensure_directory_exists(base_path)
        file_manager.ensure_directory_exists(types_path)

        shell&.say "📁 Output directory: #{base_path}", :blue
      end

      # Extract schema and apply filtering logic
      #
      # @return [Hash] Filtered schema data ready for generation
      # @raise [SchemaExtractionError] If schema extraction fails
      def extract_and_filter_schema
        begin
          schema_service = service_registry.get_service(:schema)

          # Use SchemaService for optimized filtering
          exclude_tables = options[:exclude_tables] || []
          include_only = options[:table] ? [ options[:table] ] : nil

          schema_data = schema_service.extract_filtered_schema(
            exclude_tables: exclude_tables,
            include_only: include_only
          )

          if schema_data[:tables].empty?
            shell&.say "⚠️  No tables found for generation", :yellow
            return { tables: [], relationships: [], patterns: {} }
          end

          schema_data

        rescue => e
          raise SchemaExtractionError, "Failed to extract schema: #{e.message}"
        end
      end


      # Generate models for all filtered tables
      #
      # @param schema_data [Hash] Complete filtered schema data
      # @return [Hash] Aggregated generation results
      def generate_models_for_all_tables(schema_data)
        result = {
          generated_models: [],
          generated_files: [],
          skipped_tables: [],
          errors: []
        }

        schema_data[:tables].each do |table|
          begin
            model_result = generate_model_set(table, schema_data)

            # Aggregate results
            result[:generated_files].concat(model_result[:files_generated])
            result[:generated_models] << {
              table_name: model_result[:table_name],
              model_name: model_result[:model_name],
              class_name: model_result[:class_name],
              kebab_name: model_result[:kebab_name]
            }.merge(model_result[:model_metadata])

          rescue ModelGenerationError => e
            error_msg = e.message
            result[:errors] << error_msg
            result[:skipped_tables] << table[:name]
            shell&.say "    ❌ #{error_msg}", :red
          end
        end

        result
      end

      # Generate Loggable configuration file
      #
      # Creates a TypeScript configuration file that maps all models
      # that include the Loggable concern
      def generate_loggable_configuration_file
        shell&.say "📝 Generating Loggable configuration...", :blue

        config_content = generate_loggable_config
        file_manager = service_registry.get_service(:file_manager)

        # Force write the file to ensure it's updated
        config_path = File.join(file_manager.output_dir, "generated-loggable-config.ts")
        full_path = if Pathname.new(file_manager.output_dir).absolute?
                      config_path
        else
                      File.join(Rails.root, config_path)
        end

        # Ensure directory exists
        FileUtils.mkdir_p(File.dirname(full_path))

        # Write the file directly
        File.write(full_path, config_content)

        shell&.say "  ✅ Updated: #{full_path}", :green
        @statistics[:files_created] += 1
      rescue => e
        shell&.say "  ❌ Failed to generate Loggable config: #{e.message}", :red
        @statistics[:errors_encountered] += 1
      end

      # Generate index files for model imports
      #
      # @param generation_result [Hash] Results from model generation
      def generate_index_files(generation_result)
        return if generation_result[:generated_models].empty?

        # Generate Zero index file (commenting out main index to prevent ESLint issues)
        generate_zero_index_file(generation_result[:generated_models])
      end

      # Generate Zero index file with model integration examples
      #
      # @param generated_models [Array] List of generated model metadata
      def generate_zero_index_file(generated_models)
        # Build Epic-008 model import examples for documentation
        model_import_examples = generated_models.first(3).map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "// import { #{class_name}, Reactive#{class_name} } from '$lib/models/#{kebab_name}';"
        end.join("\n")

        zero_index_content = generate_zero_index_content(model_import_examples)
        file_manager = service_registry.get_service(:file_manager)
        file_manager.write_with_formatting("../zero/index.ts", zero_index_content)
      end

      # Process batch formatting for all collected files
      #
      # @return [Hash] Batch processing results
      def process_batch_formatting
        file_manager = service_registry.get_service(:file_manager)
        batch_result = file_manager.process_batch_formatting

        if batch_result[:processed] > 0
          shell&.say "\n🎨 Batch Formatting Results:", :blue
          shell&.say "  ✅ Formatted: #{batch_result[:processed]} files", :green
          shell&.say "  ⏱️  Time: #{batch_result[:time]}s", :cyan
          shell&.say "  💾 Memory used: #{batch_result[:memory_used_mb]}MB", :magenta

          if batch_result[:errors] > 0
            shell&.say "  ❌ Errors: #{batch_result[:errors]} files", :red
          end
        end

        batch_result
      end

      # Compile final results with comprehensive error handling
      def compile_final_results(generation_result, start_time)
        final_result = compile_results(generation_result, start_time)

        # Report results to user
        report_generation_results(final_result)
        display_comprehensive_statistics(final_result)

        final_result
      end

      # Handle execution errors with detailed reporting
      def handle_execution_error(error)
        error_message = "❌ Generation failed: #{error.message}"
        shell&.say error_message, :red

        if Rails.env.development?
          shell&.say error.backtrace.first(5).join("\n"), :red
        end

        raise GenerationError, error_message
      end

      # Service coordination methods for template generation

      def find_relationships_for_table(table_name, relationships)
        relationships.find { |rel| rel[:table] == table_name } || {
          belongs_to: [],
          has_many: [],
          has_one: [],
          polymorphic: []
        }
      end

      def generate_data_interface(table, class_name, relationships = {})
        context = build_data_interface_context(table, class_name, relationships)
        template_renderer = service_registry.get_service(:template_renderer)
        template_renderer.render("data_interface.ts.erb", context)
      end

      def generate_active_model(table, class_name, kebab_name, relationships, patterns)
        context = build_active_model_context(table, class_name, kebab_name, relationships, patterns)
        template_renderer = service_registry.get_service(:template_renderer)
        template_renderer.render("active_model.ts.erb", context)
      end

      def generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
        context = build_reactive_model_context(table, class_name, kebab_name, relationships, patterns)
        template_renderer = service_registry.get_service(:template_renderer)
        template_renderer.render("reactive_model.ts.erb", context)
      end

      # Template context builders (delegated from generator)

      def build_data_interface_context(table, class_name, relationships = {})
        # Store current table name for self-reference detection
        current_table_name = table[:name]

        # Generate database column properties
        type_mapper = service_registry.get_service(:type_mapper)
        column_properties = table[:columns].map do |column|
          ts_type = type_mapper.map_rails_type_to_typescript(column[:type], column)
          nullable = column[:null] ? "?" : ""
          comment = column[:comment] ? " // #{column[:comment]}" : ""

          "  #{column[:name]}#{nullable}: #{ts_type};#{comment}"
        end.join("\n")

        # Generate relationship properties using RelationshipProcessor
        processor_factory = service_registry.get_service(:relationship_processor)
        processor = processor_factory.call(relationships, current_table_name)
        relationship_data = processor.process_all

        # Combine all properties
        all_properties = [ column_properties, relationship_data[:properties] ].reject(&:empty?).join("\n")

        # Generate type exclusions
        base_exclusions = "'id', 'created_at', 'updated_at'"
        create_exclusions = "Omit<#{class_name}Data, #{base_exclusions}#{relationship_data[:exclusions]}>"
        update_exclusions = "Partial<Omit<#{class_name}Data, #{base_exclusions}#{relationship_data[:exclusions]}>>"

        {
          class_name: class_name,
          table: table,
          timestamp: Time.current.strftime("%Y-%m-%d %H:%M:%S UTC"),
          relationship_docs: relationship_data[:documentation],
          relationship_imports: relationship_data[:imports],
          all_properties: all_properties,
          create_exclusions: create_exclusions,
          update_exclusions: update_exclusions
        }
      end

      def build_active_model_context(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        # Generate relationship import section
        relationship_import = generate_relationship_import(relationships)
        relationship_import_section = relationship_import.empty? ? "" : "\n#{relationship_import}"

        # Generate relationship registration
        processor_factory = service_registry.get_service(:relationship_processor)
        processor = processor_factory.call(relationships, table_name)
        relationship_registration = processor.process_all[:registration]

        # Generate defaults using DefaultValueConverter
        default_value_converter = service_registry.get_service(:default_value_converter)
        defaults_object = default_value_converter.generate_defaults_object(table_name, table[:columns])
        has_defaults = !defaults_object.nil?

        {
          class_name: class_name,
          table_name: table_name,
          kebab_name: kebab_name,
          model_name: model_name,
          timestamp: Time.current.strftime("%Y-%m-%d %H:%M:%S UTC"),
          relationship_import_section: relationship_import_section,
          supports_discard: supports_discard?(patterns),
          discard_scopes: discard_scopes,
          relationship_registration: relationship_registration,
          has_defaults: has_defaults,
          defaults_object: defaults_object
        }
      end

      def build_reactive_model_context(table, class_name, kebab_name, relationships, patterns)
        # Same as active model context - could be extracted to shared method
        build_active_model_context(table, class_name, kebab_name, relationships, patterns)
      end

      # Helper methods for template generation

      def build_discard_scopes(patterns, class_name)
        return "" unless patterns[:soft_deletion]

        soft_deletion_column = patterns[:soft_deletion][:column]

        if patterns[:soft_deletion][:gem] == "discard"
          "\n * const discarded#{class_name}s = await #{class_name}.discarded().all();"
        else
          ""
        end
      end

      def supports_discard?(patterns)
        if patterns[:soft_deletion] && patterns[:soft_deletion][:gem] == "discard"
          "true"
        else
          "false"
        end
      end

      def generate_relationship_import(relationships)
        # Only import registerModelRelationships if there are actual relationships
        has_relationships = relationships && (
          relationships[:belongs_to]&.any? ||
          relationships[:has_many]&.any? ||
          relationships[:has_one]&.any?
        )

        if has_relationships
          "import { registerModelRelationships } from './base/scoped-query-base';"
        else
          ""
        end
      end

      def generate_zero_index_content(model_import_examples)
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
          // This ensures consistent ReactiveRecord patterns and prevents daily regression
          // from legacy fixture generators.

          // Re-export Zero library types for convenience
          export type { Zero } from '@rocicorp/zero';

          /**
           * Epic-008 Migration Notes:
           *
           * Before (Legacy):
           * import { User } from '$lib/zero/user.generated';
           * const usersQuery = User.all(); // Unreliable fixture generator
           *
           * After (Epic-008):
           * import { ReactiveUser as User } from '$lib/models/reactive-user';
           * const usersQuery = User.all(); // Reliable ReactiveRecord pattern
           *
           * Benefits:
           * - Consistent Zero.js ReactiveQuery patterns
           * - No daily regression from legacy generators
           * - Clean separation of concerns
           * - Type-safe Epic-008 architecture
           */
        TYPESCRIPT
      end

      # Reporting and statistics methods

      def report_dry_run_files(files)
        files.each do |file|
          shell&.say "    📄 Would create: #{file}", :yellow
        end
      end

      def report_generation_results(result)
        if options[:dry_run]
          shell&.say "\n🔍 DRY RUN COMPLETED", :yellow
          shell&.say "Run without --dry-run to actually generate files", :yellow
        end

        if result[:errors]&.any?
          shell&.say "\n❌ Errors encountered:", :red
          result[:errors].each do |error|
            shell&.say "  - #{error}", :red
          end
        end
      end

      def display_comprehensive_statistics(result)
        return if options[:dry_run]

        display_file_statistics(result)
        display_service_performance(result)
        display_execution_summary(result)
      end

      def display_file_statistics(result)
        file_manager = service_registry.get_service(:file_manager)
        file_stats = file_manager.statistics
        total_operations = file_stats[:created] + file_stats[:identical]

        if total_operations > 0
          shell&.say "\n📊 File Operations Summary:", :blue
          shell&.say "  ✅ Created: #{file_stats[:created]} files", :green if file_stats[:created] > 0
          shell&.say "  🔄 Identical (skipped): #{file_stats[:identical]} files", :blue if file_stats[:identical] > 0
          shell&.say "  🎨 Formatted with Prettier: #{file_stats[:formatted]} files", :magenta if file_stats[:formatted] > 0

          # Display batch formatting statistics if available
          if file_stats[:batch_operations] && file_stats[:batch_operations] > 0
            shell&.say "  📦 Batch operations: #{file_stats[:batch_operations]}", :blue
            shell&.say "  ⚡ Batch formatted: #{file_stats[:batch_formatted]} files", :green
          end

          shell&.say "  📁 Directories created: #{file_stats[:directories_created]}", :cyan if file_stats[:directories_created] > 0
          shell&.say "  ❌ Errors: #{file_stats[:errors]}", :red if file_stats[:errors] > 0
        end
      end

      def display_service_performance(result)
        template_renderer = service_registry.get_service(:template_renderer)
        template_stats = template_renderer.statistics

        if template_stats[:renders] > 0
          shell&.say "\n🎭 Template Rendering Performance:", :blue
          shell&.say "  📄 Templates rendered: #{template_stats[:renders]}", :green
          shell&.say "  ⚡ Total render time: #{template_stats[:total_time]}s", :cyan
          shell&.say "  📊 Average render time: #{template_stats[:average_time]}s", :cyan

          if template_stats[:cache_enabled]
            shell&.say "  🗄️  Template caching: enabled", :blue
            shell&.say "  📈 Cache hit ratio: #{template_stats[:cache_hit_ratio]}%", :magenta
            shell&.say "  🔄 Cache hits: #{template_stats[:cache_hits]}", :green
            shell&.say "  ❌ Cache misses: #{template_stats[:cache_misses]}", :yellow
          else
            shell&.say "  🗄️  Template caching: disabled", :yellow
          end
        end
      end

      def display_execution_summary(result)
        summary = result[:summary]

        shell&.say "\n🏁 Generation Summary:", :blue
        shell&.say "  📈 Models generated: #{summary[:total_models]}", :green
        shell&.say "  📄 Files created: #{summary[:total_files]}", :green
        shell&.say "  ⏱️  Execution time: #{summary[:execution_time]}s", :cyan
        shell&.say "  ✅ Success rate: #{summary[:success_rate]}%", :green
        shell&.say "  🔧 Services initialized: #{@statistics[:services_initialized]}", :blue
      end

      # Utility methods for statistics

      def aggregate_service_statistics
        # Use ServiceRegistry's aggregate statistics method
        service_registry.aggregate_service_statistics
      end

      def calculate_success_rate(generation_result)
        total_attempted = generation_result[:generated_models].length + generation_result[:skipped_tables].length
        return 100.0 if total_attempted.zero?

        success_count = generation_result[:generated_models].length
        ((success_count.to_f / total_attempted) * 100).round(2)
      end

      # Detect models that include the Loggable concern
      #
      # @return [Hash] Map of table names to model info for Loggable models
      def detect_loggable_models
        loggable_models = {}

        # Load models manually instead of using eager_load! which has issues
        model_files = Dir[Rails.root.join("app/models/**/*.rb")]
        model_files.each do |file|
          # Skip concerns and application_record
          next if file.include?("concerns/") || file.include?("application_record.rb")

          begin
            # Use load instead of require_dependency to avoid issues
            load file
          rescue => e
            # Skip files that can't be loaded
            Rails.logger.debug "Skipping file #{file}: #{e.message}"
          end
        end

        # Now check loaded models for Loggable concern
        if defined?(ApplicationRecord)
          ApplicationRecord.descendants.each do |model|
            next unless model.respond_to?(:included_modules)
            next unless model.included_modules.include?(Loggable)

            loggable_models[model.table_name] = {
              modelName: model.name,
              includesLoggable: true
            }
          end
        end

        # If still empty, use known models as fallback
        if loggable_models.empty?
          shell&.say "  ⚠️  Could not detect models dynamically, using known defaults", :yellow
          %w[Job Task Client User Person Device ScheduledDateTime].each do |model_name|
            begin
              model = model_name.constantize
              if model.included_modules.include?(Loggable)
                loggable_models[model.table_name] = {
                  modelName: model_name,
                  includesLoggable: true
                }
              end
            rescue => e
              Rails.logger.debug "Could not check #{model_name}: #{e.message}"
            end
          end
        end

        shell&.say "  ✅ Detected #{loggable_models.count} Loggable models", :green if loggable_models.any?
        loggable_models
      rescue => e
        Rails.logger.warn "Failed to detect Loggable models: #{e.message}"
        shell&.say "  ❌ Error detecting Loggable models: #{e.message}", :red
        {}
      end

      # Generate TypeScript configuration for Loggable models
      #
      # @return [String] Generated TypeScript configuration content
      def generate_loggable_config
        loggable_models = detect_loggable_models

        # Sort models by table name for consistent output
        sorted_models = loggable_models.sort_by { |table_name, _| table_name }

        # Generate model entries
        model_entries = sorted_models.map do |table_name, config|
          "  '#{table_name}': { modelName: '#{config[:modelName]}', includesLoggable: true }"
        end.join(",\n")

        <<~TYPESCRIPT
          // 🤖 AUTO-GENERATED LOGGABLE CONFIGURATION
          // Generated at: #{Time.current.strftime("%Y-%m-%dT%H:%M:%SZ")}
          //#{' '}
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

      # Determine if caching should be enabled based on environment
      #
      # @return [Boolean] True if caching should be enabled
      #
      def enable_caching_for_environment?
        return true if defined?(Rails) && Rails.env.development?
        return true if defined?(Rails) && Rails.env.production?
        false # Disable for test environment
      end

      # Create a mock shell for testing purposes
      #
      # @return [Object] Mock shell that responds to shell methods
      #
      def create_mock_shell
        Class.new do
          def say(message, color = nil)
            # Silent for testing
          end

          def say_status(status, message, color = nil)
            # Silent for testing
          end
        end.new
      end
    end
  end
end
