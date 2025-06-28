// Get BasePopoverController and icons from window.Bos
const { BasePopoverController } = window.Bos
const { jobStatusEmoji, jobStatusLabel, jobPriorityEmoji, priorityLabel } = window.Bos?.Icons || {}

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
      if (statusValue && currentStatus) {
        statusValue.innerHTML = `
          <span class="status-emoji">${jobStatusEmoji(currentStatus)}</span>
          <span>${jobStatusLabel(currentStatus)}</span>
        `
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
      if (priorityValue && currentPriority) {
        const emoji = jobPriorityEmoji(currentPriority)
        const label = priorityLabel(currentPriority)
        priorityValue.innerHTML = emoji ? 
          `<span class="priority-emoji">${emoji}</span><span>${label}</span>` :
          `<span>${label}</span>`
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
      
      if (assigneeValue) {
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
          assigneeValue.innerHTML = '<span>❓</span><span>Unassigned</span>'
        } else if (activeTechs.length === 1) {
          const tech = activeTechs[0]
          const iconHtml = tech.querySelector('span:first-child')?.outerHTML || ''
          const name = tech.querySelector('span:nth-child(2)')?.textContent || ''
          assigneeValue.innerHTML = `${iconHtml}<span>${name}</span>`
        } else {
          assigneeValue.innerHTML = `<span>${activeTechs.length} assigned</span>`
        }
      }
    }
  }
}