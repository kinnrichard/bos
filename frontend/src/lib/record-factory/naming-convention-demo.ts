/**
 * Naming Convention Demonstration
 * 
 * EPIC-007 Phase 2 Story 3: Clear Naming Convention Implementation
 * This file demonstrates the naming convention system and validation
 */

// ✅ CORRECT: ActiveModel in .ts file
import { createActiveModel, validateActiveModelUsage } from './index';
import type { Task } from '../types/generated';

// This should work fine - ActiveModel in TypeScript file
const Task = createActiveModel<Task>('task', 'tasks');

// Demonstrate validation system
console.log('🎯 Naming Convention Demo - EPIC-007 Phase 2 Story 3');

// Test validation
const validation = validateActiveModelUsage('TaskActive', {
  logToConsole: true,
  enableWarnings: true
});

console.log('✅ ActiveModel validation result:', validation);

// Demonstrate correct usage pattern
const activeTasks = Task.where({ status: 'active' });

// Show performance-optimized access
console.log('⚡ Performance-optimized property access:');
console.log('   Tasks loaded:', !activeTasks.isLoading);
console.log('   Task count:', activeTasks.records.length);
console.log('   Has errors:', !!activeTasks.error);

// Demonstrate subscription pattern for vanilla JS
const unsubscribe = activeTasks.subscribe((data, meta) => {
  if (!meta.isLoading) {
    console.log('📊 Data updated via subscription:', {
      recordCount: Array.isArray(data) ? data.length : 0,
      hasError: !!meta.error,
      isCollection: meta.isCollection
    });
    
    // Clean up subscription
    unsubscribe();
  }
});

// Export for demonstration
export const NamingConventionDemo = {
  Task,
  validation,
  activeTasks,
  
  /**
   * Show correct patterns for different contexts
   */
  showCorrectPatterns() {
    console.group('📋 Correct Naming Convention Patterns');
    
    console.log('✅ .svelte files:');
    console.log('   import { createReactiveModel } from "$lib/record-factory";');
    console.log('   const Task = createReactiveModel<Task>("task", "tasks");');
    console.log('   // Automatic reactivity for UI updates');
    
    console.log('');
    console.log('✅ .ts/.js files:');
    console.log('   import { createActiveModel } from "$lib/record-factory";');
    console.log('   const Task = createActiveModel<Task>("task", "tasks");');
    console.log('   // Better performance, manual subscriptions');
    
    console.log('');
    console.log('✅ .test.ts files:');
    console.log('   import { createActiveModel } from "$lib/record-factory";');
    console.log('   const Task = createActiveModel<Task>("task", "tasks");');
    console.log('   // Predictable behavior for testing');
    
    console.groupEnd();
  },
  
  /**
   * Show what the ESLint rule would catch
   */
  showESLintCatches() {
    console.group('🚨 ESLint Rule Would Catch');
    
    console.log('❌ ReactiveModel in .ts file:');
    console.log('   Warning: "ReactiveModel should only be used in .svelte files"');
    console.log('   Suggestion: "Use ActiveModel for better performance"');
    
    console.log('');
    console.log('❌ ActiveModel in .svelte file:');
    console.log('   Warning: "ActiveModel will not be reactive in Svelte"');
    console.log('   Suggestion: "Use ReactiveModel for automatic UI updates"');
    
    console.log('');
    console.log('❌ ReactiveModel in .test.ts file:');
    console.log('   Warning: "ReactiveModel in tests may cause unpredictable behavior"');
    console.log('   Suggestion: "Use ActiveModel for reliable testing"');
    
    console.groupEnd();
  }
};

// Run demonstrations
if (process.env.NODE_ENV === 'development') {
  NamingConventionDemo.showCorrectPatterns();
  NamingConventionDemo.showESLintCatches();
}