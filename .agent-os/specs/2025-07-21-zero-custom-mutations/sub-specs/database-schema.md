# Database Schema

This is the database schema implementation for the spec detailed in @.agent-os/specs/2025-07-21-zero-custom-mutations/spec.md

> Created: 2025-07-21
> Version: 1.0.0

## Schema Changes

No database schema changes are required for this feature. The custom mutators work with existing database tables and columns.

## Existing Schema Utilized

### Clients Table
The implementation uses the existing `clients` table structure:
- `name` (string) - The display name entered by users
- `normalized_name` (string) - The normalized version for uniqueness checks
- Standard timestamps and audit fields

### Why No Changes Needed

1. **Mutators operate on existing columns** - The name normalizer populates the existing `normalized_name` column
2. **Validations use existing data** - Unique name validation queries existing records
3. **No new metadata required** - Mutator logic lives in application code, not database

## Data Integrity Considerations

While no schema changes are needed, the custom mutators ensure:
- `normalized_name` is always populated when `name` is present
- Uniqueness is enforced at both application and database levels
- Existing database constraints remain in effect

## Migration Notes

No database migrations required. However, after deployment:
1. Consider running a data cleanup task to ensure all existing clients have `normalized_name` populated
2. The Ruby normalizer will handle this automatically on next save of each record
3. A rake task could be created if immediate normalization is needed:

```ruby
# lib/tasks/normalize_client_names.rake
namespace :clients do
  desc "Normalize all client names"
  task normalize_names: :environment do
    Client.find_each do |client|
      client.save! # Triggers before_validation callback
    end
  end
end
```