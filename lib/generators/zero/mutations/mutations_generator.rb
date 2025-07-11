# frozen_string_literal: true

require "rails/generators"
require_relative "../../../zero_schema_generator/mutation_generator"
require_relative "../../../zero_schema_generator/mutation_config"

module Zero
  module Generators
    class MutationsGenerator < Rails::Generators::Base
      desc "Generate Zero mutations from Rails schema"

      class_option :dry_run, type: :boolean, default: false,
                   desc: "Show what would be generated without creating files"
      class_option :force, type: :boolean, default: false,
                   desc: "Force generation even if conflicts are detected"
      class_option :table, type: :string,
                   desc: "Generate mutations for specific table only"
      class_option :config, type: :string,
                   desc: "Path to custom configuration file"
      class_option :exclude_tables, type: :array, default: [],
                   desc: "Tables to exclude from generation"
      class_option :exclude_patterns, type: :hash, default: {},
                   desc: "Patterns to exclude per table"

      def generate_mutations
        say "🔍 Generating Zero mutations from Rails schema...", :green

        # Load configuration
        config_path = options[:config]
        config = if config_path && File.exist?(config_path)
          ZeroSchemaGenerator::MutationConfig.load_from_file(config_path)
        else
          ZeroSchemaGenerator::MutationConfig.new
        end

        # Apply command-line options to config
        apply_command_options_to_config(config)

        # Initialize generator
        generator = ZeroSchemaGenerator::MutationGenerator.new(config)

        begin
          # Generate mutations
          result = generator.generate_mutations(
            dry_run: options[:dry_run],
            force: options[:force]
          )

          # Output results
          output_generation_results(result)

          # Save config if it was created with overrides
          if command_line_overrides_present?
            config.save_to_file
            say "💾 Configuration saved to #{config.class.default_config_path}", :blue
          end

        rescue => e
          say "❌ Generation failed: #{e.message}", :red
          say e.backtrace.first(5).join("\n"), :red if Rails.env.development?
          exit 1
        end
      end

      private

      def apply_command_options_to_config(config)
        # Apply exclude tables
        if options[:exclude_tables].any?
          config.exclude_tables.concat(options[:exclude_tables])
        end

        # Apply exclude patterns
        if options[:exclude_patterns].any?
          config.exclude_patterns.merge!(options[:exclude_patterns])
        end

        # Apply dry run and force
        config.dry_run = options[:dry_run]
        config.force_generation = options[:force]

        # If specific table requested, exclude all others
        if options[:table]
          all_tables = get_all_table_names
          tables_to_exclude = all_tables - [ options[:table] ]
          config.exclude_tables.concat(tables_to_exclude)
        end
      end

      def command_line_overrides_present?
        options[:exclude_tables].any? ||
        options[:exclude_patterns].any? ||
        options[:table].present?
      end

      def get_all_table_names
        introspector = ZeroSchemaGenerator::RailsSchemaIntrospector.new
        schema_data = introspector.extract_schema
        schema_data[:tables].map { |table| table[:name] }
      end

      def output_generation_results(result)
        if result[:dry_run]
          say "\n🔍 DRY RUN COMPLETED", :yellow
          say "Run without --dry-run to actually generate files", :yellow
        else
          say "\n✅ GENERATION COMPLETED", :green
        end

        if result[:generated_tables].any?
          say "\n📋 Generated mutations for:", :green
          result[:generated_tables].each do |table|
            say "  ✅ #{table}", :green
          end
        end

        if result[:skipped_tables].any?
          say "\n⏭️ Skipped tables:", :yellow
          result[:skipped_tables].each do |table|
            say "  - #{table}", :yellow
          end
        end

        if result[:errors].any?
          say "\n❌ Errors encountered:", :red
          result[:errors].each do |error|
            say "  - #{error}", :red
          end
        end

        unless result[:dry_run]
          if result[:generated_files].any?
            say "\n📁 Files created/updated:", :blue
            result[:generated_files].each do |file|
              say "  📄 #{File.basename(file)}", :blue
            end
          end

          say "\n🎉 Zero mutations are ready to use!", :green
          say "Import them in your components:", :blue
          say "  import { createUser, updateUser } from '$lib/zero/user';", :blue
        end
      end
    end
  end
end
