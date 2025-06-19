# frozen_string_literal: true

module Views
  module People
    class IndexView < Views::Base
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
          div(class: "page-header") do
            h1 { "People" }
            link_to "Add Person", new_client_person_path(@client), class: "btn btn-primary"
          end
          
          if @people.any?
            div(class: "people-list") do
              @people.each do |person|
                link_to client_person_path(@client, person), class: "person-item" do
                  div(class: "person-info") do
                    span(class: "person-name") { person.name }
                    
                    if person.contact_methods.any?
                      div(class: "person-contacts") do
                        person.contact_methods.each do |contact|
                          span(class: "contact-icon") { contact_icon(contact.contact_type) }
                        end
                      end
                    end
                  end
                end
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
      
      private
      
      def contact_icon(type)
        case type
        when 'phone' then "📱"
        when 'email' then "✉️"
        when 'address' then "📍"
        else "📝"
        end
      end
    end
  end
end