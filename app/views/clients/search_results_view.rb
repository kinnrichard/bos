# frozen_string_literal: true

module Views
  module Clients
    class SearchResultsView < Views::Base
      def initialize(clients:, query:)
        @clients = clients
        @query = query
      end

      def view_template
        if @clients.any?
          # Show existing clients
          div(class: "search-section") do
            h3 { "Clients" }
            @clients.each do |client|
              a(
                href: "/clients/#{client.id}",
                class: "search-result",
                data: {
                  action: "click->search#selectClient",
                  client_name: client.name
                }
              ) do
                span { client.name }
                span(class: "tag tag-#{client.business? ? 'purple' : 'blue'}") do
                  " • #{client.client_type.capitalize}"
                end
              end
            end
          end
        end

        # Always show "New Client" option
        div(class: "search-section") do
          h3 { "Actions" }
          a(
            href: new_client_path(name: @query),
            class: "search-result new-client",
            data: { action: "click->search#createNewClient" }
          ) do
            span { "New Client: #{format_name(@query)}" }
          end
        end
      end

      private

      def format_name(name)
        return name if name.blank?

        # If the name is all lowercase, convert to title case
        if name == name.downcase
          name.split.map(&:capitalize).join(" ")
        else
          name
        end
      end
    end
  end
end
