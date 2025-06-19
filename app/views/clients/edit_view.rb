# frozen_string_literal: true

module Views
  module Clients
    class EditView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
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
          active_section: :clients
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
                a(href: "/clients/#{@client.id}", class: "btn btn-secondary", style: "margin-right: auto;") { "Cancel" }
                button(type: "submit", class: "btn btn-primary") { "Save" }
              end
            end
            
            # Delete button at the bottom
            div(style: "margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;") do
              form(action: client_path(@client), method: "post", style: "display: inline;", 
                   onsubmit: "return confirm('Are you sure you want to delete this client?');") do
                input(type: "hidden", name: "_method", value: "delete")
                input(type: "hidden", name: "authenticity_token", value: @authenticity_token)
                button(type: "submit", class: "btn btn-danger") { "Delete Client" }
              end
            end
          end
        end
      end
    end
  end
end