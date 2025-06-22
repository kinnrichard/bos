# frozen_string_literal: true

class Views::Base < Components::Base
  include JobStatusHelper
  include IconHelper
  # The `Views::Base` is an abstract class for all your views.

  # By default, it inherits from `Components::Base`, but you
  # can change that to `Phlex::HTML` if you want to keep views and
  # components independent.

  # Common Rails helpers used across views
  include Phlex::Rails::Helpers::LinkTo
  include Phlex::Rails::Helpers::FormWith
  include Phlex::Rails::Helpers::ButtonTag
  include Phlex::Rails::Helpers::ButtonTo
  include Phlex::Rails::Helpers::ImageTag
  include Phlex::Rails::Helpers::NumberToHumanSize
  include Phlex::Rails::Helpers::CheckBoxTag
  include Phlex::Rails::Helpers::TimeAgoInWords
  

  private

  def delete_form_with_confirmation(url:, message: nil, checkbox_label: nil, &block)
    div(data: { controller: "delete-confirmation" }) do
      # Render the modal
      render Components::Modal::DeleteConfirmationModalComponent.new(
        message: message,
        checkbox_label: checkbox_label
      )

      # Render the form with the trigger
      form_with(url: url, method: :delete, data: { turbo: false }) do |f|
        render Components::Ui::ButtonComponent.new(
          type: :button,
          variant: :danger,
          data: {
            action: "click->delete-confirmation#open",
            delete_confirmation_message_value: message,
            delete_confirmation_checkbox_label_value: checkbox_label
          }
        ) do
          block_given? ? yield : "Delete"
        end
      end
    end
  end

  def render_layout(title:, current_user: nil, active_section: nil, client: nil, toolbar_items: nil, extra_controllers: nil, hide_sidebar: false, &content)
    doctype
    html(lang: "en") do
      head do
        title { title }
        meta(name: "viewport", content: "width=device-width,initial-scale=1")
        meta(name: "view-transition", content: "same-origin")
        csrf_meta_tags

        stylesheet_link_tag "application"
        javascript_importmap_tags
        

        # Additional JavaScript
        script(src: asset_path("search.js"), defer: true)
      end

      body(data: { 
        current_user_role: current_user&.role,
        resort_tasks_on_status_change: current_user&.resort_tasks_on_status_change&.to_s
      }) do
        if hide_sidebar
          # Simple layout without sidebar/header for auth pages
          yield
        else
          controllers = ["sidebar"]
          controllers += extra_controllers if extra_controllers
          
          div(class: "main-container", data: { controller: controllers.join(" ") }) do
            # Check cookie to determine initial sidebar state
            sidebar_hidden = cookies[:sidebar_hidden] == 'true'
            sidebar_classes = ["sidebar"]
            sidebar_classes << "sidebar-hidden" if sidebar_hidden
            
            div(class: sidebar_classes.join(" "), data: { sidebar_target: "sidebar" }) do
              render Components::Sidebar::SidebarComponent.new(
                current_user: current_user,
                active_section: active_section,
                client: client
              )
            end

            div(class: "main-content") do
              render Components::Header::HeaderComponent.new(
                current_user: current_user,
                toolbar_items: toolbar_items,
                sidebar_hidden: sidebar_hidden
              )

              div(class: "content", &content)
            end
          end
        end
      end
    end
  end
end
