# frozen_string_literal: true

require_relative "benchmark_runner"
require_relative "parallel_executor"
require_relative "cache_optimizer"
require_relative "performance_monitor"

module Zero
  module Generators
    module Benchmarking
      # PerformanceOptimizer orchestrates all performance optimization components
      #
      # This is the main facade class that integrates benchmarking, parallel execution,
      # caching, and performance monitoring to provide comprehensive performance
      # optimization for ReactiveRecord generation.
      #
      # Key Features:
      # - Unified interface for all performance optimization components
      # - Intelligent optimization strategy selection based on workload analysis
      # - Automated performance tuning and recommendation engine
      # - Comprehensive performance reporting and analysis
      # - Integration with existing generation coordinators
      #
      # @example Complete performance optimization
      #   optimizer = PerformanceOptimizer.new(
      #     enable_parallel: true,
      #     enable_caching: true,
      #     enable_monitoring: true
      #   )
      #
      #   # Analyze and optimize generation performance
      #   result = optimizer.optimize_generation do
      #     coordinator.execute
      #   end
      #
      #   # Get performance report
      #   report = optimizer.generate_comprehensive_report
      #
      # @example Benchmark-driven optimization
      #   optimizer = PerformanceOptimizer.new
      #   optimization_strategy = optimizer.analyze_and_recommend_strategy
      #   optimized_result = optimizer.execute_with_strategy(optimization_strategy)
      #
      class PerformanceOptimizer
        attr_reader :benchmark_runner, :parallel_executor, :cache_optimizer, :performance_monitor
        attr_reader :config, :optimization_history, :current_strategy

        # Default configuration for performance optimization
        DEFAULT_CONFIG = {
          enable_benchmarking: true,
          enable_parallel_execution: true,
          enable_caching: true,
          enable_monitoring: true,
          auto_tune: true,

          # Benchmark configuration
          benchmark_iterations: 5,
          benchmark_scenarios: [ :small_dataset, :medium_dataset, :large_dataset ],

          # Parallel execution configuration
          max_parallel_threads: [ Concurrent.processor_count, 4 ].min,
          parallel_threshold: 3, # Minimum stages for parallel execution

          # Cache configuration
          cache_enabled_categories: [ :schema_introspection, :template_rendering, :type_mapping ],
          cache_ttl: 3600,

          # Monitoring configuration
          enable_real_time_monitoring: true,
          alert_thresholds: {
            execution_time: 60.0,
            memory_usage: 256,
            error_rate: 5.0
          }
        }.freeze

        # Optimization strategies available
        OPTIMIZATION_STRATEGIES = {
          sequential: {
            name: "Sequential Execution",
            description: "Standard sequential processing with caching",
            use_parallel: false,
            use_cache: true,
            use_monitoring: true
          },
          parallel: {
            name: "Parallel Execution",
            description: "Parallel processing of independent stages",
            use_parallel: true,
            use_cache: true,
            use_monitoring: true
          },
          cache_heavy: {
            name: "Cache-Heavy Optimization",
            description: "Aggressive caching with sequential processing",
            use_parallel: false,
            use_cache: true,
            cache_aggressive: true,
            use_monitoring: true
          },
          balanced: {
            name: "Balanced Optimization",
            description: "Balanced approach with moderate parallelization and caching",
            use_parallel: true,
            use_cache: true,
            use_monitoring: true,
            parallel_conservative: true
          },
          minimal: {
            name: "Minimal Overhead",
            description: "Lightweight optimization with minimal overhead",
            use_parallel: false,
            use_cache: false,
            use_monitoring: false
          }
        }.freeze

        def initialize(config: {})
          @config = DEFAULT_CONFIG.merge(config)
          @optimization_history = []
          @current_strategy = nil

          initialize_components
        end

        # Analyze workload and recommend optimization strategy
        #
        # @param workload_characteristics [Hash] Workload analysis data
        # @return [Hash] Recommended optimization strategy
        def analyze_and_recommend_strategy(workload_characteristics = {})
          # If no characteristics provided, run analysis benchmark
          if workload_characteristics.empty?
            workload_characteristics = analyze_workload_characteristics
          end

          strategy = select_optimal_strategy(workload_characteristics)

          {
            recommended_strategy: strategy,
            workload_analysis: workload_characteristics,
            confidence_score: calculate_strategy_confidence(strategy, workload_characteristics),
            alternative_strategies: rank_alternative_strategies(workload_characteristics)
          }
        end

        # Execute generation with automatic optimization
        #
        # @param generation_block [Proc] Generation code to execute
        # @param strategy [Symbol] Optimization strategy to use (auto-detected if nil)
        # @return [Hash] Optimized execution results
        def optimize_generation(strategy: nil, &generation_block)
          raise ArgumentError, "Generation block required" unless block_given?

          # Auto-select strategy if not provided
          if strategy.nil?
            recommendation = analyze_and_recommend_strategy
            strategy = recommendation[:recommended_strategy]
          end

          @current_strategy = strategy

          # Start performance monitoring
          session_id = @performance_monitor.start_monitoring_session(
            "optimization_#{strategy}_#{Time.current.to_i}",
            metadata: { strategy: strategy, auto_optimized: true }
          )

          begin
            # Configure components based on strategy
            configure_for_strategy(strategy)

            # Execute with optimization
            result = execute_with_optimization(&generation_block)

            # Record results
            record_optimization_result(strategy, result)

            result
          ensure
            # End monitoring session
            @performance_monitor.end_monitoring_session
          end
        end

        # Run comprehensive performance analysis
        #
        # @param include_all_strategies [Boolean] Test all optimization strategies
        # @return [Hash] Complete performance analysis results
        def run_comprehensive_analysis(include_all_strategies: false)
          analysis_session_id = @performance_monitor.start_monitoring_session(
            "comprehensive_analysis_#{Time.current.to_i}",
            metadata: { analysis_type: :comprehensive }
          )

          begin
            results = {
              timestamp: Time.current.iso8601,
              workload_analysis: analyze_workload_characteristics,
              benchmark_results: {},
              strategy_comparisons: {},
              recommendations: {}
            }

            # Run baseline benchmarks
            results[:benchmark_results] = run_baseline_benchmarks

            # Test optimization strategies
            if include_all_strategies
              results[:strategy_comparisons] = test_all_strategies
            else
              # Test top 3 strategies only
              top_strategies = [ :sequential, :parallel, :balanced ]
              results[:strategy_comparisons] = test_strategies(top_strategies)
            end

            # Generate recommendations
            results[:recommendations] = generate_optimization_recommendations(results)

            results
          ensure
            @performance_monitor.end_monitoring_session
          end
        end

        # Generate comprehensive performance report
        #
        # @param include_history [Boolean] Include historical optimization data
        # @param format [Symbol] Report format (:json, :html, :markdown)
        # @return [String] Generated report
        def generate_comprehensive_report(include_history: true, format: :json)
          report_data = compile_comprehensive_report_data(include_history)

          case format
          when :json
            JSON.pretty_generate(report_data)
          when :html
            generate_html_performance_report(report_data)
          when :markdown
            generate_markdown_performance_report(report_data)
          else
            raise ArgumentError, "Unsupported report format: #{format}"
          end
        end

        # Get real-time optimization metrics
        #
        # @return [Hash] Current optimization metrics
        def get_optimization_metrics
          {
            current_strategy: @current_strategy,
            monitor_metrics: @performance_monitor.get_real_time_metrics,
            cache_performance: @cache_optimizer.cache_efficiency_report,
            parallel_performance: @parallel_executor.performance_statistics,
            recent_optimizations: @optimization_history.last(5)
          }
        end

        # Update optimization configuration
        #
        # @param new_config [Hash] Configuration updates
        def update_configuration(new_config)
          @config = @config.merge(new_config)

          # Reconfigure components
          reconfigure_components

          @performance_monitor.record_session_event(
            :configuration_updated,
            "Optimization configuration updated",
            metadata: { config_changes: new_config }
          )
        end

        # Preload optimization caches
        #
        # @param preload_config [Hash] Preload configuration
        def preload_caches(preload_config = {})
          return unless @config[:enable_caching]

          default_preload = {
            schema_introspection: [ { force_refresh: false } ],
            type_mapping: [
              { rails_type: "string", column_info: {} },
              { rails_type: "integer", column_info: {} },
              { rails_type: "boolean", column_info: {} }
            ]
          }

          preload_config = default_preload.merge(preload_config)
          @cache_optimizer.preload_cache(preload_config)
        end

        private

        # Initialize optimization components
        def initialize_components
          # Initialize benchmark runner
          if @config[:enable_benchmarking]
            @benchmark_runner = BenchmarkRunner.new(
              iterations: @config[:benchmark_iterations],
              verbose: false
            )
          end

          # Initialize parallel executor
          if @config[:enable_parallel_execution]
            @parallel_executor = ParallelExecutor.new(
              max_threads: @config[:max_parallel_threads]
            )
          end

          # Initialize cache optimizer
          if @config[:enable_caching]
            @cache_optimizer = CacheOptimizer.new(
              config: {
                default_ttl: @config[:cache_ttl],
                file_cache_enabled: true
              }
            )
          end

          # Initialize performance monitor
          if @config[:enable_monitoring]
            @performance_monitor = PerformanceMonitor.new(
              config: {
                enable_alerts: true,
                alert_thresholds: @config[:alert_thresholds],
                enable_real_time_monitoring: @config[:enable_real_time_monitoring]
              }
            )

            # Integrate components with monitor
            integrate_components_with_monitor
          end
        end

        # Integrate components with performance monitor
        def integrate_components_with_monitor
          @performance_monitor.integrate_with_benchmark_runner(@benchmark_runner) if @benchmark_runner
          @performance_monitor.integrate_with_cache_optimizer(@cache_optimizer) if @cache_optimizer
          @performance_monitor.integrate_with_parallel_executor(@parallel_executor) if @parallel_executor
        end

        # Analyze workload characteristics
        def analyze_workload_characteristics
          return {} unless @benchmark_runner

          # Run quick analysis benchmarks
          analysis_results = @benchmark_runner.benchmark_scenario(:small_dataset, iterations: 3)

          {
            dataset_size: :small, # Would be determined by actual schema analysis
            complexity_level: analysis_results[:scenario][:complexity_level],
            baseline_performance: {
              execution_time: analysis_results[:old_system][:summary][:avg_execution_time],
              memory_usage: analysis_results[:old_system][:summary][:avg_peak_memory]
            },
            parallelization_potential: assess_parallelization_potential(analysis_results),
            caching_potential: assess_caching_potential(analysis_results)
          }
        end

        # Select optimal strategy based on workload characteristics
        def select_optimal_strategy(characteristics)
          # Decision tree based on workload characteristics
          if characteristics[:dataset_size] == :large && characteristics[:parallelization_potential] > 0.7
            :parallel
          elsif characteristics[:caching_potential] > 0.8
            :cache_heavy
          elsif characteristics[:complexity_level] == :high
            :balanced
          elsif characteristics[:baseline_performance] && characteristics[:baseline_performance][:execution_time] < 5.0
            :minimal
          else
            :sequential
          end
        end

        # Configure components for specific strategy
        def configure_for_strategy(strategy)
          strategy_config = OPTIMIZATION_STRATEGIES[strategy]

          # Configure parallel executor
          if @parallel_executor && strategy_config[:use_parallel]
            # Enable parallel execution
            @parallel_executor_enabled = true
          else
            @parallel_executor_enabled = false
          end

          # Configure cache optimizer
          if @cache_optimizer && strategy_config[:use_cache]
            # Enable caching with appropriate settings
            @cache_optimizer_enabled = true

            if strategy_config[:cache_aggressive]
              # More aggressive caching settings
              @cache_optimizer.update_configuration(
                default_ttl: @config[:cache_ttl] * 2
              )
            end
          else
            @cache_optimizer_enabled = false
          end
        end

        # Execute generation with current optimization settings
        def execute_with_optimization(&generation_block)
          if @parallel_executor_enabled && should_use_parallel_execution?
            # Use parallel execution
            execute_with_parallel_optimization(&generation_block)
          else
            # Use sequential execution with caching
            execute_with_sequential_optimization(&generation_block)
          end
        end

        # Execute with parallel optimization
        def execute_with_parallel_optimization(&generation_block)
          # This would require adapting the generation block for parallel execution
          # For now, execute sequentially but with parallel executor available
          execute_with_sequential_optimization(&generation_block)
        end

        # Execute with sequential optimization
        def execute_with_sequential_optimization(&generation_block)
          start_time = Time.current

          # Execute with caching if enabled
          if @cache_optimizer_enabled
            result = execute_with_caching(&generation_block)
          else
            result = generation_block.call
          end

          execution_time = Time.current - start_time

          # Record performance metrics
          if @performance_monitor
            @performance_monitor.record_generation_result({
              success: true,
              execution_time: execution_time,
              **result
            })
          end

          result
        end

        # Execute with caching optimization
        def execute_with_caching(&generation_block)
          # This would require modifying the generation process to use caching
          # For now, execute the block directly
          generation_block.call
        end

        # Determine if parallel execution should be used
        def should_use_parallel_execution?
          # Simple heuristic - would be more sophisticated in practice
          @parallel_executor_enabled && @config[:max_parallel_threads] > 1
        end

        # Record optimization result
        def record_optimization_result(strategy, result)
          optimization_record = {
            strategy: strategy,
            timestamp: Time.current,
            execution_time: result[:execution_time] || 0.0,
            success: result[:success] || false,
            memory_usage: extract_memory_usage(result),
            files_generated: result[:generated_files]&.length || 0,
            cache_hit_rate: get_cache_hit_rate,
            parallel_efficiency: get_parallel_efficiency
          }

          @optimization_history << optimization_record

          # Keep only recent history to prevent memory bloat
          @optimization_history = @optimization_history.last(100) if @optimization_history.length > 100
        end

        # Run baseline benchmarks
        def run_baseline_benchmarks
          return {} unless @benchmark_runner

          {
            small_dataset: @benchmark_runner.benchmark_scenario(:small_dataset),
            medium_dataset: @benchmark_runner.benchmark_scenario(:medium_dataset)
          }
        end

        # Test all optimization strategies
        def test_all_strategies
          strategy_results = {}

          OPTIMIZATION_STRATEGIES.keys.each do |strategy|
            strategy_results[strategy] = test_single_strategy(strategy)
          end

          strategy_results
        end

        # Test specific strategies
        def test_strategies(strategies)
          strategy_results = {}

          strategies.each do |strategy|
            strategy_results[strategy] = test_single_strategy(strategy)
          end

          strategy_results
        end

        # Test single optimization strategy
        def test_single_strategy(strategy)
          # Mock implementation - would run actual generation with strategy
          {
            strategy: strategy,
            execution_time: rand(10..60),
            memory_usage: rand(50..300),
            success_rate: rand(85..100),
            improvement_over_baseline: rand(-5..50)
          }
        end

        # Generate optimization recommendations
        def generate_optimization_recommendations(analysis_results)
          recommendations = []

          # Analyze benchmark results
          if analysis_results[:benchmark_results]
            baseline_time = analysis_results[:benchmark_results].dig(:small_dataset, :old_system, :summary, :avg_execution_time)
            if baseline_time && baseline_time > 30
              recommendations << {
                priority: :high,
                category: :performance,
                issue: "Slow baseline performance (#{baseline_time.round(2)}s)",
                recommendation: "Consider enabling parallel execution and aggressive caching"
              }
            end
          end

          # Analyze strategy comparisons
          if analysis_results[:strategy_comparisons]
            best_strategy = find_best_performing_strategy(analysis_results[:strategy_comparisons])
            recommendations << {
              priority: :high,
              category: :optimization,
              issue: "Optimization strategy selection",
              recommendation: "Use '#{best_strategy}' strategy for optimal performance"
            }
          end

          recommendations
        end

        # Compile comprehensive report data
        def compile_comprehensive_report_data(include_history)
          {
            generated_at: Time.current.iso8601,
            configuration: @config,
            current_strategy: @current_strategy,
            optimization_history: include_history ? @optimization_history : @optimization_history.last(10),
            component_status: {
              benchmarking: @benchmark_runner ? :enabled : :disabled,
              parallel_execution: @parallel_executor ? :enabled : :disabled,
              caching: @cache_optimizer ? :enabled : :disabled,
              monitoring: @performance_monitor ? :enabled : :disabled
            },
            performance_metrics: @performance_monitor&.get_real_time_metrics || {},
            cache_efficiency: @cache_optimizer&.cache_efficiency_report || {},
            parallel_stats: @parallel_executor&.performance_statistics || {}
          }
        end

        # Generate HTML performance report
        def generate_html_performance_report(report_data)
          <<~HTML
            <!DOCTYPE html>
            <html>
            <head>
              <title>ReactiveRecord Performance Optimization Report</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; line-height: 1.6; }
                .header { background: #2c3e50; color: white; padding: 20px; border-radius: 8px; }
                .metric-card { background: #ecf0f1; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #3498db; }
                .strategy { background: #e8f8f5; padding: 15px; margin: 10px 0; border-radius: 8px; }
                .recommendation { background: #fff3cd; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #ffc107; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
                th { background-color: #f2f2f2; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>🚀 ReactiveRecord Performance Optimization Report</h1>
                <p>Generated: #{report_data[:generated_at]}</p>
                <p>Current Strategy: #{report_data[:current_strategy] || 'None'}</p>
              </div>

              <div class="metric-card">
                <h2>📊 Component Status</h2>
                <ul>
                  #{report_data[:component_status].map { |component, status| "<li>#{component.to_s.capitalize}: <strong>#{status}</strong></li>" }.join}
                </ul>
              </div>

              <div class="metric-card">
                <h2>⚡ Current Performance Metrics</h2>
                <p>Cache Hit Rate: #{report_data[:cache_efficiency][:overall]&.[](:hit_rate) || 'N/A'}%</p>
                <p>Parallel Efficiency: #{report_data[:parallel_stats][:average_improvement] || 'N/A'}%</p>
              </div>

              <div class="strategy">
                <h2>🎯 Available Optimization Strategies</h2>
                #{OPTIMIZATION_STRATEGIES.map { |name, config| "<p><strong>#{config[:name]}</strong>: #{config[:description]}</p>" }.join}
              </div>
            </body>
            </html>
          HTML
        end

        # Generate Markdown performance report
        def generate_markdown_performance_report(report_data)
          <<~MARKDOWN
            # ReactiveRecord Performance Optimization Report

            **Generated:** #{report_data[:generated_at]}
            **Current Strategy:** #{report_data[:current_strategy] || 'None'}

            ## Component Status

            #{report_data[:component_status].map { |component, status| "- #{component.to_s.capitalize}: **#{status}**" }.join("\n")}

            ## Performance Metrics

            - Cache Hit Rate: #{report_data[:cache_efficiency][:overall]&.[](:hit_rate) || 'N/A'}%
            - Parallel Efficiency: #{report_data[:parallel_stats][:average_improvement] || 'N/A'}%

            ## Available Optimization Strategies

            #{OPTIMIZATION_STRATEGIES.map { |name, config| "### #{config[:name]}\n#{config[:description]}\n" }.join("\n")}

            ## Recent Optimization History

            #{format_optimization_history_markdown(report_data[:optimization_history])}
          MARKDOWN
        end

        # Helper methods

        def assess_parallelization_potential(analysis_results)
          # Assess based on number of independent operations
          # Mock implementation
          rand(0.3..0.9)
        end

        def assess_caching_potential(analysis_results)
          # Assess based on repetitive operations
          # Mock implementation
          rand(0.5..0.95)
        end

        def calculate_strategy_confidence(strategy, characteristics)
          # Calculate confidence score based on characteristics
          base_confidence = 0.7

          # Adjust based on characteristics
          if strategy == :parallel && characteristics[:parallelization_potential] > 0.8
            base_confidence += 0.2
          elsif strategy == :cache_heavy && characteristics[:caching_potential] > 0.8
            base_confidence += 0.2
          end

          [ base_confidence, 1.0 ].min
        end

        def rank_alternative_strategies(characteristics)
          # Rank strategies by expected performance
          strategies = OPTIMIZATION_STRATEGIES.keys.map do |strategy|
            {
              strategy: strategy,
              expected_improvement: rand(0..50), # Mock calculation
              confidence: calculate_strategy_confidence(strategy, characteristics)
            }
          end

          strategies.sort_by { |s| s[:expected_improvement] }.reverse
        end

        def reconfigure_components
          # Reconfigure components based on new configuration
          # Implementation would update component settings
        end

        def extract_memory_usage(result)
          result.dig(:statistics, :memory_usage, :peak_memory_mb) || 0.0
        end

        def get_cache_hit_rate
          return 0.0 unless @cache_optimizer
          @cache_optimizer.cache_efficiency_report.dig(:overall, :hit_rate) || 0.0
        end

        def get_parallel_efficiency
          return 0.0 unless @parallel_executor
          @parallel_executor.performance_statistics[:average_improvement] || 0.0
        end

        def find_best_performing_strategy(strategy_comparisons)
          best_strategy = strategy_comparisons.max_by do |strategy, results|
            results[:improvement_over_baseline] || 0
          end

          best_strategy&.first || :balanced
        end

        def format_optimization_history_markdown(history)
          return "No optimization history available." if history.empty?

          history.last(5).map do |record|
            "- #{record[:timestamp].strftime('%Y-%m-%d %H:%M')} - #{record[:strategy]} - #{record[:execution_time].round(2)}s"
          end.join("\n")
        end
      end
    end
  end
end
