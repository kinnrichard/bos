# frozen_string_literal: true

require "digest"
require "json"

module Zero
  module Generators
    module Benchmarking
      # CacheOptimizer provides intelligent caching for ReactiveRecord generation
      #
      # This class implements multi-level caching strategies to optimize performance
      # during ReactiveRecord generation by caching frequently accessed data like
      # schema introspection results, template rendering, and type mappings.
      #
      # Key Features:
      # - Multi-level caching (memory, file-based, and persistent)
      # - Intelligent cache invalidation based on schema changes
      # - Cache hit/miss statistics and performance monitoring
      # - Configurable cache policies and TTL settings
      # - Thread-safe cache operations
      #
      # @example Basic usage
      #   cache_optimizer = CacheOptimizer.new
      #
      #   # Cache schema introspection results
      #   schema_data = cache_optimizer.cached_schema_introspection do
      #     introspector.extract_schema
      #   end
      #
      #   # Cache template rendering
      #   rendered_content = cache_optimizer.cached_template_render(template_path, context) do
      #     template_renderer.render(template_path, context)
      #   end
      #
      class CacheOptimizer
        attr_reader :cache_statistics, :cache_policies

        # Default cache configuration
        DEFAULT_CACHE_CONFIG = {
          memory_cache_size: 100,
          file_cache_enabled: true,
          file_cache_directory: "/tmp/reactive_record_cache",
          default_ttl: 3600, # 1 hour
          schema_cache_ttl: 7200, # 2 hours
          template_cache_ttl: 3600, # 1 hour
          type_mapping_cache_ttl: 14400 # 4 hours
        }.freeze

        # Cache categories for different types of data
        CACHE_CATEGORIES = %i[
          schema_introspection
          template_rendering
          type_mapping
          relationship_processing
          file_operations
          polymorphic_analysis
        ].freeze

        def initialize(config: {})
          @config = DEFAULT_CACHE_CONFIG.merge(config)
          @cache_statistics = initialize_cache_statistics
          @cache_policies = initialize_cache_policies

          # Multi-level cache storage
          @memory_cache = {}
          @file_cache_enabled = @config[:file_cache_enabled]
          @cache_directory = @config[:file_cache_directory]

          # Thread safety
          @cache_mutex = Mutex.new

          # Setup cache directory if file caching is enabled
          setup_file_cache if @file_cache_enabled
        end

        # Cache schema introspection results
        #
        # Schema introspection is expensive and rarely changes, making it ideal for caching.
        # Cache keys are based on database schema checksum.
        #
        # @param force_refresh [Boolean] Force cache refresh
        # @return [Hash] Cached or computed schema data
        def cached_schema_introspection(force_refresh: false, &block)
          cache_key = generate_schema_cache_key
          cache_category = :schema_introspection

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Cache template rendering results
        #
        # Template rendering can be cached when the template content and context
        # variables remain the same.
        #
        # @param template_path [String] Path to template file
        # @param context [Hash] Template rendering context
        # @param force_refresh [Boolean] Force cache refresh
        # @return [String] Cached or computed rendered content
        def cached_template_render(template_path, context, force_refresh: false, &block)
          cache_key = generate_template_cache_key(template_path, context)
          cache_category = :template_rendering

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Cache type mapping results
        #
        # Type mappings are computed once and can be cached for the duration
        # of the generation process.
        #
        # @param rails_type [String] Rails column type
        # @param column_info [Hash] Column metadata
        # @param force_refresh [Boolean] Force cache refresh
        # @return [String] Cached or computed TypeScript type
        def cached_type_mapping(rails_type, column_info, force_refresh: false, &block)
          cache_key = generate_type_mapping_cache_key(rails_type, column_info)
          cache_category = :type_mapping

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Cache relationship processing results
        #
        # Relationship processing involves complex analysis that can be cached
        # when the relationship structure hasn't changed.
        #
        # @param table_name [String] Table name
        # @param relationships [Hash] Raw relationship data
        # @param force_refresh [Boolean] Force cache refresh
        # @return [Hash] Cached or computed relationship processing results
        def cached_relationship_processing(table_name, relationships, force_refresh: false, &block)
          cache_key = generate_relationship_cache_key(table_name, relationships)
          cache_category = :relationship_processing

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Cache polymorphic analysis results
        #
        # @param table_name [String] Table name
        # @param force_refresh [Boolean] Force cache refresh
        # @return [Array] Cached or computed polymorphic associations
        def cached_polymorphic_analysis(table_name, force_refresh: false, &block)
          cache_key = generate_polymorphic_cache_key(table_name)
          cache_category = :polymorphic_analysis

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Cache file operation results (for semantic comparison)
        #
        # @param file_path [String] File path
        # @param content [String] File content
        # @param force_refresh [Boolean] Force cache refresh
        # @return [Boolean] Cached or computed file comparison result
        def cached_file_comparison(file_path, content, force_refresh: false, &block)
          cache_key = generate_file_comparison_cache_key(file_path, content)
          cache_category = :file_operations

          cached_operation(cache_key, cache_category, force_refresh: force_refresh, &block)
        end

        # Clear all caches
        def clear_all_caches
          @cache_mutex.synchronize do
            @memory_cache.clear
            clear_file_cache if @file_cache_enabled
            reset_cache_statistics
          end
        end

        # Clear specific cache category
        #
        # @param category [Symbol] Cache category to clear
        def clear_cache_category(category)
          @cache_mutex.synchronize do
            @memory_cache.delete_if { |key, _| key.start_with?("#{category}:") }
            clear_file_cache_category(category) if @file_cache_enabled
            @cache_statistics[:categories][category][:hits] = 0
            @cache_statistics[:categories][category][:misses] = 0
          end
        end

        # Get cache efficiency statistics
        #
        # @return [Hash] Cache performance statistics
        def cache_efficiency_report
          total_requests = @cache_statistics[:total_requests]
          total_hits = @cache_statistics[:total_hits]

          return empty_efficiency_report if total_requests == 0

          hit_rate = (total_hits.to_f / total_requests * 100).round(2)

          category_stats = CACHE_CATEGORIES.map do |category|
            cat_stats = @cache_statistics[:categories][category]
            cat_requests = cat_stats[:hits] + cat_stats[:misses]
            cat_hit_rate = cat_requests > 0 ? (cat_stats[:hits].to_f / cat_requests * 100).round(2) : 0.0

            {
              category: category,
              requests: cat_requests,
              hits: cat_stats[:hits],
              misses: cat_stats[:misses],
              hit_rate: cat_hit_rate,
              average_compute_time: cat_stats[:total_compute_time] > 0 ?
                (cat_stats[:total_compute_time] / [ cat_stats[:misses], 1 ].max).round(4) : 0.0
            }
          end

          {
            overall: {
              total_requests: total_requests,
              total_hits: total_hits,
              total_misses: @cache_statistics[:total_misses],
              hit_rate: hit_rate,
              memory_cache_size: @memory_cache.size,
              file_cache_enabled: @file_cache_enabled
            },
            categories: category_stats,
            recommendations: generate_cache_recommendations(hit_rate, category_stats)
          }
        end

        # Preload frequently used cache entries
        #
        # @param preload_config [Hash] Preload configuration
        def preload_cache(preload_config = {})
          return unless preload_config.any?

          @cache_mutex.synchronize do
            preload_config.each do |category, entries|
              entries.each do |entry|
                case category
                when :schema_introspection
                  # Preload schema if available
                  preload_schema_cache(entry)
                when :template_rendering
                  # Preload templates
                  preload_template_cache(entry)
                when :type_mapping
                  # Preload common type mappings
                  preload_type_mapping_cache(entry)
                end
              end
            end
          end
        end

        # Calculate potential performance improvement from caching
        #
        # @param benchmark_results [Hash] Benchmark results without caching
        # @return [Hash] Projected performance improvement with optimal caching
        def calculate_cache_performance_impact(benchmark_results)
          cache_stats = cache_efficiency_report

          # Estimate time savings based on cache hit rates and average compute times
          estimated_time_saved = 0.0

          cache_stats[:categories].each do |category_data|
            category = category_data[:category]
            hits = category_data[:hits]
            avg_compute_time = category_data[:average_compute_time]

            # Assume cache retrieval is 100x faster than computation
            cache_retrieval_time = avg_compute_time * 0.01
            time_saved_per_hit = avg_compute_time - cache_retrieval_time

            estimated_time_saved += hits * time_saved_per_hit
          end

          baseline_time = benchmark_results[:total_execution_time] || 0.0
          projected_time = [ baseline_time - estimated_time_saved, baseline_time * 0.1 ].max

          improvement_percentage = baseline_time > 0 ?
            ((baseline_time - projected_time) / baseline_time * 100).round(2) : 0.0

          {
            baseline_execution_time: baseline_time,
            projected_execution_time: projected_time,
            estimated_time_saved: estimated_time_saved.round(4),
            improvement_percentage: improvement_percentage,
            cache_hit_rate: cache_stats[:overall][:hit_rate],
            recommendations: generate_performance_recommendations(improvement_percentage, cache_stats)
          }
        end

        private

        # Core cached operation method
        def cached_operation(cache_key, category, force_refresh: false, &block)
          # Check cache first (unless forcing refresh)
          unless force_refresh
            cached_result = get_from_cache(cache_key, category)
            if cached_result
              record_cache_hit(category)
              return cached_result[:data]
            end
          end

          # Cache miss - compute result
          record_cache_miss(category)
          compute_start_time = current_time_microseconds

          result = block.call

          compute_time = current_time_microseconds - compute_start_time
          record_compute_time(category, compute_time)

          # Store in cache with TTL
          store_in_cache(cache_key, category, result)

          result
        end

        # Get item from cache
        def get_from_cache(cache_key, category)
          @cache_mutex.synchronize do
            # Check memory cache first
            if @memory_cache.key?(cache_key)
              cache_entry = @memory_cache[cache_key]
              return cache_entry if cache_entry[:expires_at] > Time.current

              # Expired - remove from cache
              @memory_cache.delete(cache_key)
            end

            # Check file cache if enabled
            if @file_cache_enabled
              file_cache_result = get_from_file_cache(cache_key, category)

              if file_cache_result
                # Promote to memory cache
                @memory_cache[cache_key] = file_cache_result
                return file_cache_result
              end
            end

            nil
          end
        end

        # Store item in cache
        def store_in_cache(cache_key, category, data)
          @cache_mutex.synchronize do
            ttl = @cache_policies[category][:ttl]
            expires_at = Time.current + ttl

            cache_entry = {
              data: data,
              created_at: Time.current,
              expires_at: expires_at,
              category: category
            }

            # Store in memory cache
            @memory_cache[cache_key] = cache_entry

            # Enforce memory cache size limit
            if @memory_cache.size > @config[:memory_cache_size]
              # Remove oldest entries
              oldest_keys = @memory_cache.keys.sort_by { |k| @memory_cache[k][:created_at] }.first(10)
              oldest_keys.each { |k| @memory_cache.delete(k) }
            end

            # Store in file cache if enabled
            store_in_file_cache(cache_key, category, cache_entry) if @file_cache_enabled
          end
        end

        # Generate cache key for schema introspection
        def generate_schema_cache_key
          # Use database schema checksum if available, otherwise use timestamp
          if defined?(ActiveRecord) && ActiveRecord::Base.connection.respond_to?(:schema_cache)
            schema_version = ActiveRecord::Base.connection.migration_context.current_version
            "schema_introspection:#{schema_version}"
          else
            "schema_introspection:#{Time.current.to_i / 300}" # 5-minute buckets
          end
        end

        # Generate cache key for template rendering
        def generate_template_cache_key(template_path, context)
          # Include template file mtime and context hash
          template_mtime = File.exist?(template_path) ? File.mtime(template_path).to_i : 0
          context_hash = generate_context_hash(context)

          "template_rendering:#{template_path}:#{template_mtime}:#{context_hash}"
        end

        # Generate cache key for type mapping
        def generate_type_mapping_cache_key(rails_type, column_info)
          # Type mappings are stable, so include relevant column attributes
          relevant_attributes = column_info.slice(:null, :default, :limit, :precision, :scale)
          attributes_hash = Digest::MD5.hexdigest(relevant_attributes.to_json)

          "type_mapping:#{rails_type}:#{attributes_hash}"
        end

        # Generate cache key for relationship processing
        def generate_relationship_cache_key(table_name, relationships)
          relationships_hash = Digest::MD5.hexdigest(relationships.to_json)
          "relationship_processing:#{table_name}:#{relationships_hash}"
        end

        # Generate cache key for polymorphic analysis
        def generate_polymorphic_cache_key(table_name)
          # Polymorphic analysis depends on model definitions
          "polymorphic_analysis:#{table_name}"
        end

        # Generate cache key for file comparison
        def generate_file_comparison_cache_key(file_path, content)
          content_hash = Digest::MD5.hexdigest(content)
          file_mtime = File.exist?(file_path) ? File.mtime(file_path).to_i : 0

          "file_comparison:#{file_path}:#{file_mtime}:#{content_hash}"
        end

        # Generate hash for template context
        def generate_context_hash(context)
          # Create deterministic hash of context data
          Digest::MD5.hexdigest(context.to_json)
        rescue
          # Fallback if context can't be serialized
          Digest::MD5.hexdigest(context.inspect)
        end

        # Initialize cache statistics
        def initialize_cache_statistics
          {
            total_requests: 0,
            total_hits: 0,
            total_misses: 0,
            categories: CACHE_CATEGORIES.each_with_object({}) do |category, hash|
              hash[category] = {
                hits: 0,
                misses: 0,
                total_compute_time: 0.0
              }
            end
          }
        end

        # Initialize cache policies
        def initialize_cache_policies
          CACHE_CATEGORIES.each_with_object({}) do |category, hash|
            ttl = case category
            when :schema_introspection
                    @config[:schema_cache_ttl]
            when :template_rendering
                    @config[:template_cache_ttl]
            when :type_mapping
                    @config[:type_mapping_cache_ttl]
            else
                    @config[:default_ttl]
            end

            hash[category] = {
              ttl: ttl,
              max_size: 50,
              enabled: true
            }
          end
        end

        # Record cache hit
        def record_cache_hit(category)
          @cache_statistics[:total_requests] += 1
          @cache_statistics[:total_hits] += 1
          @cache_statistics[:categories][category][:hits] += 1
        end

        # Record cache miss
        def record_cache_miss(category)
          @cache_statistics[:total_requests] += 1
          @cache_statistics[:total_misses] += 1
          @cache_statistics[:categories][category][:misses] += 1
        end

        # Record compute time for cache miss
        def record_compute_time(category, compute_time_microseconds)
          compute_time_seconds = compute_time_microseconds / 1_000_000.0
          @cache_statistics[:categories][category][:total_compute_time] += compute_time_seconds
        end

        # Reset cache statistics
        def reset_cache_statistics
          @cache_statistics = initialize_cache_statistics
        end

        # Setup file cache directory
        def setup_file_cache
          FileUtils.mkdir_p(@cache_directory) unless Dir.exist?(@cache_directory)
        end

        # Get item from file cache
        def get_from_file_cache(cache_key, category)
          cache_file_path = file_cache_path(cache_key, category)
          return nil unless File.exist?(cache_file_path)

          begin
            cache_data = JSON.parse(File.read(cache_file_path), symbolize_names: true)
            expires_at = Time.parse(cache_data[:expires_at])

            if expires_at > Time.current
              {
                data: cache_data[:data],
                created_at: Time.parse(cache_data[:created_at]),
                expires_at: expires_at,
                category: category
              }
            else
              # Expired - remove file
              File.delete(cache_file_path)
              nil
            end
          rescue => e
            # Corrupted cache file - remove it
            File.delete(cache_file_path) if File.exist?(cache_file_path)
            nil
          end
        end

        # Store item in file cache
        def store_in_file_cache(cache_key, category, cache_entry)
          cache_file_path = file_cache_path(cache_key, category)

          cache_data = {
            data: cache_entry[:data],
            created_at: cache_entry[:created_at].iso8601,
            expires_at: cache_entry[:expires_at].iso8601,
            category: category
          }

          File.write(cache_file_path, JSON.pretty_generate(cache_data))
        rescue => e
          # File cache write failed - not critical, continue without file caching
        end

        # Generate file cache path
        def file_cache_path(cache_key, category)
          safe_key = cache_key.gsub(/[\/\\:*?"<>|]/, "_")
          File.join(@cache_directory, "#{category}_#{safe_key}.json")
        end

        # Clear file cache
        def clear_file_cache
          return unless Dir.exist?(@cache_directory)

          Dir.glob(File.join(@cache_directory, "*.json")).each do |file|
            File.delete(file)
          end
        end

        # Clear file cache category
        def clear_file_cache_category(category)
          return unless Dir.exist?(@cache_directory)

          pattern = File.join(@cache_directory, "#{category}_*.json")
          Dir.glob(pattern).each do |file|
            File.delete(file)
          end
        end

        # Preload schema cache
        def preload_schema_cache(entry)
          # Implementation would load known schema data
        end

        # Preload template cache
        def preload_template_cache(entry)
          # Implementation would pre-render common templates
        end

        # Preload type mapping cache
        def preload_type_mapping_cache(entry)
          # Implementation would pre-compute common type mappings
        end

        # Generate cache recommendations
        def generate_cache_recommendations(overall_hit_rate, category_stats)
          recommendations = []

          if overall_hit_rate < 50
            recommendations << {
              priority: :high,
              category: :overall,
              issue: "Low cache hit rate (#{overall_hit_rate}%)",
              recommendation: "Consider increasing cache TTL settings and memory cache size"
            }
          end

          category_stats.each do |cat_data|
            if cat_data[:hit_rate] < 30 && cat_data[:requests] > 10
              recommendations << {
                priority: :medium,
                category: cat_data[:category],
                issue: "Low hit rate for #{cat_data[:category]} (#{cat_data[:hit_rate]}%)",
                recommendation: "Review cache key generation and TTL settings for this category"
              }
            end
          end

          recommendations
        end

        # Generate performance recommendations
        def generate_performance_recommendations(improvement_percentage, cache_stats)
          recommendations = []

          if improvement_percentage > 25
            recommendations << "Caching provides excellent performance improvement (#{improvement_percentage}%). Current implementation is optimal."
          elsif improvement_percentage > 10
            recommendations << "Good performance improvement from caching (#{improvement_percentage}%). Consider optimizing cache hit rates further."
          elsif improvement_percentage > 0
            recommendations << "Minimal performance improvement (#{improvement_percentage}%). Review cache policies and consider alternative optimizations."
          else
            recommendations << "Caching overhead may be negating benefits. Consider disabling caching for this workload."
          end

          recommendations
        end

        # Empty efficiency report
        def empty_efficiency_report
          {
            overall: {
              total_requests: 0,
              total_hits: 0,
              total_misses: 0,
              hit_rate: 0.0,
              memory_cache_size: 0,
              file_cache_enabled: @file_cache_enabled
            },
            categories: [],
            recommendations: []
          }
        end

        # Get current time in microseconds
        def current_time_microseconds
          Process.clock_gettime(Process::CLOCK_MONOTONIC, :float_microsecond)
        end
      end
    end
  end
end
