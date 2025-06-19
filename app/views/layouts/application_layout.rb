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
            
            link(rel: "stylesheet", href: "/assets/application.css")
            unsafe_raw(helpers.javascript_importmap_tags)
            
            # Allow additional head content
            if helpers.content_for?(:head)
              unsafe_raw(helpers.content_for(:head))
            end
          end

          body do
            div(class: "main-container") do
              yield
            end
          end
        end
      end
    end
  end
end