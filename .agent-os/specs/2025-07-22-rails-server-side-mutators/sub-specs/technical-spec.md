# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-07-22-rails-server-side-mutators/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Technical Requirements

- Rails API controllers for all mutation operations (create, update, delete, positioning, bulk operations)
- JWT token validation and user extraction using existing ZeroJwt class
- Server-side implementations of all frontend mutators with identical business logic
- Mutation authorization layer checking user permissions for each operation
- Integration with existing Zero.js schema and database structure
- Comprehensive logging of all mutation attempts and security violations
- Error handling for invalid tokens, unauthorized operations, and business logic failures
- Performance optimization to maintain real-time collaboration responsiveness
- Backward compatibility with existing client-side optimistic updates

## Approach Options

**Option A: Middleware Integration with Zero.js**
- Pros: Seamless integration, minimal client changes, leverages Zero.js features
- Cons: Complex integration with Zero.js internals, potential dependency issues

**Option B: Rails API Layer with Zero.js Passthrough** (Selected)
- Pros: Full control over validation logic, clear separation of concerns, testable
- Cons: Additional network hop, need to maintain client-server consistency

**Option C: Hybrid Client-Server Validation**
- Pros: Lower latency for non-security-critical mutations, flexible security
- Cons: Complex logic branches, potential security gaps, harder to maintain

**Rationale:** Option B provides the clearest security model with full server-side validation while maintaining compatibility with existing Zero.js infrastructure. The additional network latency is acceptable for the security benefits gained.

## Implementation Details

### Rails Controller Architecture

```ruby
class Api::V1::MutationsController < Api::V1::BaseController
  before_action :authenticate_request
  before_action :validate_mutation_permissions
  
  def create_record
    result = ServerSideMutators::CreateMutator.call(
      table_name: params[:table_name],
      data: params[:data],
      user: current_user,
      context: build_mutation_context
    )
    render json: result
  end
  
  def update_record
    result = ServerSideMutators::UpdateMutator.call(
      table_name: params[:table_name],
      record_id: params[:id],
      data: params[:data],
      user: current_user,
      context: build_mutation_context
    )
    render json: result
  end
end
```

### Server-Side Mutator Pattern

```ruby
module ServerSideMutators
  class BaseMutator
    def self.call(table_name:, data:, user:, context: {})
      new(table_name, data, user, context).execute
    end
    
    private
    
    def validate_user_authorization
      # Check user permissions for this operation
    end
    
    def apply_business_logic
      # Apply positioning, activity logging, etc.
    end
    
    def ensure_data_consistency
      # Validate against client-side calculations
    end
  end
end
```

### Client-Server Consistency Framework

```typescript
// Client-side consistency testing
export class MutationConsistencyTester {
  async testMutation(mutationType: string, data: any): Promise<boolean> {
    // 1. Calculate client-side result
    const clientResult = await this.applyClientMutation(mutationType, data);
    
    // 2. Send to server for validation
    const serverResult = await this.validateWithServer(mutationType, data);
    
    // 3. Compare results
    return this.compareResults(clientResult, serverResult);
  }
}
```

### JWT Integration Pattern

```ruby
class MutationAuthService
  def self.validate_and_extract_user(request)
    token = extract_jwt_from_request(request)
    decoded_jwt = ZeroJwt.decode(token)
    
    unless decoded_jwt&.valid?
      raise UnauthorizedError, "Invalid or expired JWT token"
    end
    
    User.find(decoded_jwt.user_id)
  end
end
```

## Performance Considerations

- Implement caching for user permission checks
- Batch mutation processing for bulk operations
- Asynchronous processing for non-critical mutations
- Connection pooling for database operations
- Response compression for large mutation results

## Security Architecture

- All mutations require valid JWT tokens
- User permissions validated before each operation
- Activity logging includes authentication context
- Rate limiting per user to prevent abuse
- Input validation and sanitization for all mutation data
- Audit logging for all security violations and failed attempts

## External Dependencies

No new external dependencies required. The implementation leverages existing infrastructure:

- **ZeroJwt** - Already available for JWT validation
- **Rails API framework** - Existing controllers and authentication
- **PostgreSQL** - Current database with Zero.js integration
- **Activity logging system** - Existing audit trail infrastructure