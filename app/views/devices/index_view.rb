# frozen_string_literal: true

module Views
  module Devices
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, devices:)
        @client = client
        @devices = devices
      end

      def view_template
        render_layout(
          title: "Devices - #{@client.name}",
          current_user: current_user,
          active_section: :devices,
          client: @client
        ) do
          div(class: "devices-container") do
            div(class: "page-header") do
              h1 { "Devices" }
              link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
            end
            
            if @devices.any?
              div(class: "devices-grid") do
                @devices.each do |device|
                  device_card(device)
                end
              end
            else
              empty_state
            end
          end
        end
      end
      
      private
      
      def device_card(device)
        div(class: "device-card") do
          link_to(client_device_path(@client, device), class: "device-card-link") do
            div(class: "device-header") do
              h3 { device.name }
            end
            
            if device.person
              div(class: "device-owner") do
                span(class: "owner-icon") { "👤" }
                span { device.person.name }
              end
            end
            
            if device.display_location?
              div(class: "device-location") do
                span(class: "location-icon") { "📍" }
                span { device.location }
              end
            end
            
            if device.display_notes?
              div(class: "device-notes") do
                device.notes.truncate(100)
              end
            end
          end
        end
      end
      
      def empty_state
        div(class: "empty-state") do
          h2 { "No devices yet" }
          p { "Add your first device to get started." }
          link_to("Add Device", new_client_device_path(@client), class: "btn btn-primary")
        end
      end
      
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