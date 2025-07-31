# frozen_string_literal: true

require "rails/generators"
require_relative "generation_coordinator"

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
        # Delegate all orchestration to GenerationCoordinator
        coordinator = GenerationCoordinator.new(options, shell)
        coordinator.execute
      end

      private

      # Override Thor's default behavior for non-interactive mode
      def file_collision(destination)
        options[:force] ? :force : super
      end
      end
  end
end
