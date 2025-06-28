// Status and Priority value converter to ensure consistency
// Converts between hyphenated (HTML/CSS) and underscored (Rails/DB) formats

export class StatusConverter {
  // Convert underscore format to hyphen format for HTML/CSS
  static toHyphen(value) {
    if (!value) return value
    return value.replace(/_/g, '-')
  }

  // Convert hyphen format to underscore format for Rails/DB
  static toUnderscore(value) {
    if (!value) return value
    return value.replace(/-/g, '_')
  }

  // Ensure value is in underscore format (for backend)
  static ensureUnderscore(value) {
    return this.toUnderscore(value)
  }

  // Ensure value is in hyphen format (for frontend)
  static ensureHyphen(value) {
    return this.toHyphen(value)
  }

  // Compare two status/priority values regardless of format
  static areEqual(value1, value2) {
    if (!value1 || !value2) return value1 === value2
    return this.toUnderscore(value1) === this.toUnderscore(value2)
  }

  // Get the proper format for data attributes
  static forDataAttribute(value) {
    return this.toHyphen(value)
  }

  // Get the proper format for API calls
  static forAPI(value) {
    return this.toUnderscore(value)
  }

  // Convert an array of values
  static convertArray(values, toFormat = 'underscore') {
    if (!Array.isArray(values)) return values
    
    const converter = toFormat === 'hyphen' ? this.toHyphen : this.toUnderscore
    return values.map(value => converter.call(this, value))
  }

  // Job status conversions
  static jobStatuses = {
    // Underscore to hyphen mapping
    underscore: {
      'open': 'open',
      'in_progress': 'in-progress',
      'paused': 'paused',
      'successfully_completed': 'successfully-completed',
      'cancelled': 'cancelled'
    },
    // Hyphen to underscore mapping
    hyphen: {
      'open': 'open',
      'in-progress': 'in_progress',
      'paused': 'paused',
      'successfully-completed': 'successfully_completed',
      'cancelled': 'cancelled'
    }
  }

  // Task status conversions
  static taskStatuses = {
    // Underscore to hyphen mapping
    underscore: {
      'new_task': 'new-task',
      'in_progress': 'in-progress',
      'paused': 'paused',
      'successfully_completed': 'successfully-completed',
      'cancelled': 'cancelled'
    },
    // Hyphen to underscore mapping
    hyphen: {
      'new-task': 'new_task',
      'in-progress': 'in_progress',
      'paused': 'paused',
      'successfully-completed': 'successfully_completed',
      'cancelled': 'cancelled'
    }
  }

  // Priority conversions
  static priorities = {
    // Underscore to hyphen mapping
    underscore: {
      'critical': 'critical',
      'high': 'high',
      'normal': 'normal',
      'low': 'low',
      'proactive_followup': 'proactive-followup'
    },
    // Hyphen to underscore mapping
    hyphen: {
      'critical': 'critical',
      'high': 'high',
      'normal': 'normal',
      'low': 'low',
      'proactive-followup': 'proactive_followup'
    }
  }
}