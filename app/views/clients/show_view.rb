# frozen_string_literal: true

module Views
  module Clients
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::Routes

      def initialize(client:, current_user:)
        @client = client
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :client_info,
          client: @client
        ) do
          div(class: "client-detail-container", data: { controller: "client" }) do
            div(class: "client-header") do
              div do
                h1 { @client.name }
              end

              div(class: "client-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: edit_client_path(@client),
                  variant: :secondary,
                  data: { action: "click->client#showDelete" }
                ) { "Edit" }
                div(style: "display: none;", data: { "client-target": "deleteButton" }) do
                  delete_form_with_confirmation(
                    url: client_path(@client),
                    message: "Are you sure you want to delete #{@client.name}? This will permanently delete ALL associated people, devices, jobs, and other data.",
                    checkbox_label: "I understand ALL data for this client will be permanently deleted"
                  ) { "Delete" }
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
                  span(class: "info-label") { "Added" }
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
