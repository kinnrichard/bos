# frozen_string_literal: true

module Views
  module Jobs
    class EditView < Views::Base
      def initialize(client:, job:, people:, technicians:, current_user:)
        @client = client
        @job = job
        @people = people
        @technicians = technicians
        @current_user = current_user
      end

      def view_template
        render_layout(
          title: "Edit Job - #{@client.name}",
          current_user: @current_user,
          active_section: :jobs,
          client: @client
        ) do
          div(class: "form-container") do
            h1(class: "form-title") { "Edit Job" }

            form_with(model: [ @client, @job ], class: "job-form") do |f|
              if @job.errors.any?
                div(class: "error-messages") do
                  h3 { "Please correct the following errors:" }
                  ul do
                    @job.errors.full_messages.each do |message|
                      li { message }
                    end
                  end
                end
              end

              div(class: "form-group") do
                f.label(:title, "Title", class: "form-label")
                f.text_field(:title, class: "form-input", placeholder: "Brief description of the issue")
              end

              div(class: "form-group") do
                f.label(:description, "Description", class: "form-label")
                f.text_area(:description, class: "form-input", rows: 4, placeholder: "Detailed description of the problem, symptoms, and any relevant information...")
              end

              div(class: "form-row") do
                div(class: "form-group form-col") do
                  f.label(:priority, "Priority", class: "form-label")
                  f.select(:priority,
                    options_for_priority,
                    { selected: @job.priority },
                    class: "form-input"
                  )
                end

                div(class: "form-group form-col") do
                  f.label(:status, "Status", class: "form-label")
                  f.select(:status,
                    options_for_status,
                    { selected: @job.status },
                    class: "form-input"
                  )
                end
              end

              div(class: "form-group") do
                f.label(:start_on_date, "Scheduled Date (Optional)", class: "form-label")
                f.date_field(:start_on_date, class: "form-input")
              end

              div(class: "form-group") do
                label(class: "form-label") { "Assign Technicians (Optional)" }
                div(class: "checkbox-group") do
                  @technicians.each do |technician|
                    div(class: "checkbox-item") do
                      check_box_tag(
                        "job[technician_ids][]",
                        technician.id,
                        @job.technicians.include?(technician),
                        id: "technician_#{technician.id}"
                      )
                      label(for: "technician_#{technician.id}") do
                        span { technician.name }
                        span(class: "technician-role") { " (#{technician.role.humanize})" }
                      end
                    end
                  end
                end
              end

              div(class: "form-group") do
                label(class: "form-label") { "Related People (Optional)" }
                div(class: "checkbox-group") do
                  @people.each do |person|
                    div(class: "checkbox-item") do
                      check_box_tag(
                        "job[person_ids][]",
                        person.id,
                        @job.people.include?(person),
                        id: "person_#{person.id}"
                      )
                      label(for: "person_#{person.id}") { person.name }
                    end
                  end
                end
              end

              div(class: "form-actions") do
                render Components::Ui::ButtonComponent.new(
                  href: client_job_path(@client, @job),
                  variant: :ghost,
                  html_options: { style: "margin-right: auto;" }
                ) { "Cancel" }
                render Components::Ui::ButtonComponent.new(
                  type: :submit,
                  variant: :primary,
                  html_options: { style: "margin-left: auto;" }
                ) { "Save Changes" }
              end

              if @current_user.can_delete?(@job)
                div(style: "margin-top: 40px; padding-top: 40px; border-top: 1px solid var(--border-primary);") do
                  delete_form_with_confirmation(
                    url: client_job_path(@client, @job),
                    message: "Are you sure you want to delete the job '#{@job.title}'? This will also delete all associated tasks and notes.",
                    checkbox_label: "I understand this will permanently delete this job and all its data"
                  ) { "Delete Job" }
                end
              end
            end
          end
        end
      end

      private

      def options_for_priority
        Job.priorities.map do |key, _|
          [ key.humanize, key ]
        end
      end

      def options_for_status
        Job.statuses.map do |key, _|
          [ key.humanize.gsub("_", " "), key ]
        end
      end
    end
  end
end
