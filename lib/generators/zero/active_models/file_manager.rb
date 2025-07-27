# frozen_string_literal: true

require "fileutils"
require "tempfile"
require "pathname"
require "json"

module Zero
  module Generators
    # Comprehensive file management service for ActiveModelsGenerator
    #
    # Consolidates all file-related operations including:
    # - Content normalization and semantic comparison
    # - Smart file creation with change detection
    # - Prettier formatting integration
    # - Directory management
    # - File operation statistics
    #
    # @example Basic usage
    #   file_manager = FileManager.new(options, shell, output_dir)
    #   file_manager.write_with_formatting("user.ts", content)
    #
    # @example Advanced usage with statistics
    #   stats = file_manager.statistics
    #   puts "Created: #{stats[:created]}, Skipped: #{stats[:identical]}"
    class FileManager
      # Timestamp patterns for semantic content comparison
      TIMESTAMP_PATTERNS = [
        /^.*Generated from Rails schema: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^.*Generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^.*Auto-generated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} UTC.*$/i,
        /^\s*\*\s*Generated.*\d{4}-\d{2}-\d{2}.*$/i,
        /^\s*\/\/.*generated.*\d{4}-\d{2}-\d{2}.*$/i,
        /^\s*\/\/.*Auto-generated.*\d{4}-\d{2}-\d{2}.*$/i
      ].freeze

      # File operation result codes
      OPERATION_RESULTS = {
        created: :created,
        identical: :identical,
        error: :error
      }.freeze

      attr_reader :options, :shell, :output_dir, :statistics

      # Initialize FileManager with configuration
      #
      # @param options [Hash] Generator options (dry_run, skip_prettier, force, etc.)
      # @param shell [Thor::Shell] Shell instance for output formatting
      # @param output_dir [String] Base output directory path
      def initialize(options, shell, output_dir)
        @options = options || {}
        @shell = shell
        @output_dir = output_dir
        @statistics = {
          created: 0,
          identical: 0,
          errors: 0,
          formatted: 0,
          directories_created: 0
        }
        @frontend_root = detect_frontend_root
        @prettier_available = prettier_available?
      end

      # Write file with optional formatting and semantic comparison
      #
      # @param relative_path [String] File path relative to output directory
      # @param content [String] File content to write
      # @param format [Boolean] Whether to format with Prettier (default: true)
      # @return [String] Absolute file path
      def write_with_formatting(relative_path, content, format: true)
        file_path = if Pathname.new(output_dir).absolute?
                      File.join(output_dir, relative_path)
        else
                      File.join(Rails.root, output_dir, relative_path)
        end

        # Ensure directory exists
        ensure_directory_exists(File.dirname(file_path))

        # Format TypeScript content with Prettier if requested
        if format && should_format?(file_path) && !options[:dry_run]
          content = format_with_prettier(content, relative_path)
        end

        # Use smart file creator for semantic comparison
        result = create_file_with_comparison(file_path, content)
        update_statistics(result)

        file_path
      end

      # Ensure directory exists with proper error handling
      #
      # @param path [String] Directory path to create
      # @return [Boolean] True if directory exists or was created successfully
      def ensure_directory_exists(path)
        return true if File.exist?(path)
        return true if options[:dry_run]

        begin
          FileUtils.mkdir_p(path)
          @statistics[:directories_created] += 1
          shell&.say_status(:create_dir, path, :blue)
          true
        rescue => e
          shell&.say_status(:error, "Failed to create directory #{path}: #{e.message}", :red)
          @statistics[:errors] += 1
          false
        end
      end

      # Check if semantic comparison is enabled
      #
      # @return [Boolean] True if semantic comparison should be used
      def semantic_comparison_enabled?
        !options[:force] && !options[:dry_run]
      end

      # Get frontend root directory for Prettier operations
      #
      # @return [String, nil] Frontend root path or nil if not detected
      def frontend_root
        @frontend_root
      end

      # Check if Prettier is available for formatting
      #
      # @return [Boolean] True if Prettier is available
      def prettier_available?
        @prettier_available
      end

      # Reset statistics counters
      #
      # @return [Hash] Reset statistics hash
      def reset_statistics
        @statistics = {
          created: 0,
          identical: 0,
          errors: 0,
          formatted: 0,
          directories_created: 0
        }
      end

      private

      # Content normalizer for semantic file comparison
      class ContentNormalizer
        def initialize(timestamp_patterns = TIMESTAMP_PATTERNS)
          @timestamp_patterns = timestamp_patterns
        end

        # Normalize content by removing timestamps and standardizing formatting
        #
        # @param content [String] Content to normalize
        # @return [String] Normalized content
        def normalize(content)
          # Remove timestamp patterns but preserve meaningful formatting
          normalized = @timestamp_patterns.reduce(content) do |text, pattern|
            text.gsub(pattern, "")
          end

          # Remove timestamp lines entirely but preserve other formatting
          lines = normalized.split("\n")
          filtered_lines = lines.reject do |line|
            @timestamp_patterns.any? { |pattern| line.match?(pattern) }
          end

          filtered_lines.join("\n").strip
        end
      end

      # Semantic content comparator with enhanced timestamp handling
      class SemanticContentComparator
        def initialize(normalizer = ContentNormalizer.new)
          @normalizer = normalizer
        end

        # Check if file content is semantically identical to new content
        #
        # @param file_path [String] Path to existing file
        # @param new_content [String] New content to compare
        # @return [Boolean] True if content is semantically identical
        def identical?(file_path, new_content)
          return false unless File.exist?(file_path)

          begin
            existing_content = File.read(file_path)
            @normalizer.normalize(existing_content) == @normalizer.normalize(new_content)
          rescue => e
            # If we can't read the file, assume it's different
            false
          end
        end
      end

      # Smart file creator with enhanced error handling
      class SmartFileCreator
        def initialize(comparator, shell = nil)
          @comparator = comparator
          @shell = shell
        end

        # Create file or skip if semantically identical
        #
        # @param destination [String] Destination file path
        # @param content [String] Content to write
        # @return [Symbol] Operation result (:created, :identical, :error)
        def create_or_skip(destination, content)
          if @comparator.identical?(destination, content)
            @shell&.say_status(:identical, destination, :blue)
            OPERATION_RESULTS[:identical]
          else
            begin
              File.write(destination, content)
              @shell&.say_status(:create, destination, :green)
              OPERATION_RESULTS[:created]
            rescue => e
              @shell&.say_status(:error, "Failed to write #{destination}: #{e.message}", :red)
              OPERATION_RESULTS[:error]
            end
          end
        end
      end

      # Detect frontend root directory
      #
      # @return [String, nil] Frontend root path or nil
      def detect_frontend_root
        frontend_path = File.join(Rails.root, "frontend")
        return frontend_path if File.exist?(File.join(frontend_path, "package.json"))

        # Try alternative locations
        alt_paths = [ "client", "web", "ui", "app/javascript" ]
        alt_paths.each do |path|
          full_path = File.join(Rails.root, path)
          return full_path if File.exist?(File.join(full_path, "package.json"))
        end

        nil
      end

      # Check if Prettier is available in the project
      #
      # @return [Boolean] True if Prettier is available
      def prettier_available?
        return false unless @frontend_root

        # Check if prettier is in package.json dependencies
        package_json_path = File.join(@frontend_root, "package.json")
        return false unless File.exist?(package_json_path)

        begin
          package_json = JSON.parse(File.read(package_json_path))
          deps = package_json["dependencies"] || {}
          dev_deps = package_json["devDependencies"] || {}

          deps.key?("prettier") || dev_deps.key?("prettier")
        rescue
          false
        end
      end

      # Check if file should be formatted with Prettier
      #
      # @param file_path [String] File path to check
      # @return [Boolean] True if file should be formatted
      def should_format?(file_path)
        return false if options[:skip_prettier]
        return false unless @prettier_available

        # Only format TypeScript/JavaScript files
        %w[.ts .tsx .js .jsx].include?(File.extname(file_path))
      end

      # Format content with Prettier with enhanced error handling
      #
      # @param content [String] Content to format
      # @param relative_path [String] Relative file path for error reporting
      # @return [String] Formatted content or original content if formatting fails
      def format_with_prettier(content, relative_path)
        return content unless @prettier_available

        # Create temporary file within frontend directory for proper config detection
        temp_dir = File.join(@frontend_root, "tmp")
        ensure_directory_exists(temp_dir)

        temp_file = Tempfile.new([ "generator", ".ts" ], temp_dir)

        begin
          temp_file.write(content)
          temp_file.close

          # Get relative path from frontend root
          temp_relative_path = Pathname.new(temp_file.path)
                                      .relative_path_from(Pathname.new(@frontend_root))

          # Run prettier with enhanced error handling
          formatted_content = run_prettier_command(temp_relative_path, relative_path)
          if formatted_content
            @statistics[:formatted] += 1
            formatted_content
          else
            content
          end
        rescue => e
          shell&.say_status(:warning, "Prettier formatting failed for #{relative_path}: #{e.message}", :yellow)
          content
        ensure
          temp_file&.unlink
        end
      end

      # Run Prettier command with proper error handling
      #
      # @param temp_relative_path [Pathname] Temporary file path relative to frontend root
      # @param relative_path [String] Original relative path for error reporting
      # @return [String, nil] Formatted content or nil if formatting failed
      def run_prettier_command(temp_relative_path, relative_path)
        Dir.chdir(@frontend_root) do
          # Use more specific prettier command with configuration detection
          prettier_cmd = "npx prettier --write --config-precedence prefer-file #{temp_relative_path}"

          success = system(prettier_cmd, out: File::NULL, err: File::NULL)

          if success
            File.read(File.join(@frontend_root, temp_relative_path))
          else
            shell&.say_status(:warning, "Could not format #{relative_path} with Prettier", :yellow)
            nil
          end
        end
      rescue => e
        shell&.say_status(:warning, "Prettier command failed for #{relative_path}: #{e.message}", :yellow)
        nil
      end

      # Create file with semantic comparison
      #
      # @param file_path [String] Absolute file path
      # @param content [String] Content to write
      # @return [Symbol] Operation result
      def create_file_with_comparison(file_path, content)
        if options[:dry_run]
          shell&.say_status(:would_create, file_path, :yellow)
          return OPERATION_RESULTS[:created]
        end

        creator = SmartFileCreator.new(
          semantic_comparison_enabled? ? SemanticContentComparator.new : AlwaysCreateComparator.new,
          shell
        )

        creator.create_or_skip(file_path, content)
      end

      # Comparator that always considers content different (for force mode)
      class AlwaysCreateComparator
        def identical?(file_path, new_content)
          false
        end
      end

      # Update operation statistics
      #
      # @param result [Symbol] Operation result
      def update_statistics(result)
        case result
        when OPERATION_RESULTS[:created]
          @statistics[:created] += 1
        when OPERATION_RESULTS[:identical]
          @statistics[:identical] += 1
        when OPERATION_RESULTS[:error]
          @statistics[:errors] += 1
        end
      end
    end
  end
end
