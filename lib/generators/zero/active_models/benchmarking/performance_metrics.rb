# frozen_string_literal: true

require "objspace"
require "gc"

module Zero
  module Generators
    module Benchmarking
      # PerformanceMetrics collects comprehensive performance data during generation
      #
      # This class provides detailed metrics collection for benchmarking the ReactiveRecord
      # generation system, capturing execution time, memory usage, file operations, and
      # pipeline stage performance.
      #
      # Key Metrics Collected:
      # - Execution time with sub-second precision
      # - Memory usage (heap size, object allocation, GC stats)
      # - File operation counts and sizes
      # - Pipeline stage timings
      # - Error rates and types
      #
      # @example Basic usage
      #   metrics = PerformanceMetrics.new
      #   metrics.start_measurement
      #   # ... perform generation ...
      #   metrics.record_generation_result(result)
      #   metrics.end_measurement
      #   data = metrics.compile_measurement_data(execution_time)
      #
      class PerformanceMetrics
        attr_reader :start_time, :end_time, :start_memory, :end_memory, :gc_stats_start, :gc_stats_end

        def initialize
          reset
        end

        # Reset all metrics for a new measurement
        def reset
          @start_time = nil
          @end_time = nil
          @start_memory = nil
          @end_memory = nil
          @gc_stats_start = nil
          @gc_stats_end = nil
          @file_operations = {
            created: 0,
            written: 0,
            formatted: 0,
            total_size_bytes: 0
          }
          @pipeline_stages = []
          @errors = []
          @generation_result = nil
        end

        # Start performance measurement
        def start_measurement
          GC.start # Clean slate for memory measurement

          @start_time = Process.clock_gettime(Process::CLOCK_MONOTONIC, :float_microsecond)
          @start_memory = current_memory_usage
          @gc_stats_start = GC.stat.dup

          # Enable ObjectSpace statistics for detailed allocation tracking
          ObjectSpace.trace_object_allocations_start if defined?(ObjectSpace.trace_object_allocations_start)
        end

        # End performance measurement
        def end_measurement
          @end_time = Process.clock_gettime(Process::CLOCK_MONOTONIC, :float_microsecond)
          @end_memory = current_memory_usage
          @gc_stats_end = GC.stat.dup

          ObjectSpace.trace_object_allocations_stop if defined?(ObjectSpace.trace_object_allocations_stop)
        end

        # Record generation result for analysis
        #
        # @param result [Hash] Generation result from coordinator
        def record_generation_result(result)
          @generation_result = result

          if result.is_a?(Hash)
            # Extract file operation counts
            if result[:generated_files]
              @file_operations[:created] = result[:generated_files].length
              @file_operations[:total_size_bytes] = calculate_total_file_size(result[:generated_files])
            end

            # Extract error information
            if result[:errors] && result[:errors].any?
              @errors = result[:errors]
            end

            # Extract pipeline statistics if available
            if result[:statistics]
              record_pipeline_statistics(result[:statistics])
            end
          end
        end

        # Record pipeline stage performance
        #
        # @param stage_name [String] Name of the pipeline stage
        # @param execution_time [Float] Execution time in seconds
        # @param metadata [Hash] Additional stage metadata
        def record_pipeline_stage(stage_name, execution_time, metadata = {})
          @pipeline_stages << {
            name: stage_name,
            execution_time: execution_time,
            metadata: metadata,
            timestamp: Time.current
          }
        end

        # Compile comprehensive measurement data
        #
        # @param benchmark_result [Benchmark::Tms] Benchmark execution result
        # @return [Hash] Comprehensive performance measurement data
        def compile_measurement_data(benchmark_result)
          return {} unless @start_time && @end_time

          execution_time_microseconds = @end_time - @start_time
          execution_time_seconds = execution_time_microseconds / 1_000_000.0

          {
            # Core timing metrics
            execution_time_seconds: execution_time_seconds,
            execution_time_microseconds: execution_time_microseconds,
            user_cpu_time: benchmark_result.utime,
            system_cpu_time: benchmark_result.stime,
            total_cpu_time: benchmark_result.total,

            # Memory metrics
            memory_usage: compile_memory_metrics,

            # File operation metrics
            file_operations: @file_operations.dup,

            # Pipeline performance metrics
            pipeline_performance: compile_pipeline_metrics,

            # Error metrics
            error_metrics: compile_error_metrics,

            # Generation result summary
            generation_summary: compile_generation_summary,

            # System information
            system_info: compile_system_info
          }
        end

        # Get current memory usage in bytes
        #
        # @return [Hash] Current memory usage statistics
        def current_memory_usage
          {
            heap_size: GC.stat[:heap_allocated_pages] * GC::INTERNAL_CONSTANTS[:HEAP_PAGE_SIZE],
            heap_live_objects: GC.stat[:heap_live_slots],
            heap_free_objects: GC.stat[:heap_free_slots],
            process_memory: get_process_memory_usage
          }
        end

        # Calculate memory efficiency score
        #
        # @return [Float] Memory efficiency score (0-100)
        def memory_efficiency_score
          return 0.0 unless @start_memory && @end_memory && @generation_result

          memory_delta = @end_memory[:process_memory] - @start_memory[:process_memory]
          files_generated = @file_operations[:created]

          return 100.0 if memory_delta <= 0 || files_generated == 0

          # Lower memory per file is better - normalize to 0-100 scale
          memory_per_file = memory_delta.to_f / files_generated
          baseline_memory_per_file = 1024 * 1024 # 1MB baseline

          efficiency = [ 100.0 - (memory_per_file / baseline_memory_per_file * 100), 0.0 ].max
          [ efficiency, 100.0 ].min
        end

        # Calculate performance score based on multiple factors
        #
        # @return [Hash] Performance score breakdown
        def performance_score
          return { overall: 0.0 } unless @generation_result && @start_time && @end_time

          execution_time_seconds = (@end_time - @start_time) / 1_000_000.0
          files_generated = @file_operations[:created]
          errors_count = @errors.length

          # Calculate individual scores (0-100)
          speed_score = calculate_speed_score(execution_time_seconds, files_generated)
          memory_score = memory_efficiency_score
          reliability_score = calculate_reliability_score(errors_count, files_generated)

          # Weighted overall score
          overall_score = (speed_score * 0.4 + memory_score * 0.3 + reliability_score * 0.3)

          {
            overall: overall_score.round(2),
            speed: speed_score.round(2),
            memory_efficiency: memory_score.round(2),
            reliability: reliability_score.round(2)
          }
        end

        private

        # Compile memory usage metrics
        def compile_memory_metrics
          return {} unless @start_memory && @end_memory

          memory_delta = @end_memory[:process_memory] - @start_memory[:process_memory]
          heap_delta = @end_memory[:heap_size] - @start_memory[:heap_size]

          {
            start_memory_mb: (@start_memory[:process_memory] / 1024.0 / 1024.0).round(2),
            end_memory_mb: (@end_memory[:process_memory] / 1024.0 / 1024.0).round(2),
            peak_memory_mb: [ @start_memory[:process_memory], @end_memory[:process_memory] ].max / 1024.0 / 1024.0,
            memory_delta_mb: (memory_delta / 1024.0 / 1024.0).round(2),
            heap_start_mb: (@start_memory[:heap_size] / 1024.0 / 1024.0).round(2),
            heap_end_mb: (@end_memory[:heap_size] / 1024.0 / 1024.0).round(2),
            heap_delta_mb: (heap_delta / 1024.0 / 1024.0).round(2),
            gc_count_delta: calculate_gc_delta,
            objects_allocated: calculate_objects_allocated
          }
        end

        # Compile pipeline stage metrics
        def compile_pipeline_metrics
          return { stages: [], total_stage_time: 0.0 } if @pipeline_stages.empty?

          total_time = @pipeline_stages.sum { |stage| stage[:execution_time] }

          {
            stages: @pipeline_stages.map do |stage|
              {
                name: stage[:name],
                execution_time: stage[:execution_time].round(4),
                percentage_of_total: ((stage[:execution_time] / total_time) * 100).round(2),
                metadata: stage[:metadata]
              }
            end,
            total_stage_time: total_time.round(4),
            slowest_stage: @pipeline_stages.max_by { |s| s[:execution_time] }&.[](:name),
            fastest_stage: @pipeline_stages.min_by { |s| s[:execution_time] }&.[](:name)
          }
        end

        # Compile error metrics
        def compile_error_metrics
          {
            total_errors: @errors.length,
            error_rate: calculate_error_rate,
            error_types: categorize_errors(@errors),
            errors: @errors
          }
        end

        # Compile generation result summary
        def compile_generation_summary
          return {} unless @generation_result.is_a?(Hash)

          {
            success: @generation_result[:success] || false,
            models_generated: extract_models_count,
            files_generated: extract_files_count,
            execution_time: @generation_result[:execution_time],
            has_statistics: @generation_result.key?(:statistics)
          }
        end

        # Compile system information
        def compile_system_info
          {
            ruby_version: RUBY_VERSION,
            ruby_platform: RUBY_PLATFORM,
            rails_version: defined?(Rails) ? Rails.version : nil,
            gc_settings: {
              heap_growth_factor: GC::INTERNAL_CONSTANTS[:HEAP_GROWTH_FACTOR],
              heap_growth_max_slots: GC::INTERNAL_CONSTANTS[:HEAP_GROWTH_MAX_SLOTS],
              heap_page_size: GC::INTERNAL_CONSTANTS[:HEAP_PAGE_SIZE]
            }
          }
        end

        # Calculate total file size for generated files
        def calculate_total_file_size(file_paths)
          return 0 unless file_paths.is_a?(Array)

          file_paths.sum do |file_path|
            File.exist?(file_path) ? File.size(file_path) : 0
          end
        end

        # Record pipeline statistics from generation result
        def record_pipeline_statistics(statistics)
          return unless statistics.is_a?(Hash)

          # Record known pipeline stages if present
          if statistics[:pipeline_stages]
            statistics[:pipeline_stages].each do |stage_name, stage_time|
              record_pipeline_stage(stage_name, stage_time)
            end
          end

          # Record file operation counts
          if statistics[:files_created]
            @file_operations[:created] = statistics[:files_created]
          end
        end

        # Get process memory usage (platform-specific)
        def get_process_memory_usage
          if RUBY_PLATFORM =~ /darwin/
            # macOS: Use `ps` command
            `ps -o rss= -p #{Process.pid}`.to_i * 1024
          elsif RUBY_PLATFORM =~ /linux/
            # Linux: Read from /proc/self/status
            status_content = File.read("/proc/self/status") rescue ""
            if status_content =~ /VmRSS:\s+(\d+)\s+kB/
              $1.to_i * 1024
            else
              0
            end
          else
            # Fallback: Use Ruby's ObjectSpace if available
            ObjectSpace.memsize_of_all rescue 0
          end
        end

        # Calculate GC delta between start and end
        def calculate_gc_delta
          return 0 unless @gc_stats_start && @gc_stats_end

          @gc_stats_end[:count] - @gc_stats_start[:count]
        end

        # Calculate objects allocated during measurement
        def calculate_objects_allocated
          return 0 unless @gc_stats_start && @gc_stats_end

          start_total = @gc_stats_start[:total_allocated_objects] || 0
          end_total = @gc_stats_end[:total_allocated_objects] || 0

          end_total - start_total
        end

        # Calculate speed score based on execution time and output
        def calculate_speed_score(execution_time, files_generated)
          return 0.0 if files_generated == 0

          files_per_second = files_generated / execution_time
          baseline_fps = 2.0 # 2 files per second baseline

          score = (files_per_second / baseline_fps) * 100
          [ score, 100.0 ].min
        end

        # Calculate reliability score based on errors
        def calculate_reliability_score(errors_count, files_generated)
          return 100.0 if errors_count == 0
          return 0.0 if files_generated == 0

          error_rate = errors_count.to_f / files_generated
          reliability_score = [ 100.0 * (1.0 - error_rate), 0.0 ].max

          [ reliability_score, 100.0 ].min
        end

        # Calculate error rate percentage
        def calculate_error_rate
          return 0.0 if @errors.empty?

          total_operations = @file_operations[:created] + @errors.length
          return 0.0 if total_operations == 0

          (@errors.length.to_f / total_operations * 100).round(2)
        end

        # Categorize errors by type
        def categorize_errors(errors)
          categories = Hash.new(0)

          errors.each do |error|
            category = case error.to_s
            when /template/i then :template_errors
            when /file/i, /write/i then :file_errors
            when /schema/i, /database/i then :schema_errors
            when /relationship/i then :relationship_errors
            else :other_errors
            end

            categories[category] += 1
          end

          categories
        end

        # Extract models count from generation result
        def extract_models_count
          return 0 unless @generation_result.is_a?(Hash)

          if @generation_result[:generated_models]
            @generation_result[:generated_models].length
          elsif @generation_result[:statistics] && @generation_result[:statistics][:models_generated]
            @generation_result[:statistics][:models_generated]
          else
            0
          end
        end

        # Extract files count from generation result
        def extract_files_count
          return 0 unless @generation_result.is_a?(Hash)

          if @generation_result[:generated_files]
            @generation_result[:generated_files].length
          elsif @generation_result[:statistics] && @generation_result[:statistics][:files_created]
            @generation_result[:statistics][:files_created]
          else
            0
          end
        end
      end
    end
  end
end
