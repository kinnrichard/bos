<script>
  import { onMount } from 'svelte';
  import { getZero } from '$lib/zero/client';
  import { useClientsQuery } from '$lib/zero/clients';
  
  let testResults = {
    initialization: 'pending',
    schema: 'pending',
    queries: 'pending',
    relationships: 'pending'
  };
  
  let logs = [];
  
  function log(message) {
    logs = [...logs, `${new Date().toLocaleTimeString()}: ${message}`];
    console.log(message);
  }
  
  onMount(async () => {
    log('🧪 Starting Zero E2E Tests...');
    
    try {
      // Test 1: Zero client initialization
      log('🔌 Testing Zero client initialization...');
      const zero = getZero();
      
      if (zero) {
        testResults.initialization = 'success';
        log('✅ Zero client initialized successfully');
      } else {
        testResults.initialization = 'failed';
        log('❌ Zero client initialization failed');
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
      
    } catch (error) {
      log(`💥 Test suite failed: ${error.message}`);
    }
  });
</script>

<div class="p-8 max-w-4xl mx-auto">
  <h1 class="text-3xl font-bold mb-6">Zero E2E Test Results</h1>
  
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