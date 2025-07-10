# bŏs Performance Guidelines

## Overview

This document outlines performance best practices and optimization strategies for the bŏs application. Following these guidelines ensures the application remains fast and responsive as it scales.

## Performance Targets

- **Page Load:** < 200ms (server response)
- **Interaction Delay:** < 100ms
- **Search Results:** < 100ms
- **Asset Load:** < 1 second (first visit)
- **Memory Usage:** < 500MB per process

## Database Performance

### Query Optimization

#### Use Eager Loading

```ruby
# Bad - N+1 queries
clients = Client.all
clients.each { |c| puts c.jobs.count }  # Query per client!

# Good - Single query with includes
clients = Client.includes(:jobs)
clients.each { |c| puts c.jobs.size }   # No additional queries

# Better - Counter cache
class Job < ApplicationRecord
  belongs_to :client, counter_cache: true
end
# Use: client.jobs_count
```

#### Complex Eager Loading

```ruby
# Load multiple associations efficiently
clients = Client.includes(
  :devices,
  :people,
  jobs: [:tasks, :assigned_technicians]
).where(status: "active")
```

### Indexing Strategy

Essential indexes are already in place:
- Foreign keys (automatic in Rails 7+)
- Lookup fields (name, email, code)
- Composite indexes for common queries

```ruby
# Example: Composite index for filtering
add_index :jobs, [:client_id, :status]
add_index :tasks, [:job_id, :status, :position]
```

### Database-Level Optimizations

```ruby
# Use database for calculations
Job.where(client_id: 1).sum(:total_hours)  # Good
jobs.map(&:total_hours).sum                # Bad

# Use pluck for single columns
User.active.pluck(:email)                  # Good
User.active.map(&:email)                   # Bad

# Use select for partial objects
Client.select(:id, :name).active           # Good
Client.active                              # Bad (if only need 2 fields)
```

## Rails Performance

### Caching Strategy

#### Fragment Caching

```ruby
# In Phlex components
def view_template
  cache_key = ["client_card", @client, @client.updated_at]
  
  Rails.cache.fetch(cache_key, expires_in: 1.hour) do
    expensive_render_operation
  end
end
```

#### Low-Level Caching

```ruby
# Cache expensive calculations
def monthly_revenue
  Rails.cache.fetch("client/#{id}/revenue/#{Date.current.month}", expires_in: 1.day) do
    jobs.completed.this_month.sum(:total_amount)
  end
end
```

#### Cache Invalidation

```ruby
# Clear related caches on update
after_update :clear_caches

private

def clear_caches
  Rails.cache.delete_matched("client/#{id}/*")
end
```

### Background Jobs

Move heavy operations to background:
```ruby
# Bad - Synchronous email
ClientMailer.welcome(@client).deliver_now

# Good - Background job
ClientMailer.welcome(@client).deliver_later

# Better - With priority
ClientMailer.welcome(@client).deliver_later(priority: 10)
```

### Memory Management

```ruby
# Process large datasets in batches
Client.find_each(batch_size: 100) do |client|
  process_client(client)
end

# Don't load unnecessary data
# Bad
all_logs = ActivityLog.all.to_a

# Good
ActivityLog.where(created_at: 1.week.ago..).find_each
```

## Frontend Performance

### Asset Optimization

#### CSS Performance

```scss
// Use CSS variables for repeated values
:root {
  --space-md: 1.5rem;
  --color-primary: #00A3FF;
}

// Avoid deep nesting (max 3 levels)
.component {
  &__element {
    // Good
  }
  
  &__element {
    &__sub {
      &__deep {
        // Bad - too deep
      }
    }
  }
}

// Use will-change sparingly
.animated-element {
  will-change: transform; // Only when actually animating
}
```

#### JavaScript Performance

```javascript
// Debounce expensive operations
export default class extends Controller {
  initialize() {
    this.search = debounce(this.search.bind(this), 300)
  }
  
  search() {
    // Search logic
  }
}

// Use event delegation
document.addEventListener('click', (e) => {
  if (e.target.matches('.dynamic-button')) {
    handleClick(e)
  }
})

// Avoid forced reflows
// Bad
element.style.height = '100px'
console.log(element.offsetHeight) // Forces reflow

// Good
element.style.height = '100px'
requestAnimationFrame(() => {
  console.log(element.offsetHeight)
})
```

### Stimulus Controller Optimization

```javascript
// Lazy load controllers
// app/javascript/controllers/index.js
import { lazyLoadController } from './lazy_loader'

// Load heavy controllers only when needed
lazyLoadController('chart', () => import('./chart_controller'))
```

### Image Optimization

1. Use appropriate formats:
   - SVG for icons and logos
   - WebP for photos (with fallbacks)
   - PNG for screenshots

2. Lazy load images:
```html
<img src="placeholder.jpg" 
     data-src="actual-image.jpg" 
     loading="lazy">
```

## Search Performance

### Database Search

```ruby
# Use PostgreSQL full-text search
class Client < ApplicationRecord
  include PgSearch::Model
  
  pg_search_scope :search_by_name,
    against: [:name, :code],
    using: {
      tsearch: { prefix: true }
    }
end

# Add GIN index for better performance
add_index :clients, :name, using: :gin
```

### Search Implementation

```ruby
# Limit results
clients = Client.search(params[:q]).limit(10)

# Add simple caching
def search_clients(query)
  Rails.cache.fetch("search/clients/#{query}", expires_in: 5.minutes) do
    Client.search(query).limit(10).to_a
  end
end
```

## Monitoring & Profiling

### Development Tools

```ruby
# Add to Gemfile (development group)
gem 'rack-mini-profiler'
gem 'bullet'  # N+1 query detection
gem 'memory_profiler'

# Profile specific code
require 'memory_profiler'
report = MemoryProfiler.report do
  # Code to profile
end
report.pretty_print
```

### Production Monitoring

Monitor these metrics:
- Response times (P50, P95, P99)
- Database query times
- Memory usage per process
- Background job queue depth
- Cache hit rates

### Performance Testing

```ruby
# Benchmark critical paths
require 'benchmark'

Benchmark.measure do
  1000.times { Client.search("test") }
end

# Load test with Apache Bench
# ab -n 1000 -c 10 http://localhost:3000/clients
```

## Common Performance Issues

### N+1 Queries

**Symptom:** Many similar queries in logs
**Fix:** Use `includes`, `preload`, or `eager_load`

```ruby
# Detect with Bullet gem in development
# Fix with eager loading
@jobs = Job.includes(:client, :tasks, :technicians)
```

### Slow Page Loads

**Symptom:** Pages take > 500ms to render
**Fix:** 
1. Add database indexes
2. Implement caching
3. Move heavy operations to background

### Memory Bloat

**Symptom:** Process memory grows over time
**Fix:**
1. Use `find_each` for large datasets
2. Clear caches periodically
3. Avoid storing large objects in memory

### Asset Pipeline Issues

**Symptom:** CSS/JS changes not appearing
**Fix:**
```bash
rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json
```

## Performance Checklist

Before deploying new features:

- [ ] No N+1 queries (check with Bullet)
- [ ] Database queries use appropriate indexes
- [ ] Large datasets processed in batches
- [ ] Heavy operations moved to background jobs
- [ ] Caching implemented for expensive operations
- [ ] Assets minified and compressed
- [ ] Images optimized and lazy loaded
- [ ] JavaScript debounced for user input
- [ ] Memory usage stable under load
- [ ] Response times meet targets

## Optimization Workflow

1. **Measure First**
   - Use profiling tools
   - Identify bottlenecks
   - Set performance targets

2. **Optimize Database**
   - Add missing indexes
   - Eliminate N+1 queries
   - Use counter caches

3. **Add Caching**
   - Fragment cache views
   - Cache expensive calculations
   - Use Russian doll caching

4. **Optimize Frontend**
   - Minimize asset size
   - Lazy load resources
   - Debounce interactions

5. **Monitor Results**
   - Track improvements
   - Watch for regressions
   - Iterate as needed

Remember: Premature optimization is the root of all evil. Profile first, optimize what matters.