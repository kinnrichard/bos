# frozen_string_literal: true

module Views
  module Devices
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
      include Phlex::Rails::Helpers::Routes
      include Phlex::Rails::Helpers::FormWith
      include Phlex::Rails::Helpers::ButtonTag
      
      def initialize(client:, device:)
        @client = client
        @device = device
      end

      def view_template
        render_layout(
          title: "#{@device.name} - #{@client.name}",
          current_user: current_user,
          active_section: :devices,
          client: @client
        ) do
          div(class: "device-detail-container") do
            div(class: "device-header") do
              h1 { @device.name }
              div(class: "device-actions") do
                link_to("Edit", edit_client_device_path(@client, @device), class: "btn btn-secondary")
                if current_user.can_delete?(@device)
                  form_with(url: client_device_path(@client, @device), method: :delete, data: { confirm: "Are you sure?" }) do |f|
                    button_tag("Delete", type: "submit", class: "btn btn-danger")
                  end
                end
              end
            end
            
            div(class: "device-info-section") do
              h2 { "Device Information" }
              
              div(class: "info-grid") do
                div(class: "info-item") do
                  div(class: "info-label") { "DEVICE NAME" }
                  div(class: "info-value") { @device.name }
                end
                
                if @device.person
                  div(class: "info-item") do
                    div(class: "info-label") { "OWNER" }
                    div(class: "info-value") do
                      link_to(@device.person.name, client_person_path(@client, @device.person), class: "text-link")
                    end
                  end
                end
                
                if @device.display_location?
                  div(class: "info-item") do
                    div(class: "info-label") { "LOCATION" }
                    div(class: "info-value") { @device.location }
                  end
                end
              end
              
              if @device.display_notes?
                div(class: "notes-section", style: "margin-top: 24px;") do
                  h3(class: "info-label", style: "margin-bottom: 8px;") { "NOTES" }
                  div(class: "notes-content") { @device.notes }
                end
              end
            end
          end
        end
      end
      
      private
      
      def current_user
        # TODO: Replace with actual current user from authentication
        User.first || User.create!(
          name: 'System User',
          email: 'system@example.com',
          role: :admin
        )
      end
    end
  end
end