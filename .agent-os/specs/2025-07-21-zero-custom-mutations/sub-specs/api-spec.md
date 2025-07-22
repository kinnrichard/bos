# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-21-zero-custom-mutations/spec.md

> Created: 2025-07-21
> Version: 1.0.0

## API Changes

No REST API endpoint changes are required. The custom mutators enhance the existing Zero.js mutation flow and Rails model callbacks.

## Mutation Flow

### Client-Side Mutation Flow

1. **Component initiates mutation**
   ```typescript
   await Client.create({
     name: "Café René",
     client_type: "business"
   });
   ```

2. **ReactiveRecord runs mutator hooks**
   - `beforeSave`: normalizeClientName transforms to `{name: "Café René", normalized_name: "CAFERENE"}`
   - `validators`: validateUniqueName checks for duplicates

3. **Zero.js processes mutation**
   ```typescript
   zero.mutate.clients.insert({
     name: "Café René",
     normalized_name: "CAFERENE",
     client_type: "business"
   });
   ```

4. **Server receives mutation via Zero sync**

### Server-Side Processing

1. **Rails receives create/update via Zero.js sync**

2. **ActiveRecord callbacks execute**
   ```ruby
   before_validation :normalize_name
   validate :unique_name_validation
   ```

3. **Validation ensures consistency**
   - Server normalizes name using same algorithm
   - Validates uniqueness of normalized_name
   - Rejects if conflicts detected

## Error Handling

### Client-Side Validation Errors
```typescript
// ValidationError thrown by ReactiveRecord
{
  type: "ValidationError",
  errors: {
    normalized_name: ["has already been taken"]
  }
}
```

### Server-Side Validation Errors
```json
// Rails API validation response
{
  "errors": {
    "normalized_name": ["has already been taken"]
  }
}
```

### Offline Conflict Resolution

When offline mutations conflict:
1. Local validation prevents duplicate normalized names in offline state
2. On sync, server validation acts as final authority
3. Conflicts trigger client-side resolution UI

## Integration Points

### ReactiveRecord Methods Enhanced

All ReactiveRecord methods automatically use mutator hooks:
- `Model.create()` - Runs beforeSave, beforeCreate, validators
- `instance.update()` - Runs beforeSave, beforeUpdate, validators  
- `instance.save()` - Runs appropriate hooks based on new/existing

### Zero.js Mutations

Direct Zero.js usage bypasses mutator hooks:
```typescript
// This bypasses mutators - not recommended
await zero.mutate.clients.insert({...});

// This uses mutators - recommended
await Client.create({...});
```

## Subscription Updates

Real-time subscriptions automatically reflect mutator results:
```typescript
// Subscription receives normalized data
const clientsQuery = useQuery((ctx) => 
  ctx.clients.where('normalized_name', 'LIKE', 'ACME%')
);
```

## Performance Considerations

- Mutators run synchronously in the mutation pipeline
- Validation queries use existing indexes
- No additional network requests required
- Offline mutations maintain same performance characteristics