# frozen_string_literal: true

module Views
  module People
    class NewView < Views::Base
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, person:, current_user:, authenticity_token:)
        @client = client
        @person = person
        @current_user = current_user
        @authenticity_token = authenticity_token
      end

      def view_template
        render_layout(
          title: "New Person - #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :people,
          client: @client
        ) do
          div(class: "form-container") do
            h1(class: "form-title") { "Add Person" }
            
            form(action: client_people_path(@client), method: "post", class: "person-form", data: { controller: "person-form" }) do
              input(type: "hidden", name: "authenticity_token", value: @authenticity_token)
              
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
                  # Render existing contact methods if any
                  if @person.contact_methods.any?
                    @person.contact_methods.each_with_index do |contact, index|
                      contact_method_fields(contact, index)
                    end
                  else
                    # Start with one empty field
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
                a(href: client_people_path(@client), class: "btn btn-link", style: "margin-right: auto;") { "Cancel" }
                button(type: "submit", class: "btn btn-primary") { "Save" }
              end
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
            value: contact&.value,
            class: "form-input",
            placeholder: "Phone, email, or address"
          )
          if contact&.persisted?
            input(type: "hidden", name: "person[contact_methods_attributes][#{index}][id]", value: contact.id)
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