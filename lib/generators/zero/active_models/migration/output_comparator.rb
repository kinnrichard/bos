# frozen_string_literal: true

require "digest"
require "json"

module Zero
  module Generators
    module Migration
      # OutputComparator provides deep comparison of generation results for canary testing
      #
      # This class performs comprehensive analysis of outputs from legacy and new systems,
      # comparing not just counts but actual content, structure, and semantics of generated
      # files. It's designed to catch subtle differences that could indicate regressions.
      #
      # Key Responsibilities:
      # - Compare generated model structures and content
      # - Analyze file-level differences with semantic understanding
      # - Detect performance regressions and improvements
      # - Provide detailed discrepancy reports for debugging
      # - Support configurable tolerance levels for acceptable differences
      #
      # @example Basic comparison
      #   comparator = OutputComparator.new
      #   result = comparator.compare(legacy_result, new_result)
      #   puts "Discrepancies: #{result[:discrepancies].length}"
      #
      # @example With custom tolerance
      #   comparator = OutputComparator.new(
      #     performance_tolerance_ms: 100,
      #     ignore_whitespace_differences: true
      #   )
      #   result = comparator.compare(legacy_result, new_result)
      #
      class OutputComparator
        # Comparison result structure
        ComparisonResult = Struct.new(
          :overall_match,
          :discrepancies,
          :performance_analysis,
          :file_comparisons,
          :model_comparisons,
          :summary_stats,
          :execution_metadata
        ) do
          def has_discrepancies?
            !overall_match
          end

          def critical_discrepancies
            discrepancies.select { |d| d[:severity] == :critical }
          end

          def warning_discrepancies
            discrepancies.select { |d| d[:severity] == :warning }
          end

          def info_discrepancies
            discrepancies.select { |d| d[:severity] == :info }
          end
        end

        # Discrepancy types and severity levels
        DISCREPANCY_TYPES = {
          success_status: :critical,
          model_count: :critical,
          file_count: :critical,
          file_content: :critical,
          model_structure: :critical,
          performance_regression: :warning,
          metadata_difference: :info,
          timestamp_difference: :info
        }.freeze

        # Default configuration
        DEFAULT_CONFIG = {
          # Performance comparison
          performance_tolerance_ms: 50,           # Acceptable performance difference in milliseconds
          performance_regression_threshold: 1.5,  # Factor for performance regression detection

          # Content comparison
          ignore_whitespace_differences: false,   # Whether to normalize whitespace in content comparison
          ignore_comment_differences: false,      # Whether to ignore comment-only differences
          ignore_timestamp_differences: true,     # Whether to ignore timestamp differences in generated files

          # Structure comparison
          compare_file_checksums: true,           # Whether to compare file content checksums
          compare_model_schemas: true,            # Whether to perform deep model structure comparison
          validate_typescript_syntax: false,     # Whether to validate generated TypeScript syntax

          # Tolerance levels
          acceptable_model_count_difference: 0,  # Acceptable difference in model count
          acceptable_file_count_difference: 0,   # Acceptable difference in file count

          # Analysis depth
          max_file_size_for_content_comparison: 1024 * 1024, # 1MB limit for content comparison
          enable_semantic_analysis: false,        # Enable semantic code analysis (expensive)
          detailed_performance_breakdown: true,   # Include detailed performance metrics

          # Reporting
          include_file_paths_in_report: true,     # Include full file paths in discrepancy reports
          max_discrepancy_examples: 10,          # Maximum number of examples per discrepancy type
          generate_diff_snippets: false          # Generate diff snippets for content differences
        }.freeze

        attr_reader :config

        # Initialize comparator with configuration
        #
        # @param config [Hash] Comparison configuration options
        def initialize(config = {})
          @config = DEFAULT_CONFIG.merge(config)
          @comparison_id = SecureRandom.uuid
        end

        # Compare outputs from legacy and new systems
        #
        # @param legacy_result [Hash] Result from legacy GenerationCoordinator
        # @param new_result [Hash] Result from new Pipeline system
        # @param comparison_context [Hash] Additional context for comparison
        # @return [ComparisonResult] Detailed comparison results
        def compare(legacy_result, new_result, comparison_context = {})
          comparison_start_time = Time.current

          # Initialize result structure
          result = ComparisonResult.new(
            true, # overall_match - will be updated based on findings
            [],   # discrepancies
            {},   # performance_analysis
            [],   # file_comparisons
            [],   # model_comparisons
            {},   # summary_stats
            build_execution_metadata(comparison_context)
          )

          begin
            # Perform different levels of comparison
            compare_success_status(legacy_result, new_result, result)
            compare_counts(legacy_result, new_result, result)
            compare_files(legacy_result, new_result, result) if should_compare_files?
            compare_models(legacy_result, new_result, result) if should_compare_models?
            analyze_performance(legacy_result, new_result, result)

            # Generate summary statistics
            generate_summary_stats(result, comparison_start_time)

            # Determine overall match status
            result.overall_match = result.critical_discrepancies.empty? &&
                                  result.warning_discrepancies.length <= acceptable_warning_threshold

          rescue => e
            add_discrepancy(result, :comparison_error, :critical,
              "Comparison failed with error: #{e.message}",
              { error_class: e.class.name, backtrace: e.backtrace&.first(3) }
            )
            result.overall_match = false
          end

          result
        end

        # Compare specific file content between systems
        #
        # @param legacy_file_path [String] Path to legacy system output file
        # @param new_file_path [String] Path to new system output file
        # @return [Hash] File-specific comparison results
        def compare_files_at_path(legacy_file_path, new_file_path)
          return { error: "File paths not provided" } unless legacy_file_path && new_file_path

          legacy_content = File.read(legacy_file_path) rescue nil
          new_content = File.read(new_file_path) rescue nil

          return { error: "Could not read files" } unless legacy_content && new_content

          compare_file_contents(
            { path: legacy_file_path, content: legacy_content },
            { path: new_file_path, content: new_content }
          )
        end

        # Generate detailed report from comparison results
        #
        # @param comparison_result [ComparisonResult] Results to generate report from
        # @return [String] Human-readable comparison report
        def generate_report(comparison_result)
          report = []

          report << "# Canary Test Comparison Report"
          report << "Generated: #{Time.current.strftime('%Y-%m-%d %H:%M:%S UTC')}"
          report << "Comparison ID: #{@comparison_id}"
          report << ""

          # Overall status
          if comparison_result.overall_match
            report << "✅ **OVERALL STATUS: MATCH**"
          else
            report << "❌ **OVERALL STATUS: DISCREPANCIES DETECTED**"
          end
          report << ""

          # Summary statistics
          report << "## Summary"
          stats = comparison_result.summary_stats
          report << "- Critical discrepancies: #{comparison_result.critical_discrepancies.length}"
          report << "- Warning discrepancies: #{comparison_result.warning_discrepancies.length}"
          report << "- Info discrepancies: #{comparison_result.info_discrepancies.length}"
          report << "- Files compared: #{stats[:files_compared] || 0}"
          report << "- Models compared: #{stats[:models_compared] || 0}"
          report << "- Comparison time: #{stats[:comparison_time_ms]}ms"
          report << ""

          # Performance analysis
          if comparison_result.performance_analysis.any?
            report << "## Performance Analysis"
            perf = comparison_result.performance_analysis

            if perf[:legacy_faster]
              report << "- Legacy system was #{perf[:performance_difference_ms]}ms faster"
            elsif perf[:new_faster]
              report << "- New system was #{perf[:performance_difference_ms]}ms faster"
            else
              report << "- Performance difference within tolerance"
            end

            report << "- Legacy execution time: #{perf[:legacy_time_ms]}ms"
            report << "- New execution time: #{perf[:new_time_ms]}ms"
            report << ""
          end

          # Discrepancy details
          if comparison_result.has_discrepancies?
            report << "## Discrepancies"

            [ :critical, :warning, :info ].each do |severity|
              discrepancies = comparison_result.discrepancies.select { |d| d[:severity] == severity }
              next if discrepancies.empty?

              report << "### #{severity.to_s.capitalize} Issues"
              discrepancies.each_with_index do |disc, idx|
                report << "#{idx + 1}. **#{disc[:type]}**: #{disc[:message]}"
                if disc[:details] && @config[:include_file_paths_in_report]
                  report << "   - Details: #{format_discrepancy_details(disc[:details])}"
                end
              end
              report << ""
            end
          end

          # File comparison details
          if comparison_result.file_comparisons.any?
            report << "## File Comparisons"
            comparison_result.file_comparisons.each do |file_comp|
              status = file_comp[:matches] ? "✅" : "❌"
              report << "- #{status} `#{file_comp[:file_name]}` (#{file_comp[:comparison_type]})"

              unless file_comp[:matches] && file_comp[:details]
                report << "  - #{file_comp[:details]}"
              end
            end
            report << ""
          end

          report.join("\n")
        end

        private

        def compare_success_status(legacy_result, new_result, result)
          legacy_success = legacy_result[:success]
          new_success = new_result[:success]

          if legacy_success != new_success
            add_discrepancy(result, :success_status, :critical,
              "Success status differs: legacy=#{legacy_success}, new=#{new_success}")
          end
        end

        def compare_counts(legacy_result, new_result, result)
          # Compare model counts
          legacy_models = legacy_result[:generated_models] || []
          new_models = new_result[:generated_models] || []

          model_diff = (legacy_models.length - new_models.length).abs
          if model_diff > @config[:acceptable_model_count_difference]
            add_discrepancy(result, :model_count, :critical,
              "Model count differs: legacy=#{legacy_models.length}, new=#{new_models.length}")
          end

          # Compare file counts
          legacy_files = legacy_result[:generated_files] || []
          new_files = new_result[:generated_files] || []

          file_diff = (legacy_files.length - new_files.length).abs
          if file_diff > @config[:acceptable_file_count_difference]
            add_discrepancy(result, :file_count, :critical,
              "File count differs: legacy=#{legacy_files.length}, new=#{new_files.length}")
          end
        end

        def compare_files(legacy_result, new_result, result)
          legacy_files = legacy_result[:generated_files] || []
          new_files = new_result[:generated_files] || []

          # Create file maps for comparison
          legacy_file_map = build_file_map(legacy_files)
          new_file_map = build_file_map(new_files)

          # Find files present in both systems
          common_files = legacy_file_map.keys & new_file_map.keys

          common_files.each do |file_key|
            legacy_file = legacy_file_map[file_key]
            new_file = new_file_map[file_key]

            file_comparison = compare_file_contents(legacy_file, new_file)
            result.file_comparisons << file_comparison

            unless file_comparison[:matches]
              add_discrepancy(result, :file_content, :critical,
                "File content differs: #{file_key}",
                file_comparison[:details]
              )
            end
          end

          # Check for files only in one system
          legacy_only = legacy_file_map.keys - new_file_map.keys
          new_only = new_file_map.keys - legacy_file_map.keys

          legacy_only.each do |file_key|
            add_discrepancy(result, :file_content, :critical,
              "File only in legacy system: #{file_key}")
          end

          new_only.each do |file_key|
            add_discrepancy(result, :file_content, :critical,
              "File only in new system: #{file_key}")
          end
        end

        def compare_models(legacy_result, new_result, result)
          legacy_models = legacy_result[:generated_models] || []
          new_models = new_result[:generated_models] || []

          # Convert to comparable structures
          legacy_model_map = build_model_map(legacy_models)
          new_model_map = build_model_map(new_models)

          # Compare common models
          common_models = legacy_model_map.keys & new_model_map.keys

          common_models.each do |model_key|
            legacy_model = legacy_model_map[model_key]
            new_model = new_model_map[model_key]

            model_comparison = compare_model_structures(legacy_model, new_model)
            result.model_comparisons << model_comparison

            unless model_comparison[:matches]
              add_discrepancy(result, :model_structure, :critical,
                "Model structure differs: #{model_key}",
                model_comparison[:details]
              )
            end
          end
        end

        def analyze_performance(legacy_result, new_result, result)
          legacy_time = extract_execution_time(legacy_result)
          new_time = extract_execution_time(new_result)

          return unless legacy_time && new_time

          difference_ms = ((new_time - legacy_time) * 1000).round(2)
          tolerance_ms = @config[:performance_tolerance_ms]

          analysis = {
            legacy_time_ms: (legacy_time * 1000).round(2),
            new_time_ms: (new_time * 1000).round(2),
            performance_difference_ms: difference_ms.abs,
            legacy_faster: difference_ms > tolerance_ms,
            new_faster: difference_ms < -tolerance_ms,
            within_tolerance: difference_ms.abs <= tolerance_ms
          }

          # Check for performance regression
          if difference_ms > tolerance_ms
            regression_factor = new_time / legacy_time
            if regression_factor > @config[:performance_regression_threshold]
              add_discrepancy(result, :performance_regression, :warning,
                "Performance regression detected: new system is #{difference_ms}ms slower (#{(regression_factor * 100).round(1)}%)")
            end
          end

          result.performance_analysis = analysis
        end

        def compare_file_contents(legacy_file, new_file)
          comparison = {
            file_name: extract_file_name(legacy_file),
            matches: false,
            comparison_type: "content",
            details: {}
          }

          legacy_content = legacy_file[:content] || ""
          new_content = new_file[:content] || ""

          # Skip large files if configured
          if legacy_content.length > @config[:max_file_size_for_content_comparison] ||
             new_content.length > @config[:max_file_size_for_content_comparison]
            comparison[:comparison_type] = "size_only"
            comparison[:matches] = legacy_content.length == new_content.length
            comparison[:details][:size_difference] = new_content.length - legacy_content.length
            return comparison
          end

          # Normalize content for comparison if configured
          normalized_legacy = normalize_content_for_comparison(legacy_content)
          normalized_new = normalize_content_for_comparison(new_content)

          if @config[:compare_file_checksums]
            legacy_checksum = Digest::SHA256.hexdigest(normalized_legacy)
            new_checksum = Digest::SHA256.hexdigest(normalized_new)

            comparison[:matches] = legacy_checksum == new_checksum
            comparison[:details][:legacy_checksum] = legacy_checksum
            comparison[:details][:new_checksum] = new_checksum
          else
            comparison[:matches] = normalized_legacy == normalized_new
          end

          # Add content analysis details
          unless comparison[:matches]
            comparison[:details][:content_length_legacy] = normalized_legacy.length
            comparison[:details][:content_length_new] = normalized_new.length
            comparison[:details][:length_difference] = normalized_new.length - normalized_legacy.length

            # Generate diff snippet if requested and content is small enough
            if @config[:generate_diff_snippets] &&
               normalized_legacy.length < 10000 && normalized_new.length < 10000
              comparison[:details][:diff_snippet] = generate_diff_snippet(normalized_legacy, normalized_new)
            end
          end

          comparison
        end

        def compare_model_structures(legacy_model, new_model)
          comparison = {
            model_name: legacy_model[:table_name] || legacy_model[:class_name] || "unknown",
            matches: true,
            details: {}
          }

          # Compare basic model attributes
          basic_attrs = [ :table_name, :class_name, :kebab_name ]
          basic_attrs.each do |attr|
            if legacy_model[attr] != new_model[attr]
              comparison[:matches] = false
              comparison[:details][attr] = {
                legacy: legacy_model[attr],
                new: new_model[attr]
              }
            end
          end

          # TODO: Add deeper model structure comparison based on actual model data structure
          # This would include column comparisons, relationship comparisons, etc.

          comparison
        end

        def build_file_map(files)
          files.each_with_object({}) do |file, map|
            key = extract_file_name(file)
            map[key] = file
          end
        end

        def build_model_map(models)
          models.each_with_object({}) do |model, map|
            key = model[:table_name] || model[:class_name] || model.to_s
            map[key] = model
          end
        end

        def extract_file_name(file)
          case file
          when String
            File.basename(file)
          when Hash
            file[:path] ? File.basename(file[:path]) : file[:name] || "unknown"
          else
            "unknown"
          end
        end

        def extract_execution_time(result)
          result[:execution_time] || result[:statistics]&.dig(:execution_time)
        end

        def normalize_content_for_comparison(content)
          normalized = content.dup

          if @config[:ignore_whitespace_differences]
            normalized = normalized.gsub(/\s+/, " ").strip
          end

          if @config[:ignore_comment_differences]
            # Remove TypeScript/JavaScript style comments
            normalized = normalized.gsub(%r{//.*$}, "").gsub(%r{/\*.*?\*/}m, "")
          end

          if @config[:ignore_timestamp_differences]
            # Remove common timestamp patterns
            normalized = normalized.gsub(/\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}/, "TIMESTAMP")
            normalized = normalized.gsub(/Generated:\s+\d{4}-\d{2}-\d{2}.*$/m, "Generated: TIMESTAMP")
          end

          normalized
        end

        def generate_diff_snippet(legacy_content, new_content)
          # Simple line-by-line diff (could be enhanced with proper diff algorithm)
          legacy_lines = legacy_content.split("\n")
          new_lines = new_content.split("\n")

          max_lines = [ legacy_lines.length, new_lines.length ].max
          diff_lines = []

          (0...max_lines).each do |i|
            legacy_line = legacy_lines[i] || ""
            new_line = new_lines[i] || ""

            if legacy_line != new_line
              diff_lines << "- #{legacy_line}" unless legacy_line.empty?
              diff_lines << "+ #{new_line}" unless new_line.empty?
            end

            break if diff_lines.length > 20 # Limit diff snippet size
          end

          diff_lines.join("\n")
        end

        def add_discrepancy(result, type, severity, message, details = {})
          result.discrepancies << {
            type: type,
            severity: severity,
            message: message,
            details: details,
            timestamp: Time.current
          }
        end

        def generate_summary_stats(result, comparison_start_time)
          result.summary_stats = {
            comparison_time_ms: ((Time.current - comparison_start_time) * 1000).round(2),
            files_compared: result.file_comparisons.length,
            models_compared: result.model_comparisons.length,
            total_discrepancies: result.discrepancies.length,
            critical_discrepancies: result.critical_discrepancies.length,
            warning_discrepancies: result.warning_discrepancies.length,
            info_discrepancies: result.info_discrepancies.length
          }
        end

        def build_execution_metadata(comparison_context)
          {
            comparison_id: @comparison_id,
            timestamp: Time.current,
            config_checksum: Digest::SHA256.hexdigest(@config.to_json),
            context: comparison_context
          }
        end

        def should_compare_files?
          @config[:compare_file_checksums] || @config[:validate_typescript_syntax]
        end

        def should_compare_models?
          @config[:compare_model_schemas]
        end

        def acceptable_warning_threshold
          # Allow some warnings but not too many
          (@config[:max_acceptable_warnings] || 3)
        end

        def format_discrepancy_details(details)
          case details
          when Hash
            details.map { |k, v| "#{k}: #{v}" }.join(", ")
          when Array
            details.join(", ")
          else
            details.to_s
          end
        end
      end
    end
  end
end
