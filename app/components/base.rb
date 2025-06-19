# frozen_string_literal: true

class Components::Base < Phlex::HTML
  # Include any helpers you want to be available across all components
  include Phlex::Rails::Helpers::Routes
  
  # Register Rails helpers
  register_output_helper :csrf_meta_tags
  register_output_helper :csp_meta_tag  
  register_output_helper :stylesheet_link_tag
  register_output_helper :javascript_importmap_tags

  if Rails.env.development?
    def before_template
      comment { "Before #{self.class.name}" }
      super
    end
  end
end