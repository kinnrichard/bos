# frozen_string_literal: true

module Views
  module Home
    class ShowView < Views::Base
      def initialize(current_user:)
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Faultless - Case Management",
          current_user: @current_user,
          active_section: :home
        ) do
          render Components::EmptyState.new(user: @current_user)
        end
      end
    end
  end
end