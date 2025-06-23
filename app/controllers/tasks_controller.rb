class TasksController < ApplicationController
  skip_before_action :verify_authenticity_token, if: :json_request?
  before_action :set_client
  before_action :set_job
  before_action :set_task, only: [ :update, :destroy ]

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
    @task.destroy
    redirect_to client_job_path(@client, @job), notice: "Task was successfully deleted."
  end

  def reorder
    # Check if this is a member action (has :id) or collection action
    if params[:id]
      # Member action - single task reorder
      @task = @job.tasks.find(params[:id])

      if params[:position]
        @task.insert_at(params[:position].to_i)

        if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
          render_task_list_update
        else
          render json: { status: "success", timestamp: @task.reload.reordered_at }
        end
      else
        render json: { error: "Position parameter required" }, status: :unprocessable_entity
      end
    else
      # Collection action - batch reorder
      if params[:positions]
        params[:positions].each do |position_data|
          task = @job.tasks.find(position_data[:id])
          task.insert_at(position_data[:position].to_i)
        end

        if request.headers["Accept"]&.include?("text/vnd.turbo-stream.html")
          render_task_list_update
        else
          render json: { status: "success", timestamp: Time.current }
        end
      else
        render json: { error: "Positions parameter required" }, status: :unprocessable_entity
      end
    end
  end

  private

  def set_client
    @client = Client.find(params[:client_id])
  end

  def set_job
    @job = @client.jobs.find(params[:job_id])
  end

  def set_task
    @task = @job.tasks.find(params[:id])
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
end
