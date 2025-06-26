// Get BasePopoverController from window.Bos
const { BasePopoverController } = window.Bos

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
      const statusEmojis = {
        'open': '⚫',
        'new': '⚫',
        'in_progress': '🟢',
        'paused': '⏸️',
        'successfully_completed': '☑️',
        'cancelled': '❌'
      }
      const statusLabels = {
        'open': 'New',
        'new': 'New',
        'in_progress': 'In Progress',
        'paused': 'Paused',
        'successfully_completed': 'Successfully Completed',
        'cancelled': 'Cancelled'
      }
      
      const statusValue = statusDropdown.querySelector('.dropdown-value')
      if (statusValue && currentStatus) {
        statusValue.innerHTML = `
          <span class="status-emoji">${statusEmojis[currentStatus] || '⚫'}</span>
          <span>${statusLabels[currentStatus] || currentStatus}</span>
        `
      }
      
      // Update active states
      statusDropdown.querySelectorAll('.status-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.status === currentStatus)
      })
    }
    
    // Update priority dropdown
    const priorityDropdown = this.element.querySelector('.popover-section:nth-child(3) .dropdown-container')
    if (priorityDropdown) {
      const currentPriority = jobController.priorityValue || jobController.getValueFromJobView('jobPriorityValue')
      const priorityEmojis = {
        'critical': '🔥',
        'high': '❗',
        'normal': '',
        'low': '➖',
        'proactive_followup': '💬'
      }
      const priorityLabels = {
        'critical': 'Critical',
        'high': 'High',
        'normal': 'Normal',
        'low': 'Low',
        'proactive_followup': 'Proactive Followup'
      }
      
      const priorityValue = priorityDropdown.querySelector('.dropdown-value')
      if (priorityValue && currentPriority) {
        const emoji = priorityEmojis[currentPriority] || ''
        const label = priorityLabels[currentPriority] || currentPriority
        priorityValue.innerHTML = emoji ? 
          `<span class="priority-emoji">${emoji}</span><span>${label}</span>` :
          `<span>${label}</span>`
      }
      
      // Update active states
      priorityDropdown.querySelectorAll('.priority-option').forEach(opt => {
        opt.classList.toggle('active', opt.dataset.priority === currentPriority)
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