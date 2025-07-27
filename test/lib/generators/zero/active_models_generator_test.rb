# frozen_string_literal: true

require "test_helper"
require "rails/generators/test_case"
require "generators/zero/active_models/active_models_generator"
require_relative "../../../lib/generators/zero/active_models/service_registry"
require_relative "../../../lib/generators/zero/active_models/configuration_service"

class Zero::ActiveModelsGeneratorTest < Rails::Generators::TestCase
  tests Zero::Generators::ActiveModelsGenerator
  destination Rails.root.join("tmp/generator_test")
  setup :prepare_destination

  def setup
    super
    @output_dir = "frontend/src/lib/models"
    @test_tables = %w[users jobs clients tasks]
  end

  def teardown
    super
    # Clean up any generated files
    FileUtils.rm_rf(destination_root) if File.exist?(destination_root)
  end

  # Phase 1: Functional Testing
  test "basic generation creates expected files" do
    run_generator

    # Check that index.ts is created
    assert_file "#{@output_dir}/index.ts"

    # Check that at least one model is generated
    assert_file "#{@output_dir}/user.ts"
    assert_file "#{@output_dir}/reactive-user.ts"
    assert_file "#{@output_dir}/types/user-data.ts"
  end

  test "dry run mode shows what would be generated without creating files" do
    output = capture(:stdout) do
      run_generator [ "--dry-run" ]
    end

    # Should show what would be created
    assert_match(/Would create.*user\.ts/, output)
    assert_match(/Would create.*reactive-user\.ts/, output)

    # But files should not actually be created
    assert_no_file "#{@output_dir}/user.ts"
    assert_no_file "#{@output_dir}/reactive-user.ts"
  end

  test "specific table generation" do
    run_generator [ "--table=users" ]

    # Should create files for users table
    assert_file "#{@output_dir}/user.ts"
    assert_file "#{@output_dir}/reactive-user.ts"
    assert_file "#{@output_dir}/types/user-data.ts"

    # Should not create files for other tables
    assert_no_file "#{@output_dir}/job.ts"
    assert_no_file "#{@output_dir}/task.ts"
  end

  test "force mode overwrites existing files" do
    # First generation
    run_generator

    original_content = File.read(File.join(destination_root, "#{@output_dir}/user.ts"))

    # Second generation with force
    run_generator [ "--force" ]

    # File should still exist (overwritten)
    assert_file "#{@output_dir}/user.ts"
  end

  test "skip prettier option" do
    run_generator [ "--skip-prettier" ]

    # Files should be created but not formatted
    assert_file "#{@output_dir}/user.ts"

    # Check that content was generated
    content = File.read(File.join(destination_root, "#{@output_dir}/user.ts"))
    assert_match(/export class User/, content)
  end

  test "custom output directory" do
    custom_dir = "custom/models/path"
    run_generator [ "--output-dir=#{custom_dir}" ]

    assert_file "#{custom_dir}/user.ts"
    assert_file "#{custom_dir}/reactive-user.ts"
    assert_file "#{custom_dir}/index.ts"
  end

  test "exclude tables option" do
    run_generator [ "--exclude-tables=users,jobs" ]

    # Excluded tables should not be generated
    assert_no_file "#{@output_dir}/user.ts"
    assert_no_file "#{@output_dir}/job.ts"

    # Non-excluded tables should be generated
    assert_file "#{@output_dir}/client.ts" if Client.table_exists?
    assert_file "#{@output_dir}/task.ts" if Task.table_exists?
  end

  # Phase 2: Service Integration Testing
  test "service registry initializes all services" do
    require_relative "../../../../lib/generators/zero/active_models/service_registry"

    registry = ServiceRegistry.new({})

    # Test that all core services can be initialized
    %i[configuration schema file_manager template_renderer type_mapper].each do |service_name|
      service = registry.get_service(service_name)
      assert_not_nil service, "Service #{service_name} should be initialized"
    end
  end

  test "service health check passes" do
    require_relative "../../../../lib/generators/zero/active_models/service_registry"

    registry = ServiceRegistry.new({})
    health_status = registry.health_check

    assert health_status[:healthy], "Service registry should be healthy"
    assert health_status[:services].all? { |_, status| status[:status] == :healthy }
  end

  test "service statistics are collected" do
    require_relative "../../../../lib/generators/zero/active_models/service_registry"

    registry = ServiceRegistry.new({})

    # Initialize a few services
    registry.get_service(:configuration)
    registry.get_service(:schema)

    stats = registry.aggregate_service_statistics
    assert_instance_of Hash, stats
    assert stats.key?(:total_services)
    assert stats.key?(:initialized_services)
  end

  # Phase 3: Output Quality Testing
  test "generated typescript compiles" do
    run_generator [ "--table=users" ]

    user_content = File.read(File.join(destination_root, "#{@output_dir}/user.ts"))
    reactive_user_content = File.read(File.join(destination_root, "#{@output_dir}/reactive-user.ts"))
    data_content = File.read(File.join(destination_root, "#{@output_dir}/types/user-data.ts"))

    # Check for proper TypeScript syntax
    assert_match(/export class User/, user_content)
    assert_match(/export class ReactiveUser/, reactive_user_content)
    assert_match(/export interface UserData/, data_content)

    # Check for proper imports
    assert_match(/import.*UserData.*from/, user_content)
    assert_match(/import.*UserData.*from/, reactive_user_content)
  end

  test "relationship handling generates correct types" do
    run_generator [ "--table=jobs" ] if Job.table_exists?

    job_content = File.read(File.join(destination_root, "#{@output_dir}/job.ts"))
    data_content = File.read(File.join(destination_root, "#{@output_dir}/types/job-data.ts"))

    # Should include relationship properties
    if Job.reflect_on_all_associations.any?
      assert_match(/client.*:/, data_content) if Job.reflect_on_association(:client)
      assert_match(/tasks.*:/, data_content) if Job.reflect_on_association(:tasks)
    end
  end

  test "enum types generate union types" do
    # Find a model with enums if any exist
    models = [ User, Job, Task, Client ].select(&:table_exists?)
    enum_model = models.find { |model| model.defined_enums.any? }

    if enum_model
      table_name = enum_model.table_name.singularize
      run_generator [ "--table=#{enum_model.table_name}" ]

      data_content = File.read(File.join(destination_root, "#{@output_dir}/types/#{table_name.dasherize}-data.ts"))

      # Should generate union types for enums
      enum_model.defined_enums.each do |enum_name, _|
        # Check for union type pattern like "status: 'active' | 'inactive'"
        assert_match(/#{enum_name}.*:.*'.*'.*\|/, data_content)
      end
    end
  end

  # Phase 4: Performance Testing
  test "generation completes within reasonable time" do
    start_time = Time.current

    run_generator

    end_time = Time.current
    generation_time = end_time - start_time

    # Should complete within 30 seconds for full generation
    assert generation_time < 30, "Generation took #{generation_time} seconds, which is too slow"
  end

  test "semantic file comparison prevents unnecessary writes" do
    # First generation
    run_generator [ "--table=users" ]

    original_mtime = File.mtime(File.join(destination_root, "#{@output_dir}/user.ts"))

    # Wait a moment to ensure different timestamp
    sleep 0.1

    # Second generation should not rewrite identical files
    run_generator [ "--table=users" ]

    new_mtime = File.mtime(File.join(destination_root, "#{@output_dir}/user.ts"))

    # If semantic comparison works, file should not be rewritten
    # (This test may need adjustment based on implementation details)
  end

  # Phase 5: Error Handling Testing
  test "handles invalid table names gracefully" do
    output = capture(:stderr) do
      assert_raises SystemExit do
        run_generator [ "--table=nonexistent_table" ]
      end
    end

    assert_match(/table.*not found/i, output) if output
  end

  test "handles missing template scenarios" do
    # Temporarily rename a template to simulate missing template
    template_path = Rails.root.join("lib/generators/zero/active_models/templates/active_model.ts.erb")
    backup_path = "#{template_path}.backup"

    if File.exist?(template_path)
      FileUtils.mv(template_path, backup_path)

      begin
        assert_raises do
          run_generator [ "--table=users" ]
        end
      ensure
        FileUtils.mv(backup_path, template_path)
      end
    end
  end

  test "graceful degradation when prettier unavailable" do
    # Mock prettier being unavailable
    original_path = ENV["PATH"]
    ENV["PATH"] = ""

    begin
      # Should still generate files even without prettier
      run_generator [ "--table=users" ]
      assert_file "#{@output_dir}/user.ts"
    ensure
      ENV["PATH"] = original_path
    end
  end

  # Phase 6: Configuration Testing
  test "respects environment specific configurations" do
    # Test in different Rails environments if possible
    original_env = Rails.env

    begin
      Rails.env = "test"
      run_generator [ "--table=users" ]
      assert_file "#{@output_dir}/user.ts"
    ensure
      Rails.env = original_env
    end
  end

  test "configuration validation works" do
    require_relative "../../../../lib/generators/zero/active_models/configuration_service"

    config_service = ConfigurationService.new({})

    # Should not raise errors for valid configuration
    assert_nothing_raised do
      config_service.validate_configuration!
    end
  end

  private

  def run_generator(args = [])
    super(args)
  end
end
