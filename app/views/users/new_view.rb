# frozen_string_literal: true

module Views
  module Users
    class NewView < Views::Base
      def initialize(user:, current_user:)
        @user = user
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "New User - Faultless",
          current_user: @current_user,
          active_section: :settings
        ) do
          div(class: "form-container") do
            div(class: "page-header") do
              h1 { "New User" }
            end
            
            render_user_form
          end
        end
      end
      
      private
      
      def render_user_form
        form_with(model: @user, url: users_path, class: "user-form") do |f|
          if @user.errors.any?
            div(class: "error-messages") do
              h3 { "Please fix the following errors:" }
              ul do
                @user.errors.full_messages.each do |message|
                  li { message }
                end
              end
            end
          end
          
          div(class: "form-group") do
            f.label :name, class: "form-label"
            f.text_field :name, class: "form-input", required: true, autofocus: true
          end
          
          div(class: "form-group") do
            f.label :email, class: "form-label"
            f.email_field :email, class: "form-input", required: true
          end
          
          div(class: "form-group") do
            f.label :password, class: "form-label"
            f.password_field :password, class: "form-input", required: true
            div(class: "form-help") { "Minimum 6 characters" }
          end
          
          div(class: "form-group") do
            f.label :password_confirmation, "Confirm Password", class: "form-label"
            f.password_field :password_confirmation, class: "form-input", required: true
          end
          
          div(class: "form-group") do
            f.label :role, class: "form-label"
            f.select :role, 
              [
                ['Admin', 'admin'],
                ['Technician', 'technician'],
                ['Customer Specialist', 'customer_specialist'],
                ['Superadmin', 'superadmin']
              ],
              { selected: @user.role },
              class: "form-input"
          end
          
          div(class: "form-actions") do
            f.submit "Create User", class: "btn btn-primary"
            link_to "Cancel", users_path, class: "btn btn-link"
          end
        end
      end
    end
  end
end