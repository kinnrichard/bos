# frozen_string_literal: true

module Views
  module Clients
    class NewView < Views::Base
      def initialize(client:, current_user:, authenticity_token: nil)
        @client = client
        @current_user = current_user
        @authenticity_token = authenticity_token
      end

      def view_template
        render_layout(
          title: "New Client - Faultless",
          current_user: @current_user,
          active_section: :clients
        ) do
          render Components::Forms::FormContainerComponent.new(title: "New Client") do
            form(action: "/clients", method: "post", class: "client-form") do
              # CSRF token
              input(type: "hidden", name: "authenticity_token", value: @authenticity_token)

              # Name field
              div(class: "form-group") do
                label(for: "client_name", class: "form-label") { "Name" }
                input(
                  type: "text",
                  name: "client[name]",
                  id: "client_name",
                  value: @client.name,
                  class: "form-input",
                  required: true,
                  autofocus: true
                )
              end

              # Client type selection
              div(class: "form-group") do
                label(class: "form-label") { "Client Type" }
                div(class: "client-type-selector") do
                  label(class: "client-type-option") do
                    input(
                      type: "radio",
                      name: "client[client_type]",
                      value: "residential",
                      checked: @client.residential? || @client.client_type.nil?,
                      class: "client-type-radio"
                    )
                    span(class: "client-type-label") do
                      span(class: "client-type-icon") { client_type_icon("residential") }
                      span { "Residential" }
                    end
                  end

                  label(class: "client-type-option") do
                    input(
                      type: "radio",
                      name: "client[client_type]",
                      value: "business",
                      checked: @client.business?,
                      class: "client-type-radio"
                    )
                    span(class: "client-type-label") do
                      span(class: "client-type-icon") { client_type_icon("business") }
                      span { "Business" }
                    end
                  end
                end
              end

              # Form actions
              render Components::Forms::FormActionsComponent.new(
                cancel_path: "/clients",
                submit_text: "Save"
              )
            end
          end
        end
      end
    end
  end
end
