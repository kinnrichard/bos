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
            unsafe_raw(helpers.csrf_meta_tags)
            unsafe_raw(helpers.csp_meta_tag)
            
            unsafe_raw(helpers.stylesheet_link_tag("application", "data-turbo-track": "reload"))
            unsafe_raw(helpers.javascript_importmap_tags)
            
            # Allow additional head content
            if helpers.content_for?(:head)
              unsafe_raw(helpers.content_for(:head))
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
        if helpers.current_user
          attrs[:resort_tasks_on_status_change] = helpers.current_user.resort_tasks_on_status_change
        end
        attrs
      end
    end
  end
end