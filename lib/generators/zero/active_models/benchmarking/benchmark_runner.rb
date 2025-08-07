# frozen_string_literal: true

require "benchmark"
require "json"
require "pathname"
require_relative "../generation_coordinator"
require_relative "../old_generation_coordinator"
require_relative "performance_metrics"
require_relative "statistical_analyzer"

module Zero
  module Generators
    module Benchmarking
      # BenchmarkRunner orchestrates performance testing between legacy and new generation systems
      #
      # This runner provides comprehensive benchmarking capabilities for the ReactiveRecord
      # generation refactoring (STORY-EP37-011), enabling accurate performance comparisons
      # between the legacy service-registry approach and the new constructor-injection pipeline.
      #
      # Key Capabilities:
      # - Side-by-side performance comparison between old and new systems
      # - Comprehensive metrics collection (time, memory, file operations)
      # - Statistical analysis of benchmark results with confidence intervals
      # - Configurable test scenarios for different dataset sizes
      # - Detailed reporting with performance recommendations
      #
      # @example Basic benchmark comparison
      #   runner = BenchmarkRunner.new(
      #     output_dir: "/tmp/benchmark_test",
      #     iterations: 10
      #   )
      #   results = runner.run_comparative_benchmark
      #   runner.generate_report(results)
      #
      # @example Custom benchmark scenario
      #   runner = BenchmarkRunner.new
      #   results = runner.benchmark_scenario(:large_dataset, iterations: 5)
      #   puts "New system: #{results[:new_system][:avg_time]}s"
      #   puts "Old system: #{results[:old_system][:avg_time]}s"
      #
      class BenchmarkRunner
        attr_reader :options, :output_dir, :metrics_collector, :statistical_analyzer

        # Predefined benchmark scenarios with different dataset characteristics
        BENCHMARK_SCENARIOS = {
          small_dataset: {
            name: "Small Dataset",
            description: "5-10 simple tables with basic relationships",
            table_filter: %w[users clients devices],
            expected_models: 3,
            complexity_level: :low
          },
          medium_dataset: {
            name: "Medium Dataset",
            description: "10-20 tables with complex relationships and patterns",
            table_filter: %w[users clients devices jobs tasks notes activity_logs contact_methods],
            expected_models: 8,
            complexity_level: :medium
          },
          large_dataset: {
            name: "Large Dataset",
            description: "Full schema with all tables and relationships",
            table_filter: nil, # Process all tables
            expected_models: 15,
            complexity_level: :high
          },
          polymorphic_heavy: {
            name: "Polymorphic Heavy",
            description: "Tables with complex polymorphic relationships",
            table_filter: %w[activity_logs notes],
            expected_models: 2,
            complexity_level: :high
          }
        }.freeze

        # Initialize benchmark runner with configuration options
        #
        # @param output_dir [String] Directory for benchmark test files
        # @param iterations [Integer] Number of benchmark iterations per test
        # @param warmup_iterations [Integer] Number of warmup iterations
        # @param cleanup_after_run [Boolean] Whether to clean up test files
        # @param verbose [Boolean] Enable verbose output during benchmarking
        def initialize(
          output_dir: "/tmp/reactive_record_benchmark",
          iterations: 5,
          warmup_iterations: 2,
          cleanup_after_run: true,
          verbose: false
        )
          @output_dir = output_dir
          @options = {
            iterations: iterations,
            warmup_iterations: warmup_iterations,
            cleanup_after_run: cleanup_after_run,
            verbose: verbose
          }

          @metrics_collector = PerformanceMetrics.new
          @statistical_analyzer = StatisticalAnalyzer.new

          setup_benchmark_environment
        end

        # Run comprehensive comparative benchmark between old and new systems
        #
        # This method executes all predefined benchmark scenarios and compares
        # performance between the legacy GenerationCoordinator and new pipeline.
        #
        # @param scenarios [Array<Symbol>] Specific scenarios to run (default: all)
        # @return [Hash] Complete benchmark results with statistical analysis
        def run_comparative_benchmark(scenarios: BENCHMARK_SCENARIOS.keys)
          puts "🚀 Starting ReactiveRecord Generation Performance Benchmark" if @options[:verbose]
          puts "📊 Scenarios: #{scenarios.join(', ')}" if @options[:verbose]

          benchmark_results = {
            metadata: {
              timestamp: Time.current.iso8601,
              ruby_version: RUBY_VERSION,
              rails_version: defined?(Rails) ? Rails.version : "N/A",
              iterations: @options[:iterations],
              warmup_iterations: @options[:warmup_iterations]
            },
            scenarios: {},
            summary: {}
          }

          scenarios.each do |scenario_name|
            puts "\n📋 Running scenario: #{BENCHMARK_SCENARIOS[scenario_name][:name]}" if @options[:verbose]

            scenario_results = benchmark_scenario(scenario_name)
            benchmark_results[:scenarios][scenario_name] = scenario_results

            display_scenario_summary(scenario_name, scenario_results) if @options[:verbose]
          end

          # Generate comprehensive summary analysis
          benchmark_results[:summary] = generate_benchmark_summary(benchmark_results[:scenarios])

          cleanup_benchmark_files if @options[:cleanup_after_run]
          benchmark_results
        end

        # Benchmark a specific scenario comparing old vs new systems
        #
        # @param scenario_name [Symbol] Name of the benchmark scenario
        # @param custom_options [Hash] Custom options to override defaults
        # @return [Hash] Scenario benchmark results with detailed metrics
        def benchmark_scenario(scenario_name, custom_options = {})
          scenario_config = BENCHMARK_SCENARIOS[scenario_name]
          raise ArgumentError, "Unknown scenario: #{scenario_name}" unless scenario_config

          test_options = build_test_options(scenario_config, custom_options)

          # Warmup iterations (not measured)
          perform_warmup_iterations(test_options)

          # Measured iterations
          old_system_results = benchmark_old_system(test_options)
          new_system_results = benchmark_new_system(test_options)

          # Statistical analysis
          statistical_comparison = @statistical_analyzer.compare_systems(
            old_system_results[:measurements],
            new_system_results[:measurements]
          )

          {
            scenario: scenario_config,
            old_system: old_system_results,
            new_system: new_system_results,
            comparison: statistical_comparison,
            performance_improvement: calculate_performance_improvement(
              old_system_results[:summary],
              new_system_results[:summary]
            )
          }
        end

        # Generate comprehensive performance report
        #
        # @param benchmark_results [Hash] Results from run_comparative_benchmark
        # @param output_file [String] Optional file path to save report
        # @return [String] Generated report content
        def generate_report(benchmark_results, output_file: nil)
          report_generator = ReportGenerator.new(benchmark_results)
          report_content = report_generator.generate_comprehensive_report

          if output_file
            File.write(output_file, report_content)
            puts "📊 Benchmark report saved to: #{output_file}" if @options[:verbose]
          end

          report_content
        end

        # Get performance recommendations based on benchmark results
        #
        # @param benchmark_results [Hash] Results from benchmarking
        # @return [Array<Hash>] Performance recommendations with priorities
        def get_performance_recommendations(benchmark_results)
          recommendations = []

          benchmark_results[:scenarios].each do |scenario_name, results|
            improvement = results[:performance_improvement]

            if improvement[:execution_time_improvement] < 0
              recommendations << {
                priority: :high,
                category: :performance_regression,
                scenario: scenario_name,
                issue: "New system is #{improvement[:execution_time_improvement].abs}% slower",
                recommendation: "Investigate pipeline stage bottlenecks and consider caching optimizations"
              }
            elsif improvement[:execution_time_improvement] < 10
              recommendations << {
                priority: :medium,
                category: :optimization_opportunity,
                scenario: scenario_name,
                issue: "Minimal performance improvement (#{improvement[:execution_time_improvement]}%)",
                recommendation: "Consider parallel execution for independent pipeline stages"
              }
            end

            if improvement[:memory_efficiency_improvement] < 0
              recommendations << {
                priority: :medium,
                category: :memory_usage,
                scenario: scenario_name,
                issue: "New system uses #{improvement[:memory_efficiency_improvement].abs}% more memory",
                recommendation: "Review GenerationContext memory footprint and implement object pooling"
              }
            end
          end

          recommendations
        end

        private

        # Setup benchmark environment and directories
        def setup_benchmark_environment
          FileUtils.mkdir_p(@output_dir)

          # Ensure Rails models are loaded for accurate benchmarking
          if defined?(Rails) && !Rails.application.config.eager_load
            Rails.autoloaders.main.eager_load_dir(Rails.root.join("app/models"))
          end
        end

        # Build test options for a specific scenario
        def build_test_options(scenario_config, custom_options)
          base_options = {
            output_dir: @output_dir,
            dry_run: false,
            force: true,
            skip_prettier: true # Skip for consistent timing
          }

          # Apply table filtering if specified
          if scenario_config[:table_filter]
            # Note: Would need to implement table filtering logic
            base_options[:include_tables] = scenario_config[:table_filter]
          end

          base_options.merge(custom_options)
        end

        # Perform warmup iterations to stabilize performance measurements
        def perform_warmup_iterations(test_options)
          @options[:warmup_iterations].times do |i|
            puts "🔥 Warmup iteration #{i + 1}/#{@options[:warmup_iterations]}" if @options[:verbose]

            # Quick warmup run with minimal options
            warmup_options = test_options.merge(dry_run: true)

            # Warmup old system
            old_coordinator = OldGenerationCoordinator.new(warmup_options, create_silent_shell)
            old_coordinator.execute rescue nil

            # Warmup new system
            new_coordinator = GenerationCoordinator.new(warmup_options, create_silent_shell)
            new_coordinator.execute rescue nil
          end
        end

        # Benchmark the old generation system
        def benchmark_old_system(test_options)
          puts "⏱️  Benchmarking old system..." if @options[:verbose]

          measurements = []

          @options[:iterations].times do |iteration|
            @metrics_collector.reset

            execution_time = Benchmark.measure do
              @metrics_collector.start_measurement

              coordinator = OldGenerationCoordinator.new(test_options, create_silent_shell)
              result = coordinator.execute

              @metrics_collector.record_generation_result(result)
              @metrics_collector.end_measurement
            end

            measurement = @metrics_collector.compile_measurement_data(execution_time)
            measurements << measurement

            puts "  Iteration #{iteration + 1}: #{measurement[:execution_time_seconds].round(4)}s" if @options[:verbose]
          end

          {
            system_type: :old_generation_coordinator,
            measurements: measurements,
            summary: @statistical_analyzer.summarize_measurements(measurements)
          }
        end

        # Benchmark the new generation system
        def benchmark_new_system(test_options)
          puts "⏱️  Benchmarking new system..." if @options[:verbose]

          measurements = []

          @options[:iterations].times do |iteration|
            @metrics_collector.reset

            execution_time = Benchmark.measure do
              @metrics_collector.start_measurement

              coordinator = GenerationCoordinator.new(test_options, create_silent_shell)
              result = coordinator.execute

              @metrics_collector.record_generation_result(result)
              @metrics_collector.end_measurement
            end

            measurement = @metrics_collector.compile_measurement_data(execution_time)
            measurements << measurement

            puts "  Iteration #{iteration + 1}: #{measurement[:execution_time_seconds].round(4)}s" if @options[:verbose]
          end

          {
            system_type: :new_generation_pipeline,
            measurements: measurements,
            summary: @statistical_analyzer.summarize_measurements(measurements)
          }
        end

        # Calculate performance improvement percentage
        def calculate_performance_improvement(old_summary, new_summary)
          {
            execution_time_improvement: calculate_percentage_improvement(
              old_summary[:avg_execution_time],
              new_summary[:avg_execution_time]
            ),
            memory_efficiency_improvement: calculate_percentage_improvement(
              old_summary[:avg_peak_memory],
              new_summary[:avg_peak_memory]
            ),
            file_operations_improvement: calculate_percentage_improvement(
              old_summary[:avg_file_operations],
              new_summary[:avg_file_operations]
            )
          }
        end

        def calculate_percentage_improvement(old_value, new_value)
          return 0.0 if old_value.zero?
          ((old_value - new_value) / old_value * 100).round(2)
        end

        # Display summary of scenario results
        def display_scenario_summary(scenario_name, results)
          scenario = results[:scenario]
          old_avg = results[:old_system][:summary][:avg_execution_time]
          new_avg = results[:new_system][:summary][:avg_execution_time]
          improvement = results[:performance_improvement][:execution_time_improvement]

          puts "  📈 Results for #{scenario[:name]}:"
          puts "    Old system: #{old_avg.round(4)}s"
          puts "    New system: #{new_avg.round(4)}s"

          if improvement > 0
            puts "    🚀 Improvement: #{improvement}% faster"
          elsif improvement < 0
            puts "    ⚠️  Regression: #{improvement.abs}% slower"
          else
            puts "    ➡️  No significant change"
          end
        end

        # Generate benchmark summary across all scenarios
        def generate_benchmark_summary(scenario_results)
          total_scenarios = scenario_results.size
          performance_improvements = scenario_results.values.map { |r| r[:performance_improvement][:execution_time_improvement] }

          {
            total_scenarios_tested: total_scenarios,
            overall_performance_improvement: performance_improvements.sum / total_scenarios,
            best_improvement: performance_improvements.max,
            worst_improvement: performance_improvements.min,
            scenarios_with_improvement: performance_improvements.count { |i| i > 0 },
            scenarios_with_regression: performance_improvements.count { |i| i < 0 }
          }
        end

        # Clean up benchmark test files
        def cleanup_benchmark_files
          FileUtils.rm_rf(@output_dir) if File.exist?(@output_dir)
          puts "🧹 Cleaned up benchmark files" if @options[:verbose]
        end

        # Create a silent shell for benchmarking (reduces noise)
        def create_silent_shell
          Class.new do
            def say(message, color = nil); end
            def say_status(status, message, color = nil); end
          end.new
        end
      end

      # Report generator for comprehensive benchmark analysis
      class ReportGenerator
        def initialize(benchmark_results)
          @results = benchmark_results
        end

        def generate_comprehensive_report
          <<~REPORT
            # ReactiveRecord Generation Performance Benchmark Report

            Generated: #{@results[:metadata][:timestamp]}
            Ruby Version: #{@results[:metadata][:ruby_version]}
            Rails Version: #{@results[:metadata][:rails_version]}
            Iterations: #{@results[:metadata][:iterations]}
            Warmup Iterations: #{@results[:metadata][:warmup_iterations]}

            ## Executive Summary

            #{generate_executive_summary}

            ## Scenario Results

            #{generate_scenario_reports}

            ## Statistical Analysis

            #{generate_statistical_analysis}

            ## Performance Recommendations

            #{generate_recommendations}

            ## Detailed Metrics

            #{generate_detailed_metrics}
          REPORT
        end

        private

        def generate_executive_summary
          summary = @results[:summary]
          improvement = summary[:overall_performance_improvement]

          status = case
          when improvement > 20 then "🚀 Excellent"
          when improvement > 10 then "✅ Good"
          when improvement > 0 then "➡️ Marginal"
          else "⚠️ Needs Attention"
          end

          <<~SUMMARY
            - **Overall Performance**: #{status} (#{improvement.round(2)}% improvement)
            - **Scenarios Tested**: #{summary[:total_scenarios_tested]}
            - **Improved Performance**: #{summary[:scenarios_with_improvement]}/#{summary[:total_scenarios_tested]} scenarios
            - **Performance Regressions**: #{summary[:scenarios_with_regression]}/#{summary[:total_scenarios_tested]} scenarios
            - **Best Improvement**: #{summary[:best_improvement].round(2)}%
            - **Worst Result**: #{summary[:worst_improvement].round(2)}%
          SUMMARY
        end

        def generate_scenario_reports
          @results[:scenarios].map do |scenario_name, results|
            scenario = results[:scenario]
            old_system = results[:old_system][:summary]
            new_system = results[:new_system][:summary]
            improvement = results[:performance_improvement]

            <<~SCENARIO
              ### #{scenario[:name]} (#{scenario_name})

              **Description**: #{scenario[:description]}
              **Complexity**: #{scenario[:complexity_level]}
              **Expected Models**: #{scenario[:expected_models]}

              | Metric | Old System | New System | Improvement |
              |--------|------------|------------|-------------|
              | Execution Time | #{old_system[:avg_execution_time].round(4)}s | #{new_system[:avg_execution_time].round(4)}s | #{improvement[:execution_time_improvement].round(2)}% |
              | Memory Usage | #{old_system[:avg_peak_memory].round(2)}MB | #{new_system[:avg_peak_memory].round(2)}MB | #{improvement[:memory_efficiency_improvement].round(2)}% |
              | File Operations | #{old_system[:avg_file_operations]} | #{new_system[:avg_file_operations]} | #{improvement[:file_operations_improvement].round(2)}% |

              **Statistical Significance**: #{results[:comparison][:statistically_significant] ? 'Yes' : 'No'}
              **Confidence Interval**: #{results[:comparison][:confidence_interval]}%
            SCENARIO
          end.join("\n")
        end

        def generate_statistical_analysis
          # Implementation would include detailed statistical analysis
          "Statistical analysis implementation would go here..."
        end

        def generate_recommendations
          # Implementation would include performance recommendations
          "Performance recommendations implementation would go here..."
        end

        def generate_detailed_metrics
          # Implementation would include detailed metrics breakdown
          "Detailed metrics implementation would go here..."
        end
      end
    end
  end
end
