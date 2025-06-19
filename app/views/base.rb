# frozen_string_literal: true

class Views::Base < Components::Base
  # The `Views::Base` is an abstract class for all your views.

  # By default, it inherits from `Components::Base`, but you
  # can change that to `Phlex::HTML` if you want to keep views and
  # components independent.
  
  private
  
  def render_layout(title:, current_user:, active_section: nil, &content)
    doctype
    html(lang: "en") do
      head do
        title { title }
        meta(name: "viewport", content: "width=device-width,initial-scale=1")
        meta(name: "view-transition", content: "same-origin")
        
        link(rel: "stylesheet", href: "/assets/application-3ea4c204.css")
        
        # JavaScript includes - shared across all pages
        script(src: "/assets/stimulus-loading-1fc53fe7.js", defer: true)
        script(type: "importmap", "data-turbo-track": "reload") { javascript_import_map }
        script(type: "module") { "import 'application'" }
        script(src: "/assets/search-7e0b6c4b.js", defer: true)
      end

      body do
        div(class: "main-container", data: { controller: "sidebar" }) do
          div(class: "sidebar", data: { sidebar_target: "sidebar" }) do
            render Components::Sidebar.new(
              current_user: current_user,
              active_section: active_section
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
  
  def javascript_import_map
    '{
  "imports": {
    "application": "/assets/application-d61e794c.js",
    "@hotwired/stimulus": "/assets/stimulus.min-4b1e420e.js",
    "@hotwired/stimulus-loading": "/assets/stimulus-loading-1fc53fe7.js",
    "controllers/application": "/assets/controllers/application-3affb389.js",
    "controllers/hello_controller": "/assets/controllers/hello_controller-708796bd.js",
    "controllers": "/assets/controllers/index-ee64e1f1.js",
    "controllers/popover_controller": "/assets/controllers/popover_controller-587e1e9d.js",
    "controllers/search_controller": "/assets/controllers/search_controller-ad854424.js",
    "controllers/sidebar_controller": "/assets/controllers/sidebar_controller-09bf1c76.js"
  }
}'
  end
end
