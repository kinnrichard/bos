# frozen_string_literal: true

require "test_helper"
require "tempfile"
require "fileutils"
require "json"
require "pathname"
require "mocha/minitest"
require "generators/zero/active_models/file_manager"

module Zero
  module Generators
    class FileManagerTest < ActiveSupport::TestCase
      def setup
        @temp_dir = Dir.mktmpdir
        @output_dir = File.join(@temp_dir, "output")
        @frontend_dir = File.join(@temp_dir, "frontend")

        # Create simple shell mock that doesn't interfere
        @shell = Object.new
        def @shell.say_status(*args); end

        # Setup basic options
        @options = {
          dry_run: false,
          skip_prettier: false,
          force: false
        }

        # Setup Rails.root mock with Pathname for compatibility
        Rails.stubs(:root).returns(Pathname.new(@temp_dir))

        @file_manager = FileManager.new(@options, @shell, @output_dir)
      end

      def teardown
        FileUtils.rm_rf(@temp_dir) if @temp_dir && Dir.exist?(@temp_dir)
      end

      # =============================================================================
      # Core Functionality Tests
      # =============================================================================

      test "writes new file successfully" do
        content = "export interface User { id: number; }"
        file_path = @file_manager.write_with_formatting("models/user.ts", content, format: false)

        assert File.exist?(file_path)
        assert_equal content, File.read(file_path).strip
        assert_equal 1, @file_manager.statistics[:created]
      end

      test "skips file when content is identical" do
        content = "export interface User { id: number; }"

        # First write
        @file_manager.write_with_formatting("models/user.ts", content, format: false)

        # Second write with identical content
        @file_manager.write_with_formatting("models/user.ts", content, format: false)

        assert_equal 1, @file_manager.statistics[:created]
        assert_equal 1, @file_manager.statistics[:identical]
      end

      test "force option bypasses semantic comparison" do
        @options[:force] = true
        content = "export interface User { id: number; }"

        # First write
        @file_manager.write_with_formatting("models/user.ts", content, format: false)

        # Second write should create file again due to force option
        @file_manager.write_with_formatting("models/user.ts", content, format: false)

        assert_equal 2, @file_manager.statistics[:created]
        assert_equal 0, @file_manager.statistics[:identical]
      end

      test "dry run mode doesn't create actual files" do
        @options[:dry_run] = true
        content = "export interface User { id: number; }"

        file_path = @file_manager.write_with_formatting("models/user.ts", content)

        assert_not File.exist?(file_path)
        assert_equal 1, @file_manager.statistics[:created]
      end

      # =============================================================================
      # Directory Management Tests
      # =============================================================================

      test "creates directories when they don't exist" do
        new_dir = File.join(@temp_dir, "new_directory")

        result = @file_manager.ensure_directory_exists(new_dir)

        assert result
        assert Dir.exist?(new_dir)
        assert_equal 1, @file_manager.statistics[:directories_created]
      end

      test "handles existing directories gracefully" do
        existing_dir = @temp_dir

        result = @file_manager.ensure_directory_exists(existing_dir)

        assert result
        assert_equal 0, @file_manager.statistics[:directories_created]
      end

      test "handles directory creation errors" do
        invalid_path = "/root/cannot_create_here"

        result = @file_manager.ensure_directory_exists(invalid_path)

        assert_not result
        assert_equal 1, @file_manager.statistics[:errors]
      end

      # =============================================================================
      # Frontend Detection Tests
      # =============================================================================

      test "detects frontend root when package.json exists" do
        create_package_json(@frontend_dir)

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert_equal @frontend_dir, file_manager.frontend_root
      end

      test "tries alternative frontend directories" do
        client_dir = File.join(@temp_dir, "client")
        create_package_json(client_dir)

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert_equal client_dir, file_manager.frontend_root
      end

      test "returns nil when no frontend directory found" do
        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert_nil file_manager.frontend_root
      end

      # =============================================================================
      # Prettier Detection Tests
      # =============================================================================

      test "detects prettier in dependencies" do
        create_package_json(@frontend_dir, dependencies: { "prettier" => "^2.0.0" })

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert file_manager.send(:prettier_available?)
      end

      test "detects prettier in devDependencies" do
        create_package_json(@frontend_dir, dev_dependencies: { "prettier" => "^2.0.0" })

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert file_manager.send(:prettier_available?)
      end

      test "prettier not available when not in package.json" do
        create_package_json(@frontend_dir)

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert_not file_manager.send(:prettier_available?)
      end

      # =============================================================================
      # Content Normalization Tests
      # =============================================================================

      test "content normalizer removes timestamp patterns" do
        normalizer = FileManager::ContentNormalizer.new

        content_with_timestamps = <<~CONTENT
          // Auto-generated: 2024-01-01 12:00:00 UTC
          export interface User {
            id: number;
          }
          // Generated from Rails schema: 2024-01-01 12:00:00 UTC
        CONTENT

        expected = <<~CONTENT.strip
          export interface User {
            id: number;
          }
        CONTENT

        result = normalizer.normalize(content_with_timestamps)
        assert_equal expected, result
      end

      test "content normalizer preserves non-timestamp content" do
        normalizer = FileManager::ContentNormalizer.new

        content = <<~CONTENT
          export interface User {
            id: number;
            name: string;
            // Regular comment that should be preserved
          }
        CONTENT

        result = normalizer.normalize(content)
        assert_equal content.strip, result
      end

      # =============================================================================
      # Semantic Comparison Tests
      # =============================================================================

      test "semantic comparator identifies identical content ignoring timestamps" do
        comparator = FileManager::SemanticContentComparator.new

        original_content = <<~CONTENT
          // Generated: 2024-01-01 12:00:00 UTC
          export interface User { id: number; }
        CONTENT

        new_content = <<~CONTENT
          // Generated: 2024-01-02 14:30:00 UTC
          export interface User { id: number; }
        CONTENT

        temp_file = Tempfile.new([ "test", ".ts" ])
        temp_file.write(original_content)
        temp_file.close

        result = comparator.identical?(temp_file.path, new_content)

        assert result

        temp_file.unlink
      end

      test "semantic comparator detects different content" do
        comparator = FileManager::SemanticContentComparator.new

        original_content = "export interface User { id: number; }"
        new_content = "export interface User { id: string; }"

        temp_file = Tempfile.new([ "test", ".ts" ])
        temp_file.write(original_content)
        temp_file.close

        result = comparator.identical?(temp_file.path, new_content)

        assert_not result

        temp_file.unlink
      end

      test "semantic comparator handles missing files" do
        comparator = FileManager::SemanticContentComparator.new

        result = comparator.identical?("/nonexistent/file.ts", "content")

        assert_not result
      end

      # =============================================================================
      # Smart File Creator Tests
      # =============================================================================

      test "smart file creator creates file when content differs" do
        comparator = FileManager::SemanticContentComparator.new
        creator = FileManager::SmartFileCreator.new(comparator, @shell)
        file_path = File.join(@temp_dir, "test.ts")

        result = creator.create_or_skip(file_path, "export interface User {}")

        assert_equal :created, result
        assert File.exist?(file_path)
      end

      test "smart file creator skips when content is identical" do
        comparator = FileManager::SemanticContentComparator.new
        creator = FileManager::SmartFileCreator.new(comparator, @shell)
        file_path = File.join(@temp_dir, "test.ts")
        content = "export interface User {}"

        # Create file first
        File.write(file_path, content)

        result = creator.create_or_skip(file_path, content)

        assert_equal :identical, result
      end

      test "smart file creator handles write errors" do
        comparator = FileManager::SemanticContentComparator.new
        creator = FileManager::SmartFileCreator.new(comparator, @shell)
        invalid_path = "/root/cannot_write_here.ts"

        result = creator.create_or_skip(invalid_path, "content")

        assert_equal :error, result
      end

      # =============================================================================
      # Prettier Integration Tests
      # =============================================================================

      test "should format TypeScript files when prettier available" do
        create_package_json(@frontend_dir, dependencies: { "prettier" => "^2.0.0" })
        file_manager = FileManager.new(@options, @shell, @output_dir)

        ts_file = File.join(@temp_dir, "test.ts")
        result = file_manager.send(:should_format?, ts_file)

        assert result
      end

      test "should not format non-TypeScript files" do
        create_package_json(@frontend_dir, dependencies: { "prettier" => "^2.0.0" })
        file_manager = FileManager.new(@options, @shell, @output_dir)

        txt_file = File.join(@temp_dir, "test.txt")
        result = file_manager.send(:should_format?, txt_file)

        assert_not result
      end

      test "should not format when skip_prettier option is true" do
        @options[:skip_prettier] = true
        create_package_json(@frontend_dir, dependencies: { "prettier" => "^2.0.0" })
        file_manager = FileManager.new(@options, @shell, @output_dir)

        ts_file = File.join(@temp_dir, "test.ts")
        result = file_manager.send(:should_format?, ts_file)

        assert_not result
      end

      # =============================================================================
      # Statistics Management Tests
      # =============================================================================

      test "reset statistics clears all counters" do
        # Manually set some statistics
        @file_manager.statistics[:created] = 5
        @file_manager.statistics[:identical] = 3

        result = @file_manager.reset_statistics

        assert_equal 0, result[:created]
        assert_equal 0, result[:identical]
        assert_equal 0, result[:errors]
      end

      test "semantic comparison enabled returns correct values" do
        # Default options (not force, not dry_run)
        assert @file_manager.semantic_comparison_enabled?

        # Force mode disables semantic comparison
        @options[:force] = true
        assert_not @file_manager.semantic_comparison_enabled?

        # Dry run mode disables semantic comparison
        @options[:force] = false
        @options[:dry_run] = true
        assert_not @file_manager.semantic_comparison_enabled?
      end

      # =============================================================================
      # Always Create Comparator Tests
      # =============================================================================

      test "always create comparator always returns false" do
        comparator = FileManager::AlwaysCreateComparator.new

        result = comparator.identical?("any_path", "any_content")

        assert_not result
      end

      # =============================================================================
      # Edge Cases Tests
      # =============================================================================

      test "handles malformed package.json gracefully" do
        # Create invalid JSON
        FileUtils.mkdir_p(@frontend_dir)
        File.write(File.join(@frontend_dir, "package.json"), "{ invalid json")

        file_manager = FileManager.new(@options, @shell, @output_dir)

        assert_not file_manager.send(:prettier_available?)
      end

      test "handles nested directory creation" do
        nested_path = "deeply/nested/directory/structure/file.ts"
        content = "export interface Nested {}"

        file_path = @file_manager.write_with_formatting(nested_path, content, format: false)

        assert File.exist?(file_path)
        assert_equal content, File.read(file_path).strip
      end

      test "tracks multiple file operations correctly" do
        # Create two different files
        @file_manager.write_with_formatting("models/user.ts", "interface User {}", format: false)
        @file_manager.write_with_formatting("models/post.ts", "interface Post {}", format: false)

        # Try to create user.ts again (should be identical)
        @file_manager.write_with_formatting("models/user.ts", "interface User {}", format: false)

        stats = @file_manager.statistics
        assert_equal 2, stats[:created]
        assert_equal 1, stats[:identical]
        assert_equal 0, stats[:errors]
      end

      test "handles special characters in file paths and content" do
        special_content = "// Special chars: &<>\"'#{}\nexport interface Special {}"

        file_path = @file_manager.write_with_formatting(
          "special/special-chars.ts",
          special_content,
          format: false
        )

        assert File.exist?(file_path)
        assert_includes File.read(file_path), special_content
      end

      private

      def create_package_json(dir, dependencies: {}, dev_dependencies: {})
        FileUtils.mkdir_p(dir)

        package_json = {
          "name" => "test-project",
          "version" => "1.0.0"
        }

        package_json["dependencies"] = dependencies if dependencies.any?
        package_json["devDependencies"] = dev_dependencies if dev_dependencies.any?

        File.write(File.join(dir, "package.json"), JSON.pretty_generate(package_json))
      end
    end
  end
end
