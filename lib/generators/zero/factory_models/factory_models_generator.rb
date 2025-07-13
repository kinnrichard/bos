# frozen_string_literal: true

require "rails/generators"
require "fileutils"
require_relative "../../../zero_schema_generator/rails_schema_introspector"

module Zero
  module Generators
    class FactoryModelsGenerator < Rails::Generators::Base
      desc "Generate TypeScript factory models from Rails schema"

      source_root File.expand_path("templates", __dir__)

      class_option :dry_run, type: :boolean, default: false,
                   desc: "Show what would be generated without creating files"
      class_option :force, type: :boolean, default: false,
                   desc: "Force generation even if conflicts are detected"
      class_option :table, type: :string,
                   desc: "Generate factory model for specific table only"
      class_option :exclude_tables, type: :array, default: [],
                   desc: "Tables to exclude from generation"
      class_option :output_dir, type: :string,
                   default: "frontend/src/lib/models/generated",
                   desc: "Custom output directory"

      def generate_factory_models
        say "🏭 Generating TypeScript factory models from Rails schema...", :green

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

        # Generate factory models
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
        return if options[:dry_run]

        FileUtils.mkdir_p(output_path) unless File.exist?(output_path)
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

            say "  🔄 Processing #{table[:name]} -> #{class_name}...", :blue

            # Find relationships for this table
            relationships = find_relationships_for_table(table[:name], schema_data[:relationships])

            # Generate TypeScript model
            model_content = generate_model_content(table, relationships, schema_data)

            if options[:dry_run]
              say "    📄 Would create: #{model_name}.ts", :yellow
            else
              file_path = write_model_file(model_name, model_content)
              result[:generated_files] << file_path
              say "    ✅ Created: #{model_name}.ts", :green
            end

            result[:generated_models] << {
              table_name: table[:name],
              model_name: model_name,
              class_name: class_name,
              file_name: "#{model_name}.ts"
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

      def generate_model_content(table, relationships, schema_data)
        model_name = table[:name].singularize
        class_name = model_name.camelize

        # Extract patterns for advanced features
        patterns = schema_data[:patterns][table[:name]] || {}

        # Build TypeScript interface
        interface_content = build_typescript_interface(table, patterns)

        # Build model configuration
        config_content = build_model_configuration(table, relationships, patterns)

        # Build factory exports
        factory_content = build_factory_exports(class_name, model_name)

        # Combine all content with header
        [
          build_file_header(class_name, table[:name]),
          interface_content,
          config_content,
          factory_content
        ].join("\n\n")
      end

      def build_file_header(class_name, table_name)
        generation_time = Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")

        <<~TYPESCRIPT
          /*
           * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
           *#{' '}
           * This file was automatically generated from Rails schema introspection.
           * Any manual changes will be lost when the generator runs again.
           *#{' '}
           * Generated: #{generation_time}
           * Table: #{table_name}
           * Generator: rails generate zero:factory_models
           *#{' '}
           * To regenerate: bin/rails generate zero:factory_models
           * To customize: Modify the Rails model or generator templates
           */

          import { ModelFactory, type ModelConfig } from '../../record-factory/model-factory';
          import { ModelConfigBuilder } from '../../record-factory/model-config';
        TYPESCRIPT
      end

      def build_typescript_interface(table, patterns)
        interface_name = "#{table[:name].singularize.camelize}Type"

        # Build interface properties from columns
        properties = table[:columns].map do |column|
          ts_type = map_rails_type_to_typescript(column[:type], column)
          nullable = column[:null] ? "?" : ""
          comment = column[:comment] ? " // #{column[:comment]}" : ""

          "  #{column[:name]}#{nullable}: #{ts_type};#{comment}"
        end.join("\n")

        <<~TYPESCRIPT
          /**
           * TypeScript interface for #{interface_name}#{' '}
           * Describes the data structure/shape for database records
           * Auto-generated from Rails schema
           */
          export interface #{interface_name} {
          #{properties}
          }
        TYPESCRIPT
      end

      def build_model_configuration(table, relationships, patterns)
        model_name = table[:name].singularize
        class_name = model_name.camelize
        table_name = table[:name]

        # Build attributes array
        attributes = table[:columns].map do |column|
          enum_values = column[:enum_values] || []
          enum_part = enum_values.any? ? ", enum: #{enum_values.inspect}" : ""

          "    { name: '#{column[:name]}', type: '#{column[:type]}', nullable: #{column[:null]}#{enum_part} }"
        end.join(",\n")

        # Build associations array
        associations = build_associations_array(relationships)

        # Build scopes array (basic implementation)
        scopes = build_scopes_array(patterns)

        <<~TYPESCRIPT
          /**
           * Model configuration for #{class_name}
           * Built using ModelConfigBuilder for type safety
           */
          const #{model_name}Config: ModelConfig = new ModelConfigBuilder('#{model_name}', '#{table_name}')
            .setZeroConfig({
              tableName: '#{table_name}',
              primaryKey: 'id'
            })
            .build();

          // Add attributes to configuration
          #{model_name}Config.attributes = [
          #{attributes}
          ];

          // Add associations to configuration
          #{model_name}Config.associations = [
          #{associations}
          ];

          // Add scopes to configuration
          #{model_name}Config.scopes = [
          #{scopes}
          ];
        TYPESCRIPT
      end

      def build_associations_array(relationships)
        all_associations = []

        # Add belongs_to associations
        relationships[:belongs_to]&.each do |assoc|
          all_associations << "    { name: '#{assoc[:name]}', type: 'belongs_to', className: '#{assoc[:target_class]}', foreignKey: '#{assoc[:foreign_key]}' }"
        end

        # Add has_many associations
        relationships[:has_many]&.each do |assoc|
          through_part = assoc[:through] ? ", through: '#{assoc[:through]}'" : ""
          all_associations << "    { name: '#{assoc[:name]}', type: 'has_many', className: '#{assoc[:target_class]}', foreignKey: '#{assoc[:foreign_key]}'#{through_part} }"
        end

        # Add has_one associations
        relationships[:has_one]&.each do |assoc|
          all_associations << "    { name: '#{assoc[:name]}', type: 'has_one', className: '#{assoc[:target_class]}', foreignKey: '#{assoc[:foreign_key]}' }"
        end

        all_associations.join(",\n")
      end

      def build_scopes_array(patterns)
        scopes = []

        # Add soft deletion scope if pattern detected
        if patterns[:soft_deletion]
          scopes << "    { name: 'withDeleted', conditions: {}, description: 'Include soft-deleted records' }"
          scopes << "    { name: 'onlyDeleted', conditions: { deleted_at: { not: null } }, description: 'Only soft-deleted records' }"
        end

        # Add positioning scopes if pattern detected
        if patterns[:positioning]
          scopes << "    { name: 'ordered', conditions: {}, description: 'Order by position' }"
        end

        # Add enum scopes if pattern detected
        if patterns[:enums]
          patterns[:enums].each do |enum_config|
            enum_config[:enum_values].each do |value|
              scopes << "    { name: '#{value}', conditions: { #{enum_config[:column]}: '#{value}' }, description: 'Filter by #{enum_config[:column]} = #{value}' }"
            end
          end
        end

        scopes.join(",\n")
      end

      def build_factory_exports(class_name, model_name)
        type_name = "#{class_name}Type"

        <<~TYPESCRIPT
          /**
           * Factory instances for #{class_name} (Rails-idiomatic naming)
           *#{' '}
           * #{class_name} = ActiveRecord-style class (primary interface)
           * #{type_name} = TypeScript interface (data structure)
           *#{' '}
           * Generated .ts files provide only ActiveRecord (non-reactive) models.
           * For reactive models in Svelte components, import the reactive factory:
           *#{' '}
           * ```typescript
           * // In Svelte components (.svelte files):
           * import { ModelFactory } from '$lib/record-factory/model-factory.svelte';
           * import { #{model_name}Config } from '$lib/models/generated/#{model_name}';
           * const #{class_name}Reactive = ModelFactory.createReactiveModel<#{type_name}>(#{model_name}Config);
           * ```
           */
          export const #{class_name} = ModelFactory.createActiveModel<#{type_name}>(#{model_name}Config);

          // Default export for convenience (ActiveRecord class)
          export default #{class_name};

          // Export configuration for use in Svelte components
          export { #{model_name}Config };

          // Re-export the interface type
          export type { #{type_name} };
        TYPESCRIPT
      end

      def map_rails_type_to_typescript(rails_type, column)
        # Check for enum first, regardless of underlying type
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
          "string" # ISO date strings from Zero.js
        when "date"
          "string" # ISO date strings
        when "time"
          "string" # Time strings
        when "json", "jsonb"
          "any" # Could be more specific based on usage
        when "uuid"
          "string"
        when "binary"
          "Uint8Array"
        else
          "any" # Fallback for unknown types
        end
      end

      def write_model_file(model_name, content)
        output_path = File.join(Rails.root, options[:output_dir])
        file_path = File.join(output_path, "#{model_name}.ts")

        File.write(file_path, content)
        file_path
      end

      def generate_index_file(generated_models)
        return if generated_models.empty?

        exports = generated_models.map do |model|
          class_name = model[:class_name]
          type_name = "#{class_name}Type"
          file_name = model[:model_name]

          "export { #{class_name}, #{model[:model_name]}Config, type #{type_name} } from './#{file_name}';"
        end.join("\n")

        index_content = <<~TYPESCRIPT
          /*
           * ⚠️  WARNING: AUTO-GENERATED FILE - DO NOT EDIT! ⚠️
           *#{' '}
           * This file was automatically generated from Rails schema introspection.
           * Any manual changes will be lost when the generator runs again.
           *#{' '}
           * Generated: #{Time.current.strftime("%Y-%m-%d %H:%M:%S UTC")}
           * Generator: rails generate zero:factory_models
           *#{' '}
           * To regenerate: bin/rails generate zero:factory_models
           *#{' '}
           * Rails-idiomatic naming:
           * - ActivityLog = ActiveRecord-style class (primary interface)
           * - ActivityLogType = TypeScript interface (data structure)
           */

          // Auto-generated exports for all factory models
          #{exports}

          // Convenience object for dynamic access (ActiveRecord models)
          export const Models = {
          #{generated_models.map { |m| "  #{m[:class_name]}: #{m[:class_name]}" }.join(",\n")}
          };
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
          say "\n✅ FACTORY MODELS GENERATION COMPLETED", :green
        end

        if result[:generated_models].any?
          say "\n📋 Generated factory models:", :green
          result[:generated_models].each do |model|
            say "  ✅ #{model[:class_name]} (#{model[:table_name]})", :green
          end
        end

        if result[:errors].any?
          say "\n❌ Errors encountered:", :red
          result[:errors].each do |error|
            say "  - #{error}", :red
          end
        end

        unless options[:dry_run]
          if result[:generated_files].any?
            say "\n📁 Files created:", :blue
            result[:generated_files].each do |file|
              say "  📄 #{File.basename(file)}", :blue
            end

            say "\n📄 Also created: index.ts", :blue
          end

          say "\n🎉 TypeScript factory models are ready to use!", :green
          say "Import them in your components:", :blue

          if result[:generated_models].any?
            example_model = result[:generated_models].first
            class_name = example_model[:class_name]

            say <<~USAGE, :blue

              // Svelte component (reactive)
              import { #{class_name} } from '$lib/models/generated/#{example_model[:model_name]}';
              const #{example_model[:model_name]} = #{class_name}.find('123');
              $: console.log('#{class_name}:', #{example_model[:model_name]}.record);

              // Vanilla JS (performant)
              import { #{class_name}Active } from '$lib/models/generated/#{example_model[:model_name]}';
              const #{example_model[:model_name]}Active = #{class_name}Active.find('123');
              #{example_model[:model_name]}Active.subscribe(data => console.log(data));
            USAGE
          end
        end
      end
    end
  end
end
