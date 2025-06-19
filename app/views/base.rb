# frozen_string_literal: true

class Views::Base < Components::Base
  # The `Views::Base` is an abstract class for all your views.

  # By default, it inherits from `Components::Base`, but you
  # can change that to `Phlex::HTML` if you want to keep views and
  # components independent.
  
  private
  
  def render_layout(title:, current_user:, active_section: nil, client: nil, &content)
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

      body do
        div(class: "main-container", data: { controller: "sidebar" }) do
          div(class: "sidebar", data: { sidebar_target: "sidebar" }) do
            render Components::Sidebar.new(
              current_user: current_user,
              active_section: active_section,
              client: client
            )
          end

          div(class: "main-content") do
            render Components::Header.new(current_user: current_user)
            
            div(class: "content", &content)
          end
        end
      end
    end
  end
end
