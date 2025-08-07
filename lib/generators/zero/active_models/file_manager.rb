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
          directories_created: 0,
          batch_formatted: 0,
          batch_operations: 0
        }
        @frontend_root = detect_frontend_root
        @prettier_available = prettier_available?

        # Batch formatting configuration
        @batch_config = {
          max_files: options[:batch_max_files] || 50,
          max_memory_mb: options[:batch_max_memory_mb] || 100,
          enabled: !options[:disable_batch_formatting]
        }
        @batch_queue = []
        @batch_memory_estimate = 0
        @formatted_content_cache = {} # Cache for batch-formatted content
      end

      # Write file with optional formatting and semantic comparison
      #
      # @param relative_path [String] File path relative to output directory
      # @param content [String] File content to write
      # @param format [Boolean] Whether to format with Prettier (default: true)
      # @param defer_write [Boolean] Whether to defer actual file writing for batch processing
      # @return [String] Absolute file path
      def write_with_formatting(relative_path, content, format: true, defer_write: false)
        file_path = if Pathname.new(output_dir).absolute?
                      File.join(output_dir, relative_path)
        else
                      File.join(Rails.root, output_dir, relative_path)
        end

        # Ensure directory exists
        ensure_directory_exists(File.dirname(file_path))

        if defer_write && format && should_format?(file_path) && !options[:dry_run] && @batch_config[:enabled]
          # Just queue the file for batch processing, don't write yet
          queue_for_batch_processing(file_path, content, relative_path)
        else
          # Original behavior for non-deferred writes
          formatted_content = if format && should_format?(file_path) && !options[:dry_run]
            if @batch_config[:enabled]
              # This shouldn't happen in defer mode but keep as fallback
              collect_and_format_for_batch(file_path, content, relative_path)
            else
              # Immediate formatting
              format_with_prettier(content, relative_path)
            end
          else
            # No formatting required
            content
          end

          # Now do semantic comparison with already-formatted new content
          result = create_file_with_comparison(file_path, formatted_content)
          update_statistics(result)
        end

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
          # Created directory: #{path}
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

      # Process all queued files for batch formatting
      #
      # @return [Hash] Batch processing results
      def process_batch_formatting
        return { processed: 0, errors: 0, time: 0.0 } if @batch_queue.empty? || options[:dry_run]

        start_time = Time.current
        processed_count = 0
        error_count = 0

        begin
          shell&.say_status(:batch_format, "Processing #{@batch_queue.size} files with Prettier", :blue)

          # Process batch with error resilience
          result = execute_batch_prettier_command

          if result[:success]
            processed_count = @batch_queue.size
            @statistics[:batch_formatted] += processed_count
            @statistics[:formatted] += processed_count
            @statistics[:batch_operations] += 1

            shell&.say_status(:batch_success, "Formatted #{processed_count} files in batch", :green)
          else
            # Fallback to individual processing with error handling
            shell&.say_status(:batch_fallback, "Batch failed, falling back to individual formatting", :yellow)
            individual_result = fallback_to_individual_formatting
            processed_count = individual_result[:processed]
            error_count = individual_result[:errors]
          end

        rescue => e
          shell&.say_status(:batch_error, "Batch formatting error: #{e.message}", :red)
          # Attempt individual fallback
          individual_result = fallback_to_individual_formatting
          processed_count = individual_result[:processed]
          error_count = individual_result[:errors]
        ensure
          # Clear batch queue and reset memory estimate
          @batch_queue.clear
          @batch_memory_estimate = 0
        end

        execution_time = (Time.current - start_time).round(4)

        {
          processed: processed_count,
          errors: error_count,
          time: execution_time,
          memory_used_mb: (@batch_memory_estimate / 1024.0 / 1024.0).round(2)
        }
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
          directories_created: 0,
          batch_formatted: 0,
          batch_operations: 0
        }
        @batch_queue.clear
        @batch_memory_estimate = 0
      end

      # Check if batch queue needs processing (memory or file count threshold)
      #
      # @return [Boolean] True if batch should be processed now
      def batch_ready_for_processing?
        return false unless @batch_config[:enabled]

        file_count_ready = @batch_queue.size >= @batch_config[:max_files]
        memory_ready = (@batch_memory_estimate / 1024.0 / 1024.0) >= @batch_config[:max_memory_mb]

        file_count_ready || memory_ready
      end

      # Get current batch queue status for monitoring
      #
      # @return [Hash] Current batch status
      def batch_status
        {
          queued_files: @batch_queue.size,
          memory_estimate_mb: (@batch_memory_estimate / 1024.0 / 1024.0).round(2),
          max_files: @batch_config[:max_files],
          max_memory_mb: @batch_config[:max_memory_mb],
          enabled: @batch_config[:enabled]
        }
      end

      # Process all queued files: format in batch, then write
      # This is the main entry point for efficient batch processing
      #
      # @return [void]
      def process_batch_files
        return if @batch_queue.empty? || options[:dry_run]

        # Processing batch of #{@batch_queue.size} files

        # Format all files in batch
        if @prettier_available && @batch_config[:enabled]
          format_batch_and_cache
        end

        # Now write all files with formatted content
        @batch_queue.each do |item|
          formatted_content = @formatted_content_cache[item[:file_path]] || item[:content]

          # Do semantic comparison and write
          result = create_file_with_comparison(item[:file_path], formatted_content)
          update_statistics(result)
        end

        # Clear the queue
        @batch_queue.clear
        @batch_memory_estimate = 0
        @formatted_content_cache.clear
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
            # File is identical, skipping: #{destination}
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

      # Queue file for batch processing without formatting yet
      # This allows us to collect all files before formatting
      #
      # @param file_path [String] Absolute file path
      # @param content [String] File content
      # @param relative_path [String] Relative path for error reporting
      # @return [void]
      def queue_for_batch_processing(file_path, content, relative_path)
        # Estimate memory usage
        content_size = content.bytesize
        estimated_overhead = content_size * 0.5
        total_estimate = content_size + estimated_overhead

        # Add to batch queue
        @batch_queue << {
          file_path: file_path,
          content: content,
          relative_path: relative_path,
          size: content_size
        }

        @batch_memory_estimate += total_estimate
      end

      # Collect and format file for batch processing
      # This method adds files to batch queue and processes them efficiently
      # Returns formatted content from cache or triggers batch processing
      #
      # @param file_path [String] Absolute file path
      # @param content [String] File content
      # @param relative_path [String] Relative path for error reporting
      # @return [String] Formatted content
      def collect_and_format_for_batch(file_path, content, relative_path)
        return format_with_prettier(content, relative_path) unless @prettier_available

        # Check if we already have formatted content for this file
        return @formatted_content_cache[file_path] if @formatted_content_cache[file_path]

        # Estimate memory usage
        content_size = content.bytesize
        estimated_overhead = content_size * 0.5
        total_estimate = content_size + estimated_overhead

        # Check if adding this file would exceed memory limits
        if (@batch_memory_estimate + total_estimate) > (@batch_config[:max_memory_mb] * 1024 * 1024)
          # Process current batch first
          format_batch_and_cache if @batch_queue.any?
        end

        # Add to batch queue
        @batch_queue << {
          file_path: file_path,
          content: content,
          relative_path: relative_path,
          size: content_size
        }

        @batch_memory_estimate += total_estimate

        # Process batch if we've hit the file count limit
        if @batch_queue.size >= @batch_config[:max_files]
          format_batch_and_cache
        end

        # Return formatted content from cache (will be populated by format_batch_and_cache)
        # If not in cache yet, format individually as fallback
        @formatted_content_cache[file_path] || format_with_prettier(content, relative_path)
      end

      # Format batch of files and populate cache
      # This processes all queued files at once for maximum efficiency
      #
      # @return [void]
      def format_batch_and_cache
        return if @batch_queue.empty? || options[:dry_run]
        return unless @prettier_available

        start_time = Time.current
        temp_dir = File.join(@frontend_root, "tmp", "batch_format_#{Time.current.to_i}")

        begin
          ensure_directory_exists(temp_dir)

          # Map to track temp files to original items
          temp_file_mapping = {}

          # Write all files to temp directory
          @batch_queue.each_with_index do |item, index|
            temp_file_path = File.join(temp_dir, "file_#{index}.ts")
            File.write(temp_file_path, item[:content])
            temp_file_mapping[temp_file_path] = item
          end

          # Run prettier on all files in one command
          prettier_cmd = "npx prettier --write --config-precedence prefer-file #{temp_dir}/*.ts"

          Dir.chdir(@frontend_root) do
            success = system(prettier_cmd, out: File::NULL, err: File::NULL)

            if success
              # Read back formatted content and populate cache
              temp_file_mapping.each do |temp_path, item|
                formatted_content = File.read(temp_path)
                @formatted_content_cache[item[:file_path]] = formatted_content

                # Update statistics
                if formatted_content != item[:content]
                  @statistics[:formatted] += 1
                  @statistics[:batch_formatted] += 1
                end
              end

              @statistics[:batch_operations] += 1
              # Formatted #{@batch_queue.size} files in #{(Time.current - start_time).round(2)}s
            else
              # Fallback: format individually and populate cache
              shell&.say_status(:batch_fallback, "Batch formatting failed, formatting individually", :yellow)
              @batch_queue.each do |item|
                formatted = format_with_prettier(item[:content], item[:relative_path])
                @formatted_content_cache[item[:file_path]] = formatted
              end
            end
          end

        rescue => e
          shell&.say_status(:batch_error, "Batch formatting error: #{e.message}", :red)
          # Fallback: format individually
          @batch_queue.each do |item|
            formatted = format_with_prettier(item[:content], item[:relative_path])
            @formatted_content_cache[item[:file_path]] = formatted
          end
        ensure
          # Cleanup
          FileUtils.rm_rf(temp_dir) if temp_dir && File.exist?(temp_dir)
          @batch_queue.clear
          @batch_memory_estimate = 0
        end
      end

      # Collect file for batch formatting with memory management
      #
      # @param file_path [String] Absolute file path
      # @param content [String] File content
      # @param relative_path [String] Relative path for error reporting
      # @return [String] Original content (formatting happens later in batch)
      def collect_for_batch_formatting(file_path, content, relative_path)
        return format_with_prettier(content, relative_path) unless @prettier_available

        # Estimate memory usage (content size + overhead)
        content_size = content.bytesize
        estimated_overhead = content_size * 0.5  # 50% overhead estimate for processing
        total_estimate = content_size + estimated_overhead

        # Check if adding this file would exceed memory limits
        if (@batch_memory_estimate + total_estimate) > (@batch_config[:max_memory_mb] * 1024 * 1024)
          # Process current batch first, then add this file
          process_batch_formatting if @batch_queue.any?
        end

        # Add to batch queue (file will be written during batch processing)
        @batch_queue << {
          file_path: file_path,
          content: content,
          relative_path: relative_path,
          size: content_size
        }

        @batch_memory_estimate += total_estimate

        # Process batch if we've hit the file count limit
        if @batch_queue.size >= @batch_config[:max_files]
          process_batch_formatting
        end

        # Return original content - file will be formatted and re-written during batch processing
        content
      end

      # Execute batch prettier command with optimized approach
      #
      # @return [Hash] Execution result
      def execute_batch_prettier_command
        return { success: false, error: "No frontend root" } unless @frontend_root
        return { success: false, error: "No files to process" } if @batch_queue.empty?

        temp_dir = File.join(@frontend_root, "tmp", "batch_format_#{Time.current.to_i}")

        begin
          # Create temporary directory for batch processing
          ensure_directory_exists(temp_dir)

          # Write all files to temporary directory
          temp_files = @batch_queue.map.with_index do |item, index|
            temp_file_path = File.join(temp_dir, "file_#{index}.ts")
            File.write(temp_file_path, item[:content])
            {
              temp_path: temp_file_path,
              original_item: item
            }
          end

          # Run prettier on all files in one command
          prettier_cmd = "npx prettier --write --config-precedence prefer-file #{temp_dir}/*.ts"

          Dir.chdir(@frontend_root) do
            success = system(prettier_cmd, out: File::NULL, err: File::NULL)

            if success
              # Read back formatted content and update original files
              temp_files.each do |temp_file_info|
                formatted_content = File.read(temp_file_info[:temp_path])
                original_item = temp_file_info[:original_item]

                # Overwrite the already-written file with formatted content
                File.write(original_item[:file_path], formatted_content)
              end

              { success: true, files_processed: temp_files.size }
            else
              { success: false, error: "Prettier command failed" }
            end
          end

        rescue => e
          { success: false, error: e.message }
        ensure
          # Cleanup temporary directory
          FileUtils.rm_rf(temp_dir) if File.exist?(temp_dir)
        end
      end

      # Fallback to individual formatting with error handling
      #
      # @return [Hash] Processing results
      def fallback_to_individual_formatting
        processed = 0
        errors = 0

        @batch_queue.each do |item|
          begin
            formatted_content = format_with_prettier(item[:content], item[:relative_path])
            File.write(item[:file_path], formatted_content)
            processed += 1
          rescue => e
            shell&.say_status(:warning, "Failed to format #{item[:relative_path]}: #{e.message}", :yellow)
            # Write original content if formatting fails
            File.write(item[:file_path], item[:content])
            errors += 1
          end
        end

        @statistics[:formatted] += processed

        { processed: processed, errors: errors }
      end

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
