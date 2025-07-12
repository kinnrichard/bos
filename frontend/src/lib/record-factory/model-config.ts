// ModelConfig: Rails model configuration interface
// Supports all Rails model features for factory generation
// Enables automated generation from Rails models

/**
 * Rails association types
 */
export type AssociationType = 
  | 'belongs_to' 
  | 'has_one' 
  | 'has_many' 
  | 'has_many_through' 
  | 'has_one_through'
  | 'has_and_belongs_to_many';

/**
 * Rails validation types
 */
export type ValidationType = 
  | 'presence'
  | 'absence'
  | 'length'
  | 'uniqueness'
  | 'format'
  | 'inclusion'
  | 'exclusion'
  | 'numericality'
  | 'confirmation'
  | 'acceptance';

/**
 * Rails scope configuration
 */
export interface ScopeConfig {
  name: string;
  conditions?: Record<string, any>;
  lambda?: string; // Rails lambda as string for generation
  chainable?: boolean;
  description?: string;
}

/**
 * Rails association configuration
 */
export interface AssociationConfig {
  name: string;
  type: AssociationType;
  className?: string;
  foreignKey?: string;
  primaryKey?: string;
  through?: string;
  source?: string;
  dependent?: 'destroy' | 'delete' | 'nullify' | 'restrict_with_exception' | 'restrict_with_error';
  inverse?: string;
  optional?: boolean;
  polymorphic?: boolean;
}

/**
 * Rails validation configuration
 */
export interface ValidationConfig {
  field: string;
  type: ValidationType;
  options?: {
    message?: string;
    on?: 'create' | 'update' | string[];
    if?: string;
    unless?: string;
    allow_nil?: boolean;
    allow_blank?: boolean;
    strict?: boolean;
    
    // Length validation options
    minimum?: number;
    maximum?: number;
    is?: number;
    within?: [number, number];
    
    // Format validation options
    with?: string; // regex as string
    without?: string; // regex as string
    
    // Inclusion/Exclusion options
    in?: any[];
    
    // Numericality options
    only_integer?: boolean;
    greater_than?: number;
    greater_than_or_equal_to?: number;
    equal_to?: number;
    less_than?: number;
    less_than_or_equal_to?: number;
    odd?: boolean;
    even?: boolean;
  };
}

/**
 * Rails attribute configuration
 */
export interface AttributeConfig {
  name: string;
  type: string;
  nullable?: boolean;
  default?: any;
  array?: boolean;
  enum?: string[];
  description?: string;
}

/**
 * Zero.js query configuration
 */
export interface ZeroQueryConfig {
  tableName: string;
  primaryKey?: string;
  relationships?: {
    [key: string]: {
      type: 'one' | 'many';
      table: string;
      foreignKey: string;
      localKey?: string;
    };
  };
  indexes?: string[];
}

/**
 * Complete Rails model configuration for factory generation
 */
export interface ModelConfig {
  // Basic model information
  name: string;
  tableName: string;
  className: string;
  
  // Rails model features
  attributes: AttributeConfig[];
  associations: AssociationConfig[];
  validations: ValidationConfig[];
  scopes: ScopeConfig[];
  
  // Zero.js integration
  zeroConfig: ZeroQueryConfig;
  
  // Factory options
  factoryOptions?: {
    ttl?: string | number;
    debugLogging?: boolean;
    expectsCollection?: boolean;
    customMethods?: string[];
  };
  
  // Generation metadata
  generatedAt?: string;
  railsVersion?: string;
  generatorVersion?: string;
}

/**
 * Factory creation options
 */
export interface FactoryCreateOptions {
  ttl?: string | number;
  debugLogging?: boolean;
  expectsCollection?: boolean;
  defaultValue?: any;
  retryDelay?: number;
  maxRetries?: number;
}

/**
 * Rails method signature for scopes and custom methods
 */
export interface MethodSignature {
  name: string;
  parameters: {
    name: string;
    type: string;
    optional?: boolean;
    default?: any;
  }[];
  returnType: 'single' | 'collection' | 'query';
  description?: string;
}

/**
 * Configuration validation utilities
 */
export const ModelConfigValidator = {
  /**
   * Validate complete model configuration
   */
  validate(config: ModelConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Basic validation
    if (!config.name || typeof config.name !== 'string') {
      errors.push('Model name is required and must be a string');
    }
    
    if (!config.tableName || typeof config.tableName !== 'string') {
      errors.push('Table name is required and must be a string');
    }
    
    if (!config.className || typeof config.className !== 'string') {
      errors.push('Class name is required and must be a string');
    }
    
    // Validate attributes
    if (!Array.isArray(config.attributes)) {
      errors.push('Attributes must be an array');
    } else {
      config.attributes.forEach((attr, index) => {
        if (!attr.name || typeof attr.name !== 'string') {
          errors.push(`Attribute ${index}: name is required and must be a string`);
        }
        if (!attr.type || typeof attr.type !== 'string') {
          errors.push(`Attribute ${index}: type is required and must be a string`);
        }
      });
    }
    
    // Validate associations
    if (!Array.isArray(config.associations)) {
      errors.push('Associations must be an array');
    } else {
      config.associations.forEach((assoc, index) => {
        if (!assoc.name || typeof assoc.name !== 'string') {
          errors.push(`Association ${index}: name is required and must be a string`);
        }
        if (!assoc.type || !['belongs_to', 'has_one', 'has_many', 'has_many_through', 'has_one_through', 'has_and_belongs_to_many'].includes(assoc.type)) {
          errors.push(`Association ${index}: type must be a valid Rails association type`);
        }
      });
    }
    
    // Validate Zero.js config
    if (!config.zeroConfig || typeof config.zeroConfig !== 'object') {
      errors.push('Zero config is required and must be an object');
    } else {
      if (!config.zeroConfig.tableName || typeof config.zeroConfig.tableName !== 'string') {
        errors.push('Zero config: tableName is required and must be a string');
      }
    }
    
    return { valid: errors.length === 0, errors };
  },

  /**
   * Validate TTL value
   */
  validateTTL(ttl: string | number | undefined): boolean {
    if (ttl === undefined) return true;
    
    if (typeof ttl === 'number') {
      return ttl > 0;
    }
    
    if (typeof ttl === 'string') {
      return /^\d+[smhd]?$/.test(ttl);
    }
    
    return false;
  },

  /**
   * Validate scope configuration
   */
  validateScope(scope: ScopeConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!scope.name || typeof scope.name !== 'string') {
      errors.push('Scope name is required and must be a string');
    }
    
    if (scope.conditions && typeof scope.conditions !== 'object') {
      errors.push('Scope conditions must be an object');
    }
    
    if (scope.lambda && typeof scope.lambda !== 'string') {
      errors.push('Scope lambda must be a string');
    }
    
    return { valid: errors.length === 0, errors };
  }
};

/**
 * Model configuration builder for programmatic creation
 */
export class ModelConfigBuilder {
  private config: Partial<ModelConfig> = {
    attributes: [],
    associations: [],
    validations: [],
    scopes: []
  };

  constructor(name: string, tableName: string) {
    this.config.name = name;
    this.config.tableName = tableName;
    this.config.className = this.pascalCase(name);
    this.config.zeroConfig = { tableName };
  }

  /**
   * Add attribute to model
   */
  addAttribute(attr: AttributeConfig): this {
    this.config.attributes!.push(attr);
    return this;
  }

  /**
   * Add association to model
   */
  addAssociation(assoc: AssociationConfig): this {
    this.config.associations!.push(assoc);
    return this;
  }

  /**
   * Add validation to model
   */
  addValidation(validation: ValidationConfig): this {
    this.config.validations!.push(validation);
    return this;
  }

  /**
   * Add scope to model
   */
  addScope(scope: ScopeConfig): this {
    this.config.scopes!.push(scope);
    return this;
  }

  /**
   * Set Zero.js configuration
   */
  setZeroConfig(zeroConfig: Partial<ZeroQueryConfig>): this {
    this.config.zeroConfig = { ...this.config.zeroConfig!, ...zeroConfig };
    return this;
  }

  /**
   * Set factory options
   */
  setFactoryOptions(options: ModelConfig['factoryOptions']): this {
    this.config.factoryOptions = options;
    return this;
  }

  /**
   * Build the final configuration
   */
  build(): ModelConfig {
    const validation = ModelConfigValidator.validate(this.config as ModelConfig);
    if (!validation.valid) {
      throw new Error(`Invalid model configuration: ${validation.errors.join(', ')}`);
    }
    
    return this.config as ModelConfig;
  }

  /**
   * Convert string to PascalCase
   */
  private pascalCase(str: string): string {
    return str.replace(/(?:^|_)([a-z])/g, (_, char) => char.toUpperCase());
  }
}