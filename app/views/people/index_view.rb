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
                    
                    # Show missing contact methods
                    missing_types = missing_contact_types(person)
                    if missing_types.any?
                      div(class: "person-contacts") do
                        missing_types.each do |type|
                          span(class: "contact-icon missing") do
                            plain contact_icon(type)
                            plain "❗"
                          end
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
      
      def missing_contact_types(person)
        all_types = ['phone', 'email', 'address']
        existing_types = person.contact_methods.pluck(:contact_type)
        all_types - existing_types
      end
    end
  end
end