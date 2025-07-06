class Api::V1::TasksController < Api::V1::BaseController
  before_action :find_job
  before_action :find_task, except: [ :index, :create, :reorder, :batch_reorder, :batch_details ]
  before_action :set_current_user

  # Temporarily skip CSRF for testing
  skip_before_action :verify_csrf_token_for_cookie_auth, only: [ :batch_reorder, :batch_details ]

  def index
    @tasks = @job.tasks.includes(:assigned_to)

    render json: {
      data: @tasks.map do |task|
        {
          type: "tasks",
          id: task.id,
          attributes: {
            title: task.title,
            description: task.description,
            status: task.status,
            position: task.position,
            parent_id: task.parent_id,
            created_at: task.created_at,
            updated_at: task.updated_at,
            completed_at: task.completed_at
          },
          relationships: {
            assigned_to: {
              data: task.assigned_to ? { type: "users", id: task.assigned_to.id } : nil
            }
          }
        }
      end,
      included: build_included_users
    }
  end

  def show
    render json: {
      data: {
        type: "tasks",
        id: @task.id,
        attributes: {
          title: @task.title,
          status: @task.status,
          position: @task.position,
          parent_id: @task.parent_id,
          created_at: @task.created_at,
          updated_at: @task.updated_at
        },
        relationships: {
          assigned_to: {
            data: @task.assigned_to ? { type: "users", id: @task.assigned_to.id } : nil
          }
        }
      }
    }
  end

  # GET /api/v1/jobs/:job_id/tasks/:id/details
  def details
    # Load associated data for detailed view
    @task = @job.tasks.includes(:assigned_to, notes: :user, activity_logs: :user).find(params[:id])

    render json: {
      id: @task.id,
      title: @task.title,
      status: @task.status,
      position: @task.position,
      parent_id: @task.parent_id,
      created_at: @task.created_at,
      updated_at: @task.updated_at,
      notes: @task.notes.map do |note|
        {
          id: note.id,
          content: note.content,
          user_name: note.user.name,
          created_at: note.created_at
        }
      end,
      activity_logs: @task.activity_logs.order(:created_at).map do |log|
        {
          id: log.id,
          action: log.action,
          user_name: log.user&.name,
          created_at: log.created_at,
          metadata: log.metadata
        }
      end,
      available_technicians: User.technician.map do |user|
        {
          id: user.id,
          name: user.name,
          initials: user.initials
        }
      end
    }
  end

  # GET /api/v1/jobs/:job_id/tasks/batch_details
  def batch_details
    # Load all tasks with their associated data in a single efficient query
    @tasks = @job.tasks.includes(:assigned_to, notes: :user, activity_logs: :user).order(:position)

    render json: {
      data: @tasks.map do |task|
        {
          type: "tasks",
          id: task.id,
          attributes: {
            title: task.title,
            status: task.status,
            position: task.position,
            parent_id: task.parent_id,
            created_at: task.created_at,
            updated_at: task.updated_at,
            notes: task.notes.order(:created_at).map do |note|
              {
                id: note.id,
                content: note.content,
                user_name: note.user.name,
                created_at: note.created_at
              }
            end,
            activity_logs: task.activity_logs.order(:created_at).map do |log|
              {
                id: log.id,
                action: log.action,
                user_name: log.user&.name,
                created_at: log.created_at,
                metadata: log.metadata
              }
            end
          },
          relationships: {
            assigned_to: {
              data: task.assigned_to ? { type: "users", id: task.assigned_to.id } : nil
            }
          }
        }
      end,
      included: build_included_users_for_batch(@tasks)
    }
  end

  # PATCH /api/v1/jobs/:job_id/tasks/:id/assign
  def assign
    technician_id = params[:technician_id]

    if technician_id.present?
      technician = User.find(technician_id)
      @task.update!(assigned_to: technician)

      render json: {
        status: "success",
        technician: {
          id: technician.id,
          name: technician.name
        }
      }
    else
      @task.update!(assigned_to: nil)

      render json: {
        status: "success",
        technician: nil
      }
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Technician not found" }, status: :not_found
  rescue ActiveRecord::RecordInvalid => e
    render json: { errors: e.record.errors.full_messages }, status: :unprocessable_entity
  end

  # POST /api/v1/jobs/:job_id/tasks/:id/notes
  def add_note
    content = params.dig(:note, :content)

    if content.blank?
      render json: { error: "Note content cannot be blank" }, status: :unprocessable_entity
      return
    end

    note = @task.notes.build(
      content: content,
      user: current_user
    )

    if note.save
      render json: {
        status: "success",
        note: {
          id: note.id,
          content: note.content,
          user_name: note.user.name,
          created_at: note.created_at
        }
      }
    else
      render json: { errors: note.errors.full_messages }, status: :unprocessable_entity
    end
  end

  def create
    @task = @job.tasks.build(task_params)

    if @task.save
      render json: {
        status: "success",
        task: task_attributes(@task)
      }, status: :created
    else
      render json: {
        errors: @task.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  def update
    if @task.update(task_params)
      render json: {
        status: "success",
        task: task_attributes(@task),
        timestamp: Time.current
      }
    else
      render json: {
        errors: @task.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  def destroy
    @task.destroy
    render json: {
      status: "success",
      message: "Task deleted successfully"
    }
  end

  # Individual task reorder
  def reorder
    position = params[:position]&.to_i

    if position.blank?
      render json: { error: "Position parameter required" }, status: :unprocessable_entity
      return
    end

    # Check lock_version if provided
    if params[:lock_version]
      expected_lock = params[:lock_version].to_i
      if @task.lock_version != expected_lock
        render json: {
          error: "Task has been modified by another user",
          conflict: true,
          current_lock_version: @task.lock_version
        }, status: :conflict
        return
      end
    end

    @task.insert_at(position)

    render json: {
      status: "success",
      timestamp: Time.current,
      lock_version: @task.reload.lock_version
    }
  rescue ActiveRecord::StaleObjectError => e
    render json: {
      error: "Task has been modified by another user",
      conflict: true,
      current_lock_version: @task.lock_version
    }, status: :conflict
  end

  # Batch reorder multiple tasks
  def batch_reorder
    if params[:positions].blank?
      render json: { error: "Positions parameter required" }, status: :unprocessable_entity
      return
    end

    # Use a transaction to ensure all updates succeed or all fail
    Task.transaction do
      # If job lock_version is provided, verify it hasn't changed
      if params[:job_lock_version]
        expected_job_lock = params[:job_lock_version].to_i
        if @job.lock_version != expected_job_lock
          raise ActiveRecord::StaleObjectError.new(@job, "lock_version")
        end
      end

      params[:positions].each do |position_data|
        task = @job.tasks.find(position_data[:id])

        # Check lock_version if provided
        if position_data[:lock_version]
          expected_lock = position_data[:lock_version].to_i
          if task.lock_version != expected_lock
            raise ActiveRecord::StaleObjectError.new(task, "lock_version")
          end
        end

        # Handle both parent_id and position changes in a single atomic update
        if position_data.key?(:parent_id)
          # When changing parent, we need to update both parent_id and position together
          # to avoid acts_as_list conflicts and lock version issues
          task.update!(
            parent_id: position_data[:parent_id],
            position: position_data[:position].to_i
          )
        else
          # If only position is changing, use acts_as_list method
          task.insert_at(position_data[:position].to_i)
        end
      end
    end

    render json: {
      status: "success",
      timestamp: Time.current,
      job_lock_version: @job.reload.lock_version,
      tasks: @job.tasks.map { |t| { id: t.id, lock_version: t.lock_version } }
    }
  rescue ActiveRecord::StaleObjectError => e
    conflict_data = if e.record.is_a?(Job)
      {
        error: "Job has been modified by another user",
        conflict: true,
        current_state: {
          job_lock_version: e.record.lock_version
        }
      }
    else
      {
        error: "One or more tasks have been modified by another user",
        conflict: true,
        current_state: {
          job_lock_version: @job.reload.lock_version,
          tasks: @job.tasks.map do |task|
            {
              id: task.id,
              title: task.title,
              position: task.position,
              parent_id: task.parent_id,
              status: task.status,
              lock_version: task.lock_version
            }
          end
        }
      }
    end

    render json: conflict_data, status: :conflict
  rescue ActiveRecord::RecordNotFound
    render json: {
      error: "One or more tasks not found"
    }, status: :not_found
  end

  def update_status
    status = params[:status]

    if status.blank?
      render json: { error: "Status parameter required" }, status: :unprocessable_entity
      return
    end

    if @task.update(status: status)
      render json: {
        status: "success",
        task: task_attributes(@task)
      }
    else
      render json: {
        errors: @task.errors.full_messages
      }, status: :unprocessable_entity
    end
  end

  private

  def set_current_user
    User.current_user = current_user
  end

  def find_job
    # Use the same permission logic as the Jobs API controller
    if current_user.admin? || current_user.owner?
      # Admins/owners can access any job
      @job = Job.includes(:tasks).find(params[:job_id])
    else
      # Regular users can only access jobs they're assigned to
      @job = current_user.technician_jobs.includes(:tasks).find(params[:job_id])
    end
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Job not found or not accessible" }, status: :not_found
  end

  def find_task
    @task = @job.tasks.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    render json: { error: "Task not found" }, status: :not_found
  end

  def task_params
    params.require(:task).permit(:title, :status, :parent_id, :position, :assigned_to_id)
  end

  def task_attributes(task)
    {
      id: task.id,
      title: task.title,
      status: task.status,
      position: task.position,
      parent_id: task.parent_id,
      created_at: task.created_at,
      updated_at: task.updated_at,
      lock_version: task.lock_version
    }
  end

  def build_included_users
    users = @tasks.filter_map(&:assigned_to).uniq
    users.map do |user|
      {
        type: "users",
        id: user.id,
        attributes: {
          name: user.name,
          email: user.email
        }
      }
    end
  end

  def build_included_users_for_batch(tasks)
    users = tasks.filter_map(&:assigned_to).uniq
    users.map do |user|
      {
        type: "users",
        id: user.id,
        attributes: {
          name: user.name,
          email: user.email
        }
      }
    end
  end
end
