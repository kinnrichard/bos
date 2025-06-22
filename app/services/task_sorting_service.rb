class TaskSortingService
  def initialize(job)
    @job = job
  end

  def sort_and_resolve_conflicts(task_updates = [])
    # Process updates by timestamp to resolve conflicts
    sorted_updates = task_updates.sort_by { |update| update[:timestamp] || Time.current }
    
    sorted_updates.each do |update|
      task = @job.tasks.find(update[:id])
      
      # Update parent if changed
      if update[:parent_id] != task.parent_id
        task.parent_id = update[:parent_id]
      end
      
      # Update position if provided
      if update[:position].present?
        task.insert_at(update[:position].to_i)
      end
      
      # Update reordered_at timestamp
      task.update_column(:reordered_at, Time.current)
    end
    
    # Return all tasks properly ordered
    get_ordered_tasks
  end

  def get_ordered_tasks
    # Get root tasks with proper ordering
    root_tasks = @job.tasks.root_tasks.ordered_by_status
    
    # Build complete task tree
    tasks_tree = []
    root_tasks.each do |task|
      tasks_tree << build_task_tree(task)
    end
    
    tasks_tree
  end

  private

  def build_task_tree(task, depth = 0)
    {
      task: task,
      depth: depth,
      subtasks: task.subtasks.ordered_by_status.map { |subtask| 
        build_task_tree(subtask, depth + 1) 
      }
    }
  end
end