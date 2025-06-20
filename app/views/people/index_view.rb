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
          render Components::PageHeader::PageHeaderComponent.new(
            title: "People",
            action_text: "Add Person",
            action_path: new_client_person_path(@client)
          )
          
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
                        span(class: "contact-icon") do
                          missing_types.each do |type|
                            plain contact_method_icon(type)
                          end
                          plain "❗"
                        end
                      end
                    end
                  end
                end
              end
            end
          else
            div(class: "empty-state-wrapper") do
              render Components::EmptyState::GenericEmptyStateComponent.new(
                title: "No people added yet",
                message: "Add family members, employees, or other contacts at #{@client.name}."
              )
            end
          end
        end
      end
      
      private
      
      
      def missing_contact_types(person)
        all_types = ['phone', 'email', 'address']
        existing_types = person.contact_methods.pluck(:contact_type)
        all_types - existing_types
      end
    end
  end
end