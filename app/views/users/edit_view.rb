# frozen_string_literal: true

module Views
  module Users
    class EditView < Views::Base
      def initialize(user:, current_user:)
        @user = user
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Edit User - Faultless",
          current_user: @current_user,
          active_section: :settings
        ) do
          div(class: "form-container") do
            div(class: "page-header") do
              h1 { "Edit User" }
            end
            
            render_user_form
          end
        end
      end
      
      private
      
      def render_user_form
        form_with(model: @user, url: user_path(@user), method: :patch, class: "user-form") do |f|
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
          
          div(class: "form-section") do
            h3 { "Change Password" }
            p(class: "form-help") { "Leave blank to keep current password" }
            
            div(class: "form-group") do
              f.label :password, "New Password", class: "form-label"
              f.password_field :password, class: "form-input"
              div(class: "form-help") { "Minimum 6 characters" }
            end
            
            div(class: "form-group") do
              f.label :password_confirmation, "Confirm New Password", class: "form-label"
              f.password_field :password_confirmation, class: "form-input"
            end
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
            render Components::Ui::ButtonComponent.new(
              type: :submit,
              variant: :primary
            ) { "Update User" }
            render Components::Ui::ButtonComponent.new(
              href: users_path,
              variant: :ghost
            ) { "Cancel" }
          end
        end
      end
    end
  end
end