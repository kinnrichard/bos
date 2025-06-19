# frozen_string_literal: true

module Views
  module Clients
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, current_user:)
        @client = client
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :clients
        ) do
          div(class: "client-detail-container", data: { controller: "client" }) do
            div(class: "client-header") do
              div do
                h1 { @client.name }
              end
              
              div(class: "client-actions") do
                link_to "Edit", edit_client_path(@client), 
                  class: "btn btn-secondary",
                  data: { action: "click->client#showDelete" }
                form(action: client_path(@client), method: "post", style: "display: none;", 
                     data: { "client-target": "deleteButton" },
                     onsubmit: "return confirm('Are you sure?');") do
                  input(type: "hidden", name: "_method", value: "delete")
                  input(type: "hidden", name: "authenticity_token", value: helpers.form_authenticity_token)
                  button(type: "submit", class: "btn btn-danger") { "Delete" }
                end
              end
            end
            
            div(class: "client-info-section") do
              h2 { "Client Info" }
              
              div(class: "info-grid") do
                div(class: "info-item") do
                  span(class: "info-label") { "Type" }
                  span(class: "info-value") { @client.client_type.capitalize }
                end
                
                div(class: "info-item") do
                  span(class: "info-label") { "Created" }
                  span(class: "info-value") { @client.created_at.strftime("%B %d, %Y") }
                end
              end
            end
          end
        end
      end
    end
  end
end