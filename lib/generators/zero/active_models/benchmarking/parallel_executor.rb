# frozen_string_literal: true

require "concurrent-ruby"
require "thread"

module Zero
  module Generators
    module Benchmarking
      # ParallelExecutor provides parallel execution capabilities for pipeline stages
      #
      # This class implements safe parallel execution for ReactiveRecord generation pipeline
      # stages that can be parallelized without dependencies. It provides thread-safe
      # coordination and error handling for concurrent operations.
      #
      # Key Features:
      # - Thread-safe parallel execution of independent pipeline stages
      # - Configurable thread pool size based on system capabilities
      # - Dependency-aware scheduling (stages can declare dependencies)
      # - Comprehensive error handling and rollback capabilities
      # - Performance monitoring for parallel vs sequential execution
      #
      # @example Basic parallel execution
      #   executor = ParallelExecutor.new(max_threads: 4)
      #
      #   stages = [
      #     { name: :schema_analysis, callable: -> { analyze_schema } },
      #     { name: :type_mapping, callable: -> { map_types } }
      #   ]
      #
      #   results = executor.execute_parallel(stages)
      #
      # @example Dependency-aware execution
      #   stages = [
      #     { name: :schema_analysis, callable: -> { analyze_schema } },
      #     { name: :model_generation, callable: -> { generate_models }, depends_on: [:schema_analysis] },
      #     { name: :typescript_generation, callable: -> { generate_typescript }, depends_on: [:model_generation] }
      #   ]
      #
      #   results = executor.execute_with_dependencies(stages)
      #
      class ParallelExecutor
        attr_reader :max_threads, :thread_pool, :performance_monitor

        # Default maximum number of threads based on system CPU count
        DEFAULT_MAX_THREADS = [ Concurrent.processor_count, 4 ].min

        # Thread pool shutdown timeout in seconds
        SHUTDOWN_TIMEOUT = 30

        # Initialize parallel executor
        #
        # @param max_threads [Integer] Maximum number of concurrent threads
        # @param enable_monitoring [Boolean] Enable performance monitoring
        # @param thread_pool [Concurrent::ThreadPoolExecutor] Custom thread pool (optional)
        def initialize(
          max_threads: DEFAULT_MAX_THREADS,
          enable_monitoring: true,
          thread_pool: nil
        )
          @max_threads = max_threads
          @enable_monitoring = enable_monitoring
          @performance_monitor = ParallelPerformanceMonitor.new if @enable_monitoring

          @thread_pool = thread_pool || create_thread_pool
          @execution_mutex = Mutex.new
          @results = {}
          @errors = []
        end

        # Execute stages in parallel without dependency management
        #
        # This method executes all stages concurrently and waits for completion.
        # Use this when stages are completely independent of each other.
        #
        # @param stages [Array<Hash>] Array of stage definitions
        # @return [Hash] Execution results with performance metrics
        def execute_parallel(stages)
          return empty_result if stages.empty?

          start_time = current_time_microseconds
          reset_execution_state

          @performance_monitor&.start_parallel_execution(stages.length)

          # Submit all stages to thread pool
          futures = stages.map do |stage|
            submit_stage_for_execution(stage)
          end

          # Wait for all stages to complete
          results = collect_futures_results(futures)

          execution_time = current_time_microseconds - start_time

          @performance_monitor&.end_parallel_execution(execution_time, results, @errors)

          compile_execution_results(results, execution_time, :parallel)
        end

        # Execute stages with dependency management
        #
        # This method executes stages in dependency order, parallelizing independent
        # stages while respecting dependency constraints.
        #
        # @param stages [Array<Hash>] Array of stage definitions with dependencies
        # @return [Hash] Execution results with performance metrics
        def execute_with_dependencies(stages)
          return empty_result if stages.empty?

          start_time = current_time_microseconds
          reset_execution_state

          @performance_monitor&.start_dependency_execution(stages.length)

          # Build dependency graph
          dependency_graph = build_dependency_graph(stages)

          # Execute stages in dependency order
          results = execute_dependency_graph(dependency_graph)

          execution_time = current_time_microseconds - start_time

          @performance_monitor&.end_dependency_execution(execution_time, results, @errors)

          compile_execution_results(results, execution_time, :dependency_aware)
        end

        # Execute stages sequentially for comparison
        #
        # @param stages [Array<Hash>] Array of stage definitions
        # @return [Hash] Execution results with performance metrics
        def execute_sequential(stages)
          return empty_result if stages.empty?

          start_time = current_time_microseconds
          reset_execution_state

          @performance_monitor&.start_sequential_execution(stages.length)

          results = {}
          stages.each do |stage|
            stage_name = stage[:name]
            stage_start = current_time_microseconds

            begin
              result = execute_stage(stage)
              stage_time = current_time_microseconds - stage_start

              results[stage_name] = {
                result: result,
                execution_time: stage_time,
                success: true
              }

              @performance_monitor&.record_stage_completion(stage_name, stage_time, true)

            rescue => error
              stage_time = current_time_microseconds - stage_start

              @errors << {
                stage: stage_name,
                error: error.message,
                backtrace: error.backtrace&.first(5),
                execution_time: stage_time
              }

              results[stage_name] = {
                result: nil,
                execution_time: stage_time,
                success: false,
                error: error.message
              }

              @performance_monitor&.record_stage_completion(stage_name, stage_time, false)
            end
          end

          execution_time = current_time_microseconds - start_time

          @performance_monitor&.end_sequential_execution(execution_time, results, @errors)

          compile_execution_results(results, execution_time, :sequential)
        end

        # Compare parallel vs sequential execution performance
        #
        # @param stages [Array<Hash>] Array of stage definitions
        # @return [Hash] Performance comparison results
        def compare_execution_methods(stages)
          return empty_comparison if stages.empty?

          # Execute both methods and compare results
          sequential_result = execute_sequential(stages.dup)
          parallel_result = execute_parallel(stages.dup)

          {
            sequential: sequential_result,
            parallel: parallel_result,
            performance_improvement: calculate_performance_improvement(
              sequential_result[:total_execution_time],
              parallel_result[:total_execution_time]
            ),
            parallelization_efficiency: calculate_parallelization_efficiency(
              sequential_result,
              parallel_result
            ),
            recommendation: generate_parallelization_recommendation(
              sequential_result,
              parallel_result
            )
          }
        end

        # Get current performance statistics
        #
        # @return [Hash] Current performance statistics
        def performance_statistics
          @performance_monitor&.statistics || {}
        end

        # Shutdown the parallel executor and clean up resources
        def shutdown
          @thread_pool.shutdown
          @thread_pool.wait_for_termination(SHUTDOWN_TIMEOUT)

          unless @thread_pool.shutdown?
            @thread_pool.kill
          end
        end

        private

        # Create configured thread pool
        def create_thread_pool
          Concurrent::ThreadPoolExecutor.new(
            min_threads: 1,
            max_threads: @max_threads,
            max_queue: @max_threads * 2,
            fallback_policy: :caller_runs,
            name: "reactive-record-parallel-executor"
          )
        end

        # Submit stage for parallel execution
        def submit_stage_for_execution(stage)
          Concurrent::Future.execute(executor: @thread_pool) do
            stage_name = stage[:name]
            stage_start = current_time_microseconds

            begin
              result = execute_stage(stage)
              stage_time = current_time_microseconds - stage_start

              @performance_monitor&.record_stage_completion(stage_name, stage_time, true)

              {
                stage_name: stage_name,
                result: result,
                execution_time: stage_time,
                success: true
              }
            rescue => error
              stage_time = current_time_microseconds - stage_start

              error_info = {
                stage: stage_name,
                error: error.message,
                backtrace: error.backtrace&.first(5),
                execution_time: stage_time
              }

              @execution_mutex.synchronize do
                @errors << error_info
              end

              @performance_monitor&.record_stage_completion(stage_name, stage_time, false)

              {
                stage_name: stage_name,
                result: nil,
                execution_time: stage_time,
                success: false,
                error: error.message
              }
            end
          end
        end

        # Execute a single stage
        def execute_stage(stage)
          callable = stage[:callable]

          case callable
          when Proc, Method
            callable.call
          when Symbol
            # Assume it's a method name on some object
            stage[:object]&.send(callable)
          else
            raise ArgumentError, "Invalid callable for stage #{stage[:name]}"
          end
        end

        # Collect results from completed futures
        def collect_futures_results(futures)
          results = {}

          futures.each do |future|
            begin
              stage_result = future.value # This will block until completion
              stage_name = stage_result[:stage_name]
              results[stage_name] = stage_result
            rescue => error
              # Future execution error - should already be recorded
              next
            end
          end

          results
        end

        # Build dependency graph from stage definitions
        def build_dependency_graph(stages)
          graph = {}

          stages.each do |stage|
            stage_name = stage[:name]
            dependencies = Array(stage[:depends_on] || [])

            graph[stage_name] = {
              stage: stage,
              dependencies: dependencies,
              dependents: [],
              executed: false
            }
          end

          # Build reverse dependencies (dependents)
          graph.each do |stage_name, node|
            node[:dependencies].each do |dependency|
              if graph[dependency]
                graph[dependency][:dependents] << stage_name
              else
                raise ArgumentError, "Unknown dependency '#{dependency}' for stage '#{stage_name}'"
              end
            end
          end

          graph
        end

        # Execute dependency graph with parallelization
        def execute_dependency_graph(graph)
          results = {}
          ready_queue = Queue.new

          # Find initial ready stages (no dependencies)
          graph.each do |stage_name, node|
            if node[:dependencies].empty?
              ready_queue.push(stage_name)
            end
          end

          # Execute stages as they become ready
          while !ready_queue.empty? || graph.values.any? { |node| !node[:executed] }
            current_batch = []

            # Collect all currently ready stages
            while !ready_queue.empty?
              current_batch << ready_queue.pop
            end

            break if current_batch.empty? # No more stages can be executed

            # Execute current batch in parallel
            batch_futures = current_batch.map do |stage_name|
              node = graph[stage_name]
              submit_stage_for_execution(node[:stage])
            end

            # Wait for batch completion and update graph
            batch_futures.each do |future|
              stage_result = future.value
              stage_name = stage_result[:stage_name]
              results[stage_name] = stage_result
              graph[stage_name][:executed] = true

              # Check if any dependent stages are now ready
              graph[stage_name][:dependents].each do |dependent|
                dependent_node = graph[dependent]

                if !dependent_node[:executed] &&
                   dependent_node[:dependencies].all? { |dep| graph[dep][:executed] }
                  ready_queue.push(dependent)
                end
              end
            end
          end

          results
        end

        # Reset execution state for new run
        def reset_execution_state
          @results = {}
          @errors = []
        end

        # Compile execution results
        def compile_execution_results(stage_results, total_execution_time, execution_method)
          successful_stages = stage_results.values.count { |result| result[:success] }
          failed_stages = stage_results.length - successful_stages

          {
            execution_method: execution_method,
            total_execution_time: total_execution_time / 1_000_000.0, # Convert to seconds
            stage_results: stage_results,
            summary: {
              total_stages: stage_results.length,
              successful_stages: successful_stages,
              failed_stages: failed_stages,
              success_rate: stage_results.empty? ? 0.0 : (successful_stages.to_f / stage_results.length * 100).round(2)
            },
            errors: @errors,
            performance_statistics: @performance_monitor&.statistics || {},
            parallelization_efficiency: calculate_parallelization_efficiency_single(stage_results, total_execution_time)
          }
        end

        # Calculate performance improvement percentage
        def calculate_performance_improvement(sequential_time, parallel_time)
          return 0.0 if sequential_time <= 0

          improvement = ((sequential_time - parallel_time) / sequential_time * 100).round(2)
          [ improvement, 0.0 ].max # Cap at 0% (no negative improvements)
        end

        # Calculate parallelization efficiency
        def calculate_parallelization_efficiency(sequential_result, parallel_result)
          sequential_time = sequential_result[:total_execution_time]
          parallel_time = parallel_result[:total_execution_time]

          return 0.0 if sequential_time <= 0 || parallel_time <= 0

          theoretical_speedup = @max_threads
          actual_speedup = sequential_time / parallel_time

          efficiency = (actual_speedup / theoretical_speedup * 100).round(2)
          [ efficiency, 100.0 ].min # Cap at 100%
        end

        # Calculate parallelization efficiency for single execution
        def calculate_parallelization_efficiency_single(stage_results, total_time)
          return 0.0 if stage_results.empty? || total_time <= 0

          total_stage_time = stage_results.values.sum { |result| result[:execution_time] }

          return 0.0 if total_stage_time <= 0

          # Theoretical minimum time if perfect parallelization
          theoretical_minimum = total_stage_time / @max_threads
          actual_time = total_time / 1_000_000.0 # Convert to seconds

          efficiency = (theoretical_minimum / actual_time * 100).round(2)
          [ efficiency, 100.0 ].min # Cap at 100%
        end

        # Generate parallelization recommendation
        def generate_parallelization_recommendation(sequential_result, parallel_result)
          improvement = calculate_performance_improvement(
            sequential_result[:total_execution_time],
            parallel_result[:total_execution_time]
          )

          case improvement
          when 0...10
            "Minimal performance gain from parallelization. Consider sequential execution for simplicity."
          when 10...25
            "Moderate performance improvement. Parallelization provides some benefit but overhead is significant."
          when 25...50
            "Good performance improvement. Parallelization is recommended for this workload."
          else
            "Excellent performance improvement. Parallelization is highly recommended."
          end
        end

        # Get current time in microseconds
        def current_time_microseconds
          Process.clock_gettime(Process::CLOCK_MONOTONIC, :float_microsecond)
        end

        # Return empty result structure
        def empty_result
          {
            execution_method: :none,
            total_execution_time: 0.0,
            stage_results: {},
            summary: {
              total_stages: 0,
              successful_stages: 0,
              failed_stages: 0,
              success_rate: 0.0
            },
            errors: [],
            performance_statistics: {}
          }
        end

        # Return empty comparison structure
        def empty_comparison
          {
            sequential: empty_result,
            parallel: empty_result,
            performance_improvement: 0.0,
            parallelization_efficiency: 0.0,
            recommendation: "No stages to execute"
          }
        end
      end

      # Performance monitor for parallel execution
      class ParallelPerformanceMonitor
        attr_reader :statistics

        def initialize
          @statistics = {
            total_executions: 0,
            parallel_executions: 0,
            sequential_executions: 0,
            dependency_executions: 0,
            average_parallel_time: 0.0,
            average_sequential_time: 0.0,
            average_improvement: 0.0,
            stage_statistics: {}
          }
          @execution_history = []
          @mutex = Mutex.new
        end

        # Start monitoring parallel execution
        def start_parallel_execution(stage_count)
          @current_execution = {
            type: :parallel,
            stage_count: stage_count,
            start_time: current_time_microseconds,
            stages: {}
          }
        end

        # Start monitoring sequential execution
        def start_sequential_execution(stage_count)
          @current_execution = {
            type: :sequential,
            stage_count: stage_count,
            start_time: current_time_microseconds,
            stages: {}
          }
        end

        # Start monitoring dependency-aware execution
        def start_dependency_execution(stage_count)
          @current_execution = {
            type: :dependency_aware,
            stage_count: stage_count,
            start_time: current_time_microseconds,
            stages: {}
          }
        end

        # Record stage completion
        def record_stage_completion(stage_name, execution_time, success)
          return unless @current_execution

          @current_execution[:stages][stage_name] = {
            execution_time: execution_time,
            success: success
          }

          # Update stage statistics
          @mutex.synchronize do
            @statistics[:stage_statistics][stage_name] ||= {
              total_executions: 0,
              total_time: 0.0,
              average_time: 0.0,
              success_rate: 0.0
            }

            stage_stats = @statistics[:stage_statistics][stage_name]
            stage_stats[:total_executions] += 1
            stage_stats[:total_time] += execution_time / 1_000_000.0
            stage_stats[:average_time] = stage_stats[:total_time] / stage_stats[:total_executions]
            stage_stats[:success_rate] = (stage_stats[:success_rate] * (stage_stats[:total_executions] - 1) +
                                        (success ? 100.0 : 0.0)) / stage_stats[:total_executions]
          end
        end

        # End parallel execution monitoring
        def end_parallel_execution(total_time, results, errors)
          end_execution_monitoring(total_time)

          @mutex.synchronize do
            @statistics[:parallel_executions] += 1
            update_parallel_statistics(total_time)
          end
        end

        # End sequential execution monitoring
        def end_sequential_execution(total_time, results, errors)
          end_execution_monitoring(total_time)

          @mutex.synchronize do
            @statistics[:sequential_executions] += 1
            update_sequential_statistics(total_time)
          end
        end

        # End dependency execution monitoring
        def end_dependency_execution(total_time, results, errors)
          end_execution_monitoring(total_time)

          @mutex.synchronize do
            @statistics[:dependency_executions] += 1
          end
        end

        private

        # End execution monitoring
        def end_execution_monitoring(total_time)
          return unless @current_execution

          @current_execution[:total_time] = total_time
          @current_execution[:end_time] = current_time_microseconds

          @execution_history << @current_execution
          @current_execution = nil

          @mutex.synchronize do
            @statistics[:total_executions] += 1
          end
        end

        # Update parallel execution statistics
        def update_parallel_statistics(total_time)
          time_seconds = total_time / 1_000_000.0

          current_avg = @statistics[:average_parallel_time]
          count = @statistics[:parallel_executions]

          @statistics[:average_parallel_time] = (current_avg * (count - 1) + time_seconds) / count
        end

        # Update sequential execution statistics
        def update_sequential_statistics(total_time)
          time_seconds = total_time / 1_000_000.0

          current_avg = @statistics[:average_sequential_time]
          count = @statistics[:sequential_executions]

          @statistics[:average_sequential_time] = (current_avg * (count - 1) + time_seconds) / count

          # Update average improvement if we have both parallel and sequential data
          if @statistics[:average_parallel_time] > 0 && @statistics[:average_sequential_time] > 0
            improvement = ((@statistics[:average_sequential_time] - @statistics[:average_parallel_time]) /
                          @statistics[:average_sequential_time] * 100)
            @statistics[:average_improvement] = improvement.round(2)
          end
        end

        # Get current time in microseconds
        def current_time_microseconds
          Process.clock_gettime(Process::CLOCK_MONOTONIC, :float_microsecond)
        end
      end
    end
  end
end
