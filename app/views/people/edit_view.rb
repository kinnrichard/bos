# frozen_string_literal: true

module Views
  module People
    class EditView < Views::Base
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, person:, current_user:, authenticity_token:)
        @client = client
        @person = person
        @current_user = current_user
        @authenticity_token = authenticity_token
      end

      def view_template
        render_layout(
          title: "Edit #{@person.name} - #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :people,
          client: @client
        ) do
          div(class: "form-container") do
            h1(class: "form-title") { "Edit Person" }
            
            form(action: client_person_path(@client, @person), method: "post", class: "person-form", data: { controller: "person-form" }) do
              input(type: "hidden", name: "authenticity_token", value: @authenticity_token)
              input(type: "hidden", name: "_method", value: "patch")
              
              # Name field
              div(class: "form-group") do
                label(for: "person_name", class: "form-label") { "Name" }
                input(
                  type: "text",
                  name: "person[name]",
                  id: "person_name",
                  value: @person.name,
                  class: "form-input",
                  required: true,
                  autofocus: true
                )
              end
              
              # Contact Methods
              div(class: "form-group") do
                label(class: "form-label") { "Contact Information" }
                div(data: { person_form_target: "contactMethods" }, class: "contact-methods") do
                  if @person.contact_methods.any?
                    @person.contact_methods.each_with_index do |contact, index|
                      contact_method_fields(contact, index)
                    end
                  else
                    contact_method_fields(nil, 0)
                  end
                end
                button(
                  type: "button",
                  class: "btn btn-secondary btn-sm",
                  data: { action: "click->person-form#addContactMethod" }
                ) { "+ Add Contact Method" }
              end
              
              # Notes field
              div(class: "form-group") do
                label(for: "person_notes", class: "form-label") { "Notes" }
                textarea(
                  name: "person[notes]",
                  id: "person_notes",
                  class: "form-input",
                  rows: 4
                ) { @person.notes }
              end
              
              # Form actions
              div(class: "form-actions") do
                a(href: client_person_path(@client, @person), class: "btn btn-secondary", style: "margin-right: auto;") { "Cancel" }
                button(type: "submit", class: "btn btn-primary") { "Save" }
              end
            end
            
            # Delete button at the bottom
            div(style: "margin-top: 3rem; padding-top: 2rem; border-top: 1px solid #e5e7eb;") do
              delete_form_with_confirmation(
                url: client_person_path(@client, @person),
                message: "Are you sure you want to delete #{@person.name}? This will also remove all contact methods and device associations.",
                checkbox_label: "I understand this person will be permanently deleted"
              ) { "Delete Person" }
            end
          end
        end
      end
      
      private
      
      def contact_method_fields(contact, index)
        div(class: "contact-method-field", data: { person_form_target: "contactMethod" }) do
          input(
            type: "text",
            name: "person[contact_methods_attributes][#{index}][value]",
            value: contact&.formatted_value || contact&.value,
            class: "form-input",
            placeholder: "Phone, email, or address"
          )
          if contact&.persisted?
            input(type: "hidden", name: "person[contact_methods_attributes][#{index}][id]", value: contact.id)
          end
          if contact&.persisted?
            input(
              type: "checkbox",
              name: "person[contact_methods_attributes][#{index}][_destroy]",
              id: "destroy_contact_#{index}",
              value: "1",
              style: "display: none;"
            )
          end
          button(
            type: "button",
            class: "btn btn-danger btn-sm",
            data: { action: "click->person-form#removeContactMethod" }
          ) { "Remove" }
        end
      end
    end
  end
end