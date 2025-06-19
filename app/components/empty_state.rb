# frozen_string_literal: true

module Components
  class EmptyState < Base
    def initialize(user:)
      @user = user
    end

    def view_template
      div(class: "empty-state") do
        h1 do
          "#{greeting}, #{@user.name || 'Oliver'}!"
        end
        
        p do
          plain "Get started by opening "
          a(href: "/cases?filter=mine") { "My Cases" }
          plain "."
        end
        
        p do
          plain "You can also "
          a(
            href: "#",
            data: { action: "click->search#focus" }
          ) { "search" }
          plain " for a client or case."
        end
      end
    end

    private

    def greeting
      hour = Time.current.hour
      case hour
      when 0..11 then "Good morning"
      when 12..17 then "Good afternoon"
      else "Good evening"
      end
    end
  end
end