# frozen_string_literal: true

module Views
  module Layouts
    class ApplicationLayout < Phlex::HTML
      include Phlex::Rails::Layout

      def template
        doctype
        html(lang: "en") do
          head do
            title { "Faultless - Case Management" }
            meta(name: "viewport", content: "width=device-width,initial-scale=1")
            meta(name: "view-transition", content: "same-origin")
            csrf_meta_tags
            csp_meta_tag
            
            stylesheet_link_tag("application", "data-turbo-track": "reload")
            javascript_importmap_tags
            
            # Allow additional head content
            if content_for?(:head)
              unsafe_raw(content_for(:head))
            end
          end

          body(data: body_data_attributes) do
            div(class: "main-container") do
              yield
            end
          end
        end
      end
      
      private
      
      def body_data_attributes
        attrs = {}
        if current_user
          attrs[:resort_tasks_on_status_change] = current_user.resort_tasks_on_status_change
        end
        attrs
      end
    end
  end
end