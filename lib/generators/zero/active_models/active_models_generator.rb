# frozen_string_literal: true

require "rails/generators"
require "fileutils"
require_relative "../../../zero_schema_generator/rails_schema_introspector"

module Zero
  module Generators
    class ActiveModelsGenerator < Rails::Generators::Base
      desc "Generate TypeScript ActiveRecord/ReactiveRecord models from Rails schema (Epic-008 architecture)"

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
        say "🎯 Epic-008: Generating simplified ActiveRecord/ReactiveRecord models...", :green

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

            say "  🔄 Processing #{table[:name]} -> #{class_name}...", :blue

            # Find relationships for this table
            relationships = find_relationships_for_table(table[:name], schema_data[:relationships])
            patterns = schema_data[:patterns][table[:name]] || {}

            if options[:dry_run]
              say "    📄 Would create: #{kebab_name}.ts", :yellow
              say "    📄 Would create: reactive-#{kebab_name}.ts", :yellow
              say "    📄 Would create: types/#{kebab_name}-data.ts", :yellow
            else
              # Generate TypeScript data interface
              data_content = generate_data_interface(table, class_name)
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

              say "    ✅ Created: #{kebab_name}.ts, reactive-#{kebab_name}.ts, types/#{kebab_name}-data.ts", :green
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

      def generate_data_interface(table, class_name)
        properties = table[:columns].map do |column|
          ts_type = map_rails_type_to_typescript(column[:type], column)
          nullable = column[:null] ? "?" : ""
          comment = column[:comment] ? " // #{column[:comment]}" : ""

          "  #{column[:name]}#{nullable}: #{ts_type};#{comment}"
        end.join("\n")

        <<~TYPESCRIPT
          /**
           * #{class_name}Data - TypeScript interface for #{table[:name]} table
           *#{' '}
           * Generated from Rails schema: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           *#{' '}
           * ⚠️  Do not edit this file manually - it will be regenerated
           * To customize: Modify Rails model or run: rails generate zero:active_models
           */

          import type { BaseRecord } from '../base/types';

          /**
           * Complete #{class_name} record interface
           * Matches the database schema exactly
           */
          export interface #{class_name}Data extends BaseRecord {
          #{properties}
          }

          /**
           * Create #{class_name} data interface
           * Excludes auto-generated fields
           */
          export type Create#{class_name}Data = Omit<#{class_name}Data, 'id' | 'created_at' | 'updated_at'>;

          /**
           * Update #{class_name} data interface
           * All fields optional except id
           */
          export type Update#{class_name}Data = Partial<Omit<#{class_name}Data, 'id' | 'created_at' | 'updated_at'>>;
        TYPESCRIPT
      end

      def generate_active_model(table, class_name, kebab_name, relationships, patterns)
        table_name = table[:name]
        model_name = table_name.singularize

        # Build discard gem scopes if present
        discard_scopes = build_discard_scopes(patterns, class_name)

        <<~TYPESCRIPT
          /**
           * #{class_name} - ActiveRecord model (non-reactive)
           *#{' '}
           * Promise-based Rails-compatible model for #{table_name} table.
           * Use this for server-side code, Node.js scripts, or non-reactive contexts.
           *#{' '}
           * For reactive Svelte components, use Reactive#{class_name} instead:
           * ```typescript
           * import { Reactive#{class_name} as #{class_name} } from './reactive-#{kebab_name}';
           * ```
           *#{' '}
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           */

          import { createActiveRecord } from './base/active-record';
          import type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data } from './types/#{kebab_name}-data';

          /**
           * ActiveRecord configuration for #{class_name}
           */
          const #{class_name}Config = {
            tableName: '#{table_name}',
            className: '#{class_name}',
            primaryKey: 'id'
          };

          /**
           * #{class_name} ActiveRecord instance
           *#{' '}
           * @example
           * ```typescript
           * // Find by ID (throws if not found)
           * const #{model_name} = await #{class_name}.find('123');
           *#{' '}
           * // Find by conditions (returns null if not found)
           * const #{model_name} = await #{class_name}.findBy({ title: 'Test' });
           *#{' '}
           * // Create new record
           * const new#{class_name} = await #{class_name}.create({ title: 'New Task' });
           *#{' '}
           * // Update existing record
           * const updated#{class_name} = await #{class_name}.update('123', { title: 'Updated' });
           *#{' '}
           * // Soft delete (discard gem)
           * await #{class_name}.discard('123');
           *#{' '}
           * // Restore discarded
           * await #{class_name}.undiscard('123');
           *#{' '}
           * // Query with scopes
           * const all#{class_name}s = await #{class_name}.all().all();
           * const active#{class_name}s = await #{class_name}.kept().all();#{discard_scopes}
           * ```
           */
          export const #{class_name} = createActiveRecord<#{class_name}Data>(#{class_name}Config);

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
           *#{' '}
           * Reactive Rails-compatible model for #{table_name} table.
           * Automatically updates Svelte components when data changes.
           *#{' '}
           * For non-reactive contexts, use #{class_name} instead:
           * ```typescript
           * import { #{class_name} } from './#{kebab_name}';
           * ```
           *#{' '}
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           */

          import { createReactiveRecord } from './base/reactive-record';
          import type { #{class_name}Data, Create#{class_name}Data, Update#{class_name}Data } from './types/#{kebab_name}-data';

          /**
           * ReactiveRecord configuration for #{class_name}
           */
          const Reactive#{class_name}Config = {
            tableName: '#{table_name}',
            className: 'Reactive#{class_name}',
            primaryKey: 'id'
          };

          /**
           * Reactive#{class_name} ReactiveRecord instance
           *#{' '}
           * @example
           * ```svelte
           * <!-- In Svelte component -->
           * <script>
           *   import { Reactive#{class_name} } from '$lib/models/reactive-#{kebab_name}';
           *#{'   '}
           *   // Reactive query - automatically updates when data changes
           *   const #{model_name}Query = Reactive#{class_name}.find('123');
           *#{'   '}
           *   // Access reactive data
           *   $: #{model_name} = #{model_name}Query.data;
           *   $: isLoading = #{model_name}Query.isLoading;
           *   $: error = #{model_name}Query.error;
           * </script>
           *#{' '}
           * {#if isLoading}
           *   Loading...
           * {:else if error}
           *   Error: {error.message}
           * {:else if #{model_name}}
           *   <p>{#{model_name}.title}</p>
           * {/if}
           * ```
           *#{' '}
           * @example
           * ```typescript
           * // Mutation operations (still async)
           * const new#{class_name} = await Reactive#{class_name}.create({ title: 'New Task' });
           * await Reactive#{class_name}.update('123', { title: 'Updated' });
           * await Reactive#{class_name}.discard('123');
           *#{' '}
           * // Reactive queries
           * const all#{class_name}sQuery = Reactive#{class_name}.all().all();
           * const active#{class_name}sQuery = Reactive#{class_name}.kept().all();#{discard_scopes}
           * ```
           */
          export const Reactive#{class_name} = createReactiveRecord<#{class_name}Data>(Reactive#{class_name}Config);

          /**
           * Import alias for easy switching between reactive/non-reactive
           *#{' '}
           * @example
           * ```typescript
           * // Use reactive model in Svelte components
           * import { Reactive#{class_name} as #{class_name} } from './reactive-#{kebab_name}';
           *#{' '}
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

        File.write(file_path, content)
        file_path
      end

      def generate_index_file(generated_models)
        return if generated_models.empty?

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
           *#{' '}
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           *#{' '}
           * ⚠️  Do not edit this file manually - it will be regenerated
           * To regenerate: rails generate zero:active_models
           */

          // ActiveRecord models (non-reactive, Promise-based)
          #{active_exports}

          // ReactiveRecord models (Svelte 5 reactive)
          #{reactive_exports}

          /**
           * ActiveRecord models object for dynamic access
           *#{' '}
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
           *#{' '}
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
           *#{' '}
           * @example
           * ```typescript
           * // In non-reactive context
           * import { Task } from '$lib/models/task';
           *#{' '}
           * // In Svelte component
           * import { ReactiveTask as Task } from '$lib/models/reactive-task';
           * ```
           */
        TYPESCRIPT

        index_path = File.join(Rails.root, options[:output_dir], "index.ts")
        File.write(index_path, index_content)

        say "    ✅ Created index.ts", :green
      end

      def output_generation_results(result)
        if options[:dry_run]
          say "\n🔍 DRY RUN COMPLETED", :yellow
          say "Run without --dry-run to actually generate files", :yellow
        else
          say "\n✅ EPIC-008 MODEL GENERATION COMPLETED", :green
        end

        if result[:generated_models].any?
          say "\n📋 Generated models:", :green
          result[:generated_models].each do |model|
            say "  ✅ #{model[:class_name]} (#{model[:table_name]})", :green
            unless options[:dry_run]
              say "    📄 #{model[:active_file]} (ActiveRecord)", :blue
              say "    📄 #{model[:reactive_file]} (ReactiveRecord)", :blue
              say "    📄 #{model[:data_file]} (TypeScript interfaces)", :blue
            end
          end
        end

        if result[:errors].any?
          say "\n❌ Errors encountered:", :red
          result[:errors].each do |error|
            say "  - #{error}", :red
          end
        end

        unless options[:dry_run]
          say "\n🎉 Epic-008 models are ready!", :green
          say "\n📖 Usage patterns:", :blue

          if result[:generated_models].any?
            example_model = result[:generated_models].first
            class_name = example_model[:class_name]
            kebab_name = example_model[:kebab_name]
            model_name = example_model[:model_name]

            say <<~USAGE, :blue

              # Non-reactive (Node.js, tests, utilities):
              import { #{class_name} } from '$lib/models/#{kebab_name}';
              const #{model_name} = await #{class_name}.find('123');

              # Reactive (Svelte components):
              import { Reactive#{class_name} as #{class_name} } from '$lib/models/reactive-#{kebab_name}';
              const #{model_name}Query = #{class_name}.find('123');
              // #{model_name}Query.data automatically updates UI

              # Easy switching with import alias:
              import { Reactive#{class_name} as #{class_name} } from '$lib/models/reactive-#{kebab_name}';
              // Use #{class_name} like normal ActiveRecord but with reactive queries
            USAGE
          end

          say "\n🔄 To regenerate: bin/rails generate zero:active_models", :blue
        end
      end
    end
  end
end
