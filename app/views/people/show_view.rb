# frozen_string_literal: true

module Views
  module People
    class ShowView < Views::Base
      include Phlex::Rails::Helpers::Routes

      def initialize(client:, person:, current_user:)
        @client = client
        @person = person
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "#{@person.name} - #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :people,
          client: @client
        ) do
          div(class: "person-detail-container") do
            div(class: "person-header") do
              div do
                h1 { @person.name }
              end

              div(class: "person-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: edit_client_person_path(@client, @person),
                  variant: :secondary
                ) { "Edit" }
                delete_form_with_confirmation(
                  url: client_person_path(@client, @person),
                  message: "Are you sure you want to delete #{@person.name}? This will also remove all contact methods and device associations.",
                  checkbox_label: "I understand this person will be permanently deleted"
                ) { "Delete" }
              end
            end

            div(class: "person-info-section") do
              h2 { "Contact Information" }

              if @person.contact_methods.any?
                div(class: "contact-methods-list") do
                  @person.contact_methods.each do |contact|
                    div(class: "contact-method-item") do
                      span(class: "contact-type") { contact_type_label(contact.contact_type) }
                      span(class: "contact-value") { contact.formatted_value || contact.value }
                    end
                  end
                end
              else
                p(class: "text-muted") { "No contact information added." }
              end
            end

            if @person.notes.present?
              div(class: "person-info-section") do
                h2 { "Notes" }
                div(class: "notes-content") do
                  plain @person.notes
                end
              end
            end

            if @person.devices.any?
              div(class: "person-info-section") do
                h2 { "Devices" }
                div(class: "devices-list") do
                  @person.devices.each do |device|
                    div(class: "device-item") do
                      h4 { device.name }
                      if device.model.present?
                        p { "Model: #{device.model}" }
                      end
                      if device.serial_number.present?
                        p { "Serial: #{device.serial_number}" }
                      end
                    end
                  end
                end
              end
            end
          end
        end
      end

      private

      def contact_type_label(type)
        case type
        when "phone" then "Phone"
        when "email" then "Email"
        when "address" then "Address"
        else type.to_s.capitalize
        end
      end
    end
  end
end
