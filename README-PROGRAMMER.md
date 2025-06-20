# Task list with drag-and-drop
class TaskList < Motion::Component
  state :tasks, -> { @case.tasks.ordered }
  
  def reorder(task_id, new_position)
    task = tasks.find { |t| t.id == task_id.to_i }
    old_position = tasks.index(task)
    
    # Update in-memory state for instant feedback
    tasks.delete_at(old_position)
    tasks.insert(new_position, task)
    
    # Persist to database
    task.insert_at(new_position + 1) # acts_as_list is 1-indexed
    
    refresh!
  end
  
  def view
    div(
      class: "task-list",
      data: { controller: "sortable" }
    ) do
      tasks.each_with_index do |task, index|
        div(
          class: "task-item",
          data: { 
            task_id: task.id,
            sortable_handle: true
          },
          "data-drag-end": ->(e) { 
            reorder(e.target.dataset.taskId, e.newIndex) 
          }
        ) do
          render TaskItem.new(task: task)
        end
      end
    end
  end
end
```

# Design System
- Font: -apple-system, BlinkMacSystemFont, Inter, sans-serif

# Simple Interactions (Stimulus)

```javascript
// sortable_controller.js - Initialize drag-and-drop
import { Controller } from "@hotwired/stimulus"
import Sortable from 'sortablejs'

export default class extends Controller {
  connect() {
    this.sortable = Sortable.create(this.element, {
      handle: '[data-sortable-handle]',
      animation: 150,
      onEnd: (event) => {
        // Motion handles the actual reordering
        const dragEndEvent = new CustomEvent('drag-end', {
          detail: { oldIndex: event.oldIndex, newIndex: event.newIndex }
        })
        event.item.dispatchEvent(dragEndEvent)
      }
    })
  }
}
```