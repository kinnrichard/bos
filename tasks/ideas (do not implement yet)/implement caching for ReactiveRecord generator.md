# 📋 **Checksum-Based Generator Caching - Detailed Implementation Plan**

## **Overview**

Not implementing at this time because if the prettier batching resolves our performance issue, it is simpler and less error-prone than a new caching strategy.

Implement intelligent inter-run caching for Zero generators to reduce generation time from 21+ seconds to ~12ms for unchanged models. Uses file checksums to detect dependency changes and skip unnecessary regeneration.

---

## **Phase 1: Core Cache Infrastructure** ⏱️ **2-3 hours**

### **1.1 Create ZeroGeneratorCache Service (45 minutes)**

**Location**: `lib/generators/zero/active_models/zero_generator_cache.rb`

```ruby
# frozen_string_literal: true

require 'digest'
require 'json'
require 'fileutils'

module Zero
  module Generators
    class ZeroGeneratorCache
      CACHE_DIR = Rails.root.join("tmp", "zero_generators")
      CHECKSUMS_FILE = CACHE_DIR.join("checksums.json")

      class CacheError < StandardError; end

      def self.load_metadata
        return empty_metadata unless CHECKSUMS_FILE.exist?
        JSON.parse(CHECKSUMS_FILE.read)
      rescue JSON::ParserError => e
        Rails.logger.warn "Zero cache corrupted, starting fresh: #{e.message}"
        empty_metadata
      end

      def self.save_metadata(metadata)
        FileUtils.mkdir_p(CACHE_DIR)
        CHECKSUMS_FILE.write(JSON.pretty_generate(metadata))
      end

      def self.empty_metadata
        {
          "version" => "1.0.0",
          "last_generated" => nil,
          "global_dependencies" => {},
          "models" => {}
        }
      end

      def self.calculate_global_checksums
        {
          "schema_rb" => checksum_file("db/schema.rb"),
          "migrations_combined" => checksum_migrations,
          "templates_combined" => checksum_templates,
          "generator_version" => Zero::Generators::VERSION
        }
      end

      def self.calculate_model_checksum(model_name)
        model_file = Rails.root.join("app/models/#{model_name.underscore}.rb")
        return nil unless model_file.exist?

        {
          "model_file" => checksum_file(model_file),
          "table_schema" => checksum_table_schema(model_name.pluralize)
        }
      end

      private

      def self.checksum_file(path)
        return nil unless File.exist?(path)
        Digest::SHA256.file(path).hexdigest[0..16]  # Truncate for readability
      end

      def self.checksum_migrations
        migration_files = Dir.glob(Rails.root.join("db/migrate/*.rb")).sort
        combined_content = migration_files.map { |f| File.read(f) }.join("\n")
        Digest::SHA256.hexdigest(combined_content)[0..16]
      end

      def self.checksum_templates
        template_files = Dir.glob(Rails.root.join("lib/generators/zero/active_models/templates/*.erb"))
        combined_content = template_files.map { |f| File.read(f) }.join("\n")
        Digest::SHA256.hexdigest(combined_content)[0..16]
      end

      def self.checksum_table_schema(table_name)
        # Extract just this table's schema from schema.rb
        schema_content = File.read(Rails.root.join("db/schema.rb"))
        table_match = schema_content.match(/create_table "#{table_name}".*?^  end$/m)
        return nil unless table_match

        Digest::SHA256.hexdigest(table_match[0])[0..16]
      end
    end
  end
end
```

### **1.2 Cache Decision Logic (30 minutes)**

```ruby
# Add to ZeroGeneratorCache
def self.needs_full_regeneration?
  current_global = calculate_global_checksums
  cached_metadata = load_metadata
  cached_global = cached_metadata["global_dependencies"]

  current_global != cached_global
end

def self.needs_model_regeneration?(model_name)
  return true if needs_full_regeneration?

  current_model = calculate_model_checksum(model_name)
  cached_metadata = load_metadata
  cached_model = cached_metadata["models"][model_name]

  current_model != cached_model
end

def self.update_model_cache(model_name)
  metadata = load_metadata
  metadata["models"][model_name] = calculate_model_checksum(model_name)
  metadata["global_dependencies"] = calculate_global_checksums
  metadata["last_generated"] = Time.current.iso8601
  save_metadata(metadata)
end
```

### **1.3 Service Registry Integration (45 minutes)**

**Modify**: `lib/generators/zero/active_models/service_registry.rb`

```ruby
# Add cache service to SERVICE_DEPENDENCIES
SERVICE_DEPENDENCIES = {
  configuration: [],
  cache: [],                    # New cache service
  schema: [ :configuration ],
  file_manager: [ :configuration ],
  template_renderer: [ :configuration ],
  type_mapper: [ :configuration ],
  relationship_processor: [ :schema ]
}.freeze

# Add to SERVICE_INITIALIZATION_ORDER
SERVICE_INITIALIZATION_ORDER = [
  :configuration,
  :cache,                       # Initialize early
  :schema,
  :file_manager,
  :template_renderer,
  :type_mapper,
  :relationship_processor
].freeze

# Add factory method
def create_cache_service(dependencies)
  ZeroGeneratorCache.new
end
```

---

## **Phase 2: Generator Integration** ⏱️ **1-2 hours**

### **2.1 Modify GenerationCoordinator (60 minutes)**

**Location**: `lib/generators/zero/active_models/generation_coordinator.rb`

```ruby
# Add to generate_models_for_all_tables method
def generate_models_for_all_tables(schema_data)
  cache_service = service_registry.get_service(:cache)

  # Check for global changes first
  if cache_service.needs_full_regeneration?
    shell&.say "🔄 Global changes detected, regenerating all models", :yellow
    return generate_all_models(schema_data)
  end

  # Process each table with cache checking
  result = {
    generated_models: [],
    generated_files: [],
    skipped_tables: [],
    cached_models: [],
    errors: []
  }

  schema_data[:tables].each do |table|
    model_name = table[:name].singularize

    if cache_service.needs_model_regeneration?(model_name)
      # Generate model (existing logic)
      model_result = generate_model_set(table, schema_data)
      result[:generated_models] << model_result
      result[:generated_files].concat(model_result[:files_generated])

      # Update cache after successful generation
      cache_service.update_model_cache(model_name)

      shell&.say "[REGEN] #{model_name} (#{detect_change_reason(model_name)})", :yellow
    else
      # Skip generation, use cache
      result[:cached_models] << model_name
      shell&.say "[CACHED] #{model_name}.ts (unchanged)", :green
    end
  end

  result
end

private

def detect_change_reason(model_name)
  # Simple change detection for user feedback
  cache_service = service_registry.get_service(:cache)
  current = cache_service.calculate_model_checksum(model_name)
  cached = cache_service.load_metadata["models"][model_name]

  return "new model" unless cached
  return "model file changed" if current["model_file"] != cached["model_file"]
  return "schema changed" if current["table_schema"] != cached["table_schema"]
  "unknown change"
end
```

### **2.2 Enhanced CLI Feedback (15 minutes)**

```ruby
# Add cache statistics to display_execution_summary
def display_execution_summary(result)
  summary = result[:summary]

  shell&.say "\n🏁 Generation Summary:", :blue
  shell&.say "  📈 Models generated: #{summary[:total_models]}", :green
  shell&.say "  💾 Models cached: #{result[:cached_models]&.length || 0}", :blue
  shell&.say "  📄 Files created: #{summary[:total_files]}", :green
  shell&.say "  ⏱️  Execution time: #{summary[:execution_time]}s", :cyan

  # Cache performance
  if result[:cached_models]&.any?
    cache_ratio = (result[:cached_models].length.to_f / (result[:cached_models].length + summary[:total_models]) * 100).round(1)
    shell&.say "  🚀 Cache hit ratio: #{cache_ratio}%", :magenta
  end
end
```

---

## **Phase 3: Smart Cache Logic** ⏱️ **1-2 hours**

### **3.1 Dependency Change Detection (45 minutes)**

```ruby
# Add to ZeroGeneratorCache
def self.analyze_changes
  current_global = calculate_global_checksums
  cached_metadata = load_metadata
  cached_global = cached_metadata["global_dependencies"]

  changes = []

  current_global.each do |key, current_checksum|
    cached_checksum = cached_global[key]
    if current_checksum != cached_checksum
      changes << {
        type: :global,
        component: key,
        impact: global_change_impact(key)
      }
    end
  end

  changes
end

def self.global_change_impact(component)
  case component
  when "schema_rb" then "All models (schema structure changed)"
  when "templates_combined" then "All models (template changes)"
  when "migrations_combined" then "Database structure may have changed"
  when "generator_version" then "Generator logic updated"
  else "Unknown impact"
  end
end
```

### **3.2 Relationship Change Cascade (45 minutes)**

```ruby
# Add relationship-aware cache invalidation
def self.invalidate_related_models(changed_model)
  # Find models that have relationships to the changed model
  # This would require schema analysis to find foreign keys
  # For now, implement simple table-name-based detection

  metadata = load_metadata
  related_models = find_related_models(changed_model)

  related_models.each do |model_name|
    metadata["models"].delete(model_name)
  end

  save_metadata(metadata)
end

def self.find_related_models(model_name)
  # Simple implementation: find models that might reference this one
  table_name = model_name.pluralize

  # Look for foreign key patterns
  ActiveRecord::Base.connection.tables.select do |other_table|
    next if other_table == table_name

    columns = ActiveRecord::Base.connection.columns(other_table)
    columns.any? { |col| col.name == "#{model_name.underscore}_id" }
  end.map(&:singularize)
end
```

---

## **Phase 4: Testing & Polish** ⏱️ **1-2 hours**

### **4.1 Comprehensive Tests (60 minutes)**

**Location**: `test/lib/generators/zero/active_models/zero_generator_cache_test.rb`

```ruby
require "test_helper"

class ZeroGeneratorCacheTest < ActiveSupport::TestCase
  def setup
    @cache_dir = Rails.root.join("tmp", "test_zero_cache")
    @original_cache_dir = Zero::Generators::ZeroGeneratorCache::CACHE_DIR
    Zero::Generators::ZeroGeneratorCache.const_set(:CACHE_DIR, @cache_dir)

    FileUtils.rm_rf(@cache_dir) if @cache_dir.exist?
  end

  def teardown
    FileUtils.rm_rf(@cache_dir) if @cache_dir.exist?
    Zero::Generators::ZeroGeneratorCache.const_set(:CACHE_DIR, @original_cache_dir)
  end

  test "empty metadata structure" do
    metadata = Zero::Generators::ZeroGeneratorCache.empty_metadata

    assert_equal "1.0.0", metadata["version"]
    assert_nil metadata["last_generated"]
    assert_equal({}, metadata["global_dependencies"])
    assert_equal({}, metadata["models"])
  end

  test "global checksum calculation" do
    checksums = Zero::Generators::ZeroGeneratorCache.calculate_global_checksums

    assert checksums["schema_rb"]
    assert checksums["templates_combined"]
    assert checksums["migrations_combined"]
    assert checksums["generator_version"]
  end

  test "needs full regeneration on first run" do
    assert Zero::Generators::ZeroGeneratorCache.needs_full_regeneration?
  end

  test "cache hit after save" do
    # Save current state
    metadata = Zero::Generators::ZeroGeneratorCache.empty_metadata
    metadata["global_dependencies"] = Zero::Generators::ZeroGeneratorCache.calculate_global_checksums
    Zero::Generators::ZeroGeneratorCache.save_metadata(metadata)

    # Should not need regeneration
    refute Zero::Generators::ZeroGeneratorCache.needs_full_regeneration?
  end

  test "corrupted cache handling" do
    # Write invalid JSON
    FileUtils.mkdir_p(@cache_dir)
    File.write(@cache_dir.join("checksums.json"), "invalid json{")

    # Should gracefully handle corruption
    metadata = Zero::Generators::ZeroGeneratorCache.load_metadata
    assert_equal Zero::Generators::ZeroGeneratorCache.empty_metadata, metadata
  end
end
```

### **4.2 Performance Benchmarks (30 minutes)**

```ruby
# Add to existing test suite
test "cache performance benchmark" do
  # Benchmark checksum calculation
  time = Benchmark.realtime do
    100.times { Zero::Generators::ZeroGeneratorCache.calculate_global_checksums }
  end

  assert time < 1.0, "Checksum calculation too slow: #{time}s for 100 iterations"
end

test "cache file operations performance" do
  metadata = Zero::Generators::ZeroGeneratorCache.empty_metadata

  # Benchmark save/load cycle
  time = Benchmark.realtime do
    50.times do
      Zero::Generators::ZeroGeneratorCache.save_metadata(metadata)
      Zero::Generators::ZeroGeneratorCache.load_metadata
    end
  end

  assert time < 0.5, "Cache file operations too slow: #{time}s for 50 cycles"
end
```

---

## **Implementation Schedule**

### **Week 1: MVP Implementation (6 hours)**
- **Day 1**: Phase 1 - Core cache infrastructure (3 hours)
- **Day 2**: Phase 2 - Basic generator integration (3 hours)
- **Testing**: Basic cache hit/miss scenarios

### **Week 2: Smart Logic (4 hours)**
- **Day 3**: Phase 3 - Dependency detection and cascade logic (2 hours)
- **Day 4**: Phase 4 - Comprehensive testing (2 hours)

### **Week 3: Polish & Documentation (2 hours)**
- **Day 5**: Performance optimization and edge cases (1 hour)
- **Day 6**: Documentation and troubleshooting guide (1 hour)

---

## **Expected Performance Impact**

### **Before Implementation:**
```bash
RAILS_ENV=development bin/rails generate zero:active_models
# First run:  21.46s
# Second run: 21.46s (no caching)
```

### **After Implementation:**
```bash
RAILS_ENV=development bin/rails generate zero:active_models
# First run:   21.48s (12ms cache overhead)
# Second run:  0.012s (99.94% time savings!)
# Partial:     ~3-5s (only changed models regenerated)
```

### **Cache Statistics Output:**
```
🏁 Generation Summary:
  📈 Models generated: 2
  💾 Models cached: 12
  📄 Files created: 6
  ⏱️  Execution time: 3.24s
  🚀 Cache hit ratio: 85.7%

💾 Cache Performance:
  🔍 Dependency scan: 12ms
  ✅ Cache hits: 12 models
  🔄 Cache updates: 2 models
```

---

## **Risk Mitigation**

### **Graceful Degradation:**
- Corrupted cache → Start fresh (no errors)
- Missing files → Full regeneration
- Permission issues → Fallback to no caching

### **Cache Invalidation Safety:**
- Conservative approach: When in doubt, regenerate
- Global changes → Force full regeneration
- Unknown changes → Regenerate affected models

### **Debugging Support:**
- Clear cache command: `rm -rf tmp/zero_generators/`
- Verbose mode: `--cache-debug` flag for troubleshooting
- Cache analysis: Show what triggered regeneration

---

## **Success Metrics**

1. **Performance**: 90%+ time savings for unchanged models
2. **Reliability**: 0% false cache hits (missed changes)
3. **Usability**: Clear feedback about cache decisions
4. **Maintainability**: Simple debugging and troubleshooting

**Total Implementation Effort: 6-12 hours over 1-3 weeks**
**Expected ROI: Massive daily productivity improvement for development workflow** 🚀
