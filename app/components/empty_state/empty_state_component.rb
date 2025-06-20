# frozen_string_literal: true

module Components
  module EmptyState
    class EmptyStateComponent < Components::Base
    def initialize(user:)
      @user = user
    end

    def view_template
      div(class: "empty-state", data: { controller: "empty-state" }) do
        h1 do
          "#{greeting}, #{@user.name || 'Oliver'}!"
        end
        
        p do
          plain "Get started by opening "
          a(href: "/jobs?filter=mine") { "My Jobs" }
          plain "."
        end
        
        p do
          plain "You can also "
          a(
            href: "#",
            data: { 
              action: "click->empty-state#focusSearch"
            }
          ) { "search" }
          plain " for a client or job."
        end
      end
    end

    private

    def greeting
      hour = Time.current.hour
      case hour
      when 0..3 then "Hello"
      when 4..11 then "Good morning"
      when 12..17 then "Good afternoon"
      else "Good evening"
      end
    end
    end
  end
end