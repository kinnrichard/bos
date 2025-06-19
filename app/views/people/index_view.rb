# frozen_string_literal: true

module Views
  module People
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
      include Phlex::Rails::Helpers::Routes
      
      def initialize(client:, people:, current_user:)
        @client = client
        @people = people
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "People - #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :people,
          client: @client
        ) do
          div(class: "people-container") do
            div(class: "page-header") do
              h1 { "People" }
              link_to "Add Person", new_client_person_path(@client), class: "btn btn-primary"
            end
            
            if @people.any?
              div(class: "people-grid") do
                @people.each do |person|
                  person_card(person)
                end
              end
            else
              div(class: "empty-state") do
                p { "No people added yet." }
                p do
                  plain "Add family members, employees, or other contacts associated with "
                  plain @client.name
                  plain "."
                end
              end
            end
          end
        end
      end
      
      private
      
      def person_card(person)
        div(class: "person-card") do
          link_to client_person_path(@client, person), class: "person-card-link" do
            div(class: "person-header") do
              h3 { person.name }
            end
            
            if person.contact_methods.any?
              div(class: "contact-methods") do
                person.contact_methods.each do |contact|
                  div(class: "contact-method") do
                    span(class: "contact-icon") { contact_icon(contact.contact_type) }
                    span(class: "contact-value") { contact.formatted_value || contact.value }
                  end
                end
              end
            end
            
            if person.notes.present?
              div(class: "person-notes") do
                plain truncate(person.notes, length: 100)
              end
            end
          end
        end
      end
      
      def contact_icon(type)
        case type
        when 'phone' then "📱"
        when 'email' then "✉️"
        when 'address' then "📍"
        else "📝"
        end
      end
      
      def truncate(text, length:)
        return text if text.length <= length
        "#{text[0...length]}..."
      end
    end
  end
end