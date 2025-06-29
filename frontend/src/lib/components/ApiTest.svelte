<script lang="ts">
  import { onMount } from 'svelte';
  import { healthService, api } from '$lib/api';
  import type { HealthResponse } from '$lib/types/api';

  let healthStatus: HealthResponse | null = null;
  let loading = false;
  let error: string | null = null;

  async function testHealthEndpoint() {
    loading = true;
    error = null;
    
    try {
      healthStatus = await healthService.checkHealth();
      console.log('Health check successful:', healthStatus);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Health check failed';
      console.error('Health check failed:', err);
    } finally {
      loading = false;
    }
  }

  async function testApiMethods() {
    console.log('Testing API methods...');
    
    try {
      // Test GET
      console.log('Testing GET /health');
      const healthData = await api.get('/health');
      console.log('GET response:', healthData);

      // Test headers and CSRF token
      console.log('Testing CSRF token handling');
      
    } catch (err) {
      console.error('API test failed:', err);
    }
  }

  onMount(() => {
    testHealthEndpoint();
    testApiMethods();
  });
</script>

<div class="api-test">
  <h2>API Client Test</h2>
  
  <div class="test-section">
    <h3>Health Check</h3>
    <button on:click={testHealthEndpoint} disabled={loading}>
      {loading ? 'Testing...' : 'Test Health Endpoint'}
    </button>
    
    {#if error}
      <div class="error">
        <strong>Error:</strong> {error}
      </div>
    {/if}
    
    {#if healthStatus}
      <div class="success">
        <h4>Health Status:</h4>
        <pre>{JSON.stringify(healthStatus, null, 2)}</pre>
      </div>
    {/if}
  </div>
</div>

<style>
  .api-test {
    max-width: 600px;
    margin: 2rem auto;
    padding: 1rem;
    border: 1px solid #ccc;
    border-radius: 8px;
  }

  .test-section {
    margin: 1rem 0;
  }

  .error {
    color: #d32f2f;
    background: #ffebee;
    padding: 0.5rem;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  .success {
    color: #2e7d32;
    background: #e8f5e8;
    padding: 0.5rem;
    border-radius: 4px;
    margin: 0.5rem 0;
  }

  pre {
    background: #f5f5f5;
    padding: 0.5rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.875rem;
  }

  button {
    background: #1976d2;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }

  button:disabled {
    background: #ccc;
    cursor: not-allowed;
  }

  button:hover:not(:disabled) {
    background: #1565c0;
  }
</style>