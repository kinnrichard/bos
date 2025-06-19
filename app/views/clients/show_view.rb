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
          div(class: "client-detail-container") do
            div(class: "client-header") do
              div do
                h1 { @client.name }
                span(class: "client-type-badge tag tag-#{@client.business? ? 'purple' : 'blue'}") do
                  @client.client_type.capitalize
                end
              end
              
              div(class: "client-actions") do
                link_to "Edit", edit_client_path(@client), class: "btn btn-secondary"
                link_to "Delete", client_path(@client), 
                  data: { "turbo-method": "delete", "turbo-confirm": "Are you sure?" },
                  class: "btn btn-danger"
              end
            end
            
            div(class: "client-info-section") do
              h2 { "Client Information" }
              
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