# frozen_string_literal: true

require_relative "file_writer"
require_relative "semantic_comparator"

module Zero
  module Generators
    # Simplified file management service for ActiveModelsGenerator
    #
    # This is a compatibility wrapper around FileWriter that maintains the
    # existing interface while delegating to the new focused architecture.
    # All formatting is handled by FormattingStage, semantic comparison by
    # SemanticComparator, and actual file I/O by FileWriter.
    #
    # @example Basic usage
    #   file_manager = FileManager.new(options, shell, output_dir)
    #   file_manager.write_with_formatting("user.ts", content)
    #
    # @example Advanced usage with statistics
    #   stats = file_manager.statistics
    #   puts "Created: #{stats[:created]}, Skipped: #{stats[:identical]}"
    #
    # @deprecated Use FileWriter directly for new code
    class FileManager
      # File operation result codes for backward compatibility
      OPERATION_RESULTS = {
        created: :created,
        identical: :identical,
        error: :error
      }.freeze

      attr_reader :options, :shell, :output_dir, :file_writer

      # Initialize FileManager with configuration
      #
      # @param options [Hash] Generator options (dry_run, force, verbose, etc.)
      # @param shell [Thor::Shell] Shell instance for output formatting
      # @param output_dir [String] Base output directory path
      def initialize(options, shell, output_dir)
        @options = options || {}
        @shell = shell
        @output_dir = output_dir

        # Delegate to FileWriter with shell-aware options
        writer_options = build_writer_options(options, shell)
        @file_writer = FileWriter.new(output_dir, writer_options)
      end

      # Write file with semantic comparison (formatting handled by FormattingStage)
      #
      # @param relative_path [String] File path relative to output directory
      # @param content [String] File content to write (should already be formatted)
      # @param format [Boolean] Ignored - formatting handled by FormattingStage
      # @param defer_write [Boolean] Ignored - batching handled by FormattingStage
      # @return [String] Absolute file path
      def write_with_formatting(relative_path, content, format: true, defer_write: false)
        # Delegate to FileWriter for actual file I/O
        result = @file_writer.write(relative_path, content)

        # Update legacy statistics format for backward compatibility
        update_legacy_statistics(result)

        # Provide shell feedback
        report_operation(result, relative_path)

        # Return absolute path for compatibility
        build_absolute_path(relative_path)
      end

      # Get statistics in legacy format for backward compatibility
      #
      # @return [Hash] Statistics hash matching legacy format
      def statistics
        writer_stats = @file_writer.statistics
        {
          created: writer_stats[:written],
          identical: writer_stats[:skipped],
          errors: writer_stats[:errors],
          directories_created: writer_stats[:directories_created],
          # Legacy formatting stats (no longer tracked)
          formatted: 0,
          batch_formatted: 0,
          batch_operations: 0
        }
      end

      # Reset statistics counters
      #
      # @return [Hash] Reset statistics hash
      def reset_statistics
        @file_writer.reset_statistics
      end

      # Legacy method for ensuring directory exists
      #
      # @param path [String] Directory path
      # @return [Boolean] True if successful
      def ensure_directory_exists(path)
        @file_writer.send(:ensure_directory_exists, path)
      end

      # Legacy method for semantic comparison check
      #
      # @return [Boolean] True if semantic comparison is enabled
      def semantic_comparison_enabled?
        !@options[:force] && !@options[:dry_run]
      end

      private

      # Build FileWriter options from FileManager options and shell
      #
      # @param options [Hash] Original options
      # @param shell [Thor::Shell] Shell instance
      # @return [Hash] FileWriter-compatible options
      def build_writer_options(options, shell)
        {
          dry_run: options[:dry_run],
          force: options[:force],
          verbose: shell ? true : false,
          quiet: true  # Suppress FileWriter's own logging since FileManager handles it
        }
      end

      # Update legacy statistics for backward compatibility
      #
      # @param result [Symbol] FileWriter operation result
      def update_legacy_statistics(result)
        # FileWriter already updates its own statistics
        # This method is for future compatibility hooks
      end

      # Report operation to shell for user feedback
      #
      # @param result [Symbol] Operation result
      # @param relative_path [String] File path for reporting
      def report_operation(result, relative_path)
        return unless @shell

        case result
        when :created
          @shell.say_status(:create, relative_path, :green)
        when :identical
          @shell.say_status(:identical, relative_path, :blue)
        when :error
          @shell.say_status(:error, relative_path, :red)
        end
      end

      # Build absolute path from relative path
      #
      # @param relative_path [String] Relative file path
      # @return [String] Absolute file path
      def build_absolute_path(relative_path)
        @file_writer.send(:build_full_path, relative_path)
      end
    end
  end
end
