# frozen_string_literal: true

require "rails/generators"
require "fileutils"
require_relative "../../../zero_schema_generator/rails_schema_introspector"
require_relative "relationship_processor"
require_relative "type_mapper"
require_relative "file_manager"

module Zero
  module Generators
    class ActiveModelsGenerator < Rails::Generators::Base
      desc "Generate TypeScript ReactiveRecord and ActiveRecord models based on our Rails models"

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

      def generate_active_models
        say "Generating ReactiveRecord models in TypeScript based on Rails models...", :green

        # Initialize FileManager for all file operations
        initialize_file_manager

        # Ensure output directory exists
        file_manager.ensure_directory_exists(File.join(Rails.root, options[:output_dir]))
        file_manager.ensure_directory_exists(File.join(Rails.root, options[:output_dir], "types"))
        say "📁 Output directory: #{File.join(Rails.root, options[:output_dir])}", :blue

        # Extract schema data
        introspector = ZeroSchemaGenerator::RailsSchemaIntrospector.new
        schema_data = introspector.extract_schema

        # Filter tables based on options
        tables_to_generate = filter_tables_for_generation(schema_data[:tables])

        if tables_to_generate.empty?
          say "⚠️  No tables found for generation", :yellow
          return
        end

        # Generate models for each table
        result = generate_models_for_tables(tables_to_generate, schema_data)

        # Generate index file - DISABLED to prevent ESLint issues
        # generate_index_file(result[:generated_models]) unless options[:dry_run]

        # Generate Zero index file
        generate_zero_index_file(result[:generated_models]) unless options[:dry_run]

        # Output results
        output_generation_results(result)

        # Display file operation statistics
        display_file_statistics

      rescue => e
        say "❌ Generation failed: #{e.message}", :red
        say e.backtrace.first(5).join("\n"), :red if Rails.env.development?
        exit 1
      end

      private

      # Initialize FileManager with current generator options
      def initialize_file_manager
        @file_manager = FileManager.new(options, shell, options[:output_dir])
      end

      # Get or create FileManager instance
      #
      # @return [FileManager] Configured file manager instance
      def file_manager
        @file_manager ||= FileManager.new(options, shell, options[:output_dir])
      end

      def filter_tables_for_generation(tables)
        filtered_tables = tables.dup

        # Filter by specific table if requested
        if options[:table]
          filtered_tables = filtered_tables.select { |table| table[:name] == options[:table] }
          if filtered_tables.empty?
            say "❌ Table '#{options[:table]}' not found", :red
            exit 1
          end
        end

        # Exclude specified tables
        if options[:exclude_tables].any?
          filtered_tables = filtered_tables.reject { |table|
            options[:exclude_tables].include?(table[:name])
          }
        end

        # Additional exclusions for known system tables
        system_tables = %w[ar_internal_metadata schema_migrations versions]
        filtered_tables = filtered_tables.reject { |table|
          system_tables.include?(table[:name])
        }

        filtered_tables
      end

      def generate_models_for_tables(tables, schema_data)
        result = {
          generated_models: [],
          generated_files: [],
          skipped_tables: [],
          errors: []
        }

        tables.each do |table|
          begin
            model_name = table[:name].singularize
            class_name = model_name.camelize
            kebab_name = model_name.underscore.dasherize

            # Find relationships for this table
            relationships = find_relationships_for_table(table[:name], schema_data[:relationships])
            patterns = schema_data[:patterns][table[:name]] || {}

            if options[:dry_run]
              say "    📄 Would create: #{kebab_name}.ts", :yellow
              say "    📄 Would create: reactive-#{kebab_name}.ts", :yellow
              say "    📄 Would create: types/#{kebab_name}-data.ts", :yellow
            else
              # Generate TypeScript data interface
              data_content = generate_data_interface(table, class_name, relationships)
              data_file_path = file_manager.write_with_formatting("types/#{kebab_name}-data.ts", data_content)
              result[:generated_files] << data_file_path

              # Generate ActiveRecord model
              active_content = generate_active_model(table, class_name, kebab_name, relationships, patterns)
              active_file_path = file_manager.write_with_formatting("#{kebab_name}.ts", active_content)
              result[:generated_files] << active_file_path

              # Generate ReactiveRecord model
              reactive_content = generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
              reactive_file_path = file_manager.write_with_formatting("reactive-#{kebab_name}.ts", reactive_content)
              result[:generated_files] << reactive_file_path
            end

            result[:generated_models] << {
              table_name: table[:name],
              model_name: model_name,
              class_name: class_name,
              kebab_name: kebab_name,
              active_file: "#{kebab_name}.ts",
              reactive_file: "reactive-#{kebab_name}.ts",
              data_file: "types/#{kebab_name}-data.ts"
            }

          rescue => e
            error_msg = "Failed to generate model for #{table[:name]}: #{e.message}"
            result[:errors] << error_msg
            say "    ❌ #{error_msg}", :red
          end
        end

        result
      end

      def find_relationships_for_table(table_name, relationships)
        relationships.find { |rel| rel[:table] == table_name } || {
          belongs_to: [],
          has_many: [],
          has_one: [],
          polymorphic: []
        }
      end

      def generate_data_interface(table, class_name, relationships = {})
        # Build template context using helper method
        context = build_data_interface_context(table, class_name, relationships)

        # Render ERB template with context
        render_template("data_interface.ts.erb", context)
      end


      # Epic-011: Relationship processing using RelationshipProcessor service
      # (Duplicated logic extracted to eliminate DRY violations)

      def generate_active_model(table, class_name, kebab_name, relationships, patterns)
        # Build template context using helper method
        context = build_active_model_context(table, class_name, kebab_name, relationships, patterns)

        # Render ERB template with context
        render_template("active_model.ts.erb", context)
      end

      def generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
        # Build template context using helper method
        context = build_reactive_model_context(table, class_name, kebab_name, relationships, patterns)

        # Render ERB template with context
        render_template("reactive_model.ts.erb", context)
      end

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
        # Return true if the model uses discard gem for soft deletion
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

      # Relationship registration now handled by RelationshipProcessor service

      def map_rails_type_to_typescript(rails_type, column)
        type_mapper.map_rails_type_to_typescript(rails_type, column)
      end

      # Get or create TypeMapper instance for type conversions
      #
      # @return [TypeMapper] Configured type mapper instance
      def type_mapper
        @type_mapper ||= TypeMapper.new
      end

      # ===============================================
      # ERB TEMPLATE RENDERING SYSTEM
      # ===============================================

      # Render an ERB template with the provided context
      #
      # @param template_name [String] Name of the template file (e.g., 'data_interface.ts.erb')
      # @param context [Hash] Variables to make available in the template
      # @return [String] Rendered template content
      def render_template(template_name, context = {})
        require "erb"

        template_path = File.join(self.class.source_root, template_name)

        unless File.exist?(template_path)
          raise "Template not found: #{template_path}"
        end

        template_content = File.read(template_path)

        # Create binding with context variables
        template_binding = create_template_binding(context)

        # Render ERB template
        erb = ERB.new(template_content, trim_mode: "-")
        erb.result(template_binding)
      end

      # Create a binding object with template context variables
      #
      # @param context [Hash] Variables to make available in template
      # @return [Binding] Binding object for ERB rendering
      def create_template_binding(context)
        # Create a new object to avoid polluting self
        template_object = Object.new

        # Define each context variable as a method on the template object
        context.each do |key, value|
          template_object.define_singleton_method(key) { value }
        end

        template_object.instance_eval { binding }
      end

      # ===============================================
      # TEMPLATE CONTEXT BUILDERS
      # ===============================================

      # Build context for data interface template
      #
      # @param table [Hash] Table schema information
      # @param class_name [String] TypeScript class name
      # @param relationships [Hash] Relationship information
      # @return [Hash] Template context variables
      def build_data_interface_context(table, class_name, relationships = {})
        # Store current table name for self-reference detection
        @current_table_name = table[:name]
        @current_class_name = class_name

        # Generate database column properties
        column_properties = table[:columns].map do |column|
          ts_type = map_rails_type_to_typescript(column[:type], column)
          nullable = column[:null] ? "?" : ""
          comment = column[:comment] ? " // #{column[:comment]}" : ""

          "  #{column[:name]}#{nullable}: #{ts_type};#{comment}"
        end.join("\n")

        # Generate relationship properties for Epic-011 using RelationshipProcessor
        processor = RelationshipProcessor.new(relationships, @current_table_name)
        relationship_data = processor.process_all

        # Combine all properties (maintain proper indentation for all lines)
        all_properties = [ column_properties, relationship_data[:properties] ].reject(&:empty?).join("\n")

        # Generate type exclusions (Prettier will handle formatting)
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

      # Build context for active model template
      #
      # @param table [Hash] Table schema information
      # @param class_name [String] TypeScript class name
      # @param kebab_name [String] Kebab-case file name
      # @param relationships [Hash] Relationship information
      # @param patterns [Hash] Model patterns (soft deletion, etc.)
      # @return [Hash] Template context variables
      def build_active_model_context(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        # Generate relationship import section
        relationship_import = generate_relationship_import(relationships)
        relationship_import_section = relationship_import.empty? ? "" : "\n#{relationship_import}"

        # Generate relationship registration
        relationship_registration = RelationshipProcessor.new(relationships, table_name).process_all[:registration]

        {
          class_name: class_name,
          table_name: table_name,
          kebab_name: kebab_name,
          model_name: model_name,
          timestamp: Time.current.strftime("%Y-%m-%d %H:%M:%S UTC"),
          relationship_import_section: relationship_import_section,
          supports_discard: supports_discard?(patterns),
          discard_scopes: discard_scopes,
          relationship_registration: relationship_registration
        }
      end

      # Build context for reactive model template
      #
      # @param table [Hash] Table schema information
      # @param class_name [String] TypeScript class name
      # @param kebab_name [String] Kebab-case file name
      # @param relationships [Hash] Relationship information
      # @param patterns [Hash] Model patterns (soft deletion, etc.)
      # @return [Hash] Template context variables
      def build_reactive_model_context(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        # Generate relationship import section
        relationship_import = generate_relationship_import(relationships)
        relationship_import_section = relationship_import.empty? ? "" : "\n#{relationship_import}"

        # Generate relationship registration
        relationship_registration = RelationshipProcessor.new(relationships, table_name).process_all[:registration]

        {
          class_name: class_name,
          table_name: table_name,
          kebab_name: kebab_name,
          model_name: model_name,
          timestamp: Time.current.strftime("%Y-%m-%d %H:%M:%S UTC"),
          relationship_import_section: relationship_import_section,
          supports_discard: supports_discard?(patterns),
          discard_scopes: discard_scopes,
          relationship_registration: relationship_registration
        }
      end

      # Override Thor's default behavior for non-interactive mode
      def file_collision(destination)
        options[:force] ? :force : super
      end


      def output_generation_results(result)
        if options[:dry_run]
          say "\n🔍 DRY RUN COMPLETED", :yellow
          say "Run without --dry-run to actually generate files", :yellow
        end

        if result[:errors].any?
          say "\n❌ Errors encountered:", :red
          result[:errors].each do |error|
            say "  - #{error}", :red
          end
        end

        unless options[:dry_run]

          if result[:generated_models].any?
            example_model = result[:generated_models].first
            class_name = example_model[:class_name]
            kebab_name = example_model[:kebab_name]
            model_name = example_model[:model_name]
          end

        end
      end

      # Display file operation statistics from FileManager
      def display_file_statistics
        return if options[:dry_run]

        stats = file_manager.statistics
        total_operations = stats[:created] + stats[:identical]

        if total_operations > 0
          say "\n📊 File Operations Summary:", :blue
          say "  ✅ Created: #{stats[:created]} files", :green if stats[:created] > 0
          say "  🔄 Identical (skipped): #{stats[:identical]} files", :blue if stats[:identical] > 0
          say "  🎨 Formatted with Prettier: #{stats[:formatted]} files", :magenta if stats[:formatted] > 0
          say "  📁 Directories created: #{stats[:directories_created]}", :cyan if stats[:directories_created] > 0
          say "  ❌ Errors: #{stats[:errors]}", :red if stats[:errors] > 0
        end
      end

      def generate_zero_index_file(generated_models)
        return if generated_models.empty?

        # Build Epic-008 model import examples for documentation
        model_import_examples = generated_models.first(3).map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "// import { #{class_name}, Reactive#{class_name} } from '$lib/models/#{kebab_name}';"
        end.join("\n")

        zero_index_content = <<~TYPESCRIPT
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

        file_manager.write_with_formatting("../zero/index.ts", zero_index_content)
      end
    end
  end
end
