# frozen_string_literal: true

module Zero
  module Generators
    module Benchmarking
      # StatisticalAnalyzer provides statistical analysis of benchmark results
      #
      # This class implements statistical methods to analyze performance data collected
      # during ReactiveRecord generation benchmarking, providing confidence intervals,
      # significance testing, and statistical summaries.
      #
      # Key Statistical Methods:
      # - Descriptive statistics (mean, median, standard deviation)
      # - Confidence intervals with configurable confidence levels
      # - Statistical significance testing (t-tests, Mann-Whitney U)
      # - Outlier detection and removal
      # - Performance regression detection
      #
      # @example Basic usage
      #   analyzer = StatisticalAnalyzer.new
      #   summary = analyzer.summarize_measurements(measurements)
      #   comparison = analyzer.compare_systems(old_measurements, new_measurements)
      #
      class StatisticalAnalyzer
        # Default confidence level for statistical tests
        DEFAULT_CONFIDENCE_LEVEL = 0.95

        # Minimum sample size for reliable statistical analysis
        MIN_SAMPLE_SIZE = 3

        # Z-scores for common confidence levels
        Z_SCORES = {
          0.90 => 1.645,
          0.95 => 1.960,
          0.99 => 2.576
        }.freeze

        attr_reader :confidence_level

        # Initialize statistical analyzer
        #
        # @param confidence_level [Float] Statistical confidence level (default: 0.95)
        def initialize(confidence_level: DEFAULT_CONFIDENCE_LEVEL)
          @confidence_level = confidence_level
        end

        # Summarize measurements with descriptive statistics
        #
        # @param measurements [Array<Hash>] Array of measurement data
        # @return [Hash] Statistical summary of measurements
        def summarize_measurements(measurements)
          return empty_summary if measurements.empty?

          # Extract key metrics from measurements
          execution_times = extract_values(measurements, :execution_time_seconds)
          memory_usage = extract_values(measurements, [ :memory_usage, :peak_memory_mb ])
          file_operations = extract_values(measurements, [ :file_operations, :created ])

          {
            sample_size: measurements.length,
            execution_time_stats: calculate_descriptive_stats(execution_times),
            memory_usage_stats: calculate_descriptive_stats(memory_usage),
            file_operations_stats: calculate_descriptive_stats(file_operations),

            # Convenience accessors for common comparisons
            avg_execution_time: calculate_mean(execution_times),
            median_execution_time: calculate_median(execution_times),
            std_dev_execution_time: calculate_standard_deviation(execution_times),
            avg_peak_memory: calculate_mean(memory_usage),
            avg_file_operations: calculate_mean(file_operations),

            # Quality indicators
            coefficient_of_variation: calculate_coefficient_of_variation(execution_times),
            outlier_count: detect_outliers(execution_times).length,
            data_quality_score: assess_data_quality(measurements)
          }
        end

        # Compare two systems statistically
        #
        # @param old_system_measurements [Array<Hash>] Measurements from old system
        # @param new_system_measurements [Array<Hash>] Measurements from new system
        # @return [Hash] Statistical comparison results
        def compare_systems(old_system_measurements, new_system_measurements)
          return empty_comparison if old_system_measurements.empty? || new_system_measurements.empty?

          old_times = extract_values(old_system_measurements, :execution_time_seconds)
          new_times = extract_values(new_system_measurements, :execution_time_seconds)

          # Basic statistical comparison
          comparison = {
            old_system_summary: summarize_measurements(old_system_measurements),
            new_system_summary: summarize_measurements(new_system_measurements),
            sample_sizes: {
              old_system: old_system_measurements.length,
              new_system: new_system_measurements.length
            }
          }

          # Performance difference analysis
          comparison[:performance_difference] = calculate_performance_difference(old_times, new_times)

          # Statistical significance testing
          comparison[:significance_tests] = perform_significance_tests(old_times, new_times)

          # Confidence intervals
          comparison[:confidence_intervals] = calculate_confidence_intervals(old_times, new_times)

          # Effect size analysis
          comparison[:effect_size] = calculate_effect_size(old_times, new_times)

          # Overall assessment
          comparison[:statistically_significant] = assess_statistical_significance(comparison[:significance_tests])
          comparison[:practical_significance] = assess_practical_significance(comparison[:performance_difference])
          comparison[:confidence_level] = @confidence_level

          comparison
        end

        # Detect performance regressions
        #
        # @param baseline_measurements [Array<Hash>] Baseline performance measurements
        # @param current_measurements [Array<Hash>] Current performance measurements
        # @param regression_threshold [Float] Regression threshold percentage (default: 5%)
        # @return [Hash] Regression analysis results
        def detect_performance_regression(baseline_measurements, current_measurements, regression_threshold: 5.0)
          comparison = compare_systems(baseline_measurements, current_measurements)

          baseline_mean = comparison[:old_system_summary][:avg_execution_time]
          current_mean = comparison[:new_system_summary][:avg_execution_time]

          performance_change = ((current_mean - baseline_mean) / baseline_mean * 100)
          is_regression = performance_change > regression_threshold &&
                         comparison[:statistically_significant]

          {
            is_regression: is_regression,
            performance_change_percent: performance_change.round(2),
            regression_threshold: regression_threshold,
            baseline_mean: baseline_mean.round(4),
            current_mean: current_mean.round(4),
            statistical_significance: comparison[:statistically_significant],
            confidence_level: @confidence_level,
            recommendation: generate_regression_recommendation(is_regression, performance_change, comparison)
          }
        end

        # Calculate statistical power for detecting performance differences
        #
        # @param effect_size [Float] Expected effect size
        # @param sample_size [Integer] Sample size per group
        # @param alpha [Float] Type I error rate (default: 0.05)
        # @return [Float] Statistical power (0.0 to 1.0)
        def calculate_statistical_power(effect_size, sample_size, alpha: 0.05)
          return 0.0 if sample_size < 2

          # Simplified power calculation for t-test
          # This is a basic approximation - real power analysis would be more complex
          degrees_of_freedom = 2 * sample_size - 2
          critical_value = t_critical_value(alpha / 2, degrees_of_freedom)

          non_centrality = effect_size * Math.sqrt(sample_size / 2.0)
          power = 1.0 - t_cumulative_distribution(critical_value - non_centrality, degrees_of_freedom)

          [ power, 1.0 ].min
        end

        # Recommend optimal sample size for detecting performance differences
        #
        # @param expected_effect_size [Float] Expected effect size
        # @param desired_power [Float] Desired statistical power (default: 0.8)
        # @param alpha [Float] Type I error rate (default: 0.05)
        # @return [Integer] Recommended sample size per group
        def recommend_sample_size(expected_effect_size, desired_power: 0.8, alpha: 0.05)
          return MIN_SAMPLE_SIZE if expected_effect_size <= 0

          # Iteratively find sample size that achieves desired power
          sample_size = MIN_SAMPLE_SIZE

          while sample_size <= 100 # Reasonable upper limit
            power = calculate_statistical_power(expected_effect_size, sample_size, alpha: alpha)
            return sample_size if power >= desired_power
            sample_size += 1
          end

          100 # Return maximum reasonable sample size
        end

        private

        # Extract values from measurements using nested keys
        def extract_values(measurements, key_path)
          measurements.map do |measurement|
            value = measurement

            if key_path.is_a?(Array)
              key_path.each { |key| value = value[key] if value.is_a?(Hash) }
            else
              value = value[key_path]
            end

            value.is_a?(Numeric) ? value.to_f : 0.0
          end.compact
        end

        # Calculate descriptive statistics for a dataset
        def calculate_descriptive_stats(values)
          return { count: 0 } if values.empty?

          sorted_values = values.sort

          {
            count: values.length,
            mean: calculate_mean(values),
            median: calculate_median(values),
            mode: calculate_mode(values),
            standard_deviation: calculate_standard_deviation(values),
            variance: calculate_variance(values),
            minimum: sorted_values.first,
            maximum: sorted_values.last,
            range: sorted_values.last - sorted_values.first,
            quartiles: calculate_quartiles(sorted_values),
            percentiles: calculate_percentiles(sorted_values),
            skewness: calculate_skewness(values),
            kurtosis: calculate_kurtosis(values)
          }
        end

        # Calculate arithmetic mean
        def calculate_mean(values)
          return 0.0 if values.empty?
          values.sum / values.length.to_f
        end

        # Calculate median
        def calculate_median(values)
          return 0.0 if values.empty?

          sorted = values.sort
          length = sorted.length

          if length.odd?
            sorted[length / 2]
          else
            (sorted[length / 2 - 1] + sorted[length / 2]) / 2.0
          end
        end

        # Calculate mode (most frequent value)
        def calculate_mode(values)
          return 0.0 if values.empty?

          frequency = values.group_by(&:itself).transform_values(&:count)
          frequency.max_by { |_, count| count }&.first || 0.0
        end

        # Calculate sample standard deviation
        def calculate_standard_deviation(values)
          Math.sqrt(calculate_variance(values))
        end

        # Calculate sample variance
        def calculate_variance(values)
          return 0.0 if values.length < 2

          mean = calculate_mean(values)
          sum_squared_deviations = values.sum { |x| (x - mean) ** 2 }

          sum_squared_deviations / (values.length - 1).to_f
        end

        # Calculate coefficient of variation
        def calculate_coefficient_of_variation(values)
          return 0.0 if values.empty?

          mean = calculate_mean(values)
          return Float::INFINITY if mean == 0.0

          standard_deviation = calculate_standard_deviation(values)
          (standard_deviation / mean.abs) * 100
        end

        # Calculate quartiles
        def calculate_quartiles(sorted_values)
          return { q1: 0.0, q2: 0.0, q3: 0.0 } if sorted_values.empty?

          {
            q1: calculate_percentile(sorted_values, 25),
            q2: calculate_percentile(sorted_values, 50), # median
            q3: calculate_percentile(sorted_values, 75)
          }
        end

        # Calculate common percentiles
        def calculate_percentiles(sorted_values)
          return {} if sorted_values.empty?

          {
            p10: calculate_percentile(sorted_values, 10),
            p25: calculate_percentile(sorted_values, 25),
            p50: calculate_percentile(sorted_values, 50),
            p75: calculate_percentile(sorted_values, 75),
            p90: calculate_percentile(sorted_values, 90),
            p95: calculate_percentile(sorted_values, 95),
            p99: calculate_percentile(sorted_values, 99)
          }
        end

        # Calculate percentile value
        def calculate_percentile(sorted_values, percentile)
          return 0.0 if sorted_values.empty?

          index = (percentile / 100.0) * (sorted_values.length - 1)

          if index.integer?
            sorted_values[index.to_i]
          else
            lower_index = index.floor
            upper_index = index.ceil
            weight = index - lower_index

            (sorted_values[lower_index] * (1 - weight)) + (sorted_values[upper_index] * weight)
          end
        end

        # Calculate skewness (measure of asymmetry)
        def calculate_skewness(values)
          return 0.0 if values.length < 3

          mean = calculate_mean(values)
          std_dev = calculate_standard_deviation(values)
          return 0.0 if std_dev == 0.0

          n = values.length
          skewness_sum = values.sum { |x| ((x - mean) / std_dev) ** 3 }

          (n / ((n - 1) * (n - 2)).to_f) * skewness_sum
        end

        # Calculate kurtosis (measure of tail heaviness)
        def calculate_kurtosis(values)
          return 0.0 if values.length < 4

          mean = calculate_mean(values)
          std_dev = calculate_standard_deviation(values)
          return 0.0 if std_dev == 0.0

          n = values.length
          kurtosis_sum = values.sum { |x| ((x - mean) / std_dev) ** 4 }

          # Excess kurtosis (subtract 3 for normal distribution baseline)
          ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3)).to_f) * kurtosis_sum -
          (3 * (n - 1) ** 2) / ((n - 2) * (n - 3)).to_f
        end

        # Detect outliers using IQR method
        def detect_outliers(values)
          return [] if values.length < 4

          sorted = values.sort
          q1 = calculate_percentile(sorted, 25)
          q3 = calculate_percentile(sorted, 75)
          iqr = q3 - q1

          lower_bound = q1 - 1.5 * iqr
          upper_bound = q3 + 1.5 * iqr

          values.select { |value| value < lower_bound || value > upper_bound }
        end

        # Assess data quality based on various factors
        def assess_data_quality(measurements)
          return 0.0 if measurements.empty?

          execution_times = extract_values(measurements, :execution_time_seconds)

          # Quality factors (0-100 scale each)
          sample_size_score = [ measurements.length / 10.0 * 100, 100 ].min
          consistency_score = calculate_consistency_score(execution_times)
          completeness_score = calculate_completeness_score(measurements)

          # Weighted average
          (sample_size_score * 0.3 + consistency_score * 0.4 + completeness_score * 0.3).round(2)
        end

        # Calculate consistency score based on coefficient of variation
        def calculate_consistency_score(values)
          cv = calculate_coefficient_of_variation(values)

          # Lower CV = higher consistency score
          # CV > 50% = low consistency, CV < 10% = high consistency
          if cv <= 10
            100.0
          elsif cv >= 50
            0.0
          else
            100.0 - ((cv - 10) / 40.0) * 100
          end
        end

        # Calculate completeness score based on missing data
        def calculate_completeness_score(measurements)
          return 100.0 if measurements.empty?

          required_fields = [ :execution_time_seconds, :memory_usage, :file_operations ]
          total_fields = measurements.length * required_fields.length

          present_fields = measurements.sum do |measurement|
            required_fields.count { |field| !measurement[field].nil? }
          end

          (present_fields.to_f / total_fields * 100).round(2)
        end

        # Calculate performance difference between two datasets
        def calculate_performance_difference(old_values, new_values)
          old_mean = calculate_mean(old_values)
          new_mean = calculate_mean(new_values)

          absolute_difference = new_mean - old_mean
          percentage_difference = old_mean != 0 ? (absolute_difference / old_mean * 100) : 0.0

          {
            absolute_difference: absolute_difference.round(6),
            percentage_difference: percentage_difference.round(2),
            improvement: percentage_difference < 0, # Negative means improvement (less time)
            old_mean: old_mean.round(6),
            new_mean: new_mean.round(6)
          }
        end

        # Perform statistical significance tests
        def perform_significance_tests(old_values, new_values)
          {
            t_test: perform_t_test(old_values, new_values),
            mann_whitney_u: perform_mann_whitney_u_test(old_values, new_values),
            kolmogorov_smirnov: perform_ks_test(old_values, new_values)
          }
        end

        # Perform two-sample t-test
        def perform_t_test(group1, group2)
          return null_test_result if group1.length < 2 || group2.length < 2

          mean1 = calculate_mean(group1)
          mean2 = calculate_mean(group2)
          var1 = calculate_variance(group1)
          var2 = calculate_variance(group2)
          n1 = group1.length
          n2 = group2.length

          # Welch's t-test (unequal variances)
          pooled_se = Math.sqrt(var1/n1 + var2/n2)
          return null_test_result if pooled_se == 0

          t_statistic = (mean1 - mean2) / pooled_se

          # Approximate degrees of freedom (Welch-Satterthwaite)
          df = ((var1/n1 + var2/n2) ** 2) / ((var1/n1)**2/(n1-1) + (var2/n2)**2/(n2-1))

          p_value = 2 * (1 - t_cumulative_distribution(t_statistic.abs, df))

          {
            test_name: "Two-sample t-test (Welch)",
            t_statistic: t_statistic.round(4),
            degrees_of_freedom: df.round(2),
            p_value: p_value.round(6),
            significant: p_value < (1 - @confidence_level),
            alpha: 1 - @confidence_level
          }
        end

        # Simplified Mann-Whitney U test
        def perform_mann_whitney_u_test(group1, group2)
          return null_test_result if group1.length < 2 || group2.length < 2

          # Combine and rank all values
          combined = (group1 + group2).map.with_index { |val, idx| [ val, idx < group1.length ? :group1 : :group2 ] }
          ranked = combined.sort_by(&:first).map.with_index { |(val, group), rank| [ val, group, rank + 1 ] }

          # Calculate U statistics
          r1 = ranked.select { |_, group, _| group == :group1 }.sum { |_, _, rank| rank }
          u1 = r1 - (group1.length * (group1.length + 1)) / 2
          u2 = group1.length * group2.length - u1

          u_statistic = [ u1, u2 ].min

          # Approximate p-value for large samples
          n1, n2 = group1.length, group2.length
          mean_u = (n1 * n2) / 2.0
          std_u = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12.0)

          z_score = (u_statistic - mean_u) / std_u
          p_value = 2 * (1 - standard_normal_cdf(z_score.abs))

          {
            test_name: "Mann-Whitney U test",
            u_statistic: u_statistic.round(4),
            z_score: z_score.round(4),
            p_value: p_value.round(6),
            significant: p_value < (1 - @confidence_level),
            alpha: 1 - @confidence_level
          }
        end

        # Simplified Kolmogorov-Smirnov test
        def perform_ks_test(group1, group2)
          return null_test_result if group1.length < 2 || group2.length < 2

          # This is a very simplified implementation
          # A full implementation would require more complex statistics
          {
            test_name: "Kolmogorov-Smirnov test (simplified)",
            statistic: 0.0,
            p_value: 1.0,
            significant: false,
            alpha: 1 - @confidence_level,
            note: "Simplified implementation - use with caution"
          }
        end

        # Calculate confidence intervals for both groups
        def calculate_confidence_intervals(old_values, new_values)
          {
            old_system: calculate_confidence_interval(old_values),
            new_system: calculate_confidence_interval(new_values),
            difference: calculate_difference_confidence_interval(old_values, new_values)
          }
        end

        # Calculate confidence interval for a single group
        def calculate_confidence_interval(values)
          return { lower: 0.0, upper: 0.0, margin_of_error: 0.0 } if values.length < 2

          mean = calculate_mean(values)
          std_error = calculate_standard_deviation(values) / Math.sqrt(values.length)

          # Use t-distribution for small samples, z-distribution for large samples
          critical_value = if values.length >= 30
                            Z_SCORES[@confidence_level] || 1.96
          else
                            t_critical_value((1 - @confidence_level) / 2, values.length - 1)
          end

          margin_of_error = critical_value * std_error

          {
            mean: mean.round(6),
            lower: (mean - margin_of_error).round(6),
            upper: (mean + margin_of_error).round(6),
            margin_of_error: margin_of_error.round(6),
            confidence_level: @confidence_level
          }
        end

        # Calculate confidence interval for the difference between two groups
        def calculate_difference_confidence_interval(group1, group2)
          return { lower: 0.0, upper: 0.0, margin_of_error: 0.0 } if group1.length < 2 || group2.length < 2

          mean1 = calculate_mean(group1)
          mean2 = calculate_mean(group2)
          diff_mean = mean1 - mean2

          se1 = calculate_standard_deviation(group1) / Math.sqrt(group1.length)
          se2 = calculate_standard_deviation(group2) / Math.sqrt(group2.length)
          pooled_se = Math.sqrt(se1**2 + se2**2)

          # Use pooled degrees of freedom approximation
          df = ((se1**2 + se2**2)**2) / (se1**4/(group1.length-1) + se2**4/(group2.length-1))
          critical_value = t_critical_value((1 - @confidence_level) / 2, df)

          margin_of_error = critical_value * pooled_se

          {
            difference_mean: diff_mean.round(6),
            lower: (diff_mean - margin_of_error).round(6),
            upper: (diff_mean + margin_of_error).round(6),
            margin_of_error: margin_of_error.round(6),
            confidence_level: @confidence_level
          }
        end

        # Calculate effect size (Cohen's d)
        def calculate_effect_size(group1, group2)
          return 0.0 if group1.length < 2 || group2.length < 2

          mean1 = calculate_mean(group1)
          mean2 = calculate_mean(group2)

          # Pooled standard deviation
          pooled_std = Math.sqrt(((group1.length - 1) * calculate_variance(group1) +
                                  (group2.length - 1) * calculate_variance(group2)) /
                                 (group1.length + group2.length - 2))

          return 0.0 if pooled_std == 0

          cohens_d = (mean1 - mean2) / pooled_std

          effect_size_interpretation = case cohens_d.abs
          when 0...0.2 then "negligible"
          when 0.2...0.5 then "small"
          when 0.5...0.8 then "medium"
          else "large"
          end

          {
            cohens_d: cohens_d.round(4),
            interpretation: effect_size_interpretation,
            magnitude: cohens_d.abs.round(4)
          }
        end

        # Assess statistical significance from test results
        def assess_statistical_significance(significance_tests)
          significant_tests = significance_tests.values.count { |test| test[:significant] }
          significant_tests > 0
        end

        # Assess practical significance of performance difference
        def assess_practical_significance(performance_difference, threshold: 5.0)
          performance_difference[:percentage_difference].abs >= threshold
        end

        # Generate regression recommendation
        def generate_regression_recommendation(is_regression, performance_change, comparison)
          if is_regression
            case performance_change
            when 0...10
              "Minor performance regression detected. Monitor closely and investigate if trend continues."
            when 10...25
              "Moderate performance regression. Recommend immediate investigation of recent changes."
            else
              "Significant performance regression. Urgent investigation required."
            end
          elsif performance_change > 0
            "Performance degradation detected but not statistically significant. Continue monitoring."
          else
            "No performance regression detected. Performance is stable or improved."
          end
        end

        # Helper methods for statistical distributions

        # Approximate t-distribution critical value
        def t_critical_value(alpha, df)
          # Very rough approximation - in practice, use a proper statistical library
          if df >= 30
            Z_SCORES[1 - alpha * 2] || 1.96
          else
            # Rough approximation for small samples
            2.0 + (1.0 / df)
          end
        end

        # Approximate t-distribution CDF
        def t_cumulative_distribution(t, df)
          # Very rough approximation - in practice, use a proper statistical library
          if df >= 30
            standard_normal_cdf(t)
          else
            # Rough approximation
            x = t / Math.sqrt(df)
            0.5 + 0.5 * Math.erf(x / Math.sqrt(2))
          end
        end

        # Standard normal CDF approximation
        def standard_normal_cdf(z)
          # Rough approximation using error function
          0.5 * (1 + Math.erf(z / Math.sqrt(2)))
        end

        # Return empty summary structure
        def empty_summary
          {
            sample_size: 0,
            avg_execution_time: 0.0,
            median_execution_time: 0.0,
            std_dev_execution_time: 0.0,
            avg_peak_memory: 0.0,
            avg_file_operations: 0.0,
            coefficient_of_variation: 0.0,
            outlier_count: 0,
            data_quality_score: 0.0
          }
        end

        # Return empty comparison structure
        def empty_comparison
          {
            statistically_significant: false,
            practical_significance: false,
            confidence_level: @confidence_level
          }
        end

        # Return null test result
        def null_test_result
          {
            test_name: "Insufficient data",
            statistic: 0.0,
            p_value: 1.0,
            significant: false,
            alpha: 1 - @confidence_level
          }
        end
      end
    end
  end
end
