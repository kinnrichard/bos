class TasksController < ApplicationController
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :set_client
  before_action :authorize_client_access!
  before_action :set_job
  before_action :set_task, only: [ :update, :destroy, :details, :assign, :add_note ]

  def create
    @task = @job.tasks.build(task_params)

    if @task.save
      respond_to do |format|
        format.json { render json: {
          status: "success",
          task: @task.as_json(only: [ :id, :title, :status, :position ])
        } }
        format.html { redirect_to client_job_path(@client, @job), notice: "Task was successfully created." }
      end
    else
      respond_to do |format|
        format.json { render json: { error: @task.errors.full_messages.join(", ") }, status: :unprocessable_entity }
        format.html { redirect_to client_job_path(@client, @job), alert: "Error creating task." }
      end
    end
  end

  def update
    Rails.logger.info "=== TasksController#update ==="
    Rails.logger.info "Request format: #{request.format}"
    Rails.logger.info "Request format symbol: #{request.format.symbol}"
    Rails.logger.info "Is Turbo Stream?: #{request.format.turbo_stream?}"
    Rails.logger.info "Accept header: #{request.headers['Accept']}"
    Rails.logger.info "Params: #{params[:task].inspect}"

    # Handle position separately if provided with parent_id change
    if params[:task][:position].present? && params[:task][:parent_id].present?
      # First update parent_id
      @task.parent_id = params[:task][:parent_id]

      if @task.save
        # Then insert at the specific position
        @task.insert_at(params[:task][:position].to_i)

        if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
          render_task_list_update
        else
          respond_to do |format|
            format.json { render json: { status: "success", task: @task, timestamp: @task.reordered_at } }
            format.html { redirect_to client_job_path(@client, @job), notice: "Task was successfully updated." }
          end
        end
      else
        respond_to do |format|
          format.json { render json: { error: @task.errors.full_messages.join(", ") }, status: :unprocessable_entity }
          format.html { render :edit }
        end
      end
    elsif @task.update(task_params)
      # Check if client wants Turbo Stream response
      if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
        render_task_list_update
      else
        respond_to do |format|
          format.json { render json: { status: "success", task: @task, timestamp: @task.reordered_at } }
          format.html { redirect_to client_job_path(@client, @job), notice: "Task was successfully updated." }
        end
      end
    else
      respond_to do |format|
        format.json { render json: { error: @task.errors.full_messages.join(", ") }, status: :unprocessable_entity }
        format.html { render :edit }
      end
    end
  end

  def destroy
    # Check if user has permission to delete tasks (same as job deletion permissions)
    unless current_user.can_delete?(@job)
      respond_to do |format|
        format.html { redirect_to client_job_path(@client, @job), alert: "You do not have permission to delete this task." }
        format.json { render json: { error: "You do not have permission to delete this task." }, status: :forbidden }
      end
      return
    end

    @task.destroy

    respond_to do |format|
      format.html { redirect_to client_job_path(@client, @job), notice: "Task was successfully deleted." }
      format.json { render json: { status: "success", message: "Task was successfully deleted." } }
    end
  end

  def reorder
    # Check if this is a member action (has :id) or collection action
    if params[:id]
      # Member action - single task reorder
      handle_single_task_reorder
    else
      # Collection action - batch reorder
      handle_batch_task_reorder
    end
  rescue ActiveRecord::StaleObjectError => e
    # Handle optimistic locking conflict
    handle_reorder_conflict(e)
  end

  def handle_single_task_reorder
    @task = @job.tasks.find(params[:id])

    if params[:position].blank?
      render json: { error: "Position parameter required" }, status: :unprocessable_entity
      return
    end

    position = params[:position].to_i
    position = 1 if position < 1  # Ensure position is at least 1

    # Handle optimistic locking
    if params[:lock_version]
      # Reload task with lock check
      current_lock_version = @task.lock_version
      expected_lock_version = params[:lock_version].to_i

      if current_lock_version != expected_lock_version
        # Lock version mismatch - someone else updated the task
        raise ActiveRecord::StaleObjectError.new(@task, "lock_version")
      end
    end

    @task.insert_at(position)

    if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
      render_task_list_update
    else
      render json: {
        status: "success",
        timestamp: @task.reload.reordered_at,
        lock_version: @task.lock_version
      }
    end
  end

  def handle_batch_task_reorder
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

        task.insert_at(position_data[:position].to_i)
      end
    end

    if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
      render_task_list_update
    else
      render json: {
        status: "success",
        timestamp: Time.current,
        job_lock_version: @job.reload.lock_version,
        tasks: @job.tasks.map { |t| { id: t.id, lock_version: t.lock_version } }
      }
    end
  end

  def handle_reorder_conflict(error)
    # Reload to get current state
    @job.reload

    # Get fresh task data
    tasks_data = @job.tasks.includes(:parent).map do |task|
      {
        id: task.id,
        title: task.title,
        position: task.position,
        parent_id: task.parent_id,
        status: task.status,
        lock_version: task.lock_version
      }
    end

    respond_to do |format|
      format.json do
        render json: {
          error: "The tasks have been modified by another user. Please refresh and try again.",
          conflict: true,
          current_state: {
            job_lock_version: @job.lock_version,
            tasks: tasks_data
          }
        }, status: :conflict
      end

      format.html do
        if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
          # Send turbo stream update with current state
          render_task_list_update
        else
          redirect_to client_job_path(@client, @job),
            alert: "The tasks have been modified by another user. The page has been refreshed with the latest changes."
        end
      end
    end
  end

  def set_client
    @client = Client.find(params[:client_id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: "Client not found" }, status: :not_found }
    end
  end

  def set_job
    @job = @client.jobs.find(params[:job_id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: "Job not found" }, status: :not_found }
    end
  end

  def set_task
    @task = @job.tasks.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    respond_to do |format|
      format.html { render file: "#{Rails.root}/public/404.html", status: :not_found, layout: false }
      format.json { render json: { error: "Task not found" }, status: :not_found }
    end
  end

  def task_params
    params.require(:task).permit(:title, :status, :assigned_to_id, :parent_id, :position)
  end

  def json_request?
    request.format.json?
  end

  def json_or_turbo_stream_request?
    request.format.json? || request.format.turbo_stream?
  end

  # Get task details for info panel
  def details
    @task = @task.includes(:notes, :assigned_to, activity_logs: :user)
    @available_technicians = User.where(role: [ :technician, :admin ]).order(:name)

    render Components::Tasks::InfoPanelComponent.new(
      task: @task,
      current_user: current_user,
      available_technicians: @available_technicians
    )
  end

  # Assign task to technician
  def assign
    technician_id = params[:technician_id].presence
    @task.assigned_to_id = technician_id

    if @task.save
      # Log the assignment change
      if technician_id
        technician = User.find(technician_id)
        ActivityLog.create!(
          user: current_user,
          action: "assigned",
          loggable: @task,
          metadata: {
            assigned_to: technician.name,
            assigned_to_id: technician.id
          }
        )
      else
        ActivityLog.create!(
          user: current_user,
          action: "unassigned",
          loggable: @task
        )
      end

      render json: {
        status: "success",
        technician: technician_id ? { id: technician.id, name: technician.name } : nil
      }
    else
      render json: { error: @task.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  # Add note to task
  def add_note
    @note = @task.notes.build(note_params)
    @note.user = current_user

    if @note.save
      render json: {
        status: "success",
        note: {
          id: @note.id,
          content: @note.content,
          user_name: @note.user.name,
          created_at: @note.created_at
        }
      }
    else
      render json: { error: @note.errors.full_messages.join(", ") }, status: :unprocessable_entity
    end
  end

  # Search tasks within the job
  def search
    query = params[:q].to_s.strip
    return render json: { tasks: [] } if query.blank?

    # Search tasks by title within this job
    tasks = @job.tasks
      .where("LOWER(title) LIKE ?", "%#{query.downcase}%")
      .includes(:parent)
      .order(:position)
      .limit(20)

    # Format results with parent path
    results = tasks.map do |task|
      parent_titles = []
      current = task.parent
      while current
        parent_titles.unshift(current.title)
        current = current.parent
      end

      {
        id: task.id,
        title: task.title,
        status: task.status,
        parent_titles: parent_titles
      }
    end

    render json: { tasks: results }
  end

  def render_task_list_update
    Rails.logger.info "=== render_task_list_update called ==="

    sorting_service = TaskSortingService.new(@job)
    @tasks_tree = sorting_service.get_ordered_tasks

    Rails.logger.info "Tasks tree has #{@tasks_tree.size} root tasks"

    # Render the Phlex component
    html_content = Views::Tasks::ListComponent.new(job: @job, tasks_tree: @tasks_tree).call

    Rails.logger.info "Rendered HTML length: #{html_content.length}"

    # Create the Turbo Stream response manually
    turbo_stream_html = <<~HTML
      <turbo-stream action="update" target="tasks-list">
        <template>
          #{html_content}
        </template>
      </turbo-stream>
    HTML

    Rails.logger.info "Turbo Stream response: #{turbo_stream_html[0..200]}..."

    render plain: turbo_stream_html, content_type: "text/vnd.turbo-stream.html"
  end

  private

  def note_params
    params.require(:note).permit(:content)
  end
end
