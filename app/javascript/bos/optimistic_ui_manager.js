// Module for managing optimistic UI updates with rollback capability
export class OptimisticUIManager {
  constructor() {
    this.pendingUpdates = new Map()
    this.updateHistory = []
    this.maxHistorySize = 50
  }

  // Create a snapshot of current state before making changes
  createSnapshot(element, attributes = []) {
    const snapshot = {
      element,
      timestamp: Date.now(),
      data: {}
    }

    // Capture element attributes
    attributes.forEach(attr => {
      if (element.hasAttribute(attr)) {
        snapshot.data[attr] = element.getAttribute(attr)
      }
    })

    // Capture dataset values
    Object.keys(element.dataset).forEach(key => {
      snapshot.data[`data-${key}`] = element.dataset[key]
    })

    // Capture classes
    snapshot.data.className = element.className

    // Capture text content for editable elements
    if (element.isContentEditable || element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
      snapshot.data.value = element.value || element.textContent
    }

    // Capture checked state for checkboxes/radios
    if (element.type === 'checkbox' || element.type === 'radio') {
      snapshot.data.checked = element.checked
    }

    return snapshot
  }

  // Apply optimistic update and track it
  async applyOptimisticUpdate(updateId, updates, rollbackFn) {
    const update = {
      id: updateId,
      timestamp: Date.now(),
      updates,
      rollbackFn,
      snapshots: []
    }

    // Create snapshots before applying updates
    updates.forEach(({ element, changes }) => {
      const snapshot = this.createSnapshot(element, Object.keys(changes))
      update.snapshots.push(snapshot)
    })

    // Apply the updates
    updates.forEach(({ element, changes }) => {
      this.applyChanges(element, changes)
    })

    // Store the update
    this.pendingUpdates.set(updateId, update)
    this.addToHistory(update)

    return update
  }

  // Apply changes to an element
  applyChanges(element, changes) {
    Object.entries(changes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value
      } else if (key === 'textContent') {
        element.textContent = value
      } else if (key === 'innerHTML' && window.Bos?.SafeDOM) {
        window.Bos.SafeDOM.setHTML(element, value)
      } else if (key === 'value') {
        element.value = value
      } else if (key === 'checked') {
        element.checked = value
      } else if (key.startsWith('data-')) {
        const dataKey = key.substring(5)
        element.dataset[dataKey] = value
      } else {
        element.setAttribute(key, value)
      }
    })
  }

  // Confirm an optimistic update (remove from pending)
  confirmUpdate(updateId) {
    const update = this.pendingUpdates.get(updateId)
    if (update) {
      this.pendingUpdates.delete(updateId)
      update.confirmed = true
      console.log(`Optimistic update ${updateId} confirmed`)
    }
  }

  // Rollback an optimistic update
  rollbackUpdate(updateId, reason = 'Unknown error') {
    const update = this.pendingUpdates.get(updateId)
    if (!update) {
      console.warn(`No pending update found for ${updateId}`)
      return
    }

    console.log(`Rolling back update ${updateId}: ${reason}`)

    // Restore snapshots in reverse order
    update.snapshots.reverse().forEach(snapshot => {
      this.restoreSnapshot(snapshot)
    })

    // Call custom rollback function if provided
    if (update.rollbackFn) {
      try {
        update.rollbackFn(reason)
      } catch (error) {
        console.error('Error in rollback function:', error)
      }
    }

    // Remove from pending
    this.pendingUpdates.delete(updateId)
    update.rolledBack = true
    update.rollbackReason = reason

    // Show notification if available
    if (window.Bos?.NotificationManager) {
      window.Bos.NotificationManager.warning(
        'Your changes have been reverted due to an error.',
        'Update Failed'
      )
    }
  }

  // Restore element state from snapshot
  restoreSnapshot(snapshot) {
    const { element, data } = snapshot

    Object.entries(data).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value
      } else if (key === 'value') {
        if (element.isContentEditable) {
          element.textContent = value
        } else {
          element.value = value
        }
      } else if (key === 'checked') {
        element.checked = value
      } else if (key.startsWith('data-')) {
        const dataKey = key.substring(5)
        element.dataset[dataKey] = value
      } else {
        element.setAttribute(key, value)
      }
    })
  }

  // Add update to history
  addToHistory(update) {
    this.updateHistory.unshift(update)
    if (this.updateHistory.length > this.maxHistorySize) {
      this.updateHistory.pop()
    }
  }

  // Get pending updates
  getPendingUpdates() {
    return Array.from(this.pendingUpdates.values())
  }

  // Clear old pending updates (cleanup)
  clearOldPendingUpdates(maxAge = 60000) {
    const now = Date.now()
    const toDelete = []

    this.pendingUpdates.forEach((update, id) => {
      if (now - update.timestamp > maxAge) {
        toDelete.push(id)
      }
    })

    toDelete.forEach(id => {
      console.warn(`Clearing stale optimistic update: ${id}`)
      this.pendingUpdates.delete(id)
    })
  }

  // Helper to create update ID
  generateUpdateId(prefix = 'update') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Convenience method for common update patterns
  async updateWithRollback(element, changes, asyncOperation) {
    const updateId = this.generateUpdateId()
    
    // Apply optimistic update
    const update = await this.applyOptimisticUpdate(
      updateId,
      [{ element, changes }],
      () => console.log(`Rolled back ${updateId}`)
    )

    try {
      // Perform the async operation
      const result = await asyncOperation()
      
      // Confirm the update
      this.confirmUpdate(updateId)
      
      return result
    } catch (error) {
      // Rollback on error
      this.rollbackUpdate(updateId, error.message)
      throw error
    }
  }

  // Batch multiple updates together
  async batchUpdateWithRollback(updates, asyncOperation) {
    const updateId = this.generateUpdateId('batch')
    
    // Apply all optimistic updates
    const update = await this.applyOptimisticUpdate(
      updateId,
      updates,
      () => console.log(`Rolled back batch ${updateId}`)
    )

    try {
      // Perform the async operation
      const result = await asyncOperation()
      
      // Confirm all updates
      this.confirmUpdate(updateId)
      
      return result
    } catch (error) {
      // Rollback all updates on error
      this.rollbackUpdate(updateId, error.message)
      throw error
    }
  }
}

// Create singleton instance
export const optimisticUI = new OptimisticUIManager()

// Auto-cleanup old pending updates every minute
setInterval(() => {
  optimisticUI.clearOldPendingUpdates()
}, 60000)