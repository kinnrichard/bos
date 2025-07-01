# bŏs Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues in the bŏs application. Issues are organized by category with symptoms, causes, and solutions.

## Development Environment Issues

### Rails Server Won't Start

**Symptoms:**
- `rails server` fails
- Port already in use error
- Bundle errors

**Solutions:**
```bash
# Kill existing Rails processes
lsof -i :3000
kill -9 [PID]

# Or use
rails restart

# Bundle issues
bundle install
bundle update

# Database issues
rails db:create
rails db:migrate
rails db:seed
```

### Assets Not Updating

**Symptoms:**
- CSS/JS changes not appearing
- Old styles persisting
- 404 errors for assets

**Solution:**
```bash
# The nuclear option - clears everything
rails tmp:clear && rails assets:clobber && rails assets:precompile && rm -f public/assets/.manifest.json

# Restart server after
rails restart
```

**Prevention:**
- Always run the asset rebuild command after CSS/JS changes
- Check `config/importmap.rb` for JS module issues

### Database Connection Errors

**Symptoms:**
- `PG::ConnectionBad` errors
- "Database does not exist"
- Connection timeout

**Solutions:**
```bash
# Check PostgreSQL is running
brew services list | grep postgresql
brew services restart postgresql

# Create database
rails db:create

# Check database.yml
cat config/database.yml

# Test connection
rails db:version
```

## Phlex Component Issues

### Component Not Rendering

**Symptoms:**
- Blank page or missing content
- No errors but component missing
- HTML comments show component name

**Common Causes:**
1. Missing `view_template` method
2. Incorrect inheritance
3. Registration issues

**Solutions:**
```ruby
# Correct component structure
class MyComponent < Components::Base
  def initialize(title:)
    @title = title
  end
  
  def view_template
    div { @title }  # This method is required!
  end
end

# Check inheritance
class MyComponent < ApplicationComponent  # Wrong!
class MyComponent < Components::Base     # Correct!

# Render correctly
render MyComponent.new(title: "Test")     # Good
MyComponent.new(title: "Test")           # Bad - missing render
```

### Phlex SVG Issues

**Symptoms:**
- SVG not appearing
- Attributes not working
- Malformed SVG output

**Solutions:**
```ruby
# Correct SVG syntax
svg(
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",    # not view_box
  stroke_width: "2"        # not stroke-width
) do |s|
  s.path(d: "M12 2L2 7")   # Use block parameter
end

# Remember: snake_case becomes kebab-case
stroke_width: "2"  # Renders as stroke-width="2"
```

### Raw HTML Not Working

**Symptoms:**
- HTML appearing as escaped text
- Script tags showing as text
- Content not rendering as HTML

**Solutions:**
```ruby
# Use unsafe_raw for trusted content only
unsafe_raw("<strong>Bold text</strong>")

# For user content, sanitize first
unsafe_raw(sanitize(user_content))

# For scripts
script do
  unsafe_raw("console.log('Hello')")
end
```

## Stimulus Controller Issues

### Controller Not Connecting

**Symptoms:**
- JavaScript not executing
- "Uncaught Error: Unable to resolve specifier"
- Controller actions not firing

**Solutions:**
```javascript
// Check registration in index.js
import SearchController from "./search_controller"
application.register("search", SearchController)

// Check HTML data attributes
<div data-controller="search">  // Correct
<div data-controller="search-controller">  // Wrong!

// Check controller filename
search_controller.js  // Correct
searchController.js   // Wrong!
```

### Actions Not Firing

**Symptoms:**
- Click handlers not working
- Form submissions ignored
- Keyboard events not captured

**Solutions:**
```html
<!-- Correct action syntax -->
<button data-action="click->dropdown#toggle">

<!-- Common mistakes -->
<button data-action="dropdown#toggle">        <!-- Missing event -->
<button data-action="click->dropdown.toggle"> <!-- Wrong separator -->
<button data-action="click->toggle">          <!-- Missing controller -->
```

### Target Not Found

**Symptoms:**
- "Error: Missing target element"
- Undefined when accessing targets
- Element selection failing

**Solutions:**
```javascript
// Define targets in controller
static targets = ["menu", "button"]

// Use in HTML
<div data-dropdown-target="menu">     // Correct
<div data-target="dropdown.menu">      // Wrong syntax
<div data-dropdown-target="dropdown-menu"> // Wrong, use camelCase in controller
```

## Testing Issues

### Playwright Tests Failing

**Symptoms:**
- Tests pass locally but fail in CI
- Timeout errors
- Element not found

**Solutions:**
```ruby
# Increase timeout for slow operations
page.get_by_role("button").click(timeout: 10000)

# Wait for elements
page.wait_for_selector("[data-testid='result']")

# Use data-testid for reliable selection
<div data-testid="client-form">

# Debug with screenshots
page.screenshot(path: "debug.png")
```

### Database Not Cleaned Between Tests

**Symptoms:**
- Tests fail when run together
- Data persisting between tests
- Unique constraint violations

**Solutions:**
```ruby
# Ensure transactional tests
class ApplicationSystemTestCase < ActionDispatch::SystemTestCase
  self.use_transactional_tests = true
end

# Manual cleanup if needed
teardown do
  Client.destroy_all
end
```

## Production Issues

### Deployment Fails

**Symptoms:**
- Kamal deploy hangs
- Health check failures
- Container won't start

**Solutions:**
```bash
# Check logs
kamal logs -f

# Skip health check temporarily
kamal deploy --skip-health-check

# Check environment variables
kamal env push
kamal app exec 'printenv | grep RAILS'

# Rollback if needed
kamal rollback
```

### Assets 404 in Production

**Symptoms:**
- CSS/JS files not found
- Broken styling
- Missing JavaScript functionality

**Solutions:**
```bash
# Precompile assets
kamal app exec 'bin/rails assets:precompile'

# Check asset files
kamal app exec 'ls -la public/assets'

# Ensure environment variable
RAILS_SERVE_STATIC_FILES=true
```

### Database Migration Errors

**Symptoms:**
- "Pending migrations" error
- Schema version mismatch
- Migration rollback needed

**Solutions:**
```bash
# Run migrations
kamal app exec 'bin/rails db:migrate'

# Check migration status
kamal app exec 'bin/rails db:migrate:status'

# Rollback if needed
kamal app exec 'bin/rails db:rollback STEP=1'
```

## Performance Issues

### Slow Page Loads

**Symptoms:**
- Pages taking > 1 second
- Timeout errors
- Users complaining about speed

**Diagnosis:**
```ruby
# Add to development
gem 'rack-mini-profiler'
gem 'bullet'  # Detects N+1 queries

# Check logs for slow queries
tail -f log/development.log | grep "ms)"
```

**Solutions:**
- Add missing indexes
- Use eager loading
- Implement caching
- See [Performance Guidelines](./performance-guidelines.md)

### Memory Leaks

**Symptoms:**
- Process memory growing
- Server running out of RAM
- Frequent restarts needed

**Solutions:**
```ruby
# Profile memory usage
require 'memory_profiler'
report = MemoryProfiler.report do
  # Suspected code
end
report.pretty_print

# Common fixes
# - Use find_each for large datasets
# - Clear caches periodically
# - Avoid storing large objects in constants
```

## Common Error Messages

### ActiveRecord Errors

**`ActiveRecord::RecordNotFound`**
```ruby
# Add error handling
@client = Client.find(params[:id])
rescue ActiveRecord::RecordNotFound
  redirect_to clients_path, alert: "Client not found"
```

**`ActiveRecord::RecordInvalid`**
```ruby
# Check validations
@client.save!
rescue ActiveRecord::RecordInvalid => e
  logger.error e.record.errors.full_messages
```

### Authentication Errors

**"Please log in to continue"**
- Session expired
- Cookies cleared
- Check `before_action :require_authentication`

### CSRF Token Errors

**"Can't verify CSRF token authenticity"**
```ruby
# In forms
<%= form_with model: @client do |form| %>
  <%= form.hidden_field :authenticity_token, value: form_authenticity_token %>

# In Phlex
input(type: "hidden", name: "authenticity_token", value: form_authenticity_token)
```

## Debugging Techniques

### Professional Debug Library (Frontend)

The project uses a professional debugging system for frontend components. See the [Debugging Guide](./debugging-guide.md) for complete documentation.

**Quick Usage:**
```bash
# Enable all frontend debugging
DEBUG=bos:* npm run dev

# Debug specific issues
DEBUG=bos:technician-assignment npm run dev:quiet  # Component issues
DEBUG=bos:reactive npm run dev:quiet               # Svelte reactivity
DEBUG=bos:api npm run dev:quiet                    # API calls
```

**Browser Console:**
```javascript
// Enable debugging in browser
bosDebug.enable('bos:*')
bosDebug.status()  // Check current settings
```

**Common Debug Scenarios:**
- **Race conditions**: `DEBUG=bos:reactive,bos:state`
- **API failures**: `DEBUG=bos:api,bos:technician-assignment`
- **State sync issues**: `DEBUG=bos:state,bos:component`

### Rails Console Debugging

```ruby
# Reload console after code changes
reload!

# Check model state
pp @client.attributes
pp @client.errors.full_messages

# Test queries
Client.connection.execute("EXPLAIN ANALYZE SELECT ...")
```

### Logging

```ruby
# Add debug logging
Rails.logger.debug "=" * 80
Rails.logger.debug "Client: #{@client.inspect}"
Rails.logger.debug "Params: #{params.inspect}"
Rails.logger.debug "=" * 80

# Conditional logging
Rails.logger.debug "Slow query" if elapsed_time > 100
```

### Browser DevTools

```javascript
// Add breakpoints in Stimulus
debugger;

// Log Stimulus lifecycle
console.log('Controller connected:', this.element);

// Check data attributes
console.log(this.element.dataset);
```

## Quick Fixes

### Reset Everything

```bash
# Nuclear option - reset entire development environment
rails db:drop
rails db:create
rails db:schema:load
rails db:seed
rails tmp:clear
rails assets:clobber
bundle install
yarn install
```

### Clear All Caches

```bash
rails tmp:clear
rails cache:clear
redis-cli FLUSHALL  # If using Redis
```

### Fix Permission Issues

```bash
# Fix file permissions
chmod -R 755 .
chmod 600 config/master.key
chmod 600 .kamal/secrets
```

## Getting Help

1. **Check logs first:**
   - `tail -f log/development.log`
   - Browser console for JS errors
   - `kamal logs` for production

2. **Search error messages:**
   - Include "Rails" or "Phlex" in searches
   - Check GitHub issues
   - Stack Overflow

3. **Minimal reproduction:**
   - Create smallest example that shows issue
   - Test in Rails console
   - Isolate the problem

Remember: Most issues have been encountered before. The solution often lies in carefully reading error messages and checking the basics first.