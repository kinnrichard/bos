# ReactiveRecord Performance Optimization Guide

## Table of Contents

1. [Understanding Performance Optimization](#understanding-performance-optimization)
2. [Performance Analysis Workflow](#performance-analysis-workflow)
3. [Optimization Strategies Deep Dive](#optimization-strategies-deep-dive)
4. [Performance Tuning Guidelines](#performance-tuning-guidelines)
5. [Monitoring and Alerting Setup](#monitoring-and-alerting-setup)
6. [Troubleshooting Performance Issues](#troubleshooting-performance-issues)
7. [Advanced Optimization Techniques](#advanced-optimization-techniques)
8. [Performance Testing Best Practices](#performance-testing-best-practices)

## Understanding Performance Optimization

### What Gets Optimized

The ReactiveRecord performance optimization system targets these key areas:

1. **Schema Introspection** - Database schema analysis and caching
2. **Type Mapping** - Rails to TypeScript type conversion
3. **Template Rendering** - ERB template processing and caching  
4. **Relationship Processing** - Rails relationship analysis
5. **File Operations** - File writing, formatting, and comparison
6. **Pipeline Execution** - Sequential vs parallel stage execution

### Performance Bottlenecks in Legacy System

Analysis of the legacy generation system identified these primary bottlenecks:

1. **Repeated Schema Queries** - Schema introspected multiple times
2. **Template Re-compilation** - Templates compiled for each model
3. **Sequential Processing** - All operations run sequentially
4. **No Caching Layer** - No persistence of computed results
5. **Memory Inefficiency** - Poor memory usage patterns

### Expected Performance Improvements

| Optimization Area | Expected Improvement | Conditions |
|------------------|---------------------|------------|
| Schema Caching | 40-60% | Multiple model generation |
| Template Caching | 30-50% | Reused templates |
| Parallel Execution | 25-40% | Independent stages |
| Type Mapping Cache | 60-80% | Repeated type conversions |
| Combined Optimizations | 50-70% | Full optimization stack |

## Performance Analysis Workflow

### Step 1: Baseline Measurement

Before applying optimizations, establish a baseline:

```ruby
# Measure baseline performance
baseline_runner = Zero::Generators::Benchmarking::BenchmarkRunner.new(
  iterations: 10,
  scenarios: [:small_dataset, :medium_dataset, :large_dataset]
)

baseline_results = baseline_runner.run_comparative_benchmark
puts "Baseline performance established"
```

### Step 2: Workload Characterization

Analyze your specific workload characteristics:

```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new
recommendation = optimizer.analyze_and_recommend_strategy

workload = recommendation[:workload_analysis]
puts "Dataset size: #{workload[:dataset_size]}"
puts "Complexity level: #{workload[:complexity_level]}"
puts "Parallelization potential: #{workload[:parallelization_potential]}"
puts "Caching potential: #{workload[:caching_potential]}"
```

### Step 3: Strategy Testing

Test different optimization strategies:

```ruby
strategies = [:sequential, :parallel, :cache_heavy, :balanced]
results = {}

strategies.each do |strategy|
  puts "Testing #{strategy} strategy..."
  
  result = optimizer.optimize_generation(strategy: strategy) do
    # Your generation code
    GenerationCoordinator.new(options, shell).execute
  end
  
  results[strategy] = {
    execution_time: result[:execution_time],
    memory_usage: result[:memory_usage],
    success: result[:success]
  }
end

# Find best performing strategy
best_strategy = results.min_by { |strategy, metrics| metrics[:execution_time] }
puts "Best strategy: #{best_strategy.first}"
```

### Step 4: Optimization Implementation

Apply the optimal strategy in production:

```ruby
# Production-ready optimization
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_monitoring: true,
    enable_caching: true,
    enable_parallel_execution: true,
    alert_thresholds: {
      execution_time: 120.0,
      memory_usage: 1024,
      error_rate: 2.0
    }
  }
)

result = optimizer.optimize_generation(strategy: best_strategy.first) do
  GenerationCoordinator.new(options, shell).execute
end
```

## Optimization Strategies Deep Dive

### Sequential Strategy

**When to Use:**
- Development environments
- Debugging performance issues
- Small datasets (< 5 models)
- Single-core environments

**Configuration:**
```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_parallel_execution: false,
    enable_caching: true,
    enable_monitoring: true,
    cache_ttl: 3600
  }
)
```

**Expected Performance:**
- Baseline + 10-30% improvement through caching
- Minimal memory overhead
- Predictable execution order

### Parallel Strategy

**When to Use:**
- Large datasets (> 10 models)
- Multi-core environments
- Independent pipeline stages
- Production deployments

**Configuration:**
```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_parallel_execution: true,
    max_parallel_threads: [Concurrent.processor_count, 6].min,
    enable_caching: true,
    parallel_threshold: 3 # Minimum stages for parallel execution
  }
)
```

**Expected Performance:**
- 30-60% improvement for suitable workloads
- Higher memory usage due to threading
- Best for CPU-bound operations

**Optimization Tips:**
```ruby
# Configure thread count based on workload
cpu_intensive_config = { max_parallel_threads: Concurrent.processor_count }
io_intensive_config = { max_parallel_threads: Concurrent.processor_count * 2 }

# Monitor parallel efficiency
metrics = optimizer.get_optimization_metrics
parallel_efficiency = metrics[:parallel_performance][:average_improvement]

if parallel_efficiency < 20
  puts "Consider reducing thread count or using sequential strategy"
end
```

### Cache-Heavy Strategy

**When to Use:**
- Repetitive generation runs
- Similar model structures
- Template-heavy workloads
- Development workflows

**Configuration:**
```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_caching: true,
    cache_ttl: 7200, # Longer TTL for aggressive caching
    memory_cache_size: 200,
    file_cache_enabled: true,
    enable_cache_preloading: true
  }
)

# Preload frequently used cache entries
optimizer.preload_caches({
  schema_introspection: [{ force_refresh: false }],
  type_mapping: [
    { rails_type: "string", column_info: {} },
    { rails_type: "integer", column_info: {} },
    { rails_type: "boolean", column_info: {} },
    { rails_type: "datetime", column_info: {} }
  ]
})
```

**Expected Performance:**
- 40-70% improvement for cache-friendly workloads
- Higher memory usage for cache storage
- Diminishing returns after cache warmup

**Cache Tuning:**
```ruby
# Monitor cache effectiveness
cache_report = optimizer.cache_optimizer.cache_efficiency_report

cache_report[:categories].each do |category|
  if category[:hit_rate] < 50
    puts "Low hit rate for #{category[:category]}: #{category[:hit_rate]}%"
    
    # Increase TTL for low hit rate categories
    case category[:category]
    when :schema_introspection
      optimizer.update_configuration(schema_cache_ttl: 14400) # 4 hours
    when :template_rendering
      optimizer.update_configuration(template_cache_ttl: 7200) # 2 hours
    end
  end
end
```

### Balanced Strategy

**When to Use:**
- Production environments
- Mixed workloads
- When optimal strategy is unclear
- General-purpose optimization

**Configuration:**
```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_parallel_execution: true,
    max_parallel_threads: [Concurrent.processor_count / 2, 3].max, # Conservative threading
    enable_caching: true,
    cache_ttl: 3600,
    memory_cache_size: 100,
    parallel_conservative: true
  }
)
```

**Expected Performance:**
- 20-40% improvement across various workloads
- Moderate resource usage
- Good balance of performance and stability

### Minimal Strategy

**When to Use:**
- Resource-constrained environments
- Debugging optimization issues
- Baseline performance measurement
- When optimization overhead is problematic

**Configuration:**
```ruby
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: {
    enable_parallel_execution: false,
    enable_caching: false,
    enable_monitoring: false,
    enable_benchmarking: false
  }
)
```

## Performance Tuning Guidelines

### CPU-Bound Workloads

For workloads that are primarily CPU-bound:

```ruby
# Optimize for CPU utilization
config = {
  enable_parallel_execution: true,
  max_parallel_threads: Concurrent.processor_count,
  enable_caching: true,
  cache_categories: [:schema_introspection, :type_mapping] # CPU-heavy operations
}
```

### IO-Bound Workloads

For workloads with heavy file operations:

```ruby
# Optimize for IO operations
config = {
  enable_parallel_execution: true,
  max_parallel_threads: Concurrent.processor_count * 2, # Higher thread count for IO
  enable_caching: true,
  file_cache_enabled: true, # Persistent cache for IO operations
  cache_categories: [:file_operations, :template_rendering]
}
```

### Memory-Constrained Environments

For environments with limited memory:

```ruby
# Optimize for low memory usage
config = {
  enable_parallel_execution: false, # Avoid threading overhead
  enable_caching: true,
  memory_cache_size: 25, # Smaller cache
  file_cache_enabled: false, # Avoid file IO overhead
  enable_real_time_monitoring: false # Reduce monitoring overhead
}
```

### High-Throughput Environments

For environments requiring maximum throughput:

```ruby
# Optimize for maximum throughput
config = {
  enable_parallel_execution: true,
  max_parallel_threads: [Concurrent.processor_count + 2, 8].min,
  enable_caching: true,
  memory_cache_size: 500, # Large cache
  cache_ttl: 14400, # Long TTL to avoid cache misses
  enable_monitoring: true,
  enable_real_time_monitoring: false # Reduce monitoring overhead
}
```

## Monitoring and Alerting Setup

### Basic Monitoring Setup

```ruby
# Configure performance monitoring
monitor_config = {
  enable_alerts: true,
  alert_thresholds: {
    execution_time: 60.0,    # Alert if generation > 1 minute
    memory_usage: 512,       # Alert if memory > 512MB
    error_rate: 5.0,         # Alert if error rate > 5%
    cache_hit_rate: 50.0     # Alert if hit rate < 50%
  },
  enable_real_time_monitoring: true,
  sampling_interval: 2.0     # Sample every 2 seconds
}

optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: monitor_config
)
```

### Advanced Alert Configuration

```ruby
# Custom alert handlers
optimizer.performance_monitor.on_alert do |alert|
  case alert[:level]
  when :critical
    # Send immediate notification
    send_notification("CRITICAL: #{alert[:message]}")
    
    # Log to error tracking system
    ErrorTracker.notify(alert[:message], {
      category: alert[:category],
      session_id: alert[:session_id]
    })
    
  when :warning
    # Log to monitoring system
    MonitoringSystem.log_warning(alert[:message])
    
  when :info
    # Log for analysis
    Rails.logger.info("Performance Alert: #{alert[:message]}")
  end
end
```

### Performance Dashboard

```ruby
# Generate dashboard data
dashboard_data = optimizer.generate_dashboard_data

# Example dashboard data structure
{
  current_session: {
    id: "session_123",
    duration: 45.2,
    metrics: {
      total_operations: 5,
      average_execution_time: 8.1,
      peak_memory_usage: 234.5,
      cache_hit_rate: 78.3
    }
  },
  recent_performance: {
    trends: {
      execution_time_trend: :decreasing, # Performance improving
      memory_usage_trend: :stable
    },
    alerts: [...] # Recent alerts
  },
  recommendations: [
    "Consider increasing cache TTL for better performance",
    "Parallel execution showing good efficiency (67%)"
  ]
}
```

### Real-Time Performance Monitoring

```ruby
# Start real-time monitoring
session_id = optimizer.performance_monitor.start_monitoring_session("production_generation")

# Perform generation with real-time monitoring
result = optimizer.optimize_generation do
  # Your generation code
end

# Get real-time metrics during execution
Thread.new do
  loop do
    metrics = optimizer.get_optimization_metrics
    
    # Log current performance
    puts "Current memory: #{metrics[:monitor_metrics][:current_metrics][:peak_memory_usage]}MB"
    puts "Cache hit rate: #{metrics[:cache_performance][:overall][:hit_rate]}%"
    
    sleep 5
  end
end
```

## Troubleshooting Performance Issues

### Diagnosing Slow Performance

#### Step 1: Identify the Bottleneck

```ruby
# Run detailed performance analysis
optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(
  config: { enable_monitoring: true }
)

# Monitor stage-by-stage performance
result = optimizer.optimize_generation do
  monitor = optimizer.performance_monitor
  
  # Schema analysis stage
  monitor.record_pipeline_stage(:schema_analysis, 0) do
    schema_data = extract_schema
  end
  
  # Model generation stage
  monitor.record_pipeline_stage(:model_generation, 0) do
    generate_models(schema_data)
  end
  
  # TypeScript generation stage
  monitor.record_pipeline_stage(:typescript_generation, 0) do
    generate_typescript_files
  end
  
  # File writing stage
  monitor.record_pipeline_stage(:file_writing, 0) do
    write_files_to_disk
  end
end

# Analyze stage performance
performance_report = optimizer.performance_monitor.generate_performance_report
stage_metrics = performance_report[:pipeline_performance][:stages]

# Find slowest stage
slowest_stage = stage_metrics.max_by { |stage| stage[:execution_time] }
puts "Slowest stage: #{slowest_stage[:name]} (#{slowest_stage[:execution_time]}s)"
```

#### Step 2: Analyze Cache Performance

```ruby
# Check cache efficiency
cache_report = optimizer.cache_optimizer.cache_efficiency_report

puts "Overall cache hit rate: #{cache_report[:overall][:hit_rate]}%"

cache_report[:categories].each do |category|
  puts "#{category[:category]}: #{category[:hit_rate]}% hit rate"
  
  if category[:hit_rate] < 30
    puts "  ⚠️ Low hit rate - investigate cache invalidation"
  end
  
  if category[:average_compute_time] > 1.0
    puts "  ⚠️ High compute time - good candidate for caching"
  end
end
```

#### Step 3: Check Parallel Execution Efficiency

```ruby
# Analyze parallel execution performance
parallel_stats = optimizer.parallel_executor.performance_statistics

puts "Parallel efficiency: #{parallel_stats[:average_improvement]}%"
puts "Total parallel executions: #{parallel_stats[:parallel_executions]}"

if parallel_stats[:average_improvement] < 20
  puts "⚠️ Low parallel efficiency - consider sequential execution"
  
  # Test sequential vs parallel
  comparison = optimizer.parallel_executor.compare_execution_methods(stages)
  puts "Sequential time: #{comparison[:sequential][:total_execution_time]}s"
  puts "Parallel time: #{comparison[:parallel][:total_execution_time]}s"
  puts "Recommendation: #{comparison[:recommendation]}"
end
```

### Common Performance Issues and Solutions

#### Issue 1: High Memory Usage

**Symptoms:**
- Memory usage growing continuously
- Out of memory errors
- System becoming unresponsive

**Diagnosis:**
```ruby
# Monitor memory usage patterns
metrics = optimizer.get_optimization_metrics
current_memory = metrics[:monitor_metrics][:current_metrics][:peak_memory_usage]

puts "Current memory usage: #{current_memory}MB"

# Check cache memory usage
cache_stats = metrics[:cache_performance]
puts "Cache memory usage: ~#{cache_stats[:overall][:memory_cache_size] * 2}MB"
```

**Solutions:**
```ruby
# Reduce memory cache size
optimizer.update_configuration(memory_cache_size: 25)

# Disable file caching if not needed
optimizer.cache_optimizer.update_configuration(file_cache_enabled: false)

# Reduce parallel threads
optimizer.update_configuration(max_parallel_threads: 2)

# Force garbage collection periodically
GC.start if (current_memory > 500)
```

#### Issue 2: Cache Thrashing

**Symptoms:**
- Low cache hit rates (< 30%)
- Performance worse than no caching
- Frequent cache invalidation

**Diagnosis:**
```ruby
# Analyze cache key generation
cache_optimizer = optimizer.cache_optimizer

# Enable cache debugging
cache_optimizer.enable_debug_logging

# Monitor cache invalidation patterns
cache_report = cache_optimizer.cache_efficiency_report
cache_report[:categories].each do |category|
  if category[:hit_rate] < 30 && category[:requests] > 10
    puts "Cache thrashing detected in #{category[:category]}"
  end
end
```

**Solutions:**
```ruby
# Increase cache TTL
optimizer.update_configuration(
  schema_cache_ttl: 14400,    # 4 hours
  template_cache_ttl: 7200,   # 2 hours
  type_mapping_cache_ttl: 28800 # 8 hours
)

# Clear corrupted cache and restart
optimizer.cache_optimizer.clear_all_caches

# Simplify cache keys if they're changing unexpectedly
# (This would require code changes to cache key generation logic)
```

#### Issue 3: Thread Contention

**Symptoms:**
- Parallel execution slower than sequential
- High CPU usage with low throughput
- Thread pool exhaustion errors

**Diagnosis:**
```ruby
# Check thread pool utilization
parallel_executor = optimizer.parallel_executor
thread_pool = parallel_executor.thread_pool

puts "Active threads: #{thread_pool.length}"
puts "Queue length: #{thread_pool.queue_length}"
puts "Completed tasks: #{thread_pool.completed_task_count}"
```

**Solutions:**
```ruby
# Reduce thread count
optimizer.update_configuration(max_parallel_threads: 2)

# Increase queue size
custom_executor = Zero::Generators::Benchmarking::ParallelExecutor.new(
  max_threads: 3,
  thread_pool: Concurrent::ThreadPoolExecutor.new(
    min_threads: 1,
    max_threads: 3,
    max_queue: 20  # Larger queue
  )
)

# Switch to sequential execution for thread-heavy workloads
optimizer.optimize_generation(strategy: :sequential) { ... }
```

## Advanced Optimization Techniques

### Custom Optimization Strategy

Create a custom optimization strategy for specific workloads:

```ruby
# Define custom strategy
custom_strategy = {
  name: "Database-Heavy Strategy",
  description: "Optimized for database-intensive operations",
  use_parallel: true,
  use_cache: true,
  cache_aggressive: true,
  parallel_conservative: false,
  custom_config: {
    max_parallel_threads: 2, # Database connections are limited
    cache_ttl: 21600,        # 6 hours for database data
    enable_connection_pooling: true
  }
}

# Register custom strategy
Zero::Generators::Benchmarking::PerformanceOptimizer::OPTIMIZATION_STRATEGIES[:database_heavy] = custom_strategy

# Use custom strategy
optimizer.optimize_generation(strategy: :database_heavy) { ... }
```

### Performance Profile-Based Optimization

Automatically adjust optimization based on system profile:

```ruby
# Detect system capabilities
system_profile = {
  cpu_cores: Concurrent.processor_count,
  memory_gb: `free -g | grep Mem | awk '{print $2}'`.to_i,
  storage_type: detect_storage_type, # SSD vs HDD
  network_speed: detect_network_speed
}

# Adjust configuration based on system
config = case
         when system_profile[:cpu_cores] >= 8 && system_profile[:memory_gb] >= 16
           { # High-performance system
             enable_parallel_execution: true,
             max_parallel_threads: 6,
             memory_cache_size: 500,
             cache_ttl: 7200
           }
         when system_profile[:cpu_cores] >= 4 && system_profile[:memory_gb] >= 8
           { # Medium-performance system
             enable_parallel_execution: true,
             max_parallel_threads: 3,
             memory_cache_size: 200,
             cache_ttl: 3600
           }
         else
           { # Low-performance system
             enable_parallel_execution: false,
             memory_cache_size: 50,
             cache_ttl: 1800
           }
         end

optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new(config: config)
```

### Adaptive Performance Tuning

Automatically adjust performance settings based on runtime metrics:

```ruby
class AdaptiveOptimizer
  def initialize
    @optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new
    @performance_history = []
  end
  
  def adaptive_optimize(&block)
    # Record baseline performance
    baseline = measure_performance { block.call }
    
    # Try different configurations and learn
    best_config = find_optimal_config(block)
    
    # Apply best configuration
    @optimizer.update_configuration(best_config)
    
    # Execute with optimal configuration
    @optimizer.optimize_generation(&block)
  end
  
  private
  
  def find_optimal_config(block)
    configs_to_test = [
      { max_parallel_threads: 2, cache_ttl: 1800 },
      { max_parallel_threads: 4, cache_ttl: 3600 },
      { max_parallel_threads: 6, cache_ttl: 7200 }
    ]
    
    best_config = nil
    best_time = Float::INFINITY
    
    configs_to_test.each do |config|
      @optimizer.update_configuration(config)
      
      time = measure_performance { block.call }
      
      if time < best_time
        best_time = time
        best_config = config
      end
    end
    
    best_config
  end
  
  def measure_performance(&block)
    start_time = Time.current
    block.call
    Time.current - start_time
  end
end

# Usage
adaptive = AdaptiveOptimizer.new
adaptive.adaptive_optimize do
  GenerationCoordinator.new(options, shell).execute
end
```

## Performance Testing Best Practices

### Comprehensive Performance Test Suite

```ruby
# performance_test_suite.rb
class PerformanceTestSuite
  def initialize
    @optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new
    @results = {}
  end
  
  def run_full_suite
    puts "Starting comprehensive performance test suite..."
    
    # Test 1: Baseline measurement
    test_baseline_performance
    
    # Test 2: Strategy comparison
    test_all_strategies
    
    # Test 3: Cache effectiveness
    test_cache_performance
    
    # Test 4: Parallel execution scaling
    test_parallel_scaling
    
    # Test 5: Memory usage profiling
    test_memory_usage
    
    # Test 6: Long-running stability
    test_stability
    
    # Generate comprehensive report
    generate_test_report
  end
  
  private
  
  def test_baseline_performance
    puts "Testing baseline performance..."
    
    @results[:baseline] = @optimizer.optimize_generation(strategy: :minimal) do
      generate_test_models(count: 10)
    end
  end
  
  def test_all_strategies
    puts "Testing all optimization strategies..."
    
    strategies = [:sequential, :parallel, :cache_heavy, :balanced]
    @results[:strategies] = {}
    
    strategies.each do |strategy|
      puts "  Testing #{strategy} strategy..."
      
      @results[:strategies][strategy] = @optimizer.optimize_generation(strategy: strategy) do
        generate_test_models(count: 10)
      end
    end
  end
  
  def test_cache_performance
    puts "Testing cache performance..."
    
    # Cold cache
    cold_cache_time = measure_time do
      @optimizer.cache_optimizer.clear_all_caches
      generate_test_models(count: 5)
    end
    
    # Warm cache
    warm_cache_time = measure_time do
      generate_test_models(count: 5) # Same models, should be cached
    end
    
    @results[:cache] = {
      cold_cache_time: cold_cache_time,
      warm_cache_time: warm_cache_time,
      improvement: ((cold_cache_time - warm_cache_time) / cold_cache_time * 100).round(2)
    }
  end
  
  def test_parallel_scaling
    puts "Testing parallel execution scaling..."
    
    thread_counts = [1, 2, 4, 6, 8]
    @results[:parallel_scaling] = {}
    
    thread_counts.each do |count|
      next if count > Concurrent.processor_count
      
      puts "  Testing with #{count} threads..."
      
      @optimizer.update_configuration(max_parallel_threads: count)
      
      time = measure_time do
        @optimizer.optimize_generation(strategy: :parallel) do
          generate_test_models(count: 15)
        end
      end
      
      @results[:parallel_scaling][count] = time
    end
  end
  
  def test_memory_usage
    puts "Testing memory usage patterns..."
    
    initial_memory = get_memory_usage
    
    10.times do |i|
      @optimizer.optimize_generation(strategy: :balanced) do
        generate_test_models(count: 5)
      end
      
      GC.start if i % 3 == 0 # Periodic GC
    end
    
    final_memory = get_memory_usage
    
    @results[:memory] = {
      initial_memory: initial_memory,
      final_memory: final_memory,
      growth: final_memory - initial_memory
    }
  end
  
  def test_stability
    puts "Testing long-running stability..."
    
    start_time = Time.current
    errors = []
    
    50.times do |i|
      begin
        @optimizer.optimize_generation(strategy: :balanced) do
          generate_test_models(count: 3)
        end
      rescue => e
        errors << e
      end
      
      if i % 10 == 0
        puts "  Completed #{i + 1}/50 iterations"
      end
    end
    
    @results[:stability] = {
      duration: Time.current - start_time,
      errors: errors,
      error_rate: (errors.length / 50.0 * 100).round(2)
    }
  end
  
  def generate_test_report
    puts "\n" + "="*60
    puts "PERFORMANCE TEST SUITE RESULTS"
    puts "="*60
    
    puts "\nBaseline Performance:"
    puts "  Execution time: #{@results[:baseline][:execution_time]}s"
    
    puts "\nStrategy Comparison:"
    @results[:strategies].each do |strategy, result|
      improvement = ((@results[:baseline][:execution_time] - result[:execution_time]) / @results[:baseline][:execution_time] * 100).round(2)
      puts "  #{strategy}: #{result[:execution_time]}s (#{improvement}% improvement)"
    end
    
    puts "\nCache Performance:"
    puts "  Cold cache: #{@results[:cache][:cold_cache_time]}s"
    puts "  Warm cache: #{@results[:cache][:warm_cache_time]}s"
    puts "  Improvement: #{@results[:cache][:improvement]}%"
    
    puts "\nParallel Scaling:"
    @results[:parallel_scaling].each do |threads, time|
      puts "  #{threads} threads: #{time}s"
    end
    
    puts "\nMemory Usage:"
    puts "  Memory growth: #{@results[:memory][:growth]}MB"
    
    puts "\nStability Test:"
    puts "  Duration: #{@results[:stability][:duration].round(2)}s"
    puts "  Error rate: #{@results[:stability][:error_rate]}%"
    
    puts "\n" + "="*60
  end
  
  def generate_test_models(count:)
    # Mock model generation for testing
    sleep(0.01 * count) # Simulate processing time
    
    {
      success: true,
      execution_time: 0.01 * count,
      generated_models: (1..count).map { |i| { table_name: "table_#{i}" } },
      generated_files: (1..count*2).map { |i| "file_#{i}.ts" }
    }
  end
  
  def measure_time(&block)
    start_time = Time.current
    block.call
    Time.current - start_time
  end
  
  def get_memory_usage
    if RUBY_PLATFORM =~ /darwin/
      `ps -o rss= -p #{Process.pid}`.to_i / 1024.0
    else
      0.0
    end
  end
end

# Run the test suite
suite = PerformanceTestSuite.new
suite.run_full_suite
```

### Automated Performance Regression Testing

```ruby
# performance_regression_test.rb
class PerformanceRegressionTest
  PERFORMANCE_BASELINE_FILE = "performance_baseline.json"
  REGRESSION_THRESHOLD = 10.0 # 10% performance regression threshold
  
  def initialize
    @optimizer = Zero::Generators::Benchmarking::PerformanceOptimizer.new
    @current_results = {}
    @baseline_results = load_baseline
  end
  
  def run_regression_test
    puts "Running performance regression test..."
    
    # Run current performance tests
    run_current_performance_tests
    
    # Compare against baseline
    regression_detected = compare_with_baseline
    
    if regression_detected
      puts "❌ Performance regression detected!"
      exit(1)
    else
      puts "✅ No performance regression detected"
      
      # Update baseline if performance improved significantly
      update_baseline_if_improved
    end
  end
  
  private
  
  def run_current_performance_tests
    test_scenarios = [
      { name: :small_dataset, model_count: 3 },
      { name: :medium_dataset, model_count: 8 },
      { name: :large_dataset, model_count: 15 }
    ]
    
    test_scenarios.each do |scenario|
      puts "Testing #{scenario[:name]}..."
      
      times = []
      memory_usage = []
      
      # Run multiple iterations for statistical significance
      5.times do
        result = @optimizer.optimize_generation(strategy: :balanced) do
          generate_test_models(count: scenario[:model_count])
        end
        
        times << result[:execution_time]
        memory_usage << result[:memory_usage] || 0
      end
      
      @current_results[scenario[:name]] = {
        avg_time: times.sum / times.length,
        avg_memory: memory_usage.sum / memory_usage.length,
        std_dev: calculate_standard_deviation(times)
      }
    end
  end
  
  def compare_with_baseline
    return false unless @baseline_results
    
    regression_detected = false
    
    @current_results.each do |scenario, current|
      baseline = @baseline_results[scenario.to_s]
      next unless baseline
      
      # Calculate performance change
      time_change = ((current[:avg_time] - baseline['avg_time']) / baseline['avg_time'] * 100)
      memory_change = ((current[:avg_memory] - baseline['avg_memory']) / baseline['avg_memory'] * 100)
      
      puts "#{scenario}:"
      puts "  Time: #{current[:avg_time]}s (#{time_change.round(2)}% change)"
      puts "  Memory: #{current[:avg_memory]}MB (#{memory_change.round(2)}% change)"
      
      # Check for regression
      if time_change > REGRESSION_THRESHOLD
        puts "  ❌ Time regression: #{time_change.round(2)}% slower than baseline"
        regression_detected = true
      end
      
      if memory_change > REGRESSION_THRESHOLD
        puts "  ❌ Memory regression: #{memory_change.round(2)}% more memory than baseline"
        regression_detected = true
      end
    end
    
    regression_detected
  end
  
  def update_baseline_if_improved
    return unless @baseline_results
    
    improvement_detected = false
    
    @current_results.each do |scenario, current|
      baseline = @baseline_results[scenario.to_s]
      next unless baseline
      
      time_improvement = ((baseline['avg_time'] - current[:avg_time]) / baseline['avg_time'] * 100)
      
      if time_improvement > 20.0 # 20% improvement
        improvement_detected = true
        puts "Significant improvement detected for #{scenario}: #{time_improvement.round(2)}% faster"
      end
    end
    
    if improvement_detected
      puts "Updating performance baseline with improved results"
      save_baseline(@current_results)
    end
  end
  
  def load_baseline
    return nil unless File.exist?(PERFORMANCE_BASELINE_FILE)
    
    JSON.parse(File.read(PERFORMANCE_BASELINE_FILE))
  rescue => e
    puts "Warning: Could not load performance baseline: #{e.message}"
    nil
  end
  
  def save_baseline(results)
    baseline_data = results.transform_keys(&:to_s).transform_values do |metrics|
      metrics.transform_keys(&:to_s)
    end
    
    File.write(PERFORMANCE_BASELINE_FILE, JSON.pretty_generate(baseline_data))
  end
  
  def calculate_standard_deviation(values)
    mean = values.sum / values.length.to_f
    sum_squared_deviations = values.sum { |value| (value - mean) ** 2 }
    Math.sqrt(sum_squared_deviations / values.length.to_f)
  end
  
  def generate_test_models(count:)
    # Mock model generation
    sleep(0.01 * count)
    
    {
      success: true,
      execution_time: 0.01 * count,
      memory_usage: 20 * count
    }
  end
end

# Usage in CI/CD pipeline
test = PerformanceRegressionTest.new
test.run_regression_test
```

This comprehensive performance guide provides detailed instructions for understanding, implementing, and troubleshooting the ReactiveRecord performance optimization system. Use it as a reference for achieving optimal performance in your specific environment and workload.