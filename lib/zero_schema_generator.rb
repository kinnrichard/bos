# frozen_string_literal: true

module ZeroSchemaGenerator
  autoload :RailsSchemaIntrospector, "zero_schema_generator/rails_schema_introspector"
  autoload :TypeMapper, "zero_schema_generator/type_mapper"
  autoload :Generator, "zero_schema_generator/generator"
  autoload :Config, "zero_schema_generator/config"

  class << self
    def generate_schema(config_path: nil)
      config = Config.load_from_file(config_path)
      generator = Generator.new(config.to_hash["zero_generator"])
      generator.generate_schema
    end

    def validate_schema(schema_path = nil)
      config = Config.load_from_file
      schema_path ||= config.schema_path

      unless File.exist?(schema_path)
        return {
          valid: false,
          errors: [ "Schema file not found at #{schema_path}" ]
        }
      end

      schema_content = File.read(schema_path)
      Generator.validate_schema(schema_content)
    end

    def create_sample_config(output_path = nil)
      output_path ||= Rails.root.join("config", "zero_generator.yml")

      config = Config.new
      # Add some example customizations
      config.type_overrides = {
        "jobs.status" => "string()",
        "tasks.position" => "number()"
      }

      config.field_mappings = {
        "notes.notable" => {
          "strategy" => "union_types",
          "types" => %w[job task client]
        }
      }

      config.save_to_file(output_path)
      puts "Sample configuration created at #{output_path}"
    end
  end
end
