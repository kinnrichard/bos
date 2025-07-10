# Cache Invalidation Guide

This guide covers the automatic cache invalidation system in our Rails application and how to use it when adding new models or relationships.

## Quick Start Checklist

When adding a new model or relationship, follow these steps:

### ✅ For New Models

1. **Inherit from ApplicationRecord** (gets Touchable concern automatically)
2. **Add belongs_to relationships** - touch behavior is automatic for known parent models
3. **Run the audit** - `rails cache:audit` to verify setup
4. **Add tests** - Use the generated cache invalidation tests

### ✅ For New Relationships

1. **belongs_to relationships** are handled automatically
2. **has_many relationships** may need touch configuration on the child model
3. **Complex relationships** can use the CacheInvalidation DSL

## Automatic Touch Behavior

The `Touchable` concern automatically adds `touch: true` to belongs_to relationships when:

- The parent model is a known cacheable entity (Job, Client, User, Person, Task)
- The association name matches touchable patterns
- The association is not explicitly excluded

### Examples

```ruby
class Task < ApplicationRecord
  # ✅ Automatically gets touch: true (Job is cacheable)
  belongs_to :job
  
  # ✅ Automatically gets touch: true (User is cacheable) 
  belongs_to :assigned_to, class_name: 'User'
  
  # ❌ No automatic touch (polymorphic associations excluded)
  belongs_to :notable, polymorphic: true
end
```

## Manual Configuration

### Disabling Auto-Touch

```ruby
class SomeModel < ApplicationRecord
  # Disable auto-touch for specific associations
  touchable_config skip_touch: [:some_association]
  
  # Or disable auto-touch entirely
  touchable_config disabled: true
  
  belongs_to :job  # Won't get auto-touch
end
```

### Enabling Touch for Non-Standard Associations

```ruby
class SomeModel < ApplicationRecord
  # Only auto-touch these specific associations
  touchable_config only_touch: [:job, :custom_parent]
  
  belongs_to :job           # Gets touch: true
  belongs_to :custom_parent # Gets touch: true  
  belongs_to :other_thing   # No touch
end
```

### Explicit Touch Control

```ruby
class Task < ApplicationRecord
  belongs_to :job, touch: true    # Explicit enable
  belongs_to :user, touch: false  # Explicit disable
end
```

## Advanced Cache Invalidation

For complex scenarios, use the `CacheInvalidation` DSL:

```ruby
class Task < ApplicationRecord
  include CacheInvalidation
  
  # Simple invalidation
  invalidates_cache_for :job
  
  # Conditional invalidation
  invalidates_cache_for :job, if: :affects_job_display?
  
  # Multiple targets
  invalidates_cache_for :job, :client
  
  # Through associations
  invalidates_cache_for :client, through: :job
  
  # Custom timing
  invalidates_cache_for :job, on: [:update, :destroy]
  
  private
  
  def affects_job_display?
    title_changed? || status_changed?
  end
end
```

## Validation Tools

### Audit Existing Models

```bash
# Check for missing touch relationships
rails cache:audit

# Show all current touch relationships  
rails cache:relationships

# Test cache invalidation for a specific record
rails cache:test[Task,abc-123]
```

### Understanding Audit Output

```
🚨 CRITICAL (2):
   Task#job -> Job
     Fix: Add `touch: true` to belongs_to :job

⚠️  HIGH (1):
   JobAssignment#user -> User  
     Fix: Add `touch: true` to belongs_to :user
```

Severity levels:
- **CRITICAL**: Affects Job (main cache entity)
- **HIGH**: Affects Client, User (major entities)
- **MEDIUM**: Affects Task, Person (secondary entities)  
- **LOW**: Other associations

## Common Patterns

### Join Tables / Many-to-Many

```ruby
class JobAssignment < ApplicationRecord
  belongs_to :job, touch: true   # ✅ Touch the job when assignment changes
  belongs_to :user               # ❌ Usually don't touch users for job changes
end
```

### Hierarchical Models

```ruby
class Task < ApplicationRecord
  belongs_to :job, touch: true           # ✅ Touch job when task changes
  belongs_to :parent, class_name: 'Task' # ❌ Don't touch parent tasks by default
  
  # Use CacheInvalidation for complex hierarchy rules
  invalidates_cache_for :job, if: :affects_job_summary?
end
```

### Polymorphic Associations

```ruby
class Note < ApplicationRecord
  belongs_to :notable, polymorphic: true  # ❌ Auto-touch disabled for polymorphic
  
  # Use CacheInvalidation for polymorphic touch logic
  invalidates_cache_for :notable, if: -> { notable.respond_to?(:touch) }
end
```

## Testing Cache Invalidation

### Generated Tests

When you create a model with cache invalidation, add tests:

```ruby
RSpec.describe Task, type: :model do
  describe "cache invalidation" do
    let(:job) { create(:job) }
    let(:task) { create(:task, job: job) }
    
    it "touches job when task status changes" do
      original_time = job.updated_at
      
      travel 1.second do
        task.update!(status: 'completed')
      end
      
      expect(job.reload.updated_at).to be > original_time
    end
  end
end
```

### Testing Complex Rules

```ruby
# Preview what would be invalidated
task.cache_invalidation_preview
#=> [
#  {
#    rule: "Invalidates job (if: affects_job_display?, on: update)",
#    targets: ["Job#abc-123"],
#    will_execute: true
#  }
#]
```

## Debugging Cache Issues

### Check Touch Relationships

```ruby
# See which associations will touch
task.touchable_associations
#=> [:job, :assigned_to]

# Check if specific association touches
task.will_touch?(:job)
#=> true
```

### Verify Cache Invalidation Rules

```ruby
# See all rules for a model
Task.cache_invalidation_summary
#=> "1. Invalidates job (if: affects_job_display?, on: create, update, destroy)"
```

### Test in Development

```ruby
# In rails console
job = Job.first
original_time = job.updated_at

# Make a change
job.tasks.first.update!(title: "New title")

# Check if job was touched
job.reload.updated_at > original_time
#=> true
```

## Performance Considerations

### Avoid Over-Touching

```ruby
# ❌ Don't touch for every small change
belongs_to :job, touch: true

# ✅ Touch only when it matters
invalidates_cache_for :job, if: :affects_display?
```

### Batch Operations

```ruby
# ❌ Touches job for each task
100.times { job.tasks.create!(title: "Task") }

# ✅ Touch once after batch
Job.no_touching do
  100.times { job.tasks.create!(title: "Task") }
end
job.touch
```

## Troubleshooting

### Common Issues

1. **Changes don't appear immediately**
   - Check if touch relationship exists
   - Verify ETag invalidation in browser
   - Run `rails cache:audit`

2. **Touch not working**
   - Ensure parent record exists
   - Check for validation errors
   - Verify touch: true option

3. **Performance issues**
   - Review conditional invalidation
   - Consider batch operations
   - Monitor touch frequency

### Getting Help

1. Run `rails cache:audit` for automated diagnosis
2. Check the Cache Invalidation section in this guide
3. Use `cache_invalidation_preview` for debugging
4. Ask the team if you're unsure about cache dependencies

## Migration Guide

If you have existing models without proper cache invalidation:

1. **Run the audit**: `rails cache:audit`
2. **Fix critical issues first** (Job-related models)
3. **Add tests** for cache invalidation
4. **Verify in staging** before deploying

Remember: Cache invalidation is one of the hardest problems in computer science, but with these tools, we can make it systematic and reliable! 🚀