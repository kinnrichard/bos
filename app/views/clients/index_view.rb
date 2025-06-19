# frozen_string_literal: true

module Views
  module Clients
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::Routes
      
      def initialize(clients:, current_user:)
        @clients = clients
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Clients - Faultless",
          current_user: @current_user,
          active_section: :clients
        ) do
          div(class: "clients-header") do
            h1 { "Clients" }
            link_to "New Client", new_client_path, class: "btn btn-primary"
          end
          
          if @clients.any?
            div(class: "clients-list") do
              @clients.each do |client|
                link_to client_path(client), class: "client-item" do
                  span(class: "client-type-emoji") do
                    client_type_icon(client.client_type)
                  end
                  span(class: "client-name") { client.name }
                end
              end
            end
          else
            div(class: "empty-state-wrapper") do
              render Components::GenericEmptyState.new(
                title: "No clients yet",
                message: "Start by searching for a client in the search bar above."
              )
            end
          end
        end
      end
    end
  end
end