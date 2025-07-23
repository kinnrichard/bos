# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-07-22-rails-server-side-mutators/spec.md

> Created: 2025-07-22
> Version: 1.0.0

## Endpoints

### POST /api/v1/mutations/create

**Purpose:** Securely create a new record with server-side validation and business logic
**Authentication:** JWT token required
**Parameters:**
- `table_name` (string, required): Name of the table/model being created
- `data` (object, required): Record data to be created
- `client_context` (object, optional): Client-side context for consistency checking

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "created_at": "timestamp",
    "updated_at": "timestamp",
    // ... other record fields
  },
  "mutations_applied": [
    {
      "mutator": "positioning",
      "result": { "position": 1.0 }
    },
    {
      "mutator": "activity_logging",
      "result": { "activity_log_id": "uuid" }
    }
  ],
  "consistency_check": "passed"
}
```

**Errors:**
- 401: Invalid or expired JWT token
- 403: User lacks permission for this operation
- 422: Validation failed or business logic error
- 409: Consistency check failed between client and server

### PUT /api/v1/mutations/update/:id

**Purpose:** Securely update an existing record with change tracking
**Authentication:** JWT token required
**Parameters:**
- `id` (string, required): Record ID to update
- `table_name` (string, required): Name of the table/model
- `data` (object, required): Fields to update
- `original_data` (object, required): Original record state for change tracking
- `client_context` (object, optional): Client-side context

**Response:**
```json
{
  "success": true,
  "data": {
    // Updated record
  },
  "changes": {
    "field_name": ["old_value", "new_value"]
  },
  "mutations_applied": [
    {
      "mutator": "activity_logging",
      "result": { 
        "activity_log_id": "uuid",
        "action": "status_changed",
        "metadata": { "old_status": "open", "new_status": "in_progress" }
      }
    }
  ]
}
```

**Errors:**
- 401: Invalid or expired JWT token
- 403: User lacks permission to update this record
- 404: Record not found
- 422: Validation failed
- 409: Optimistic locking conflict or consistency check failed

### DELETE /api/v1/mutations/destroy/:id

**Purpose:** Securely delete a record with proper authorization
**Authentication:** JWT token required
**Parameters:**
- `id` (string, required): Record ID to delete
- `table_name` (string, required): Name of the table/model
- `hard_delete` (boolean, optional): Whether to hard delete or soft delete

**Response:**
```json
{
  "success": true,
  "deleted": true,
  "mutations_applied": [
    {
      "mutator": "activity_logging", 
      "result": { "activity_log_id": "uuid", "action": "deleted" }
    }
  ]
}
```

### PUT /api/v1/mutations/reorder

**Purpose:** Securely reorder records with positioning algorithm validation
**Authentication:** JWT token required
**Parameters:**
- `table_name` (string, required): Name of the table/model
- `record_id` (string, required): Record being moved
- `new_position` (number, required): Target position
- `scope_conditions` (object, optional): Scoping conditions for positioning

**Response:**
```json
{
  "success": true,
  "positioning_results": [
    {
      "record_id": "uuid1",
      "old_position": 1.0,
      "new_position": 2.0
    },
    {
      "record_id": "uuid2", 
      "old_position": 2.0,
      "new_position": 1.0
    }
  ],
  "consistency_check": "passed"
}
```

### POST /api/v1/mutations/bulk

**Purpose:** Process multiple mutations atomically with rollback support
**Authentication:** JWT token required
**Parameters:**
- `mutations` (array, required): Array of mutation objects
  - `operation` (string): "create", "update", "delete"
  - `table_name` (string): Target table
  - `data` (object): Operation data
  - `record_id` (string, for updates/deletes): Target record ID

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "operation": "create",
      "success": true,
      "data": { /* created record */ }
    },
    {
      "operation": "update",
      "success": true, 
      "data": { /* updated record */ }
    }
  ],
  "transaction_id": "uuid",
  "mutations_applied_count": 15
}
```

### GET /api/v1/mutations/consistency-check

**Purpose:** Validate client-side calculations match server-side results
**Authentication:** JWT token required
**Parameters:**
- `table_name` (string, required): Table to validate
- `record_id` (string, required): Record to check
- `client_calculations` (object, required): Client-side calculated values

**Response:**
```json
{
  "consistency_status": "passed",
  "server_calculations": {
    "position": 1.5,
    "calculated_field": "server_value"
  },
  "client_calculations": {
    "position": 1.5,
    "calculated_field": "server_value"  
  },
  "differences": []
}
```

## Controllers

### MutationsController

**Actions:**
- `create` - Handle record creation with mutator pipeline
- `update` - Handle record updates with change tracking
- `destroy` - Handle record deletion
- `reorder` - Handle positioning operations
- `bulk` - Handle batch operations
- `consistency_check` - Validate client-server calculations

**Business Logic:**
- JWT token validation and user extraction
- Permission checking for each operation
- Mutator pipeline execution (positioning, activity logging, validation)
- Consistency verification between client and server calculations
- Transaction management for bulk operations

**Error Handling:**
- Invalid JWT tokens → 401 Unauthorized
- Missing permissions → 403 Forbidden  
- Validation failures → 422 Unprocessable Entity
- Record not found → 404 Not Found
- Consistency failures → 409 Conflict
- Server errors → 500 Internal Server Error

### ConsistencyController  

**Actions:**
- `validate_calculations` - Compare client vs server computed values
- `report_inconsistency` - Log discrepancies for analysis
- `get_server_state` - Retrieve authoritative server state

**Purpose:**
- Maintain mathematical consistency between client optimistic updates and server authoritative results
- Provide debugging tools for inconsistency issues
- Enable automated testing of mutator behavior consistency