# frozen_string_literal: true

class Components::Base < Phlex::HTML
  # Include any helpers you want to be available across all components
  include Phlex::Rails::Helpers::Routes
  include Phlex::Rails::Helpers::AssetPath
  include Phlex::Rails::Helpers::LinkTo
  include Phlex::Rails::Helpers::ButtonTo
  include IconsHelper

  # Register Rails helpers
  register_output_helper :csrf_meta_tags
  register_output_helper :csp_meta_tag
  register_output_helper :stylesheet_link_tag
  register_output_helper :javascript_importmap_tags
  register_value_helper :form_authenticity_token
  register_value_helper :flash
  register_value_helper :current_user
  register_value_helper :content_for
  register_value_helper :content_for?
  register_value_helper :cookies

  if Rails.env.development?
    def before_template
      comment { "Before #{self.class.name}" }
      super
    end
  end

  # BEM naming convention helpers

  # Get the component's base class name (block in BEM)
  def component_name
    @component_name ||= self.class.name.split("::").last.underscore.gsub("_component", "")
  end

  # Generate a BEM block class
  def bem_block(name = nil)
    name || component_name
  end

  # Generate a BEM element class
  def bem_element(element, block_name = nil)
    "#{bem_block(block_name)}__#{element}"
  end

  # Generate a BEM modifier class
  def bem_modifier(modifier, element = nil, block_name = nil)
    base = element ? bem_element(element, block_name) : bem_block(block_name)
    "#{base}--#{modifier}"
  end

  # Generate a complete set of BEM classes
  def bem_classes(block: nil, element: nil, modifiers: [], extra: [])
    classes = []

    if element
      classes << bem_element(element, block)
    else
      classes << bem_block(block)
    end

    modifiers = Array(modifiers)
    modifiers.each do |modifier|
      classes << bem_modifier(modifier, element, block)
    end

    classes.concat(Array(extra))
    classes.join(" ")
  end

  # Shorthand for css_class that uses BEM naming
  def css_class(element = nil, modifiers: [], extra: [])
    bem_classes(element: element, modifiers: modifiers, extra: extra)
  end
end
