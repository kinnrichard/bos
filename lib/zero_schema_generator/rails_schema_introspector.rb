# frozen_string_literal: true

module ZeroSchemaGenerator
  class RailsSchemaIntrospector
    # Tables to exclude from Zero schema generation
    EXCLUDED_TABLES = %w[
      solid_cache_entries
      solid_queue_jobs
      solid_queue_blocked_executions
      solid_queue_claimed_executions
      solid_queue_failed_executions
      solid_queue_paused_executions
      solid_queue_ready_executions
      solid_queue_recurring_executions
      solid_queue_scheduled_executions
      solid_queue_semaphores
      solid_queue_processes
      solid_queue_pauses
      solid_queue_recurring_tasks
      solid_cable_messages
      refresh_tokens
      revoked_tokens
      unique_ids
      ar_internal_metadata
      schema_migrations
      versions
    ].freeze

    def initialize
      @connection = ActiveRecord::Base.connection
    end

    def extract_schema
      {
        tables: extract_tables,
        relationships: extract_relationships,
        indexes: extract_indexes,
        constraints: extract_constraints
      }
    end

    private

    def extract_tables
      @connection.tables.map do |table_name|
        next if excluded_table?(table_name)

        {
          name: table_name,
          columns: extract_columns(table_name),
          primary_key: extract_primary_key(table_name),
          foreign_keys: extract_foreign_keys(table_name)
        }
      end.compact
    end

    def extract_columns(table_name)
      @connection.columns(table_name).map do |column|
        {
          name: column.name,
          type: column.type,
          sql_type: column.sql_type,
          null: column.null,
          default: column.default,
          comment: column.comment,
          enum: enum_column?(table_name, column.name),
          enum_values: enum_values_for_column(table_name, column.name)
        }
      end
    end

    def extract_primary_key(table_name)
      @connection.primary_key(table_name)
    end

    def extract_foreign_keys(table_name)
      @connection.foreign_keys(table_name).map do |fk|
        {
          name: fk.name,
          from_table: fk.from_table,
          from_column: fk.column,
          to_table: fk.to_table,
          to_column: fk.primary_key,
          on_delete: fk.on_delete,
          on_update: fk.on_update
        }
      end
    end

    def extract_relationships
      # Extract ActiveRecord model relationships
      models = discover_models

      models.map do |model_class|
        next unless model_class.table_exists?

        {
          model: model_class.name,
          table: model_class.table_name,
          belongs_to: extract_belongs_to(model_class),
          has_many: extract_has_many(model_class),
          has_one: extract_has_one(model_class),
          polymorphic: extract_polymorphic(model_class)
        }
      end.compact
    end

    def extract_indexes
      # Extract database indexes (not covered by foreign keys)
      indexes = {}

      @connection.tables.each do |table_name|
        next if excluded_table?(table_name)

        indexes[table_name] = @connection.indexes(table_name).map do |index|
          {
            name: index.name,
            columns: index.columns,
            unique: index.unique,
            using: index.try(:using),
            where: index.try(:where)
          }
        end
      end

      indexes
    end

    def extract_constraints
      # Extract check constraints and other constraints
      # This is PostgreSQL-specific implementation
      return {} unless postgresql?

      constraints_sql = <<~SQL
        SELECT#{' '}
          tc.table_name,
          tc.constraint_name,
          tc.constraint_type,
          cc.check_clause
        FROM information_schema.table_constraints tc
        LEFT JOIN information_schema.check_constraints cc#{' '}
          ON tc.constraint_name = cc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type IN ('CHECK', 'UNIQUE')
        ORDER BY tc.table_name, tc.constraint_name;
      SQL

      result = @connection.execute(constraints_sql)

      constraints = {}
      result.each do |row|
        table_name = row["table_name"]
        next if excluded_table?(table_name)

        constraints[table_name] ||= []
        constraints[table_name] << {
          name: row["constraint_name"],
          type: row["constraint_type"],
          definition: row["check_clause"]
        }
      end

      constraints
    end

    def excluded_table?(table_name)
      EXCLUDED_TABLES.include?(table_name)
    end

    def enum_column?(table_name, column_name)
      # Check if this column is defined as an enum in Rails models
      model_class = find_model_for_table(table_name)
      return false unless model_class

      model_class.defined_enums.key?(column_name)
    end

    def enum_values_for_column(table_name, column_name)
      model_class = find_model_for_table(table_name)
      return [] unless model_class&.defined_enums&.key?(column_name)

      model_class.defined_enums[column_name].keys
    end

    def find_model_for_table(table_name)
      # Find ActiveRecord model class for table
      model_name = table_name.classify
      return nil unless Object.const_defined?(model_name)

      model_class = Object.const_get(model_name)
      return nil unless model_class < ActiveRecord::Base
      return nil unless model_class.table_name == table_name

      model_class
    rescue NameError
      nil
    end

    def discover_models
      # Avoid eager loading that causes issues, just discover known models
      model_names = %w[User Client Job Task Person Device Note ActivityLog ContactMethod ScheduledDateTime JobAssignment JobPerson]

      model_names.map do |name|
        begin
          model_class = Object.const_get(name)
          model_class if model_class < ActiveRecord::Base && model_class.table_exists?
        rescue NameError, ActiveRecord::StatementInvalid
          nil
        end
      end.compact
    end

    def extract_belongs_to(model_class)
      model_class.reflections.select { |_, r| r.macro == :belongs_to }.map do |name, reflection|
        {
          name: name,
          foreign_key: reflection.foreign_key,
          target_table: reflection.polymorphic? ? nil : safe_table_name(reflection),
          target_class: reflection.polymorphic? ? nil : reflection.class_name,
          optional: reflection.options[:optional] || false,
          polymorphic: reflection.polymorphic?
        }
      end
    end

    def extract_has_many(model_class)
      model_class.reflections.select { |_, r| r.macro == :has_many }.map do |name, reflection|
        {
          name: name,
          foreign_key: reflection.foreign_key,
          target_table: safe_table_name(reflection),
          target_class: reflection.class_name,
          through: reflection.through_reflection&.name,
          dependent: reflection.options[:dependent]
        }
      end
    end

    def extract_has_one(model_class)
      model_class.reflections.select { |_, r| r.macro == :has_one }.map do |name, reflection|
        {
          name: name,
          foreign_key: reflection.foreign_key,
          target_table: safe_table_name(reflection),
          target_class: reflection.class_name,
          dependent: reflection.options[:dependent]
        }
      end
    end

    def extract_polymorphic(model_class)
      model_class.reflections.select { |_, r| r.polymorphic? }.map do |name, reflection|
        {
          name: name,
          type_column: "#{name}_type",
          id_column: "#{name}_id",
          strategy: :polymorphic_union,
          foreign_key: reflection.foreign_key,
          foreign_type: reflection.foreign_type
        }
      end
    end

    def postgresql?
      @connection.adapter_name.downcase == "postgresql"
    end

    def safe_table_name(reflection)
      return nil if reflection.polymorphic?

      begin
        reflection.table_name
      rescue => e
        Rails.logger.warn "Could not determine table name for reflection #{reflection.name}: #{e.message}"
        nil
      end
    end
  end
end
