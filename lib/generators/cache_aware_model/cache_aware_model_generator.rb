# frozen_string_literal: true

# Generator for creating models with automatic cache invalidation setup
#
# Usage:
#   rails generate cache_aware_model TaskComment task:belongs_to content:text
#   rails generate cache_aware_model JobNote job:belongs_to title:string body:text --touchable-config="skip_touch: [:job]"

class CacheAwareModelGenerator < Rails::Generators::NamedBase
  source_root File.expand_path("templates", __dir__)

  argument :attributes, type: :array, default: [], banner: "field[:type][:index] field[:type][:index]"

  class_option :touchable_config, type: :string, desc: "Custom touchable configuration"
  class_option :skip_tests, type: :boolean, default: false, desc: "Skip generating cache invalidation tests"

  def create_model_file
    template "model.rb.erb", File.join("app/models", "#{file_name}.rb")
  end

  def create_test_file
    return if options[:skip_tests]

    template "cache_invalidation_spec.rb.erb", File.join("spec/models", "#{file_name}_cache_invalidation_spec.rb")
  end

  def show_cache_guidance
    say ""
    say "🧪 Cache Invalidation Setup Complete!", :green
    say "=" * 50
    say ""

    if belongs_to_associations.any?
      say "✅ Belongs_to associations detected:", :green
      belongs_to_associations.each do |assoc|
        parent_model = assoc.name.to_s.classify
        if touchable_parent?(parent_model)
          say "   #{assoc.name} -> #{parent_model} (auto-touch enabled)", :green
        else
          say "   #{assoc.name} -> #{parent_model} (no auto-touch)", :yellow
        end
      end
      say ""
    end

    say "Next steps:", :blue
    say "1. Run: rails cache:audit"
    say "2. Review generated cache invalidation tests"
    say "3. Add custom invalidation rules if needed"
    say ""

    if complex_relationships?
      say "💡 Consider using CacheInvalidation DSL for complex relationships:", :yellow
      say ""
      say "   class #{class_name} < ApplicationRecord"
      say "     include CacheInvalidation"
      say "     "
      say "     invalidates_cache_for :job, if: :affects_display?"
      say "   end"
      say ""
    end
  end

  private

  def belongs_to_associations
    @belongs_to_associations ||= attributes.select { |attr| attr.type == :belongs_to }
  end

  def regular_attributes
    @regular_attributes ||= attributes.reject { |attr| attr.type == :belongs_to }
  end

  def touchable_parent?(model_name)
    %w[Job Client User Person Task].include?(model_name)
  end

  def touchable_config
    return nil unless options[:touchable_config]

    # Parse the touchable config option
    # Example: "skip_touch: [:job]" -> { skip_touch: [:job] }
    eval("{#{options[:touchable_config]}}")
  rescue
    say "Warning: Invalid touchable_config format. Use: skip_touch: [:association]", :yellow
    nil
  end

  def complex_relationships?
    # Suggest CacheInvalidation DSL if there are multiple belongs_to or potential complexity
    belongs_to_associations.count > 1 ||
      belongs_to_associations.any? { |assoc| !touchable_parent?(assoc.name.to_s.classify) }
  end

  def cache_test_scenarios
    scenarios = []

    belongs_to_associations.each do |assoc|
      parent_model = assoc.name.to_s.classify
      if touchable_parent?(parent_model)
        scenarios << {
          association: assoc.name,
          parent_model: parent_model,
          test_change: "title: 'Updated title'"
        }
      end
    end

    scenarios
  end
end
