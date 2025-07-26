# frozen_string_literal: true

require "rails/generators"
require "fileutils"
require_relative "../../../zero_schema_generator/rails_schema_introspector"

module Zero
  module Generators
    # Content normalizer for semantic file comparison
    class ContentNormalizer
      TIMESTAMP_PATTERNS = [
        /^.*Generated from Rails schema: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^.*Generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^.*Auto-generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^\s*\*\s*Generated.*\d{4}-\d{2}-\d{2}.*$/i,
        /^\s*\/\/.*generated.*\d{4}-\d{2}-\d{2}.*$/i
      ].freeze

      def normalize(content)
        TIMESTAMP_PATTERNS.reduce(content) { |text, pattern| text.gsub(pattern, "") }
                         .gsub(/^\s*$\n/, "")
                         .strip
      end
    end

    # Semantic content comparator
    class SemanticContentComparator
      def initialize(normalizer = ContentNormalizer.new)
        @normalizer = normalizer
      end

      def identical?(file_path, new_content)
        return false unless File.exist?(file_path)

        existing_content = File.read(file_path)
        @normalizer.normalize(existing_content) == @normalizer.normalize(new_content)
      end
    end

    # Smart file creator with semantic comparison
    class SmartFileCreator
      def initialize(comparator = SemanticContentComparator.new, shell = nil)
        @comparator = comparator
        @shell = shell
      end

      def create_or_skip(destination, content)
        if @comparator.identical?(destination, content)
          @shell&.say_status(:identical, destination, :blue)
          :identical
        else
          File.write(destination, content)
          @shell&.say_status(:create, destination, :green)
          :created
        end
      end
    end

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

      def generate_active_models
        say "Generating ReactiveRecord models in TypeScript based on Rails models...", :green

        # Ensure output directory exists
        ensure_output_directory_exists

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

        # Generate index file
        generate_index_file(result[:generated_models]) unless options[:dry_run]

        # Generate Zero index file
        generate_zero_index_file(result[:generated_models]) unless options[:dry_run]

        # Output results
        output_generation_results(result)

      rescue => e
        say "❌ Generation failed: #{e.message}", :red
        say e.backtrace.first(5).join("\n"), :red if Rails.env.development?
        exit 1
      end

      private

      def ensure_output_directory_exists
        output_path = File.join(Rails.root, options[:output_dir])
        types_path = File.join(output_path, "types")

        return if options[:dry_run]

        FileUtils.mkdir_p(output_path) unless File.exist?(output_path)
        FileUtils.mkdir_p(types_path) unless File.exist?(types_path)
        say "📁 Output directory: #{output_path}", :blue
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
              data_file_path = write_file("types/#{kebab_name}-data.ts", data_content)
              result[:generated_files] << data_file_path

              # Generate ActiveRecord model
              active_content = generate_active_model(table, class_name, kebab_name, relationships, patterns)
              active_file_path = write_file("#{kebab_name}.ts", active_content)
              result[:generated_files] << active_file_path

              # Generate ReactiveRecord model
              reactive_content = generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
              reactive_file_path = write_file("reactive-#{kebab_name}.ts", reactive_content)
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

        # Generate relationship properties for Epic-011
        relationship_properties = generate_relationship_properties(relationships)
        relationship_imports = generate_relationship_imports(relationships)
        relationship_exclusions = extract_relationship_names_for_exclusion(relationships)
        relationship_docs = generate_relationship_documentation(relationships)

        # Combine all properties (ensure no extra blank lines)
        all_properties = [ column_properties.strip, relationship_properties.strip ].reject(&:empty?).join("\n")

        # Format long Omit types with proper line breaks for printWidth: 100
        base_exclusions = "'id', 'created_at', 'updated_at'"
        create_exclusions = format_omit_exclusions(base_exclusions, relationship_exclusions, class_name)
        update_exclusions = format_partial_omit_exclusions(base_exclusions, relationship_exclusions, class_name)

        <<~TYPESCRIPT
          /**
           * #{class_name}Data - TypeScript interface for #{table[:name]} table
           *
           * Generated from Rails schema: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           *#{relationship_docs}
           * ⚠️  Do not edit this file manually - it will be regenerated
           * To customize: Modify Rails model or run: rails generate zero:active_models
           */

          import type { BaseRecord } from '../base/types';#{relationship_imports}

          /**
           * Complete #{class_name} record interface
           * Matches the database schema exactly with optional relationships
           */
          export interface #{class_name}Data extends BaseRecord {
          #{all_properties}
          }

          /**
           * Create #{class_name} data interface
           * Excludes auto-generated fields and relationships
           */
          export type Create#{class_name}Data = #{create_exclusions};

          /**
           * Update #{class_name} data interface
           * All fields optional except id, excludes relationships
           */
          export type Update#{class_name}Data = #{update_exclusions};
        TYPESCRIPT
      end

      # Helper method to format long Omit types with proper line breaks
      def format_omit_exclusions(base_exclusions, relationship_exclusions, class_name)
        full_exclusions = "#{base_exclusions}#{relationship_exclusions}"

        # If the line would be too long for printWidth: 100, format as multi-line
        if "Omit<#{class_name}Data, #{full_exclusions}>".length > 70  # Match Prettier's behavior
          # Format as multi-line with Prettier-compatible indentation
          exclusions_array = full_exclusions.split(", ").map(&:strip)
          formatted_exclusions = exclusions_array.join(",\n  ")
          "Omit<\n  #{class_name}Data,\n  #{formatted_exclusions}\n>"
        else
          # Format single-line with commas
          "Omit<#{class_name}Data, #{full_exclusions}>"
        end
      end

      # Helper method to format Partial<Omit<>> types with proper line breaks
      def format_partial_omit_exclusions(base_exclusions, relationship_exclusions, class_name)
        full_exclusions = "#{base_exclusions}#{relationship_exclusions}"

        # If the line would be too long for printWidth: 100, format as multi-line
        if "Partial<Omit<#{class_name}Data, #{full_exclusions}>>".length > 70  # Match Prettier's behavior
          # Format as multi-line with Prettier-compatible indentation
          exclusions_array = full_exclusions.split(", ").map(&:strip)
          formatted_exclusions = exclusions_array.join(",\n    ")
          "Partial<\n  Omit<\n    #{class_name}Data,\n    #{formatted_exclusions}\n  >\n>"
        else
          # Format single-line with commas
          "Partial<Omit<#{class_name}Data, #{full_exclusions}>>"
        end
      end

      # Epic-011: Helper methods for relationship property generation

      def generate_relationship_properties(relationships)
        return "" unless relationships && (relationships[:belongs_to]&.any? || relationships[:has_many]&.any? || relationships[:has_one]&.any?)

        properties = []

        # belongs_to relationships
        if relationships[:belongs_to]&.any?
          relationships[:belongs_to].each do |rel|
            next unless rel[:target_table] && rel[:name]
            # Skip relationships to excluded tables
            next if ZeroSchemaGenerator::RailsSchemaIntrospector::EXCLUDED_TABLES.include?(rel[:target_table])
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            properties << "  #{property_name}?: #{target_class}Data; // belongs_to"
          end
        end

        # has_one relationships
        if relationships[:has_one]&.any?
          relationships[:has_one].each do |rel|
            next unless rel[:target_table] && rel[:name]
            # Skip relationships to excluded tables
            next if ZeroSchemaGenerator::RailsSchemaIntrospector::EXCLUDED_TABLES.include?(rel[:target_table])
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            properties << "  #{property_name}?: #{target_class}Data; // has_one"
          end
        end

        # has_many relationships
        if relationships[:has_many]&.any?
          relationships[:has_many].each do |rel|
            next unless rel[:target_table] && rel[:name]
            # Skip relationships to excluded tables
            next if ZeroSchemaGenerator::RailsSchemaIntrospector::EXCLUDED_TABLES.include?(rel[:target_table])
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            properties << "  #{property_name}?: #{target_class}Data[]; // has_many"
          end
        end

        properties.join("\n")
      end

      def generate_relationship_imports(relationships)
        return "" unless relationships && (relationships[:belongs_to]&.any? || relationships[:has_many]&.any? || relationships[:has_one]&.any?)

        import_classes = Set.new
        current_table_name = @current_table_name # Store current table for self-reference detection

        # Collect all target classes that need imports
        [ relationships[:belongs_to], relationships[:has_one], relationships[:has_many] ].compact.each do |relation_list|
          relation_list.each do |rel|
            if rel[:target_table] && rel[:name]
              target_class = rel[:target_table].singularize.camelize
              # Skip self-referencing imports to avoid circular dependencies
              # Skip imports for excluded tables (like refresh_tokens, revoked_tokens)
              unless rel[:target_table] == current_table_name ||
                     ZeroSchemaGenerator::RailsSchemaIntrospector::EXCLUDED_TABLES.include?(rel[:target_table])
                import_classes << target_class
              end
            end
          end
        end

        return "" if import_classes.empty?

        imports = import_classes.map do |class_name|
          kebab_name = class_name.underscore.dasherize
          "\nimport type { #{class_name}Data } from './#{kebab_name}-data';"
        end

        imports.join("")
      end

      def extract_relationship_names_for_exclusion(relationships)
        return "" unless relationships && (relationships[:belongs_to]&.any? || relationships[:has_many]&.any? || relationships[:has_one]&.any?)

        names = []

        # Collect all relationship property names
        [ relationships[:belongs_to], relationships[:has_one], relationships[:has_many] ].compact.each do |relation_list|
          relation_list.each do |rel|
            if rel[:name] && rel[:target_table]
              # Skip relationships to excluded tables
              next if ZeroSchemaGenerator::RailsSchemaIntrospector::EXCLUDED_TABLES.include?(rel[:target_table])
              property_name = rel[:name].to_s.camelize(:lower)
              names << property_name
            end
          end
        end

        return "" if names.empty?
        ", '#{names.join("', '")}'"
      end

      def generate_relationship_documentation(relationships)
        return "" unless relationships && (relationships[:belongs_to]&.any? || relationships[:has_many]&.any? || relationships[:has_one]&.any?)

        docs = []
        docs << " * Relationships (loaded via includes()):"

        # Document belongs_to relationships
        if relationships[:belongs_to]&.any?
          relationships[:belongs_to].each do |rel|
            next unless rel[:target_table] && rel[:name]
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            docs << " * - #{property_name}: belongs_to #{target_class}"
          end
        end

        # Document has_one relationships
        if relationships[:has_one]&.any?
          relationships[:has_one].each do |rel|
            next unless rel[:target_table] && rel[:name]
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            docs << " * - #{property_name}: has_one #{target_class}"
          end
        end

        # Document has_many relationships
        if relationships[:has_many]&.any?
          relationships[:has_many].each do |rel|
            next unless rel[:target_table] && rel[:name]
            target_class = rel[:target_table].singularize.camelize
            property_name = rel[:name].to_s.camelize(:lower)
            if rel[:through]
              docs << " * - #{property_name}: has_many #{target_class}, through: #{rel[:through]}"
            else
              docs << " * - #{property_name}: has_many #{target_class}"
            end
          end
        end

        docs.join("\n")
      end

      def generate_active_model(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        <<~TYPESCRIPT
          /**
           * #{class_name} - ActiveRecord model (non-reactive)
           *
           * Promise-based Rails-compatible model for #{table_name} table.
           * Use this for server-side code, Node.js scripts, or non-reactive contexts.
           *
           * For reactive Svelte components, use Reactive#{class_name} instead:
           * ```typescript
           * import { Reactive#{class_name} as #{class_name} } from './reactive-#{kebab_name}';
           * ```
           *
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           */

          import { createActiveRecord } from './base/active-record';
          import type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data } from './types/#{kebab_name}-data';
          import { registerModelRelationships } from './base/scoped-query-base';

          /**
           * ActiveRecord configuration for #{class_name}
           */
          const #{class_name}Config = {
            tableName: '#{table_name}',
            className: '#{class_name}',
            primaryKey: 'id',
            supportsDiscard: #{supports_discard?(patterns)},
          };

          /**
           * #{class_name} ActiveRecord instance
           *
           * @example
           * ```typescript
           * // Find by ID (throws if not found)
           * const #{model_name} = await #{class_name}.find('123');
           *
           * // Find by conditions (returns null if not found)
           * const #{model_name} = await #{class_name}.findBy({ title: 'Test' });
           *
           * // Create new record
           * const new#{class_name} = await #{class_name}.create({ title: 'New Task' });
           *
           * // Update existing record
           * const updated#{class_name} = await #{class_name}.update('123', { title: 'Updated' });
           *
           * // Soft delete (discard gem)
           * await #{class_name}.discard('123');
           *
           * // Restore discarded
           * await #{class_name}.undiscard('123');
           *
           * // Query with scopes
           * const all#{class_name}s = await #{class_name}.all().all();
           * const active#{class_name}s = await #{class_name}.kept().all();#{discard_scopes}
           * ```
           */
          export const #{class_name} = createActiveRecord<#{class_name}Data>(#{class_name}Config);

          // Epic-009: Register model relationships for includes() functionality
          #{generate_relationship_registration(table_name, relationships)}

          // Export types for convenience
          export type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data };

          // Default export
          export default #{class_name};
        TYPESCRIPT
      end

      def generate_reactive_model(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        <<~TYPESCRIPT
          /**
           * Reactive#{class_name} - ReactiveRecord model (Svelte 5 reactive)
           *
           * Reactive Rails-compatible model for #{table_name} table.
           * Automatically updates Svelte components when data changes.
           *
           * For non-reactive contexts, use #{class_name} instead:
           * ```typescript
           * import { #{class_name} } from './#{kebab_name}';
           * ```
           *
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           */

          import { createReactiveRecord } from './base/reactive-record';
          import type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data } from './types/#{kebab_name}-data';
          import { registerModelRelationships } from './base/scoped-query-base';

          /**
           * ReactiveRecord configuration for #{class_name}
           */
          const Reactive#{class_name}Config = {
            tableName: '#{table_name}',
            className: 'Reactive#{class_name}',
            primaryKey: 'id',
            supportsDiscard: #{supports_discard?(patterns)},
          };

          /**
           * Reactive#{class_name} ReactiveRecord instance
           *
           * @example
           * ```svelte
           * <!-- In Svelte component -->
           * <script>
           *   import { Reactive#{class_name} } from '$lib/models/reactive-#{kebab_name}';
           *
           *   // Reactive query - automatically updates when data changes
           *   const #{model_name}Query = Reactive#{class_name}.find('123');
           *
           *   // Access reactive data
           *   $: #{model_name} = #{model_name}Query.data;
           *   $: isLoading = #{model_name}Query.isLoading;
           *   $: error = #{model_name}Query.error;
           * </script>
           *
           * {#if isLoading}
           *   Loading...
           * {:else if error}
           *   Error: {error.message}
           * {:else if #{model_name}}
           *   <p>{#{model_name}.title}</p>
           * {/if}
           * ```
           *
           * @example
           * ```typescript
           * // Mutation operations (still async)
           * const new#{class_name} = await Reactive#{class_name}.create({ title: 'New Task' });
           * await Reactive#{class_name}.update('123', { title: 'Updated' });
           * await Reactive#{class_name}.discard('123');
           *
           * // Reactive queries
           * const all#{class_name}sQuery = Reactive#{class_name}.all().all();
           * const active#{class_name}sQuery = Reactive#{class_name}.kept().all();#{discard_scopes}
           * ```
           */
          export const Reactive#{class_name} = createReactiveRecord<#{class_name}Data>(Reactive#{class_name}Config);

          // Epic-009: Register model relationships for includes() functionality
          #{generate_relationship_registration(table_name, relationships)}

          /**
           * Import alias for easy switching between reactive/non-reactive
           *
           * @example
           * ```typescript
           * // Use reactive model in Svelte components
           * import { Reactive#{class_name} as #{class_name} } from './reactive-#{kebab_name}';
           *
           * // Use like ActiveRecord but with reactive queries
           * const #{model_name}Query = #{class_name}.find('123');
           * ```
           */
          export { Reactive#{class_name} as #{class_name} };

          // Export types for convenience
          export type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data };

          // Default export
          export default Reactive#{class_name};
        TYPESCRIPT
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

      def generate_relationship_registration(table_name, relationships)
        # Build relationship metadata for Epic-009
        relationship_metadata = []

        # belongs_to relationships
        if relationships[:belongs_to] && relationships[:belongs_to].any?
          relationships[:belongs_to].each do |rel|
            next unless rel[:target_table] && rel[:name]
            model_name = rel[:target_table].singularize.camelize
            relationship_name = rel[:name].to_s.camelize(:lower)
            relationship_metadata << "  #{relationship_name}: { type: 'belongsTo', model: '#{model_name}' }"
          end
        end

        # has_many relationships
        if relationships[:has_many] && relationships[:has_many].any?
          relationships[:has_many].each do |rel|
            next unless rel[:target_table] && rel[:name]
            model_name = rel[:target_table].singularize.camelize
            relationship_name = rel[:name].to_s.camelize(:lower)
            relationship_metadata << "  #{relationship_name}: { type: 'hasMany', model: '#{model_name}' }"
          end
        end

        # has_one relationships
        if relationships[:has_one] && relationships[:has_one].any?
          relationships[:has_one].each do |rel|
            next unless rel[:target_table] && rel[:name]
            model_name = rel[:target_table].singularize.camelize
            relationship_name = rel[:name].to_s.camelize(:lower)
            relationship_metadata << "  #{relationship_name}: { type: 'hasOne', model: '#{model_name}' }"
          end
        end

        if relationship_metadata.any?
          metadata_string = relationship_metadata.join(",\n")
          <<~TYPESCRIPT
            registerModelRelationships('#{table_name}', {
            #{metadata_string},
            });
          TYPESCRIPT
        else
          "// No relationships defined for this model"
        end
      end

      def map_rails_type_to_typescript(rails_type, column)
        # Check for enum first
        if column[:enum] && column[:enum_values]&.any?
          return column[:enum_values].map { |v| "'#{v}'" }.join(" | ")
        end

        case rails_type.to_s
        when "string", "text"
          "string"
        when "integer", "bigint"
          "number"
        when "decimal", "float"
          "number"
        when "boolean"
          "boolean"
        when "datetime", "timestamp", "timestamptz"
          "string | number" # Support both ISO strings and timestamps
        when "date"
          "string"
        when "time"
          "string"
        when "json", "jsonb"
          "any"
        when "uuid"
          "string"
        when "binary"
          "Uint8Array"
        else
          "any"
        end
      end

      def write_file(relative_path, content)
        output_path = File.join(Rails.root, options[:output_dir])
        file_path = File.join(output_path, relative_path)

        # Ensure directory exists
        FileUtils.mkdir_p(File.dirname(file_path))

        # Use smart file creator for semantic comparison
        file_creator.create_or_skip(file_path, content)

        file_path
      end

      def file_creator
        @file_creator ||= SmartFileCreator.new(SemanticContentComparator.new, shell)
      end

      # Override Thor's default behavior for non-interactive mode
      def file_collision(destination)
        options[:force] ? :force : super
      end

      def generate_index_file(generated_models)
        return if generated_models.empty?

        # Build imports for all models (for use in objects)
        active_imports = generated_models.map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "import { #{class_name} } from './#{kebab_name}';"
        end.join("\n")

        reactive_imports = generated_models.map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "import { Reactive#{class_name} } from './reactive-#{kebab_name}';"
        end.join("\n")

        # Build exports for all models
        active_exports = generated_models.map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "export { #{class_name}, type #{class_name}Data, type Create#{class_name}Data, type Update#{class_name}Data } from './#{kebab_name}';"
        end.join("\n")

        reactive_exports = generated_models.map do |model|
          class_name = model[:class_name]
          kebab_name = model[:kebab_name]
          "export { Reactive#{class_name} } from './reactive-#{kebab_name}';"
        end.join("\n")

        # Build convenient object exports
        active_models_object = generated_models.map do |model|
          class_name = model[:class_name]
          "  #{class_name}"
        end.join(",\n")

        reactive_models_object = generated_models.map do |model|
          class_name = model[:class_name]
          "  Reactive#{class_name}"
        end.join(",\n")

        index_content = <<~TYPESCRIPT
          /**
           * Epic-008 Model Index - Simplified ActiveRecord/ReactiveRecord Architecture
           *
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           *
           * ⚠️  Do not edit this file manually - it will be regenerated
           * To regenerate: rails generate zero:active_models
           */

          // Imports for object construction
          #{active_imports}
          #{reactive_imports}

          // ActiveRecord models (non-reactive, Promise-based)
          #{active_exports}

          // ReactiveRecord models (Svelte 5 reactive)
          #{reactive_exports}

          /**
           * ActiveRecord models object for dynamic access
           *
           * @example
           * ```typescript
           * import { ActiveModels } from '$lib/models';
           * const Task = ActiveModels.Task;
           * const tasks = await Task.all().all();
           * ```
           */
          export const ActiveModels = {
          #{active_models_object}
          };

          /**
           * ReactiveRecord models object for dynamic access
           *
           * @example
           * ```typescript
           * import { ReactiveModels } from '$lib/models';
           * const ReactiveTask = ReactiveModels.ReactiveTask;
           * const tasksQuery = ReactiveTask.all().all();
           * ```
           */
          export const ReactiveModels = {
          #{reactive_models_object}
          };

          /**
           * Import alias helpers for easy switching
           *
           * @example
           * ```typescript
           * // In non-reactive context
           * import { Task } from '$lib/models/task';
           *
           * // In Svelte component
           * import { ReactiveTask as Task } from '$lib/models/reactive-task';
           * ```
           */
        TYPESCRIPT

        index_path = File.join(Rails.root, options[:output_dir], "index.ts")
        file_creator.create_or_skip(index_path, index_content)
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

        zero_index_path = File.join(Rails.root, "frontend/src/lib/zero", "index.ts")
        file_creator.create_or_skip(zero_index_path, zero_index_content)
      end
    end
  end
end
