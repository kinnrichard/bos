# frozen_string_literal: true

require_relative "rails_schema_introspector"
require_relative "type_mapper"

module ZeroSchemaGenerator
  class ZeroSchemaGenerator
    def initialize(config = {})
      @config = config
      @introspector = RailsSchemaIntrospector.new
      @type_mapper = TypeMapper.new(config)
      @output_path = config[:schema_file] || default_schema_path
      @types_path = config[:types_file] || default_types_path
    end

    def generate_schema(rails_schema = nil)
      puts "🔍 Analyzing Rails schema..."
      rails_schema ||= @introspector.extract_schema

      puts "🔄 Converting to Zero format..."
      zero_schema = build_zero_schema(rails_schema)

      puts "📝 Writing schema files..."
      write_schema_files(zero_schema)

      {
        schema_content: zero_schema,
        schema_path: @output_path,
        types_path: @types_path,
        tables_count: rails_schema[:tables].count,
        generated_at: Time.current
      }
    end

    def write_schema_files(zero_schema)
      # Ensure output directory exists
      FileUtils.mkdir_p(File.dirname(@output_path))
      FileUtils.mkdir_p(File.dirname(@types_path)) if @types_path != @output_path

      # Write main schema file
      File.write(@output_path, zero_schema)

      # Generate TypeScript types file if different path
      if @types_path != @output_path
        types_content = generate_typescript_types
        File.write(@types_path, types_content)
      end
    end

    private

    def build_zero_schema(rails_schema)
      tables = rails_schema[:tables]
      relationships = rails_schema[:relationships]

      table_definitions = []
      table_names = []
      relationship_definitions = []
      relationship_names = []

      tables.each do |table|
        table_def = generate_table_definition(table)
        table_definitions << table_def
        table_names << table[:name].singularize
      end

      relationships.select(&:present?).each do |relationship_data|
        rel_def = generate_relationship_definition(relationship_data, table_names)
        if rel_def
          relationship_definitions << rel_def
          relationship_names << "#{relationship_data[:table].singularize}Relationships"
        end
      end

      generate_schema_template(table_definitions, table_names, relationship_definitions, relationship_names)
    end

    def generate_table_definition(table)
      columns = generate_columns(table)
      primary_key = table[:primary_key] || "id"
      table_name = table[:name].singularize

      <<~TYPESCRIPT
        // #{table[:name].humanize} table
        const #{table_name} = table('#{table[:name]}')
          .columns({
            #{columns.join(",\n    ")}
          })
          .primaryKey('#{primary_key}');
      TYPESCRIPT
    end

    def generate_columns(table)
      table[:columns].map do |column|
        # Add table context for type mapping
        column_with_context = column.merge(table_name: table[:name])

        zero_type = if column[:name] == table[:primary_key]
          @type_mapper.map_primary_key(column_with_context)
        else
          @type_mapper.map_column(column_with_context)
        end

        comment = column[:comment] ? " // #{column[:comment]}" : ""
        "#{column[:name]}: #{zero_type}#{comment}"
      end
    end

    def generate_relationship_definition(relationship_data, table_names)
      table_name = relationship_data[:table].singularize
      belongs_to_rels = relationship_data[:belongs_to] || []
      has_many_rels = relationship_data[:has_many] || []

      # Skip if no relationships or table not in our generated tables
      return nil unless table_names.include?(table_name)
      return nil if belongs_to_rels.empty? && has_many_rels.empty?

      relationships = []

      # Generate belongs_to relationships (one)
      belongs_to_rels.each do |rel|
        if rel[:polymorphic]
          # Handle polymorphic associations with multiple target relationships
          polymorphic_rels = generate_polymorphic_relationships(rel, table_names)
          relationships.concat(polymorphic_rels)
        elsif rel[:target_table] && table_names.include?(rel[:target_table].singularize)
          rel_name = rel[:name].to_s.camelize(:lower)
          relationships << generate_one_relationship(rel_name, rel[:foreign_key], rel[:target_table].singularize)
        end
      end

      # Generate has_many relationships (many)
      has_many_rels.each do |rel|
        next unless rel[:target_table] && table_names.include?(rel[:target_table].singularize)
        next if rel[:through] # Skip through relationships for now

        rel_name = rel[:name].to_s.camelize(:lower)
        relationships << generate_many_relationship(rel_name, rel[:foreign_key], rel[:target_table].singularize)
      end

      # Add self-referential children relationship if we have a parent relationship
      if belongs_to_rels.any? { |rel| rel[:target_table] == relationship_data[:table] && rel[:name].to_s.include?("parent") }
        relationships << generate_many_relationship("children", "parent_id", table_name)
      end

      return nil if relationships.empty?

      <<~TYPESCRIPT
        // #{relationship_data[:table].humanize} relationships
        const #{table_name}Relationships = relationships(#{table_name}, ({ one, many }) => ({
          #{relationships.join(",\n  ")}
        }));
      TYPESCRIPT
    end

    def generate_one_relationship(rel_name, foreign_key, target_table)
      <<~TYPESCRIPT.strip
        #{rel_name}: one({
          sourceField: ['#{foreign_key}'],
          destField: ['id'],
          destSchema: #{target_table},
        })
      TYPESCRIPT
    end

    def generate_many_relationship(rel_name, foreign_key, target_table)
      <<~TYPESCRIPT.strip
        #{rel_name}: many({
          sourceField: ['id'],
          destSchema: #{target_table},
          destField: ['#{foreign_key}'],
        })
      TYPESCRIPT
    end

    def generate_polymorphic_relationships(rel, table_names)
      # For polymorphic associations, create separate relationships for each possible target
      # Based on common Rails patterns: notable_type can be 'Job', 'Task', 'Client', etc.

      polymorphic_targets = case rel[:name].to_s
      when "notable"
        %w[job task client]
      when "loggable"
        %w[job task client user person]
      when "schedulable"
        %w[job task]
      else
        []
      end

      relationships = []
      polymorphic_targets.each do |target|
        next unless table_names.include?(target)

        # Create conditional relationship: notable_job, notable_task, etc.
        rel_name = "#{rel[:name]}#{target.classify}"
        relationships << generate_conditional_polymorphic_relationship(
          rel_name.camelize(:lower),
          rel[:foreign_key],
          rel[:foreign_type],
          target,
          target.classify
        )
      end

      relationships
    end

    def generate_conditional_polymorphic_relationship(rel_name, id_column, type_column, target_table, type_value)
      # Note: This is a simplified approach. Full polymorphic support would need
      # conditional queries based on the type column
      <<~TYPESCRIPT.strip
        #{rel_name}: one({
          sourceField: ['#{id_column}'],
          destField: ['id'],
          destSchema: #{target_table},
        })
      TYPESCRIPT
    end

    def generate_schema_template(table_definitions, table_names, relationship_definitions = [], relationship_names = [])
      imports = if relationship_definitions.any?
        <<~TYPESCRIPT.strip
          import {
            createSchema,
            table,
            string,
            number,
            boolean,
            json,
            relationships,
            type Zero
          } from '@rocicorp/zero';
        TYPESCRIPT
      else
        <<~TYPESCRIPT.strip
          import {
            createSchema,
            table,
            string,
            number,
            boolean,
            json,
            type Zero
          } from '@rocicorp/zero';
        TYPESCRIPT
      end

      relationships_section = if relationship_definitions.any?
        "\n\n#{relationship_definitions.join("\n\n")}"
      else
        ""
      end

      schema_relationships = if relationship_names.any?
        ",\n  relationships: [\n    #{relationship_names.join(",\n    ")}\n  ]"
      else
        ""
      end

      <<~TYPESCRIPT
        // Generated Zero Schema
        // Generated at: #{Time.current.iso8601}
        // DO NOT EDIT - This file is automatically generated from Rails schema

        #{imports}

        #{table_definitions.join("\n\n")}#{relationships_section}

        // Create the complete schema
        export const schema = createSchema({
          tables: [
            #{table_names.join(",\n    ")}
          ]#{schema_relationships}
        });

        export type ZeroClient = Zero<typeof schema>;

        // Table type exports for convenience
        #{generate_table_type_exports(table_names)}
      TYPESCRIPT
    end

    def generate_table_type_exports(table_names)
      table_names.map do |name|
        "export type #{name.classify} = typeof #{name}.inferZodType._type;"
      end.join("\n")
    end

    def generate_typescript_types
      # Generate separate TypeScript types file if needed
      rails_schema = @introspector.extract_schema

      type_definitions = rails_schema[:tables].map do |table|
        generate_table_type_definition(table)
      end

      <<~TYPESCRIPT
        // Generated TypeScript Types from Rails Schema
        // Generated at: #{Time.current.iso8601}
        // DO NOT EDIT - This file is automatically generated

        #{type_definitions.join("\n\n")}

        // Union types for easier usage
        export type TableNames = #{rails_schema[:tables].map { |t| "'#{t[:name]}'" }.join(' | ')};
        export type ModelNames = #{rails_schema[:tables].map { |t| "'#{t[:name].singularize}'" }.join(' | ')};
      TYPESCRIPT
    end

    def generate_table_type_definition(table)
      fields = table[:columns].map do |column|
        ts_type = rails_type_to_typescript(column)
        optional = column[:null] && column[:name] != table[:primary_key] ? "?" : ""
        comment = column[:comment] ? " // #{column[:comment]}" : ""
        "  #{column[:name]}#{optional}: #{ts_type};#{comment}"
      end

      <<~TYPESCRIPT
        export interface #{table[:name].classify} {
        #{fields.join("\n")}
        }
      TYPESCRIPT
    end

    def rails_type_to_typescript(column)
      case column[:type]
      when :uuid, :string, :text, :datetime, :date, :time
        "string"
      when :integer, :bigint, :decimal, :float
        "number"
      when :boolean
        "boolean"
      when :jsonb, :json
        "any" # Could be more specific based on usage
      else
        "string" # Safe fallback
      end
    end

    def default_schema_path
      Rails.root.join("frontend", "src", "lib", "zero", "generated-schema.ts").to_s
    end

    def default_types_path
      Rails.root.join("frontend", "src", "lib", "types", "generated.ts").to_s
    end

    def self.validate_schema(schema_content)
      # Basic validation of generated schema
      required_imports = [ "createSchema", "table", "string", "number", "boolean" ]
      missing_imports = required_imports.reject { |import| schema_content.include?(import) }

      errors = []
      errors << "Missing required imports: #{missing_imports.join(', ')}" if missing_imports.any?
      errors << "Missing schema export" unless schema_content.include?("export const schema")
      errors << "Missing ZeroClient type export" unless schema_content.include?("export type ZeroClient")

      {
        valid: errors.empty?,
        errors: errors
      }
    end
  end
end
