# frozen_string_literal: true

module Views
  module Clients
    class IndexView < Views::Base
      include Phlex::Rails::Helpers::LinkTo
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
          div(class: "clients-container") do
            div(class: "clients-header") do
              h1 { "Clients" }
              link_to "New Client", new_client_path, class: "btn btn-primary"
            end
            
            if @clients.any?
              div(class: "clients-list") do
                @clients.each do |client|
                  link_to client_path(client), class: "client-item" do
                    div(class: "client-info") do
                      h3 { client.name }
                      span(class: "client-type tag tag-#{client.business? ? 'purple' : 'blue'}") do
                        client.client_type.capitalize
                      end
                    end
                  end
                end
              end
            else
              div(class: "empty-state") do
                h2 { "No clients yet" }
                p { "Start by searching for a client in the search bar above." }
              end
            end
          end
        end
      end
    end
  end
end