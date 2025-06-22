# frozen_string_literal: true

module Views
  module Devices
    class EditView < Views::Base
      def initialize(client:, device:, people:, current_user:)
        @client = client
        @device = device
        @people = people
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Edit Device - #{@client.name}",
          current_user: @current_user,
          active_section: :devices,
          client: @client
        ) do
          div(class: "form-container") do
            h1(class: "form-title") { "Edit Device" }

            form_with(model: [ @client, @device ], class: "device-form") do |f|
              if @device.errors.any?
                div(class: "error-messages") do
                  h3 { "Please correct the following errors:" }
                  ul do
                    @device.errors.full_messages.each do |message|
                      li { message }
                    end
                  end
                end
              end

              div(class: "form-group") do
                f.label(:name, "Device Name", class: "form-label")
                f.text_field(:name, class: "form-input", placeholder: "e.g., MacBook Pro, iPhone 15, Dell Desktop")
              end

              div(class: "form-group") do
                f.label(:person_id, "Owner (Optional)", class: "form-label")
                f.select(:person_id,
                  [ [ "No owner", "" ] ] + @people.map { |p| [ p.name, p.id ] },
                  { selected: @device.person_id },
                  class: "form-input"
                )
              end

              div(class: "form-group") do
                f.label(:location, "Location (Optional)", class: "form-label")
                f.text_field(:location, class: "form-input", placeholder: "e.g., Main office, Home, Reception desk")
              end

              div(class: "form-group") do
                f.label(:notes, "Notes (Optional)", class: "form-label")
                f.text_area(:notes, class: "form-input", rows: 4, placeholder: "Any additional information about this device...")
              end

              div(class: "form-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: client_device_path(@client, @device),
                  variant: :ghost,
                  html_options: { style: "margin-right: auto;" }
                ) { "Cancel" }
                render Components::Ui::ButtonComponent.new(
                  type: :submit,
                  variant: :primary,
                  html_options: { style: "margin-left: auto;" }
                ) { "Save Changes" }
              end

              if @current_user.can_delete?(@device)
                div(style: "margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--border-primary);") do
                  delete_form_with_confirmation(
                    url: client_device_path(@client, @device),
                    message: "Are you sure you want to delete the device '#{@device.name}'?",
                    checkbox_label: "I understand this device will be permanently deleted"
                  ) { "Delete Device" }
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
