# frozen_string_literal: true

module Views
  module Devices
    class ShowView < Views::Base
      def initialize(client:, device:, current_user:)
        @client = client
        @device = device
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@device.name} - #{@client.name}",
          current_user: @current_user,
          active_section: :devices,
          client: @client
        ) do
          div(class: "device-detail-container") do
            div(class: "device-header") do
              h1 { @device.name }
              div(class: "device-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: edit_client_device_path(@client, @device),
                  variant: :secondary
                ) { "Edit" }
                if @current_user.can_delete?(@device)
                  delete_form_with_confirmation(
                    url: client_device_path(@client, @device),
                    message: "Are you sure you want to delete the device '#{@device.name}'?",
                    checkbox_label: "I understand this device will be permanently deleted"
                  ) { "Delete" }
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
    end
  end
end
