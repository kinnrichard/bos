// Get BasePopoverController and icons from window.Bos
const { BasePopoverController } = window.Bos
const { jobStatusEmoji, jobStatusLabel, jobPriorityEmoji, priorityLabel } = window.Bos?.Icons || {}
const { SafeDOM } = window.Bos || {}

// Connects to data-controller="job-popover"
export default class extends BasePopoverController {
  static targets = ["content"]
  static values = { 
    closeOnClickOutside: { type: Boolean, default: true },
    zIndex: { type: Number, default: 1000 },
    animationDuration: { type: Number, default: 200 },
    jobId: Number,
    clientId: Number
  }
  
  childConnect() {
    // Job popover controller connected
  }
  
  onShow() {
    // Update dropdown displays to reflect current state
    this.updateDropdownDisplays()
  }
  
  
  updateDropdownDisplays() {
    // Get the job controller to access current values
    const jobView = document.querySelector('.job-view')
    if (!jobView) return
    
    const jobController = this.application.getControllerForElementAndIdentifier(jobView, 'job')
    if (!jobController) return
    
    // Update status dropdown
    const statusDropdown = this.element.querySelector('.popover-section:nth-child(1) .dropdown-container')
    if (statusDropdown) {
      const currentStatus = jobController.statusValue || jobController.getValueFromJobView('jobStatusValue')
      
      const statusValue = statusDropdown.querySelector('.dropdown-value')
      if (statusValue && currentStatus && SafeDOM) {
        const content = SafeDOM.createDropdownContent(jobStatusEmoji(currentStatus), jobStatusLabel(currentStatus))
        SafeDOM.replaceChildren(statusValue, content)
      }
      
      // Update active states
      statusDropdown.querySelectorAll('.status-option').forEach(opt => {
        // Convert hyphens back to underscores for comparison
        const optStatus = opt.dataset.status.replace(/-/g, '_')
        opt.classList.toggle('active', optStatus === currentStatus)
      })
    }
    
    // Update priority dropdown
    const priorityDropdown = this.element.querySelector('.popover-section:nth-child(3) .dropdown-container')
    if (priorityDropdown) {
      const currentPriority = jobController.priorityValue || jobController.getValueFromJobView('jobPriorityValue')
      
      const priorityValue = priorityDropdown.querySelector('.dropdown-value')
      if (priorityValue && currentPriority && SafeDOM) {
        const emoji = jobPriorityEmoji(currentPriority)
        const label = priorityLabel(currentPriority)
        
        const content = emoji 
          ? [
              SafeDOM.element('span', { className: 'priority-emoji' }, [emoji]),
              SafeDOM.element('span', {}, [label])
            ]
          : [SafeDOM.element('span', {}, [label])]
        
        SafeDOM.replaceChildren(priorityValue, content)
      }
      
      // Update active states
      priorityDropdown.querySelectorAll('.priority-option').forEach(opt => {
        // Convert hyphens back to underscores for comparison
        const optPriority = opt.dataset.priority.replace(/-/g, '_')
        opt.classList.toggle('active', optPriority === currentPriority)
      })
    }
    
    // Update assignee dropdown (more complex due to multi-select)
    const assigneeDropdown = this.element.querySelector('.popover-section:nth-child(2) .dropdown-container')
    if (assigneeDropdown) {
      // Get currently selected technicians from active assignee options
      const activeTechs = assigneeDropdown.querySelectorAll('.assignee-option.active[data-technician-id]')
      const assigneeValue = assigneeDropdown.querySelector('.dropdown-value')
      
      if (assigneeValue && SafeDOM) {
        if (activeTechs.length === 0) {
          // Check if unassigned option is active
          const unassignedActive = assigneeDropdown.querySelector('.assignee-option[data-action*="setUnassigned"]')?.classList.contains('active')
          if (!unassignedActive) {
            // If nothing is marked active, default to unassigned
            const unassignedOption = assigneeDropdown.querySelector('.assignee-option[data-action*="setUnassigned"]')
            if (unassignedOption) {
              unassignedOption.classList.add('active')
            }
          }
          const content = [
            SafeDOM.element('span', {}, ['❓']),
            SafeDOM.element('span', {}, ['Unassigned'])
          ]
          SafeDOM.replaceChildren(assigneeValue, content)
        } else if (activeTechs.length === 1) {
          const tech = activeTechs[0]
          const iconElement = tech.querySelector('span:first-child')
          const name = tech.querySelector('span:nth-child(2)')?.textContent || ''
          const content = []
          
          if (iconElement) {
            content.push(iconElement.cloneNode(true))
          }
          content.push(SafeDOM.element('span', {}, [name]))
          
          SafeDOM.replaceChildren(assigneeValue, content)
        } else {
          const content = [SafeDOM.element('span', {}, [`${activeTechs.length} assigned`])]
          SafeDOM.replaceChildren(assigneeValue, content)
        }
      }
    }
  }
}