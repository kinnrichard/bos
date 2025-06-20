# frozen_string_literal: true

module Views
  module Sessions
    class NewView < Views::Base
      def initialize(return_to: nil)
        @return_to = return_to
      end

      def view_template
        render_layout(
          title: "Sign In",
          hide_sidebar: true,
          current_user: nil
        ) do
          div(class: "auth-container") do
            div(class: "auth-box") do
              div(class: "auth-logo") do
                img(src: asset_path("faultless_logo.png"), alt: "Logo", class: "auth-logo-image")
              end
              
              h1(class: "auth-title") { "Sign In" }
              
              # Display flash messages
              if helpers.flash[:alert]
                div(class: "alert alert-error") { helpers.flash[:alert] }
              end
              if helpers.flash[:notice]
                div(class: "alert alert-success") { helpers.flash[:notice] }
              end
              
              form(action: login_path, method: "post", class: "auth-form", data: { turbo: false }) do
                input(type: "hidden", name: "authenticity_token", value: helpers.form_authenticity_token)
                input(type: "hidden", name: "return_to", value: @return_to) if @return_to
                
                div(class: "form-group") do
                  label(for: "email", class: "form-label") { "Email" }
                  input(
                    type: "email",
                    id: "email",
                    name: "email",
                    class: "form-input",
                    required: true,
                    autofocus: true,
                    placeholder: "your@email.com"
                  )
                end
                
                div(class: "form-group") do
                  label(for: "password", class: "form-label") { "Password" }
                  input(
                    type: "password",
                    id: "password",
                    name: "password",
                    class: "form-input",
                    required: true,
                    placeholder: "••••••••"
                  )
                end
                
                button(type: "submit", class: "btn btn-primary btn-full") { "Sign In" }
              end
            end
          end
        end
      end
    end
  end
end