# frozen_string_literal: true

require_relative "rails_schema_introspector"
require_relative "mutation_config"

module ZeroSchemaGenerator
  class MutationGenerator
    def initialize(config = nil)
      @config = config || MutationConfig.new
      @introspector = RailsSchemaIntrospector.new
      @generated_files = []
      @dry_run_output = []
    end

    def generate_mutations(options = {})
      # Override config with command-line options
      @config.dry_run = options[:dry_run] if options.key?(:dry_run)
      @config.force_generation = options[:force] if options.key?(:force)

      # Validate configuration
      validation_result = @config.validate_configuration
      unless validation_result[:valid]
        raise "Configuration validation failed:\n#{validation_result[:errors].join("\n")}"
      end

      if validation_result[:warnings].any?
        puts "⚠️ Configuration warnings:"
        validation_result[:warnings].each { |warning| puts "  - #{warning}" }
      end

      # Extract schema and patterns
      puts "🔍 Analyzing Rails schema and detecting patterns..."
      schema_data = @introspector.extract_schema

      # Detect existing mutation files
      existing_files = @config.detect_existing_mutation_files
      if existing_files.any? && !@config.force_generation
        puts "📁 Found existing mutation files:"
        existing_files.each do |file_info|
          puts "  - #{file_info[:name]}.ts (#{file_info[:size]} bytes, modified #{file_info[:modified].strftime('%Y-%m-%d %H:%M')})"
        end
      end

      # Generate mutations for each table
      generation_summary = {
        generated_tables: [],
        skipped_tables: [],
        errors: [],
        dry_run: @config.dry_run,
        generated_files: []
      }

      schema_data[:tables].each do |table|
        table_name = table[:name]
        table_patterns = schema_data[:patterns][table_name] || {}

        # Check exclusions
        if @config.should_exclude_table?(table_name)
          generation_summary[:skipped_tables] << "#{table_name} (excluded via config)"
          next
        end

        # Check if regeneration needed (incremental generation)
        unless @config.should_regenerate_table?(table_name, table_patterns)
          generation_summary[:skipped_tables] << "#{table_name} (no changes detected)"
          next
        end

        begin
          result = generate_table_mutations(table, table_patterns)
          if result[:generated]
            generation_summary[:generated_tables] << table_name
            generation_summary[:generated_files].concat(result[:files])
          else
            generation_summary[:skipped_tables] << "#{table_name} (#{result[:reason]})"
          end
        rescue => e
          generation_summary[:errors] << "#{table_name}: #{e.message}"
          puts "❌ Error generating mutations for #{table_name}: #{e.message}"
        end
      end

      # Output summary
      output_generation_summary(generation_summary)

      if @config.dry_run
        puts "\n📝 Dry-run output preview:"
        @dry_run_output.each { |output| puts output }
      end

      generation_summary
    end

    def generate_table_mutations(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize

      # Skip if no meaningful patterns detected
      if patterns.empty?
        return { generated: false, reason: "no patterns detected" }
      end

      files_to_generate = []

      # Generate .generated.ts file
      generated_content = generate_generated_file(table, patterns)
      generated_file_path = File.join(@config.output_directory, "#{singular_name}.generated.ts")
      files_to_generate << { path: generated_file_path, content: generated_content, type: "generated" }

      # Generate .custom.ts file (only if it doesn't exist)
      custom_file_path = File.join(@config.output_directory, "#{singular_name}.custom.ts")
      unless File.exist?(custom_file_path)
        custom_content = generate_custom_template(table, patterns)
        files_to_generate << { path: custom_file_path, content: custom_content, type: "custom" }
      end

      # Generate main .ts file (merger)
      main_file_path = File.join(@config.output_directory, "#{singular_name}.ts")
      main_content = generate_main_file(table, patterns)
      files_to_generate << { path: main_file_path, content: main_content, type: "main" }

      # Write files (or dry-run)
      written_files = []
      files_to_generate.each do |file_info|
        if @config.dry_run
          @dry_run_output << "\n=== #{file_info[:path]} ==="
          @dry_run_output << file_info[:content]
        else
          # Check for conflicts on generated files
          if file_info[:type] == "generated" && File.exist?(file_info[:path])
            existing_content = File.read(file_info[:path])
            unless file_generated_by_us?(existing_content)
              raise "Generated file #{file_info[:path]} appears to have manual modifications. Use --force to overwrite."
            end
          end

          File.write(file_info[:path], file_info[:content])
          written_files << file_info[:path]
          puts "✅ Generated #{File.basename(file_info[:path])}"
        end
      end

      # Update manifest for incremental generation
      unless @config.dry_run
        @config.update_table_manifest(table_name, patterns, written_files)
      end

      { generated: true, files: written_files }
    end

    private

    def generate_generated_file(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize

      imports = [ "import { getZero } from './client';" ]

      mutations = []

      # Generate basic CRUD mutations
      mutations << generate_create_mutation(table, patterns)
      mutations << generate_update_mutation(table, patterns)
      mutations << generate_delete_mutation(table, patterns)
      mutations << generate_upsert_mutation(table, patterns)

      # Generate pattern-specific mutations
      if patterns[:positioning]
        mutations.concat(generate_positioning_mutations(table, patterns[:positioning]))
      end

      if patterns[:soft_deletion]
        mutations << generate_restore_mutation(table, patterns[:soft_deletion])
      end

      header = generate_file_header("generated")

      <<~TYPESCRIPT
        #{header}

        #{imports.join("\n")}

        // Generated CRUD mutations for #{table_name}

        #{mutations.join("\n\n")}
      TYPESCRIPT
    end

    def generate_custom_template(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize

      header = generate_file_header("custom")

      examples = []

      if patterns[:soft_deletion]
        examples << generate_hard_delete_example(table)
      end

      if patterns[:enums]
        examples << generate_enum_transition_example(table, patterns[:enums])
      end

      <<~TYPESCRIPT
        #{header}

        import { getZero } from './client';

        // Custom mutations for #{table_name}
        // Add your custom business logic here

        #{examples.join("\n\n")}

        // Example: Custom validation mutation
        // export async function validateAndUpdate#{singular_name.classify}(id: string, data: any) {
        //   // Add custom validation logic
        //   // Then call standard update
        //   return update#{singular_name.classify}(id, data);
        // }
      TYPESCRIPT
    end

    def generate_main_file(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize

      header = generate_file_header("main")

      <<~TYPESCRIPT
        #{header}

        // Main export file for #{table_name} mutations
        // This file merges generated and custom mutations

        // Export all generated mutations
        export * from './#{singular_name}.generated';

        // Export all custom mutations#{'  '}
        export * from './#{singular_name}.custom';

        // Note: Custom mutations with the same name will override generated ones
      TYPESCRIPT
    end

    def generate_create_mutation(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      # Build parameter interface based on table columns
      required_fields = []
      optional_fields = []

      table[:columns].each do |column|
        next if column[:name] == "id" || column[:name] == table[:primary_key]
        next if %w[created_at updated_at].include?(column[:name])

        # Handle pattern-specific fields
        if patterns[:soft_deletion] && column[:name] == "deleted_at"
          next # Skip deleted_at in create
        end

        if patterns[:positioning] && column[:name] == "position"
          optional_fields << "#{column[:name]}?: number"
          next
        end

        ts_type = rails_type_to_typescript(column)
        if column[:null]
          optional_fields << "#{column[:name]}?: #{ts_type}"
        else
          required_fields << "#{column[:name]}: #{ts_type}"
        end
      end

      params = (required_fields + optional_fields).join(";\n  ")

      <<~TYPESCRIPT
        /**
         * Create a new #{singular_name}
         */
        export async function create#{class_name}(data: {
          #{params}
        }) {
          const zero = getZero();
          const id = crypto.randomUUID();
          const now = Date.now();

          await zero.mutate.#{table_name}.insert({
            id,
            ...data,
            created_at: now,
            updated_at: now,
          });

          return { id };
        }
      TYPESCRIPT
    end

    def generate_update_mutation(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      <<~TYPESCRIPT
        /**
         * Update a #{singular_name}
         */
        export async function update#{class_name}(id: string, data: Partial<{
          // Add updateable fields here based on table columns
          [key: string]: any;
        }>) {
          const zero = getZero();
          const now = Date.now();

          await zero.mutate.#{table_name}.update({
            id,
            ...data,
            updated_at: now,
          });

          return { id };
        }
      TYPESCRIPT
    end

    def generate_delete_mutation(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      if patterns[:soft_deletion]
        # Generate soft delete
        <<~TYPESCRIPT
          /**
           * #{@config.get_custom_name('softDelete').humanize} a #{singular_name} (soft deletion)
           */
          export async function #{@config.get_custom_name('delete')}#{class_name}(id: string) {
            const zero = getZero();
            const now = Date.now();

            await zero.mutate.#{table_name}.update({
              id,
              deleted_at: now,
              updated_at: now,
            });

            return { id };
          }
        TYPESCRIPT
      else
        # Generate hard delete
        <<~TYPESCRIPT
          /**
           * Delete a #{singular_name} (permanent deletion)
           */
          export async function delete#{class_name}(id: string) {
            const zero = getZero();

            await zero.mutate.#{table_name}.delete({
              id
            });

            return { id };
          }
        TYPESCRIPT
      end
    end

    def generate_upsert_mutation(table, patterns)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      <<~TYPESCRIPT
        /**
         * Create or update a #{singular_name}
         */
        export async function upsert#{class_name}(data: any) {
          const zero = getZero();
          const now = Date.now();

          await zero.mutate.#{table_name}.upsert({
            ...data,
            updated_at: now,
          });

          return { id: data.id };
        }
      TYPESCRIPT
    end

    def generate_restore_mutation(table, soft_deletion_pattern)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      restore_name = @config.get_custom_name("restore")

      <<~TYPESCRIPT
        /**
         * #{restore_name.humanize} a soft-deleted #{singular_name}
         */
        export async function #{restore_name}#{class_name}(id: string) {
          const zero = getZero();
          const now = Date.now();

          await zero.mutate.#{table_name}.update({
            id,
            deleted_at: null,
            updated_at: now,
          });

          return { id };
        }
      TYPESCRIPT
    end

    def generate_positioning_mutations(table, positioning_pattern)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      positioning_pattern[:methods].map do |method_name|
        custom_name = @config.get_custom_name(method_name)

        case method_name
        when "move_before"
          <<~TYPESCRIPT
            /**
             * Move #{singular_name} before another #{singular_name}
             */
            export async function #{custom_name.camelize(:lower)}#{class_name}(id: string, targetId: string) {
              const zero = getZero();
              const now = Date.now();
            #{'  '}
              // Implementation would calculate new position based on target
              // This is a placeholder - full implementation needed
            #{'  '}
              await zero.mutate.#{table_name}.update({
                id,
                // position: calculated_position,
                updated_at: now,
              });

              return { id };
            }
          TYPESCRIPT
        when "move_after"
          <<~TYPESCRIPT
            /**
             * Move #{singular_name} after another #{singular_name}
             */
            export async function #{custom_name.camelize(:lower)}#{class_name}(id: string, targetId: string) {
              const zero = getZero();
              const now = Date.now();
            #{'  '}
              // Implementation would calculate new position based on target
              // This is a placeholder - full implementation needed
            #{'  '}
              await zero.mutate.#{table_name}.update({
                id,
                // position: calculated_position,
                updated_at: now,
              });

              return { id };
            }
          TYPESCRIPT
        when "move_to_top"
          <<~TYPESCRIPT
            /**
             * Move #{singular_name} to first position
             */
            export async function #{custom_name.camelize(:lower)}#{class_name}(id: string) {
              const zero = getZero();
              const now = Date.now();
            #{'  '}
              await zero.mutate.#{table_name}.update({
                id,
                position: 0,
                updated_at: now,
              });

              return { id };
            }
          TYPESCRIPT
        when "move_to_bottom"
          <<~TYPESCRIPT
            /**
             * Move #{singular_name} to last position#{'  '}
             */
            export async function #{custom_name.camelize(:lower)}#{class_name}(id: string) {
              const zero = getZero();
              const now = Date.now();
            #{'  '}
              // Implementation would query for max position
              // This is a placeholder - full implementation needed
            #{'  '}
              await zero.mutate.#{table_name}.update({
                id,
                // position: max_position + 1,
                updated_at: now,
              });

              return { id };
            }
          TYPESCRIPT
        end
      end
    end

    def generate_hard_delete_example(table)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      <<~TYPESCRIPT
        // Example: Hard delete (permanent removal)
        // export async function hardDelete#{class_name}(id: string) {
        //   const zero = getZero();
        //   await zero.mutate.#{table_name}.delete({ id });
        //   return { id };
        // }
      TYPESCRIPT
    end

    def generate_enum_transition_example(table, enum_patterns)
      table_name = table[:name]
      singular_name = table_name.singularize
      class_name = singular_name.classify

      # Get first enum as example
      enum_pattern = enum_patterns.first
      enum_column = enum_pattern[:column]

      <<~TYPESCRIPT
        // Example: Status transition with business logic
        // export async function transition#{class_name}Status(
        //   id: string,#{' '}
        //   newStatus: '#{enum_pattern[:enum_values].join("' | '")}'
        // ) {
        //   // Add validation logic here
        //   // Check current status, validate transition
        //#{'   '}
        //   return update#{class_name}(id, { #{enum_column}: newStatus });
        // }
      TYPESCRIPT
    end

    def generate_file_header(file_type)
      case file_type
      when "generated"
        <<~TYPESCRIPT
          // 🤖 AUTO-GENERATED ZERO MUTATIONS
          // Generated at: #{Time.current.iso8601}
          //
          // ⚠️  DO NOT EDIT THIS FILE DIRECTLY
          // This file is automatically generated. Manual changes will be overwritten.
          //
          // 🔧 FOR CUSTOMIZATIONS:
          // Use the corresponding .custom.ts file for your custom mutations
          //
          // 🔄 TO REGENERATE: Run `rails generate zero:mutations`
        TYPESCRIPT
      when "custom"
        <<~TYPESCRIPT
          // ✏️ CUSTOM ZERO MUTATIONS
          // Add your custom mutation logic here
          //
          // 💡 This file is safe to edit - it won't be overwritten by generation
          //
          // 🔗 You can override generated mutations by exporting functions with the same name
          // 📚 Docs: https://zero.rocicorp.dev/docs/mutations
        TYPESCRIPT
      when "main"
        <<~TYPESCRIPT
          // 🔄 ZERO MUTATIONS MERGER
          // This file combines generated and custom mutations
          //
          // ⚠️  This file is automatically regenerated - do not edit directly
          //
          // Import this file to get access to all mutations:
          // import { createUser, updateUser, customUserLogic } from './user';
        TYPESCRIPT
      end
    end

    def file_generated_by_us?(content)
      content.include?("🤖 AUTO-GENERATED ZERO MUTATIONS") ||
      content.include?("🔄 ZERO MUTATIONS MERGER")
    end

    def rails_type_to_typescript(column)
      case column[:type]
      when :uuid, :string, :text
        "string"
      when :integer, :bigint, :decimal, :float, :datetime
        "number"
      when :boolean
        "boolean"
      when :jsonb, :json
        "any"
      else
        "string"
      end
    end

    def output_generation_summary(summary)
      puts "\n📊 Mutation Generation Summary"
      puts "=" * 50

      if summary[:dry_run]
        puts "🔍 DRY RUN MODE - No files were actually created"
      end

      puts "✅ Generated: #{summary[:generated_tables].size} tables"
      summary[:generated_tables].each { |table| puts "  - #{table}" }

      if summary[:skipped_tables].any?
        puts "⏭️ Skipped: #{summary[:skipped_tables].size} tables"
        summary[:skipped_tables].each { |table| puts "  - #{table}" }
      end

      if summary[:errors].any?
        puts "❌ Errors: #{summary[:errors].size}"
        summary[:errors].each { |error| puts "  - #{error}" }
      end

      unless summary[:dry_run]
        puts "📁 Files generated: #{summary[:generated_files].size}"
        summary[:generated_files].each { |file| puts "  - #{File.basename(file)}" }
      end
    end
  end
end
