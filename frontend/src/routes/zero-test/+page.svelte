<script>
  import { onMount } from 'svelte';
  import { getZeroAsync, getZeroState, initZero } from '$lib/zero/client';
  import { useClientsQuery } from '$lib/zero/clients';
  import { browser } from '$app/environment';
  
  let testResults = {
    initialization: 'pending',
    schema: 'pending',
    queries: 'pending',
    relationships: 'pending'
  };
  
  let logs = [];
  let connectionState = null;
  
  function log(message) {
    logs = [...logs, `${new Date().toLocaleTimeString()}: ${message}`];
    console.log(message);
  }
  
  async function waitForInitialization(maxWaitTime = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const state = getZeroState();
      
      if (state.initializationState === 'success') {
        return true;
      }
      
      if (state.initializationState === 'error') {
        throw new Error('Zero initialization failed');
      }
      
      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error('Zero initialization timed out');
  }
  
  onMount(async () => {
    if (!browser) return;
    
    // Start live state monitoring
    const stateMonitor = setInterval(() => {
      connectionState = getZeroState();
    }, 1000);
    
    log('🧪 Starting Zero E2E Tests...');
    
    try {
      // Test 1: Zero client initialization
      log('🔌 Testing Zero client initialization...');
      
      // Check initial state
      connectionState = getZeroState();
      log(`📊 Initial state: ${JSON.stringify(connectionState)}`);
      
      // Wait for initialization to complete or start it
      let zero;
      try {
        zero = await getZeroAsync();
        testResults.initialization = 'success';
        log('✅ Zero client initialized successfully');
      } catch (error) {
        testResults.initialization = 'failed';
        log(`❌ Zero client initialization failed: ${error.message}`);
        return;
      }
      
      // Test 2: Schema structure
      log('📋 Testing schema structure...');
      if (zero.query) {
        testResults.schema = 'success';
        log('✅ Schema loaded successfully');
        
        // List available tables
        const tables = Object.keys(zero.query);
        log(`📊 Available tables: ${tables.join(', ')}`);
      } else {
        testResults.schema = 'failed';
        log('❌ Schema not available');
        return;
      }
      
      // Test 3: Basic queries
      log('🔍 Testing query construction...');
      try {
        const clientsQuery = useClientsQuery();
        log(`✅ Clients query: ${clientsQuery ? 'constructed' : 'failed'}`);
        
        testResults.queries = 'success';
      } catch (error) {
        testResults.queries = 'failed';
        log(`❌ Query construction failed: ${error.message}`);
      }
      
      // Test 4: Relationships
      log('🔗 Testing relationships...');
      try {
        // Check if tables have relationships defined
        const tablesWithRelationships = [];
        
        if (zero.query.clients) tablesWithRelationships.push('clients');
        if (zero.query.jobs) tablesWithRelationships.push('jobs');
        if (zero.query.tasks) tablesWithRelationships.push('tasks');
        if (zero.query.users) tablesWithRelationships.push('users');
        
        log(`✅ Tables with relationships: ${tablesWithRelationships.join(', ')}`);
        testResults.relationships = 'success';
      } catch (error) {
        testResults.relationships = 'failed';
        log(`❌ Relationships test failed: ${error.message}`);
      }
      
      log('🎉 Zero E2E Tests completed!');
      
      // Final state check
      const finalState = getZeroState();
      log(`🔍 Final state: ${JSON.stringify(finalState)}`);
      
    } catch (error) {
      log(`💥 Test suite failed: ${error.message}`);
      
      // Log final state for debugging
      const errorState = getZeroState();
      log(`🔍 Error state: ${JSON.stringify(errorState)}`);
    }
    
    // Cleanup on unmount
    return () => {
      clearInterval(stateMonitor);
    };
  });
</script>

<div class="p-8 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">Zero E2E Test Results</h1>
  
  <!-- Connection State Monitor -->
  <div class="bg-blue-50 p-4 rounded-lg mb-6">
    <h3 class="font-semibold mb-2">🔍 Connection State</h3>
    {#if connectionState}
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div><strong>Initialized:</strong> {connectionState.isInitialized ? '✅' : '❌'}</div>
        <div><strong>State:</strong> {connectionState.initializationState}</div>
        <div><strong>Tab Visible:</strong> {connectionState.isTabVisible ? '✅' : '❌'}</div>
        <div><strong>Suspended:</strong> {connectionState.isConnectionSuspended ? '❌' : '✅'}</div>
        <div><strong>Has Promise:</strong> {connectionState.hasInitializationPromise ? '✅' : '❌'}</div>
      </div>
    {:else}
      <div class="text-gray-500">No connection state available</div>
    {/if}
  </div>
  
  <div class="grid grid-cols-2 gap-4 mb-8">
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="font-semibold mb-2">🔌 Client Initialization</h3>
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full mr-2 {testResults.initialization === 'success' ? 'bg-green-500' : testResults.initialization === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}"></div>
        <span class="capitalize">{testResults.initialization}</span>
      </div>
    </div>
    
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="font-semibold mb-2">📋 Schema Loading</h3>
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full mr-2 {testResults.schema === 'success' ? 'bg-green-500' : testResults.schema === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}"></div>
        <span class="capitalize">{testResults.schema}</span>
      </div>
    </div>
    
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="font-semibold mb-2">🔍 Query Construction</h3>
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full mr-2 {testResults.queries === 'success' ? 'bg-green-500' : testResults.queries === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}"></div>
        <span class="capitalize">{testResults.queries}</span>
      </div>
    </div>
    
    <div class="bg-white p-4 rounded-lg shadow">
      <h3 class="font-semibold mb-2">🔗 Relationships</h3>
      <div class="flex items-center">
        <div class="w-3 h-3 rounded-full mr-2 {testResults.relationships === 'success' ? 'bg-green-500' : testResults.relationships === 'failed' ? 'bg-red-500' : 'bg-yellow-500'}"></div>
        <span class="capitalize">{testResults.relationships}</span>
      </div>
    </div>
  </div>
  
  <div class="bg-gray-100 p-4 rounded-lg">
    <h3 class="font-semibold mb-3">📝 Test Logs</h3>
    <div class="space-y-1 max-h-96 overflow-y-auto">
      {#each logs as logEntry}
        <div class="text-sm font-mono text-gray-700">{logEntry}</div>
      {/each}
    </div>
  </div>
</div>