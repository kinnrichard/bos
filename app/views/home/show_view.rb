# frozen_string_literal: true

module Views
  module Home
    class ShowView < Views::Base
      def initialize(current_user:)
        @current_user = current_user
      end

      def view_template
        doctype
        html(lang: "en") do
          head do
            title { "Faultless - Case Management" }
            meta(name: "viewport", content: "width=device-width,initial-scale=1")
            meta(name: "view-transition", content: "same-origin")
            
            link(rel: "stylesheet", href: "/assets/application-4c829d28.css")
            script(type: "importmap") do
              plain %{
                {
                  "imports": {
                    "application": "/assets/application-d61e794c.js",
                    "@hotwired/stimulus": "/assets/stimulus.min-4b1e420e.js",
                    "@hotwired/stimulus-loading": "/assets/stimulus-loading-1fc53fe7.js",
                    "controllers/application": "/assets/controllers/application-3affb389.js",
                    "controllers/hello_controller": "/assets/controllers/hello_controller-708796bd.js",
                    "controllers/popover_controller": "/assets/controllers/popover_controller-587e1e9d.js",
                    "controllers/sidebar_controller": "/assets/controllers/sidebar_controller-09bf1c76.js",
                    "controllers": "/assets/controllers/index-ee64e1f1.js",
                    "@hotwired/stimulus-autoloader": "/assets/stimulus-autoloader-9d447422.js"
                  }
                }
              }
            end
            script(type: "module") { plain "import 'application'" }
          end

          body do
            div(class: "main-container", data: { controller: "sidebar" }) do
              div(class: "sidebar", data: { sidebar_target: "sidebar" }) do
                render Components::Sidebar.new(
                  current_user: @current_user,
                  active_section: :home
                )
              end

              div(class: "main-content") do
                render Components::Header.new(current_user: @current_user)

                div(class: "content") do
                  render Components::EmptyState.new(user: @current_user)
                end
              end
            end
          end
        end
      end
    end
  end
end