# frozen_string_literal: true

module Views
  module People
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::Routes

      def initialize(client:, people:, current_user:, contact_types_by_person: nil, sidebar_stats: nil)
        @client = client
        @people = people
        @current_user = current_user
        @contact_types_by_person = contact_types_by_person || {}
        @sidebar_stats = sidebar_stats
      end

      def view_template
        render_layout(
          title: "People - #{@client.name} - Faultless",
          current_user: @current_user,
          active_section: :people,
          client: @client,
          sidebar_stats: @sidebar_stats
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
                            plain contact_method_emoji(type)
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
            message = if @client.business?
              "Add employees and other people at #{@client.name} we might work with."
            else
              "Add family members, contacts, and even pets at #{@client.name}!"
            end

            div(class: "empty-state-wrapper") do
              render Components::EmptyState::GenericEmptyStateComponent.new(
                title: "No people added yet",
                message: message
              )

              render Components::Ui::ButtonComponent.new(
                href: new_client_person_path(@client),
                variant: :primary
              ) { "Add a Person" }
            end
          end
        end
      end

      private


      def missing_contact_types(person)
        all_types = [ "phone", "email", "address" ]
        existing_types = @contact_types_by_person[person.id] || []
        all_types - existing_types
      end
    end
  end
end
