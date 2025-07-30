# ReactiveRecord v3 Architecture Plan

**Building Upon the Unified ReactiveRecord System with Three Strategic Enhancements**

## 🎯 Executive Summary

ReactiveRecord v3 represents the next evolution of our unified Rails-compatible reactive data layer, seamlessly integrating three powerful new features into the existing context-aware architecture:

### 🆕 New V3 Features

1. **ActivityLogs Integration**: Client-side activity log generation with server-side validation and authentication
2. **Zero.js Permissions System**: Native integration with Rails/Pundit for seamless authorization patterns
3. **Schema Defaults Synchronization**: Client-side models automatically inherit Rails schema default values

### 🏗️ Architecture Continuity

V3 builds upon the proven unified ReactiveRecord foundation:
- **Single Context-Aware Class**: Automatic optimization for Svelte vs vanilla JS environments
- **Rails API Compatibility**: Perfect Rails ActiveRecord patterns (`find`, `where`, scopes)
- **Advanced Features**: TTL coordination, computed properties, flash prevention
- **Performance Optimized**: Context-aware optimization with intelligent caching

### 🎊 V3 Enhancement Benefits

- **Comprehensive Audit Trail**: Automatic activity logging with client generation and server validation
- **Unified Authorization**: Zero.js queries respect Rails/Pundit permissions seamlessly
- **Data Consistency**: Client models match Rails schema defaults for immediate form population
- **Developer Experience**: All features integrate elegantly without breaking existing patterns
- **Performance**: Enhanced caching strategies and optimized query patterns

---

## 🔄 Enhanced Architecture Overview

### V3 System Components (Building on V2)

```
Rails Models (Source of Truth + Permissions + Defaults)
    ↓
Enhanced Rails Generator (ERB Templates + ActivityLog + Permissions + Defaults)
    ↓
TypeScript Configuration Objects (+ ActivityLog Config + Permission Rules + Default Values)
    ↓
Unified Factory Functions (createModel + Activity + Permissions + Defaults)
    ↓
ReactiveRecord V3 (Context-Aware + Activity + Authorization + Defaults)
    ↓
Advanced Features (Coordination + Computed Properties + TTL + Activity + Permissions)
```

### New V3 Components

#### 1. ActivityLog Integration Layer
```typescript
class ActivityLogCoordinator {
  // Generate activity logs on client with server validation
  generateActivityLog(entity: BaseRecord, changes: FieldChanges): ActivityLogEntry
  
  // Coordinate with server for authentication validation
  validateAndSubmit(activityLog: ActivityLogEntry): Promise<ValidationResult>
  
  // Integrate with existing TTL coordination
  setupActivityLogQuery(entityQuery: IReactiveQuery): IReactiveQuery
}
```

#### 2. Zero.js Permissions Integration
```typescript
class PermissionAwareQuery {
  // Integrate Rails/Pundit permissions with Zero.js queries
  withPermissions(user: User, action: string): FilteredQuery
  
  // Server-side validation with client-side filtering
  validatePermissions(query: ZeroQuery, context: UserContext): boolean
  
  // Permission-aware computed properties
  applyPermissionFilters(data: T[], permissions: PermissionSet): T[]
}
```

#### 3. Schema Defaults Synchronization
```typescript
class DefaultValueProvider {
  // Extract default values from Rails schema
  getDefaults(modelName: string): Record<string, any>
  
  // Apply defaults to new model instances
  applyDefaults<T>(data: Partial<T>, defaults: Record<string, any>): T
  
  // Coordinate with form systems for immediate population
  populateForm(formData: FormData, defaults: Record<string, any>): FormData
}
```

---

## 📋 Technical Implementation V3

### Enhanced Unified ReactiveRecord Architecture

```typescript
/**
 * ReactiveRecord V3 with ActivityLogs, Permissions, and Schema Defaults
 * BUILDS ON: Unified architecture from V2 with context-aware optimization
 */
class ReactiveRecordV3<T> extends ReactiveRecord<T> {
  private static activityLogCoordinator = new ActivityLogCoordinator();
  private static permissionManager = new PermissionAwareQuery();
  private static defaultValueProvider = new DefaultValueProvider();

  static createModel<T>(config: ModelConfigV3) {
    return {
      // V2 methods enhanced with V3 features
      find: (id: string, options?: QueryOptionsV3) => 
        new ReactiveInstanceV3<T>(config, 'find', { id }, options),
      
      find_by: (params: Partial<T>, options?: QueryOptionsV3) => 
        new ReactiveInstanceV3<T>(config, 'find_by', params, options),
      
      where: (conditions: Partial<T>, options?: QueryOptionsV3) => 
        new ReactiveInstanceV3<T>(config, 'where', conditions, options),

      // V3 Enhanced Methods
      
      // ActivityLog Integration
      withActivityLogs: (options: ActivityLogOptions = {}) => 
        new ReactiveActivityBuilder<T>(config, options),
      
      // Permission-Aware Queries
      withPermissions: (user: User, action: string = 'read') =>
        new ReactivePermissionBuilder<T>(config, user, action),
      
      // Schema Defaults
      withDefaults: () => 
        new ReactiveDefaultsBuilder<T>(config),
      
      // Combined V3 Features
      withV3Features: (user: User, options: V3Options = {}) =>
        new ReactiveV3Builder<T>(config, user, options),

      // Generate scope methods with V3 enhancements
      ...this.generateV3ScopeMethods(config.scopes, config),
      
      // V2 features still available
      includes: (associations: string[]) => new ReactiveIncludeBuilder<T>(config, associations),
      withTTL: (ttl: string) => new ReactiveTTLBuilder<T>(config, ttl),
      withComputed: <P extends ComputedPropertiesConfig<T>>(properties: P) => 
        new ReactiveComputedBuilder<T, P>(config, properties)
    };
  }

  /**
   * Enhanced scope methods with ActivityLog, Permissions, and Defaults
   */
  private static generateV3ScopeMethods<T>(scopes: Record<string, any>, config: ModelConfigV3) {
    const methods: Record<string, Function> = {};
    
    for (const [scopeName, scopeConfig] of Object.entries(scopes)) {
      methods[scopeName] = (...args: any[]) => {
        // Compile Rails-style scope with Zero.js constraints
        const compiledQuery = this.railsCompiler.compile({
          model: config.tableName,
          scope: scopeName,
          args,
          config: scopeConfig
        });
        
        // Apply V3 enhancements if configured
        let enhancedQuery = compiledQuery;
        
        if (config.features.activityLogs) {
          enhancedQuery = this.activityLogCoordinator.enhanceQuery(enhancedQuery);
        }
        
        if (config.features.permissions) {
          enhancedQuery = this.permissionManager.enhanceQuery(enhancedQuery);
        }
        
        if (config.features.defaults) {
          enhancedQuery = this.defaultValueProvider.enhanceQuery(enhancedQuery);
        }
        
        return new ReactiveInstanceV3<T>(config, 'scope', enhancedQuery);
      };
    }
    
    return methods;
  }
}

/**
 * V3 Enhanced reactive instance with all new features
 */
class ReactiveInstanceV3<T> extends ReactiveInstance<T> {
  private activityLogTracker?: ActivityLogTracker<T>;
  private permissionFilter?: PermissionFilter<T>;
  private defaultApplier?: DefaultApplier<T>;
  
  constructor(
    private config: ModelConfigV3, 
    private method: string, 
    private params: any,
    private options: QueryOptionsV3 = {}
  ) {
    super(config, method, params, options);
    
    // Initialize V3 features if enabled
    if (config.features.activityLogs) {
      this.activityLogTracker = new ActivityLogTracker(config.activityLogConfig);
    }
    
    if (config.features.permissions) {
      this.permissionFilter = new PermissionFilter(config.permissionConfig);
    }
    
    if (config.features.defaults) {
      this.defaultApplier = new DefaultApplier(config.defaultsConfig);
    }
    
    this.setupV3Features();
  }

  /**
   * Enhanced data accessor with V3 features
   */
  get data() {
    if (this.isInSvelteContext) {
      // Svelte: Use reactive state with V3 enhancements
      return $derived.by(() => {
        let baseData = this._state.data;
        
        // Apply V3 enhancements in order
        baseData = this.applyDefaults(baseData);
        baseData = this.applyPermissionFilters(baseData);
        baseData = this.applyComputedProperties(baseData);
        baseData = this.attachActivityLogs(baseData);
        
        return baseData;
      });
    } else {
      // Vanilla JS: Direct access with V3 enhancements applied
      let processedData = this._data;
      
      processedData = this.applyDefaults(processedData);
      processedData = this.applyPermissionFilters(processedData);
      processedData = this.applyComputedProperties(processedData);
      processedData = this.attachActivityLogs(processedData);
      
      return processedData;
    }
  }

  /**
   * V3 Feature: Apply schema defaults to new records
   */
  private applyDefaults(data: T | T[] | null): T | T[] | null {
    if (!this.defaultApplier || !data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.defaultApplier!.apply(item));
    }
    
    return this.defaultApplier.apply(data);
  }

  /**
   * V3 Feature: Apply permission-based filtering
   */
  private applyPermissionFilters(data: T | T[] | null): T | T[] | null {
    if (!this.permissionFilter || !data) return data;
    
    if (Array.isArray(data)) {
      return this.permissionFilter.filterCollection(data);
    }
    
    return this.permissionFilter.filterItem(data);
  }

  /**
   * V3 Feature: Attach activity logs to data
   */
  private attachActivityLogs(data: T | T[] | null): T | T[] | null {
    if (!this.activityLogTracker || !data) return data;
    
    if (Array.isArray(data)) {
      return data.map(item => this.activityLogTracker!.attachLogs(item));
    }
    
    return this.activityLogTracker.attachLogs(data);
  }

  /**
   * V3 Feature: Generate activity log for changes
   */
  async logActivity(changes: FieldChanges): Promise<ActivityLogEntry> {
    if (!this.activityLogTracker) {
      throw new Error('ActivityLog tracking not enabled for this model');
    }
    
    const activityLog = this.activityLogTracker.generateLog(this.data, changes);
    
    // Client-side generation with server-side validation
    const validationResult = await ReactiveRecordV3.activityLogCoordinator
      .validateAndSubmit(activityLog);
    
    if (!validationResult.valid) {
      throw new Error(`ActivityLog validation failed: ${validationResult.error}`);
    }
    
    return activityLog;
  }

  /**
   * V3 Feature: Permission-aware updates
   */
  async updateWithPermissions(changes: Partial<T>, user: User): Promise<T> {
    // Check permissions before attempting update
    const canUpdate = await this.permissionFilter?.checkPermission(
      this.data, user, 'update'
    );
    
    if (!canUpdate) {
      throw new PermissionError('User does not have permission to update this record');
    }
    
    // Generate activity log for the changes
    const activityLog = await this.logActivity({
      old_values: this.extractChangedFields(this.data, changes),
      new_values: changes,
      user_id: user.id,
      action: 'update'
    });
    
    // Perform the update
    const updatedData = await this.performUpdate(changes);
    
    return updatedData;
  }

  /**
   * V3 Feature: Create with defaults and activity logging
   */
  static async createWithV3<T>(
    modelConfig: ModelConfigV3,
    data: Partial<T>,
    user: User
  ): Promise<ReactiveInstanceV3<T>> {
    // Apply schema defaults
    const defaultApplier = new DefaultApplier(modelConfig.defaultsConfig);
    const dataWithDefaults = defaultApplier.apply(data);
    
    // Check creation permissions
    const permissionFilter = new PermissionFilter(modelConfig.permissionConfig);
    const canCreate = await permissionFilter.checkPermission(null, user, 'create');
    
    if (!canCreate) {
      throw new PermissionError('User does not have permission to create this record');
    }
    
    // Create the record
    const instance = new ReactiveInstanceV3<T>(modelConfig, 'create', dataWithDefaults);
    
    // Generate creation activity log
    await instance.logActivity({
      old_values: {},
      new_values: dataWithDefaults,
      user_id: user.id,
      action: 'create'
    });
    
    return instance;
  }
}
```

### V3 Feature Implementations

#### 1. ActivityLog Integration

```typescript
/**
 * Client-side activity log generation with server validation
 */
class ActivityLogTracker<T> {
  constructor(private config: ActivityLogConfig) {}

  generateLog(entity: T, changes: FieldChanges): ActivityLogEntry {
    return {
      id: crypto.randomUUID(),
      entity_type: this.config.entityType,
      entity_id: (entity as any).id,
      entity_uuid: (entity as any).uuid,
      client_id: (entity as any).client_id,
      user_id: changes.user_id,
      action: changes.action,
      field_changes: this.extractFieldChanges(changes),
      metadata: {
        client_generated: true,
        timestamp: new Date().toISOString(),
        browser: navigator.userAgent,
        ...changes.metadata
      },
      created_at: new Date().toISOString()
    };
  }

  private extractFieldChanges(changes: FieldChanges): FieldChange[] {
    const fieldChanges: FieldChange[] = [];
    
    for (const [fieldName, newValue] of Object.entries(changes.new_values)) {
      const oldValue = changes.old_values[fieldName];
      
      if (oldValue !== newValue) {
        fieldChanges.push({
          field_name: fieldName,
          old_value: oldValue,
          new_value: newValue,
          data_type: typeof newValue
        });
      }
    }
    
    return fieldChanges;
  }

  attachLogs(entity: T): T & { activityLogs?: ActivityLogEntry[] } {
    // If activity logs are already loaded, return as-is
    if ((entity as any).activityLogs) {
      return entity as T & { activityLogs: ActivityLogEntry[] };
    }
    
    // Create reactive query for activity logs
    const activityQuery = ReactiveActivityLog.where({
      entity_type: this.config.entityType,
      entity_id: (entity as any).id
    }).orderBy('created_at', 'desc');
    
    return {
      ...entity,
      get activityLogs() {
        return activityQuery.data || [];
      }
    };
  }
}

/**
 * Server-side validation coordinator
 */
class ActivityLogCoordinator {
  async validateAndSubmit(activityLog: ActivityLogEntry): Promise<ValidationResult> {
    try {
      // Send to server for validation
      const response = await fetch('/api/v1/activity_logs/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getCurrentToken()}`
        },
        body: JSON.stringify({ activity_log: activityLog })
      });
      
      if (!response.ok) {
        return {
          valid: false,
          error: `Server validation failed: ${response.statusText}`
        };
      }
      
      const result = await response.json();
      
      // Server rejects if not attributed to authenticated user
      if (!result.valid) {
        return {
          valid: false,
          error: result.error || 'Activity log not attributed to authenticated user'
        };
      }
      
      return { valid: true, activityLog: result.activity_log };
      
    } catch (error) {
      return {
        valid: false,
        error: `Validation request failed: ${error.message}`
      };
    }
  }

  enhanceQuery<T>(query: CompiledZeroQuery<T>): CompiledZeroQuery<T> {
    // Add activity log preloading to queries
    return {
      ...query,
      includes: [...(query.includes || []), 'activityLogs'],
      ttl: query.ttl || '5m' // Activity logs need shorter TTL
    };
  }
}
```

#### 2. Zero.js Permissions Integration

```typescript
/**
 * Rails/Pundit integration with Zero.js queries
 */
class PermissionAwareQuery {
  constructor(private railsPermissionAdapter: RailsPermissionAdapter) {}

  /**
   * Create permission-aware query builder
   */
  withPermissions<T>(
    baseQuery: IReactiveQuery<T>,
    user: User,
    action: string = 'read'
  ): PermissionFilteredQuery<T> {
    return new PermissionFilteredQuery(baseQuery, user, action, this.railsPermissionAdapter);
  }

  /**
   * Server-side permission validation
   */
  async validatePermissions(
    query: ZeroQuery,
    context: UserContext
  ): Promise<PermissionValidationResult> {
    try {
      const response = await fetch('/api/v1/permissions/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${context.token}`
        },
        body: JSON.stringify({
          query: query,
          user_id: context.user.id,
          action: context.action
        })
      });
      
      return await response.json();
      
    } catch (error) {
      return {
        valid: false,
        error: `Permission validation failed: ${error.message}`
      };
    }
  }

  enhanceQuery<T>(query: CompiledZeroQuery<T>): CompiledZeroQuery<T> {
    // Add permission context to query
    return {
      ...query,
      permissionContext: {
        enabled: true,
        serverValidation: true,
        clientFiltering: true
      }
    };
  }
}

/**
 * Permission-filtered query implementation
 */
class PermissionFilteredQuery<T> implements IReactiveQuery<T> {
  constructor(
    private baseQuery: IReactiveQuery<T>,
    private user: User,
    private action: string,
    private permissionAdapter: RailsPermissionAdapter
  ) {}

  get data(): T | T[] | null {
    const baseData = this.baseQuery.data;
    if (!baseData) return baseData;
    
    // Apply client-side permission filtering
    if (Array.isArray(baseData)) {
      return baseData.filter(item => 
        this.permissionAdapter.checkClientPermission(item, this.user, this.action)
      );
    }
    
    const hasPermission = this.permissionAdapter.checkClientPermission(
      baseData, this.user, this.action
    );
    
    return hasPermission ? baseData : null;
  }

  get loading(): boolean {
    return this.baseQuery.loading;
  }

  get error(): Error | null {
    return this.baseQuery.error;
  }

  subscribe(callback: (data: T | T[] | null) => void): () => void {
    return this.baseQuery.subscribe((data) => {
      // Apply permission filtering to subscription updates
      callback(this.data);
    });
  }
}

/**
 * Rails/Pundit adapter for client-side permission checks
 */
class RailsPermissionAdapter {
  constructor(private permissionRules: PermissionRuleSet) {}

  checkClientPermission<T>(
    record: T,
    user: User,
    action: string
  ): boolean {
    const recordType = this.getRecordType(record);
    const rules = this.permissionRules[recordType];
    
    if (!rules || !rules[action]) {
      // Default to deny if no rules found
      return false;
    }
    
    const rule = rules[action];
    
    // Simple rule evaluation (extend for complex logic)
    switch (rule.type) {
      case 'owner':
        return (record as any).user_id === user.id;
        
      case 'client_member':
        return (record as any).client_id === user.client_id;
        
      case 'role_based':
        return rule.allowed_roles.includes(user.role);
        
      case 'custom':
        return rule.evaluate(record, user);
        
      default:
        return false;
    }
  }

  private getRecordType<T>(record: T): string {
    // Extract record type from object or constructor
    return (record as any).constructor.name.toLowerCase();
  }
}
```

#### 3. Schema Defaults Synchronization

```typescript
/**
 * Rails schema defaults provider for client models
 */
class DefaultValueProvider {
  private defaultsCache = new Map<string, Record<string, any>>();
  
  constructor(private schemaConfig: SchemaDefaultsConfig) {
    this.loadDefaults();
  }

  getDefaults(modelName: string): Record<string, any> {
    return this.defaultsCache.get(modelName.toLowerCase()) || {};
  }

  applyDefaults<T>(data: Partial<T>, modelName?: string): T {
    const targetModel = modelName || this.inferModelName(data);
    const defaults = this.getDefaults(targetModel);
    
    // Apply defaults for missing fields
    const result = { ...data };
    
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (!(field in result) || result[field] === undefined || result[field] === null) {
        (result as any)[field] = this.resolveDefaultValue(defaultValue);
      }
    }
    
    return result as T;
  }

  populateForm(formData: FormData, modelName: string): FormData {
    const defaults = this.getDefaults(modelName);
    const populated = new FormData();
    
    // Copy existing form data
    for (const [key, value] of formData.entries()) {
      populated.append(key, value);
    }
    
    // Add defaults for missing fields
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (!formData.has(field)) {
        const resolvedValue = this.resolveDefaultValue(defaultValue);
        populated.append(field, String(resolvedValue));
      }
    }
    
    return populated;
  }

  private loadDefaults(): void {
    // Load defaults from generated schema configuration
    for (const [modelName, config] of Object.entries(this.schemaConfig.models)) {
      this.defaultsCache.set(modelName.toLowerCase(), config.defaults || {});
    }
  }

  private resolveDefaultValue(defaultValue: any): any {
    // Handle different types of default values
    if (typeof defaultValue === 'function') {
      return defaultValue();
    }
    
    if (typeof defaultValue === 'string' && defaultValue.startsWith('CURRENT_')) {
      switch (defaultValue) {
        case 'CURRENT_TIMESTAMP':
          return new Date().toISOString();
        case 'CURRENT_DATE':
          return new Date().toISOString().split('T')[0];
        default:
          return defaultValue;
      }
    }
    
    return defaultValue;
  }

  private inferModelName<T>(data: Partial<T>): string {
    // Try to infer model name from constructor or type hints
    if ((data as any).constructor?.name) {
      return (data as any).constructor.name.replace(/Data$/, '').toLowerCase();
    }
    
    // Fallback to unknown
    return 'unknown';
  }
}

/**
 * Default applier for model instances
 */
class DefaultApplier<T> {
  constructor(private config: DefaultsConfig) {}

  apply(data: Partial<T> | T): T {
    const defaults = this.config.defaults;
    const result = { ...data };
    
    // Apply field defaults
    for (const [field, defaultValue] of Object.entries(defaults)) {
      if (!(field in result) || this.shouldApplyDefault(result[field])) {
        (result as any)[field] = this.resolveDefault(defaultValue);
      }
    }
    
    // Apply computed defaults (based on other fields)
    for (const [field, computation] of Object.entries(this.config.computedDefaults || {})) {
      if (!(field in result) || this.shouldApplyDefault(result[field])) {
        (result as any)[field] = computation(result);
      }
    }
    
    return result as T;
  }

  private shouldApplyDefault(value: any): boolean {
    return value === undefined || value === null || value === '';
  }

  private resolveDefault(defaultValue: any): any {
    if (typeof defaultValue === 'function') {
      return defaultValue();
    }
    
    return defaultValue;
  }
}
```

---

## 🔗 Enhanced Rails Integration V3

### V3 Rails Generator Strategy

#### Enhanced ERB Template with V3 Features

```erb
<!-- lib/generators/zero/models/templates/unified_model_v3.generated.ts.erb -->

// 🤖 AUTO-GENERATED FROM RAILS MODEL - DO NOT EDIT
// Generated from: app/models/<%= file_name %>.rb
// Regenerate: rails generate zero:models
// 
// ✨ V3 FEATURES ENABLED:
<% if activity_logs_enabled? -%>//   - ActivityLogs: Client generation + server validation<% end -%>
<% if permissions_enabled? -%>//   - Permissions: Rails/Pundit integration<% end -%>
<% if defaults_enabled? -%>//   - Schema Defaults: Rails schema synchronization<% end -%>
// 
// 🚫 NEVER EDIT GENERATED FILES DIRECTLY
// 🔧 TO MAKE CHANGES:
//   1. Edit Rails model: app/models/<%= file_name %>.rb  
//   2. Update permissions: app/policies/<%= file_name %>_policy.rb
//   3. Add activity log config: zero_config block
//   4. Run: rails generate zero:models

import { 
  ReactiveRecordV3, 
  ReactiveCoordinator,
  ReactiveTTLCoordinator,
  RailsToReactiveQueryCompiler,
  ComputedPropertiesConfig,
  // V3 imports
  ActivityLogCoordinator,
  PermissionAwareQuery,
  DefaultValueProvider
} from '../base/reactive-record-v3';

<% if has_computed_properties? -%>
import { <%= class_name %>ComputedProperties } from '../computed-properties/<%= file_name %>-computed';
<% end -%>

<% if activity_logs_enabled? -%>
import { ActivityLog } from './activity-log.generated';
<% end -%>

// TypeScript interface generated from Rails schema
export interface <%= class_name %>Data {
<% attributes.each do |attr| -%>
  <%= attr.name %>: <%= attr.typescript_type %>;
<% end -%>
<% if activity_logs_enabled? -%>
  // V3 Feature: ActivityLogs integration
  activityLogs?: ActivityLogEntry[];
<% end -%>
}

// V3 Configuration with enhanced features
const <%= class_name %>ConfigV3: ModelConfigV3 = {
  tableName: '<%= table_name %>',
  primaryKey: '<%= primary_key %>',
  
  // V2 features (inherited)
  associations: [
<% associations.each do |assoc| -%>
    {
      name: '<%= assoc.name %>',
      type: '<%= assoc.type %>',
      foreignKey: '<%= assoc.foreign_key %>',
      <% if assoc.options.any? %>options: <%= assoc.options.to_json %><% end %>
    },
<% end -%>
  ],
  
  scopes: {
<% scopes.each do |scope| -%>
    <%= scope.name %>: {
      query: <%= scope.zero_implementation %>,
      estimatedRows: <%= scope.estimated_row_count || 1000 %>,
      constraints: <%= scope.zero_constraints.to_json %>
    },
<% end -%>
  },
  
  validations: {
<% validations.each do |validation| -%>
    <%= validation.field %>: <%= validation.rules.to_json %>,
<% end -%>
  },
  
  ttl: {
    find: '<%= model_config.find_ttl || "2h" %>',
    collection: '<%= model_config.collection_ttl || "1h" %>',
    scopes: '<%= model_config.scope_ttl || "30m" %>',
    preload: '<%= model_config.preload_ttl || "4h" %>'
  },
  
  constraints: {
    maxRowEstimate: <%= model_config.max_row_estimate || 20000 %>,
    hasManyToMany: <%= model_config.has_many_to_many || false %>,
    requiresClientProcessing: <%= model_config.requires_client_processing || false %>
  },

  // 🆕 V3 FEATURES
  
  features: {
    activityLogs: <%= activity_logs_enabled? %>,
    permissions: <%= permissions_enabled? %>,
    defaults: <%= defaults_enabled? %>
  },

<% if activity_logs_enabled? -%>
  // ActivityLogs configuration
  activityLogConfig: {
    entityType: '<%= class_name %>',
    trackFields: <%= tracked_fields.to_json %>,
    serverValidation: true,
    clientGeneration: true,
    includeMetadata: true
  },
<% end -%>

<% if permissions_enabled? -%>
  // Permissions configuration
  permissionConfig: {
    policy: '<%= class_name %>Policy',
    actions: <%= permission_actions.to_json %>,
    clientFiltering: true,
    serverValidation: true,
    rules: <%= permission_rules.to_json %>
  },
<% end -%>

<% if defaults_enabled? -%>
  // Schema defaults configuration
  defaultsConfig: {
    defaults: <%= schema_defaults.to_json %>,
    computedDefaults: <%= computed_defaults.to_json || '{}' %>,
    applyOnCreation: true,
    applyOnFormPopulation: true
  }
<% end -%>
};

// Clean unified export with V3 features
export const <%= class_name %> = ReactiveRecordV3.createModel<<%= class_name %>Data>(<%= class_name %>ConfigV3)
<% if has_computed_properties? -%>
  .withComputedProperties(<%= class_name %>ComputedProperties)
<% end -%>
<% if activity_logs_enabled? -%>
  .withActivityLogs(<%= class_name %>ConfigV3.activityLogConfig)
<% end -%>
<% if permissions_enabled? -%>
  .withPermissions(<%= class_name %>ConfigV3.permissionConfig)
<% end -%>
<% if defaults_enabled? -%>
  .withDefaults(<%= class_name %>ConfigV3.defaultsConfig)
<% end -%>
;

// V3 Enhanced query builders
export const <%= class_name %>Queries = {
  // V2 query builders (inherited)
  withTTL: (ttl: string) => <%= class_name %>.withTTL(ttl),
  withIncludes: (associations: string[]) => <%= class_name %>.includes(associations),
<% if has_computed_properties? -%>
  withComputed: () => <%= class_name %>.withComputed(<%= class_name %>ComputedProperties),
<% end -%>
  
  // 🆕 V3 query builders
<% if activity_logs_enabled? -%>
  withActivityLogs: (options: ActivityLogOptions = {}) => 
    <%= class_name %>.withActivityLogs(options),
<% end -%>

<% if permissions_enabled? -%>
  withPermissions: (user: User, action: string = 'read') =>
    <%= class_name %>.withPermissions(user, action),
<% end -%>

<% if defaults_enabled? -%>
  withDefaults: () => <%= class_name %>.withDefaults(),
<% end -%>

  // Combined V3 features
  withV3Features: (user: User, options: V3Options = {}) =>
    <%= class_name %>.withV3Features(user, options),
  
  // Advanced coordinated queries
  createCoordinator: () => new ReactiveTTLCoordinator()
};

// 🆕 V3 Helper functions
<% if activity_logs_enabled? -%>
export const create<%= class_name %>WithActivity = async (
  data: Partial<<%= class_name %>Data>,
  user: User
): Promise<ReactiveInstanceV3<<%= class_name %>Data>> => {
  return ReactiveInstanceV3.createWithV3(<%= class_name %>ConfigV3, data, user);
};
<% end -%>

<% if permissions_enabled? -%>
export const check<%= class_name %>Permission = (
  record: <%= class_name %>Data,
  user: User,
  action: string
): boolean => {
  const adapter = new RailsPermissionAdapter(<%= class_name %>ConfigV3.permissionConfig.rules);
  return adapter.checkClientPermission(record, user, action);
};
<% end -%>

<% if defaults_enabled? -%>
export const create<%= class_name %>WithDefaults = (
  data: Partial<<%= class_name %>Data> = {}
): <%= class_name %>Data => {
  const provider = new DefaultValueProvider(<%= class_name %>ConfigV3.defaultsConfig);
  return provider.applyDefaults(data, '<%= class_name.downcase %>');
};
<% end -%>
```

#### V3 Enhanced Rails Model Configuration

```ruby
# app/models/job.rb
class Job < ApplicationRecord
  # Standard Rails associations and scopes
  belongs_to :client
  has_many :tasks, dependent: :destroy
  has_many :job_assignments, dependent: :destroy
  has_many :assigned_users, through: :job_assignments, source: :user
  
  # Rails scopes with Zero.js optimization hints
  scope :active, -> { where(status: 'active') }
  scope :inactive, -> { where(status: 'inactive') }
  scope :high_priority, -> { where(priority: 3) }
  scope :by_client, ->(client_id) { where(client_id: client_id) }
  scope :recent, -> { where('created_at > ?', 1.day.ago) }
  
  # Rails validations
  validates :title, presence: true, length: { minimum: 1 }
  validates :status, presence: true, inclusion: { in: %w[pending active completed cancelled] }
  validates :priority, presence: true, inclusion: { in: 1..3 }
  
  # 🆕 V3 Zero.js configuration with enhanced features
  zero_config do
    # V2 features (inherited)
    ttl find: '2h', collection: '1h', scopes: '30m', preload: '4h'
    associations preload: [:client, :tasks], include_computed: [:tasks]
    indexes [:status, :priority], [:client_id, :status]
    estimated_rows active: 5000, recent: 2000, by_client: 500
    many_to_many_scopes [:assigned_users]
    client_processing_scopes [:with_active_tasks]
    computed_properties_available true

    # 🆕 V3 FEATURE: ActivityLogs integration
    activity_logs do
      enabled true
      track_fields [:title, :status, :priority, :description, :due_date]
      client_generation true
      server_validation true
      include_metadata true
    end

    # 🆕 V3 FEATURE: Permissions integration  
    permissions do
      enabled true
      policy 'JobPolicy'
      actions [:read, :create, :update, :destroy]
      client_filtering true
      server_validation true
      
      # Define permission rules for client-side filtering
      rules do
        read { |job, user| job.client_id == user.client_id }
        create { |_, user| user.role.in?(['admin', 'manager']) }
        update { |job, user| job.client_id == user.client_id && user.role.in?(['admin', 'manager', 'technician']) }
        destroy { |job, user| job.client_id == user.client_id && user.role.in?(['admin', 'manager']) }
      end
    end

    # 🆕 V3 FEATURE: Schema defaults synchronization
    defaults do
      enabled true
      apply_on_creation true
      apply_on_form_population true
      
      # Schema defaults from database
      schema_defaults priority: 2, status: 'pending'
      
      # Computed defaults based on other fields
      computed_defaults do
        due_date { |job| job.created_at ? job.created_at + 7.days : 7.days.from_now }
        title { |job| job.client_id ? "New Job for #{Client.find(job.client_id).name}" : "New Job" }
      end
    end
  end
end

# app/policies/job_policy.rb (Rails/Pundit integration)
class JobPolicy < ApplicationPolicy
  def read?
    record.client_id == user.client_id
  end

  def create?
    user.role.in?(['admin', 'manager'])
  end

  def update?
    record.client_id == user.client_id && 
    user.role.in?(['admin', 'manager', 'technician'])
  end

  def destroy?
    record.client_id == user.client_id && 
    user.role.in?(['admin', 'manager'])
  end
end
```

#### V3 Server-Side Validation Controllers

```ruby
# app/controllers/api/v1/activity_logs_controller.rb
class Api::V1::ActivityLogsController < Api::V1::BaseController
  before_action :authenticate_user!

  # V3 Feature: Validate client-generated activity logs
  def validate
    activity_log_params = params.require(:activity_log)
    
    # Server validation: Must be attributed to authenticated user
    unless activity_log_params[:user_id] == current_user.id
      render json: { 
        valid: false, 
        error: 'Activity log must be attributed to authenticated user' 
      }, status: 422
      return
    end
    
    # Additional validation: User must have permission for the entity
    entity = find_entity(activity_log_params[:entity_type], activity_log_params[:entity_id])
    unless can_access_entity?(entity)
      render json: { 
        valid: false, 
        error: 'User does not have permission to log activity for this entity' 
      }, status: 403
      return
    end
    
    # Create the activity log
    activity_log = ActivityLog.create!(
      entity_type: activity_log_params[:entity_type],
      entity_id: activity_log_params[:entity_id],
      entity_uuid: activity_log_params[:entity_uuid],
      client_id: current_user.client_id,
      user_id: current_user.id,
      action: activity_log_params[:action],
      field_changes: activity_log_params[:field_changes],
      metadata: activity_log_params[:metadata]
    )
    
    render json: { 
      valid: true, 
      activity_log: ActivityLogSerializer.new(activity_log).as_json 
    }
    
  rescue StandardError => e
    render json: { 
      valid: false, 
      error: "Server validation failed: #{e.message}" 
    }, status: 422
  end

  private

  def find_entity(entity_type, entity_id)
    entity_class = entity_type.constantize
    entity_class.find(entity_id)
  end

  def can_access_entity?(entity)
    # Use Pundit for permission checking
    policy = policy(entity)
    policy.read?
  end
end

# app/controllers/api/v1/permissions_controller.rb
class Api::V1::PermissionsController < Api::V1::BaseController
  before_action :authenticate_user!

  # V3 Feature: Validate Zero.js query permissions
  def validate
    query_params = params.require(:query)
    user_id = params.require(:user_id)
    action = params.require(:action)
    
    # Ensure user is requesting permissions for themselves
    unless user_id == current_user.id
      render json: { 
        valid: false, 
        error: 'Cannot validate permissions for other users' 
      }, status: 403
      return
    end
    
    # Extract entity information from query
    entity_type = query_params[:model]
    entity_conditions = query_params[:conditions] || {}
    
    # Check permissions using Pundit
    policy_class = "#{entity_type.camelize}Policy".constantize
    policy = policy_class.new(current_user, entity_type.camelize.constantize)
    
    has_permission = case action
    when 'read'
      policy.read?
    when 'create'
      policy.create?
    when 'update'
      policy.update?
    when 'destroy'
      policy.destroy?
    else
      false
    end
    
    render json: { 
      valid: has_permission,
      user_id: current_user.id,
      action: action,
      entity_type: entity_type,
      conditions: entity_conditions
    }
    
  rescue StandardError => e
    render json: { 
      valid: false, 
      error: "Permission validation failed: #{e.message}" 
    }, status: 422
  end
end
```

---

## 🔄 V3 Usage Examples

### Svelte Components with V3 Features

```svelte
<!-- JobDetailPageV3.svelte -->
<script>
  import { Job, Task, Client } from '$lib/zero/models';
  import { TaskComputedProperties } from '$lib/models/computed-properties';
  import { getCurrentUser } from '$lib/auth';
  
  export let jobId: string;
  
  const currentUser = getCurrentUser();
  
  // V3 Feature: Combined query with all enhancements
  const jobQuery = Job
    .includes(['client', 'tasks'])
    .withPermissions(currentUser, 'read')
    .withActivityLogs({ includeFieldChanges: true })
    .withV3Features(currentUser, {
      trackActivity: true,
      applyPermissions: true,
      useDefaults: false // Not needed for existing record
    })
    .find(jobId);
  
  // V3 Feature: Permission-aware task query with defaults
  const newTaskQuery = Task
    .withDefaults() // Apply schema defaults for new task form
    .withPermissions(currentUser, 'create')
    .withComputed(TaskComputedProperties);
  
  // V3 Feature: Activity logs with user context
  const activityQuery = ActivityLog
    .withPermissions(currentUser, 'read')
    .where({ 
      entity_type: 'Job', 
      entity_id: jobId,
      client_id: currentUser.client_id 
    })
    .orderBy('created_at', 'desc');
  
  // TTL-coordinated queries for optimal performance
  const coordinator = new ReactiveTTLCoordinator();
  
  const coordinatedQuery = coordinator.registerQuery('jobDetail', 
    () => jobQuery,
    { ttl: '1d', required: true }
  );
  
  const tasksQuery = coordinator.registerQuery('tasks',
    () => Task.withComputed(TaskComputedProperties)
              .withPermissions(currentUser, 'read')
              .where({ job_id: jobId })
              .orderBy('position'),
    { ttl: '1h', preload: true }
  );
  
  const combinedData = coordinator.createCombinedQuery(['jobDetail', 'tasks']);
  
  // V3 reactive access with all enhancements
  $: jobData = combinedData.data.jobDetail;
  $: tasksData = combinedData.data.tasks;
  $: activityLogs = jobData?.activityLogs || [];
  $: isLoading = combinedData.isLoading;
  $: canEdit = jobData && checkJobPermission(jobData, currentUser, 'update');
  
  // V3 Feature: Update with activity logging
  async function updateJobWithActivity(changes) {
    try {
      const updatedJob = await jobQuery.updateWithPermissions(changes, currentUser);
      
      // Activity log automatically generated and validated
      console.log('Job updated with activity log:', updatedJob);
      
    } catch (error) {
      if (error instanceof PermissionError) {
        alert('You do not have permission to update this job');
      } else {
        alert(`Update failed: ${error.message}`);
      }
    }
  }
  
  // V3 Feature: Create task with defaults and permissions
  async function createTaskWithDefaults() {
    try {
      const defaultTaskData = createTaskWithDefaults({
        job_id: jobId,
        client_id: currentUser.client_id
      });
      
      const newTask = await ReactiveInstanceV3.createWithV3(
        TaskConfigV3, 
        defaultTaskData, 
        currentUser
      );
      
      console.log('Task created with defaults and activity log:', newTask);
      
    } catch (error) {
      alert(`Task creation failed: ${error.message}`);
    }
  }
</script>

<!-- Template with V3 features -->
{#if !isLoading && jobData}
  <div class="job-detail-v3">
    <header class="job-header">
      <div class="job-title-section">
        <h1>{jobData.title}</h1>
        <div class="job-meta">
          <span class="status-badge status-{jobData.status}">{jobData.status}</span>
          <span class="priority-badge priority-{jobData.priority}">
            Priority {jobData.priority}
          </span>
        </div>
      </div>
      
      {#if canEdit}
        <div class="job-actions">
          <button 
            class="btn btn-primary" 
            onclick={() => updateJobWithActivity({ status: 'in_progress' })}
          >
            Start Job
          </button>
          <button 
            class="btn btn-secondary" 
            onclick={createTaskWithDefaults}
          >
            Add Task
          </button>
        </div>
      {/if}
    </header>
    
    <div class="job-content">
      <div class="job-info">
        <p><strong>Client:</strong> {jobData.client?.name}</p>
        <p><strong>Description:</strong> {jobData.description}</p>
        {#if jobData.due_date}
          <p><strong>Due Date:</strong> {new Date(jobData.due_date).toLocaleDateString()}</p>
        {/if}
      </div>
      
      <!-- V3 Feature: Activity timeline -->
      {#if activityLogs.length > 0}
        <div class="activity-timeline">
          <h3>Activity History</h3>
          {#each activityLogs as log}
            <div class="activity-entry">
              <div class="activity-meta">
                <span class="activity-user">{log.user?.name}</span>
                <span class="activity-time">{new Date(log.created_at).toLocaleString()}</span>
              </div>
              <div class="activity-action">
                {log.action}: {log.field_changes?.map(f => `${f.field_name}: ${f.old_value} → ${f.new_value}`).join(', ')}
              </div>
            </div>
          {/each}
        </div>
      {/if}
      
      <!-- Tasks section with computed properties -->
      <div class="tasks-section">
        <h2>Tasks</h2>
        {#each tasksData as task}
          <div class="task" class:in-progress={task.status === 'in_progress'}>
            <h3>{task.title}</h3>
            <p>{task.description}</p>
            
            <!-- V3 computed properties available automatically -->
            {#if task.in_progress_since}
              <p>In progress since: {task.in_progress_since.toLocaleString()}</p>
            {/if}
            <p>Time spent: {task.duration_display}</p>
            
            <!-- V3 permission-aware actions -->
            {#if checkTaskPermission(task, currentUser, 'update')}
              <div class="task-actions">
                <button onclick={() => task.updateWithPermissions({ status: 'completed' }, currentUser)}>
                  Complete
                </button>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>
{:else if isLoading}
  <div class="loading">Loading job details...</div>
{:else}
  <div class="error">Job not found or access denied</div>
{/if}
```

### Vanilla JavaScript with V3 Features

```typescript
// Console, Node.js, or vanilla JavaScript usage with V3
import { Job, Task, Client } from './models';
import { TaskComputedProperties } from './computed-properties';
import { getCurrentUser } from './auth';

// V3 Features in vanilla JavaScript context
const currentUser = getCurrentUser();

// Permission-aware job query with activity logs
const job = Job
  .includes(['client', 'tasks'])
  .withPermissions(currentUser, 'read')
  .withActivityLogs()
  .find('job-123');

console.log('Job title:', job.title);
console.log('Can edit:', checkJobPermission(job.data, currentUser, 'update'));
console.log('Activity logs:', job.data?.activityLogs?.length || 0);

// V3 Feature: Create with defaults and activity logging
async function createJobWithV3Features() {
  try {
    // Create job data with schema defaults
    const jobData = createJobWithDefaults({
      client_id: 'client-456',
      title: '', // Will be populated with computed default
      // priority: 2, // Will be populated with schema default
      // status: 'pending' // Will be populated with schema default
    });
    
    console.log('Job data with defaults:', jobData);
    
    // Create with permissions and activity logging
    const newJob = await ReactiveInstanceV3.createWithV3(
      JobConfigV3,
      jobData,
      currentUser
    );
    
    console.log('Created job with activity log:', newJob);
    
  } catch (error) {
    if (error instanceof PermissionError) {
      console.error('Permission denied:', error.message);
    } else {
      console.error('Creation failed:', error.message);
    }
  }
}

// V3 Feature: Permission-aware task queries
const userTasks = Task
  .withPermissions(currentUser, 'read')
  .withComputed(TaskComputedProperties)
  .where({ 
    client_id: currentUser.client_id,
    status: 'in_progress' 
  });

userTasks.subscribe((tasks) => {
  console.log('User tasks with permissions applied:', tasks.length);
  
  tasks.forEach(task => {
    console.log(`Task: ${task.title}`);
    console.log(`Time spent: ${task.duration_display}`);
    console.log(`Can update: ${checkTaskPermission(task, currentUser, 'update')}`);
    
    if (task.activityLogs) {
      console.log(`Activity logs: ${task.activityLogs.length}`);
    }
  });
});

// V3 Feature: Bulk operations with activity logging
async function bulkUpdateWithActivity() {
  const jobs = Job
    .withPermissions(currentUser, 'update')
    .where({ status: 'pending', client_id: currentUser.client_id });
  
  for (const job of jobs.data || []) {
    try {
      await job.updateWithPermissions(
        { status: 'active' }, 
        currentUser
      );
      
      console.log(`Updated job ${job.id} with activity log`);
      
    } catch (error) {
      console.error(`Failed to update job ${job.id}:`, error.message);
    }
  }
}

// V3 Feature: Advanced multi-query coordination with all features
class JobDashboardCoordinatorV3 {
  private ttlCoordinator = new ReactiveTTLCoordinator();
  
  setupV3Queries(clientId: string, user: User) {
    // Jobs with permissions, defaults, and long TTL
    const jobsQuery = this.ttlCoordinator.registerQuery('jobs',
      () => Job.includes(['client'])
               .withPermissions(user, 'read')
               .withActivityLogs({ limit: 5 })
               .where({ client_id: clientId })
               .orderBy('priority', 'desc'),
      { ttl: '4h', required: true }
    );
    
    // Tasks with computed properties and permissions
    const tasksQuery = this.ttlCoordinator.registerQuery('tasks',
      () => Task.withComputed(TaskComputedProperties)
               .withPermissions(user, 'read')
               .where({ client_id: clientId, status: 'in_progress' }),
      { ttl: '30m', preload: true }
    );
    
    // Activity logs for dashboard overview
    const activityQuery = this.ttlCoordinator.registerQuery('activity',
      () => ActivityLog.withPermissions(user, 'read')
                      .where({ 
                        client_id: clientId,
                        created_at: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
                      })
                      .orderBy('created_at', 'desc')
                      .limit(20),
      { ttl: '5m', preload: true }
    );
    
    return this.ttlCoordinator.createCombinedQuery(['jobs', 'tasks', 'activity']);
  }
}

// Usage
const coordinatorV3 = new JobDashboardCoordinatorV3();
const dashboardData = coordinatorV3.setupV3Queries(currentUser.client_id, currentUser);

// All queries coordinated with V3 features
const { jobs, tasks, activity } = dashboardData.data;
console.log('Dashboard loaded with V3 features:', {
  jobsCount: jobs?.length || 0,
  tasksCount: tasks?.length || 0,
  recentActivityCount: activity?.length || 0
});
```

### V3 Form Integration Examples

```typescript
// V3 Feature: Form population with schema defaults
import { createJobWithDefaults, createTaskWithDefaults } from './models';

// Job creation form with defaults
function populateJobForm(clientId: string): JobFormData {
  const jobDefaults = createJobWithDefaults({
    client_id: clientId
    // title, priority, status, due_date will be populated with defaults
  });
  
  return {
    ...jobDefaults,
    // Override specific defaults if needed
    title: `New Job for ${getClientName(clientId)}`,
    due_date: addDays(new Date(), 14) // Custom due date
  };
}

// Task creation with parent job context
function populateTaskForm(jobId: string): TaskFormData {
  const job = Job.find(jobId);
  
  const taskDefaults = createTaskWithDefaults({
    job_id: jobId,
    client_id: job.data?.client_id
    // title, status, priority will be populated with schema defaults
  });
  
  return {
    ...taskDefaults,
    // Inherit some values from parent job
    priority: job.data?.priority || taskDefaults.priority,
    due_date: job.data?.due_date || addDays(new Date(), 7)
  };
}

// Permission-aware form fields
function getEditableFields(record: any, user: User, action: string): string[] {
  const allFields = Object.keys(record);
  
  return allFields.filter(field => {
    // Check field-level permissions (if configured)
    const canEditField = checkFieldPermission(record, user, action, field);
    return canEditField;
  });
}

// Example usage in form component
function setupJobEditForm(jobId: string, user: User) {
  const job = Job
    .withPermissions(user, 'update')
    .withActivityLogs()
    .find(jobId);
  
  const editableFields = getEditableFields(job.data, user, 'update');
  
  return {
    data: job.data,
    editableFields,
    canEdit: checkJobPermission(job.data, user, 'update'),
    onSave: async (changes) => {
      return await job.updateWithPermissions(changes, user);
    }
  };
}
```

---

## 🚀 V3 Implementation Strategy

### Phase 1: ActivityLogs Foundation (Weeks 1-2)

#### Client-Side Generation System
```typescript
// Week 1: Core ActivityLog architecture
class ActivityLogTracker<T> {
  // Client-side log generation
  generateLog(entity: T, changes: FieldChanges): ActivityLogEntry
  
  // Field change detection and tracking
  trackChanges(oldData: T, newData: T): FieldChange[]
  
  // Metadata collection (browser, timestamp, etc.)
  collectMetadata(): ActivityLogMetadata
}

// Week 1: Server validation coordinator
class ActivityLogCoordinator {
  // Server-side validation with authentication check
  validateAndSubmit(activityLog: ActivityLogEntry): Promise<ValidationResult>
  
  // Batch validation for multiple logs
  validateBatch(activityLogs: ActivityLogEntry[]): Promise<BatchValidationResult>
  
  // Integration with TTL coordination
  enhanceQuery<T>(query: CompiledZeroQuery<T>): CompiledZeroQuery<T>
}
```

#### Rails Integration for ActivityLogs
```ruby
# Week 2: Rails controller for validation
class Api::V1::ActivityLogsController < Api::V1::BaseController
  def validate
    # Validate client-generated activity log
    # Ensure attribution to authenticated user
    # Create server-side record
  end
  
  def batch_validate
    # Handle multiple activity logs efficiently
  end
end

# Week 2: Enhanced Rails generator
# Update ERB templates to include ActivityLog configuration
# Generate ActivityLog integration for models
```

### Phase 2: Zero.js Permissions Integration (Weeks 3-4)

#### Permission-Aware Query System
```typescript
// Week 3: Core permissions architecture
class PermissionAwareQuery {
  // Rails/Pundit integration
  withPermissions<T>(baseQuery: IReactiveQuery<T>, user: User, action: string): PermissionFilteredQuery<T>
  
  // Server-side validation
  validatePermissions(query: ZeroQuery, context: UserContext): Promise<PermissionValidationResult>
  
  // Client-side filtering rules
  applyClientFilters<T>(data: T[], permissions: PermissionRuleSet): T[]
}

// Week 3: Rails permission adapter
class RailsPermissionAdapter {
  // Client-side permission checking using Rails/Pundit patterns
  checkClientPermission<T>(record: T, user: User, action: string): boolean
  
  // Rule evaluation system
  evaluateRule(rule: PermissionRule, record: T, user: User): boolean
}
```

#### Rails/Pundit Integration
```ruby
# Week 4: Permission validation controller
class Api::V1::PermissionsController < Api::V1::BaseController
  def validate
    # Validate Zero.js query permissions using Pundit
    # Return permission context for client-side filtering
  end
end

# Week 4: Enhanced Rails generator with permissions
# Generate permission configuration from Pundit policies
# Create client-side permission rules
# Integrate with Zero.js query generation
```

### Phase 3: Schema Defaults Synchronization (Weeks 5-6)

#### Default Value System
```typescript
// Week 5: Schema defaults provider
class DefaultValueProvider {
  // Extract defaults from Rails schema
  getDefaults(modelName: string): Record<string, any>
  
  // Apply defaults to model instances
  applyDefaults<T>(data: Partial<T>, modelName?: string): T
  
  // Form population integration
  populateForm(formData: FormData, modelName: string): FormData
}

// Week 5: Default applier for instances
class DefaultApplier<T> {
  // Apply field defaults
  apply(data: Partial<T> | T): T
  
  // Computed defaults based on other fields
  applyComputedDefaults(data: T): T
  
  // Conditional default application
  shouldApplyDefault(value: any): boolean
}
```

#### Rails Schema Integration
```ruby
# Week 6: Enhanced Rails generator with schema defaults
# Extract default values from database schema
# Generate computed defaults configuration
# Create default value synchronization

# Week 6: Rails introspection for defaults
class ZeroSchemaGenerator::DefaultsExtractor
  def extract_defaults(model_class)
    # Extract from database schema
    # Parse default value expressions
    # Generate TypeScript default configuration
  end
  
  def extract_computed_defaults(model_class)
    # Analyze model methods for computed defaults
    # Generate client-side computation logic
  end
end
```

### Phase 4: V3 Integration & Enhancement (Weeks 7-8)

#### Unified V3 Architecture
```typescript
// Week 7: ReactiveRecordV3 class
class ReactiveRecordV3<T> extends ReactiveRecord<T> {
  // Integrate all V3 features into unified architecture
  // Maintain backward compatibility with V2
  // Enhanced query builders with V3 features
  
  static createModel<T>(config: ModelConfigV3): UnifiedReactiveModelV3<T>
}

// Week 7: V3 reactive instance
class ReactiveInstanceV3<T> extends ReactiveInstance<T> {
  // Enhanced data accessor with V3 features
  // Permission-aware updates with activity logging
  // Schema defaults application
  
  async updateWithPermissions(changes: Partial<T>, user: User): Promise<T>
  static async createWithV3<T>(config: ModelConfigV3, data: Partial<T>, user: User): Promise<ReactiveInstanceV3<T>>
}
```

#### Advanced V3 Features
```typescript
// Week 8: V3 query builders
class ReactiveV3Builder<T> {
  // Combined V3 features in single builder
  withV3Features(user: User, options: V3Options): ReactiveInstanceV3<T>
  
  // Feature-specific builders
  withActivityLogs(options: ActivityLogOptions): ReactiveActivityBuilder<T>
  withPermissions(user: User, action: string): ReactivePermissionBuilder<T>
  withDefaults(): ReactiveDefaultsBuilder<T>
}

// Week 8: Performance optimization for V3
class V3PerformanceOptimizer {
  // Optimize query performance with V3 features
  optimizeV3Query<T>(query: ZeroQuery, features: V3Features): OptimizedZeroQuery<T>
  
  // Caching strategies for permissions and defaults
  setupV3Caching(config: ModelConfigV3): CacheConfiguration
}
```

### Phase 5: Testing, Documentation & Polish (Weeks 9-10)

#### Comprehensive Testing
```typescript
// Week 9: V3 feature testing
describe('ReactiveRecord V3 Features', () => {
  describe('ActivityLogs', () => {
    test('client generation with server validation')
    test('permission-based activity log access')
    test('integration with TTL coordination')
  });
  
  describe('Permissions', () => {
    test('Rails/Pundit integration')
    test('client-side permission filtering')
    test('server-side validation')
  });
  
  describe('Schema Defaults', () => {
    test('default value application')
    test('computed defaults')
    test('form population')
  });
  
  describe('V3 Integration', () => {
    test('all features work together')
    test('backward compatibility with V2')
    test('performance with V3 features enabled')
  });
});
```

#### Documentation & Migration
```markdown
<!-- Week 10: Comprehensive documentation -->
# ReactiveRecord V3 Migration Guide
- V2 to V3 upgrade path
- Feature-by-feature migration
- Breaking changes and compatibility

# V3 Feature Documentation
- ActivityLogs usage patterns
- Permissions integration guide
- Schema defaults configuration

# Performance Guide
- V3 optimization strategies
- Caching best practices
- Query performance with V3 features
```

---

## 📚 V3 API Reference

### Enhanced Factory Methods

```typescript
// V3 Enhanced model creation
ReactiveRecordV3.createModel<T>(config: ModelConfigV3): UnifiedReactiveModelV3<T>

// V3 instance creation with all features
ReactiveInstanceV3.createWithV3<T>(
  config: ModelConfigV3, 
  data: Partial<T>, 
  user: User
): Promise<ReactiveInstanceV3<T>>
```

### V3 Query Methods

```typescript
interface UnifiedReactiveModelV3<T> {
  // V2 methods (inherited and enhanced)
  find(id: string, options?: QueryOptionsV3): ReactiveInstanceV3<T>
  find_by(params: Partial<T>, options?: QueryOptionsV3): ReactiveInstanceV3<T>
  where(conditions: Partial<T>, options?: QueryOptionsV3): ReactiveInstanceV3<T[]>
  
  // V3 Feature methods
  withActivityLogs(options?: ActivityLogOptions): ReactiveActivityBuilder<T>
  withPermissions(user: User, action?: string): ReactivePermissionBuilder<T>
  withDefaults(): ReactiveDefaultsBuilder<T>
  withV3Features(user: User, options?: V3Options): ReactiveV3Builder<T>
  
  // V2 methods still available
  includes(associations: string[]): ReactiveIncludeBuilder<T>
  withTTL(ttl: string): ReactiveTTLBuilder<T>
  withComputed<P>(properties: P): ReactiveComputedBuilder<T, P>
}
```

### V3 Feature Interfaces

```typescript
// ActivityLogs interfaces
interface ActivityLogOptions {
  includeFieldChanges?: boolean;
  includeMetadata?: boolean;
  limit?: number;
  serverValidation?: boolean;
}

interface ActivityLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  entity_uuid: string;
  client_id: string;
  user_id: string;
  action: string;
  field_changes: FieldChange[];
  metadata: ActivityLogMetadata;
  created_at: string;
}

// Permissions interfaces
interface PermissionOptions {
  action: string;
  clientFiltering?: boolean;
  serverValidation?: boolean;
}

interface PermissionRule {
  type: 'owner' | 'client_member' | 'role_based' | 'custom';
  condition?: string;
  allowed_roles?: string[];
  evaluate?: (record: any, user: User) => boolean;
}

// Schema Defaults interfaces
interface DefaultsOptions {
  applyOnCreation?: boolean;
  applyOnFormPopulation?: boolean;
  overrideExisting?: boolean;
}

interface DefaultsConfig {
  defaults: Record<string, any>;
  computedDefaults?: Record<string, (data: any) => any>;
  applyOnCreation: boolean;
  applyOnFormPopulation: boolean;
}
```

### V3 Configuration

```typescript
// Enhanced model configuration
interface ModelConfigV3 extends ModelConfig {
  // V3 feature flags
  features: {
    activityLogs: boolean;
    permissions: boolean;
    defaults: boolean;
  };
  
  // V3 feature configurations
  activityLogConfig?: ActivityLogConfig;
  permissionConfig?: PermissionConfig;
  defaultsConfig?: DefaultsConfig;
}

interface V3Options {
  trackActivity?: boolean;
  applyPermissions?: boolean;
  useDefaults?: boolean;
  cachePermissions?: boolean;
  batchActivityLogs?: boolean;
}
```

---

## 🎯 V3 Success Metrics

### Technical Excellence
- **Feature Integration**: All V3 features work seamlessly with existing V2 architecture
- **Performance**: < 10% performance impact when V3 features are enabled
- **Memory Efficiency**: < 100KB additional memory usage per 1000 V3-enhanced records
- **Backward Compatibility**: 100% compatibility with existing V2 code
- **Rails Integration**: Perfect synchronization with Rails schema, permissions, and audit trail

### Developer Experience  
- **Zero Learning Curve**: V3 features follow familiar Rails patterns
- **Enhanced Productivity**: Activity logging, permissions, and defaults work automatically
- **Type Safety**: Full TypeScript support for all V3 features
- **Form Integration**: Automatic form population with schema defaults
- **Audit Trail**: Comprehensive activity logging with client generation and server validation

### Business Value
- **Compliance**: Complete audit trail for regulatory requirements
- **Security**: Permission-based data access with Rails/Pundit integration
- **Data Quality**: Consistent defaults across client and server
- **Developer Velocity**: Reduced boilerplate for common patterns
- **Operational Excellence**: Enhanced monitoring and debugging capabilities

### V3 Feature Performance
- **ActivityLogs**: Client generation with < 5ms latency, server validation < 100ms
- **Permissions**: Client filtering < 2ms per record, server validation < 50ms
- **Schema Defaults**: Form population < 1ms, default application < 0.5ms
- **Combined Features**: All V3 features together < 15ms total overhead
- **TTL Integration**: V3 features integrate with existing TTL coordination seamlessly

---

## 📞 V3 Support and Troubleshooting

### Common V3 Issues

#### ActivityLogs Not Generating
```typescript
// Problem: Activity logs not being created
const job = Job.find('job-123');
await job.updateWithPermissions({ status: 'active' }, currentUser);
// No activity log generated

// Solution: Ensure ActivityLogs are enabled in model config
const JobConfigV3: ModelConfigV3 = {
  // ... other config
  features: {
    activityLogs: true, // Must be enabled
    permissions: true,
    defaults: true
  },
  activityLogConfig: {
    entityType: 'Job',
    trackFields: ['status', 'title', 'priority'],
    serverValidation: true,
    clientGeneration: true
  }
};
```

#### Permission Validation Failures
```typescript
// Problem: Permission checks failing unexpectedly
const jobs = Job.withPermissions(currentUser, 'read').where({ client_id: 'client-123' });
// Returns empty array despite user having access

// Solution: Check Rails policy and client-side rules alignment
// Ensure Pundit policy matches client-side permission rules
class JobPolicy < ApplicationPolicy
  def read?
    record.client_id == user.client_id # Must match client rule
  end
end

// Client-side rule must match server-side policy
const permissionRules = {
  job: {
    read: {
      type: 'client_member', // Matches Pundit policy logic
      condition: 'job.client_id === user.client_id'
    }
  }
};
```

#### Schema Defaults Not Applied
```typescript
// Problem: Schema defaults not being applied to new records
const newJob = createJobWithDefaults({ client_id: 'client-123' });
console.log(newJob.priority); // undefined instead of default value

// Solution: Check schema defaults configuration
const JobConfigV3: ModelConfigV3 = {
  // ... other config
  defaultsConfig: {
    defaults: {
      priority: 2,        // Must match Rails schema default
      status: 'pending'   // Must match Rails schema default
    },
    applyOnCreation: true,
    applyOnFormPopulation: true
  }
};

// Ensure Rails model has matching defaults
# app/models/job.rb
class Job < ApplicationRecord
  # Database schema should have:
  # t.integer :priority, default: 2
  # t.string :status, default: 'pending'
end
```

### V3 Performance Optimization

#### Activity Log Performance
```typescript
// For high-frequency updates, batch activity logs
const activityLogCoordinator = new ActivityLogCoordinator();

// Enable batching for better performance
const batchOptions = {
  batchSize: 10,
  batchInterval: 1000, // 1 second
  serverValidation: true
};

// Batch multiple activity logs
const activities = [
  { entity: job1, changes: { status: 'active' } },
  { entity: job2, changes: { priority: 3 } },
  { entity: job3, changes: { title: 'Updated Title' } }
];

await activityLogCoordinator.validateBatch(activities, batchOptions);
```

#### Permission Caching
```typescript
// Cache permission results for better performance
const permissionCache = new Map<string, PermissionResult>();

const cachedPermissionFilter = new PermissionFilter({
  ...config,
  caching: {
    enabled: true,
    ttl: 300000, // 5 minutes
    maxSize: 1000
  }
});

// Permission results will be cached per user/action/record combination
const canEdit = cachedPermissionFilter.checkPermission(job, currentUser, 'update');
```

#### Schema Defaults Optimization
```typescript
// Optimize default application for large datasets
const optimizedDefaultApplier = new DefaultApplier({
  ...config,
  optimization: {
    lazyComputation: true,      // Compute defaults only when accessed
    memoization: true,          // Cache computed defaults
    batchApplication: true      // Apply defaults in batches
  }
});

// For large collections, apply defaults efficiently
const jobsWithDefaults = optimizedDefaultApplier.applyBatch(jobCollection);
```

### Getting V3 Help

- **Documentation**: Complete V3 feature documentation with examples
- **Migration Guide**: Step-by-step V2 to V3 upgrade path
- **API Reference**: Comprehensive V3 API documentation
- **Performance Guide**: V3 optimization strategies and best practices
- **Troubleshooting**: Common issues and solutions for each V3 feature
- **Examples**: Real-world usage patterns and integration examples

---

## 📝 V3 Migration Path

### Migrating from V2 to V3

#### Step 1: Enable V3 Features Gradually
```typescript
// Start with V3 features disabled (V2 compatibility)
const JobConfigV3: ModelConfigV3 = {
  ...JobConfigV2, // Inherit V2 configuration
  
  // V3 features initially disabled
  features: {
    activityLogs: false,
    permissions: false,
    defaults: false
  }
};

// Your existing V2 code continues to work unchanged
const job = Job.find('job-123');
console.log(job.title); // Works exactly as before
```

#### Step 2: Enable Schema Defaults (Safest First)
```typescript
// Enable defaults first (lowest risk)
const JobConfigV3: ModelConfigV3 = {
  ...JobConfigV2,
  
  features: {
    activityLogs: false,
    permissions: false,
    defaults: true // Enable defaults first
  },
  
  defaultsConfig: {
    defaults: {
      priority: 2,
      status: 'pending'
    },
    applyOnCreation: true,
    applyOnFormPopulation: true
  }
};

// Test with new record creation
const newJob = createJobWithDefaults({ client_id: 'client-123' });
console.log('Priority default applied:', newJob.priority === 2);
```

#### Step 3: Add Permissions Integration
```typescript
// Add permissions after defaults are working
const JobConfigV3: ModelConfigV3 = {
  ...JobConfigV2,
  
  features: {
    activityLogs: false,
    permissions: true, // Add permissions
    defaults: true
  },
  
  permissionConfig: {
    policy: 'JobPolicy',
    actions: ['read', 'create', 'update', 'destroy'],
    clientFiltering: true,
    serverValidation: true,
    rules: {
      read: { type: 'client_member' },
      create: { type: 'role_based', allowed_roles: ['admin', 'manager'] },
      update: { type: 'client_member' },
      destroy: { type: 'role_based', allowed_roles: ['admin', 'manager'] }
    }
  }
};

// Test permission-aware queries
const jobs = Job.withPermissions(currentUser, 'read').where({ client_id: currentUser.client_id });
console.log('Permission filtering working:', jobs.data?.length || 0);
```

#### Step 4: Enable ActivityLogs (Most Complex)
```typescript
// Finally enable activity logs
const JobConfigV3: ModelConfigV3 = {
  ...JobConfigV2,
  
  features: {
    activityLogs: true, // Enable activity logs last
    permissions: true,
    defaults: true
  },
  
  activityLogConfig: {
    entityType: 'Job',
    trackFields: ['title', 'status', 'priority', 'description'],
    serverValidation: true,
    clientGeneration: true,
    includeMetadata: true
  }
};

// Test activity logging
const job = Job.find('job-123');
await job.updateWithPermissions({ status: 'active' }, currentUser);
console.log('Activity log created:', job.data?.activityLogs?.length || 0);
```

#### Step 5: Use Combined V3 Features
```typescript
// Use all V3 features together
const jobQuery = Job
  .withV3Features(currentUser, {
    trackActivity: true,
    applyPermissions: true,
    useDefaults: false // Not needed for existing records
  })
  .includes(['client', 'tasks'])
  .find(jobId);

console.log('V3 migration complete:', {
  hasPermissions: !!jobQuery.permissionFilter,
  hasActivityLogs: !!jobQuery.activityLogTracker,
  hasDefaults: !!jobQuery.defaultApplier
});
```

### Breaking Changes and Compatibility

#### V3 Maintains Full V2 Compatibility
```typescript
// ✅ All V2 code continues to work unchanged
const job = Job.find('job-123');                           // V2 pattern - still works
const tasks = Task.where({ job_id: 'job-123' });          // V2 pattern - still works
const coordinated = coordinator.createCombinedQuery(...);  // V2 pattern - still works

// ✅ V2 computed properties still work
const taskWithComputed = Task.withComputed(TaskComputedProperties).find('task-123');

// ✅ V2 TTL coordination still works
const ttlQuery = Task.withTTL('1h').where({ status: 'active' });
```

#### New V3 Features Are Opt-In Only
```typescript
// ❌ V3 features are NOT enabled by default
const job = Job.find('job-123');
console.log(job.activityLogs); // undefined - must explicitly enable

// ✅ V3 features must be explicitly enabled
const jobWithV3 = Job.withActivityLogs().find('job-123');
console.log(jobWithV3.activityLogs); // Available when enabled
```

#### Configuration Migration
```typescript
// V2 configuration still works
const JobConfigV2: ModelConfig = {
  tableName: 'jobs',
  associations: [...],
  scopes: {...},
  ttl: {...}
};

// V3 extends V2 configuration (backward compatible)
const JobConfigV3: ModelConfigV3 = {
  ...JobConfigV2, // All V2 config inherited
  
  // V3 additions are optional
  features: {
    activityLogs: true,    // Optional - defaults to false
    permissions: true,     // Optional - defaults to false  
    defaults: true         // Optional - defaults to false
  }
  
  // V3 feature configs only needed when features enabled
};
```

---

This ReactiveRecord v3 architecture plan provides a comprehensive roadmap for integrating ActivityLogs, Permissions, and Schema Defaults into the existing unified ReactiveRecord system. The design maintains perfect backward compatibility while adding powerful new capabilities that enhance the developer experience and provide enterprise-grade features for audit trails, security, and data consistency.

The phased implementation approach ensures a smooth transition from v2 to v3, with each feature being independently enableable and testable. The extensive examples and migration guide provide clear paths for adoption, while the comprehensive API reference and troubleshooting guide ensure long-term maintainability and developer success.