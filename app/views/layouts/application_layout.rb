# frozen_string_literal: true

module Views
  module Layouts
    class ApplicationLayout < Phlex::HTML
      include Phlex::Rails::Layout

      def template
        doctype
        html(lang: "en") do
          head do
            title { "Faultless - Case Management" }
            meta(name: "viewport", content: "width=device-width,initial-scale=1")
            meta(name: "view-transition", content: "same-origin")
            csrf_meta_tags
            csp_meta_tag

            stylesheet_link_tag("application", "data-turbo-track": "reload")
            javascript_importmap_tags

            # Prevent sidebar flash on page load when hidden
            script do
              unsafe_raw <<~JS
                // Check sidebar state before page renders to prevent flash
                if (localStorage.getItem('sidebarHidden') === 'true') {
                  document.documentElement.classList.add('sidebar-initially-hidden');
                }
              JS
            end

            # Inject emoji configuration
            script(id: "emoji-config", type: "application/json") do
              unsafe_raw emoji_config_json
            end

            # Initialize emoji config
            script do
              unsafe_raw <<~JS
                document.addEventListener('DOMContentLoaded', function() {
                  const configElement = document.getElementById('emoji-config');
                  if (configElement && window.Bos?.EmojiConfig) {
                    try {
                      const config = JSON.parse(configElement.textContent);
                      window.Bos.EmojiConfig.initializeEmojiConfig(config);
                    } catch (e) {
                      console.error('Failed to initialize emoji config:', e);
                    }
                  }
                });
              JS
            end

            # Allow additional head content
            if content_for?(:head)
              unsafe_raw(content_for(:head))
            end
          end

          body(data: body_data_attributes) do
            div(class: "main-container") do
              yield
            end
          end
        end
      end

      private

      def body_data_attributes
        attrs = {}
        if current_user
          attrs[:resort_tasks_on_status_change] = current_user.resort_tasks_on_status_change
        end
        attrs
      end

      def emoji_config_json
        {
          task_statuses: task_status_emojis,
          job_statuses: job_status_emojis,
          priorities: priority_emojis,
          unassigned: "❓",
          utility: utility_emojis
        }.to_json
      end

      def task_status_emojis
        TaskStatus::STATUSES.transform_values do |config|
          {
            emoji: config[:emoji],
            label: config[:label]
          }
        end
      end

      def job_status_emojis
        JobStatus::STATUSES.transform_values do |config|
          {
            emoji: config[:emoji],
            label: config[:label]
          }
        end
      end

      def priority_emojis
        {
          job: {
            critical: { emoji: "🔥", label: "Critical" },
            high: { emoji: "❗", label: "High" },
            normal: { emoji: "", label: "Normal" },
            low: { emoji: "➖", label: "Low" },
            proactive_followup: { emoji: "💬", label: "Proactive Follow-up" }
          },
          task: {
            high: { emoji: "🔴", label: "High" },
            medium: { emoji: "🟡", label: "Medium" },
            low: { emoji: "🟢", label: "Low" }
          }
        }
      end

      def utility_emojis
        {
          timer: "⏱️",
          trash: "🗑️",
          warning: "❗",
          check: "✓",
          client_types: {
            business: "🏢",
            residential: "🏠"
          },
          contact_methods: {
            phone: "📱",
            primary_phone: "📱",
            email: "📧",
            address: "📍"
          },
          schedule_types: {
            scheduled_appointment: "📅",
            follow_up: "🔄",
            due_date: "⏰",
            start_date: "▶️"
          }
        }
      end
    end
  end
end
