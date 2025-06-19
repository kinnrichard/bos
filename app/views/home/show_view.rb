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
            
            link(rel: "stylesheet", href: "/assets/application-937da5d6.css")
          end

          body do
            div(class: "main-container") do
              render Components::Sidebar.new(
                current_user: @current_user,
                active_section: :home
              )

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