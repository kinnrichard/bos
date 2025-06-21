# frozen_string_literal: true

module Views
  module Clients
    class EditView < Views::Base
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, current_user:, authenticity_token: nil)
        @client = client
        @current_user = current_user
        @authenticity_token = authenticity_token
      end

      def view_template
        render_layout(
          title: "Edit #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :client_info,
          client: @client
        ) do
          div(class: "form-container") do
            h1(class: "form-title") { "Edit Client" }
            
            form(action: "/clients/#{@client.id}", method: "post", class: "client-form") do
              # CSRF token
              input(type: "hidden", name: "authenticity_token", value: @authenticity_token)
              input(type: "hidden", name: "_method", value: "patch")
              
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
                      checked: @client.residential?,
                      class: "client-type-radio"
                    )
                    span(class: "client-type-label") do
                      span(class: "client-type-icon") { "🏠" }
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
                      span(class: "client-type-icon") { "🏢" }
                      span { "Business" }
                    end
                  end
                end
              end
              
              # Form actions
              div(class: "form-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: "/clients/#{@client.id}",
                  variant: :ghost,
                  html_options: { style: "margin-right: auto;" }
                ) { "Cancel" }
                render Components::Ui::ButtonComponent.new(
                  type: :submit,
                  variant: :primary
                ) { "Save" }
              end
            end
            
            # Delete button at the bottom
            div(style: "margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;") do
              delete_form_with_confirmation(
                url: client_path(@client),
                message: "Are you sure you want to delete #{@client.name}? This will permanently delete ALL associated people, devices, jobs, and other data.",
                checkbox_label: "I understand ALL data for this client will be permanently deleted"
              ) { "Delete Client" }
            end
          end
        end
      end
    end
  end
end