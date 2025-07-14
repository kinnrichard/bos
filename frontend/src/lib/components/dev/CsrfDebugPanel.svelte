<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { csrfTokenManager } from '$lib/api/csrf';
  
  // Only show in development
  let showPanel = import.meta.env.DEV;
  let isExpanded = false;
  let debugInfo: any = {};
  let intervalId: NodeJS.Timeout;

  function updateDebugInfo() {
    debugInfo = csrfTokenManager.getDebugInfo();
  }

  function formatTime(ms: number): string {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    if (ms < 60000) return `${Math.round(ms/1000)}s`;
    return `${Math.round(ms/60000)}m`;
  }

  function getStatusColor(debugInfo: any): string {
    if (!debugInfo.hasToken) return '#ff453a'; // Red - no token
    if (!debugInfo.isFresh) return '#ff9f0a'; // Orange - stale token
    if (debugInfo.needsRefresh) return '#ffd60a'; // Yellow - needs refresh soon
    return '#32d74b'; // Green - fresh token
  }

  function forceRefresh() {
    csrfTokenManager.forceRefresh();
    updateDebugInfo();
  }

  function clearToken() {
    csrfTokenManager.clearToken();
    updateDebugInfo();
  }

  onMount(() => {
    updateDebugInfo();
    intervalId = setInterval(updateDebugInfo, 1000);
  });

  onDestroy(() => {
    if (intervalId) clearInterval(intervalId);
  });
</script>

{#if showPanel}
  <div class="csrf-debug-panel" class:expanded={isExpanded}>
    <button 
      class="debug-toggle"
      onclick={() => isExpanded = !isExpanded}
      style="background-color: {getStatusColor(debugInfo)}"
    >
      🔒 CSRF
    </button>
    
    {#if isExpanded}
      <div class="debug-content">
        <h4>CSRF Token Status</h4>
        
        <div class="status-grid">
          <div class="status-item">
            <span class="label">Has Token:</span>
            <span class="value" class:good={debugInfo.hasToken} class:bad={!debugInfo.hasToken}>
              {debugInfo.hasToken ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Token Age:</span>
            <span class="value">
              {debugInfo.hasToken ? formatTime(debugInfo.tokenAge) : 'N/A'}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Is Fresh:</span>
            <span class="value" class:good={debugInfo.isFresh} class:bad={!debugInfo.isFresh}>
              {debugInfo.isFresh ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Needs Refresh:</span>
            <span class="value" class:warn={debugInfo.needsRefresh} class:good={!debugInfo.needsRefresh}>
              {debugInfo.needsRefresh ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Is Refreshing:</span>
            <span class="value" class:warn={debugInfo.isRefreshing}>
              {debugInfo.isRefreshing ? 'Yes' : 'No'}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Queue Length:</span>
            <span class="value" class:warn={debugInfo.queueLength > 0}>
              {debugInfo.queueLength}
            </span>
          </div>
          
          <div class="status-item">
            <span class="label">Has Timer:</span>
            <span class="value" class:good={debugInfo.hasRefreshTimer}>
              {debugInfo.hasRefreshTimer ? 'Yes' : 'No'}
            </span>
          </div>
        </div>
        
        <div class="debug-actions">
          <button onclick={forceRefresh} class="action-btn refresh">
            Force Refresh
          </button>
          <button onclick={clearToken} class="action-btn clear">
            Clear Token
          </button>
          <button onclick={updateDebugInfo} class="action-btn update">
            Update Info
          </button>
        </div>
        
        <div class="tips">
          <h5>💡 Debug Tips:</h5>
          <ul>
            <li>Red = No token (check authentication)</li>
            <li>Orange = Stale token (will refresh automatically)</li>
            <li>Yellow = Refresh needed soon</li>
            <li>Green = Fresh token, all good!</li>
            <li>Use browser console: <code>csrfDebug()</code></li>
          </ul>
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .csrf-debug-panel {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    font-family: 'SF Mono', Monaco, 'Consolas', monospace;
    font-size: 12px;
  }

  .debug-toggle {
    background-color: #007AFF;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
    font-weight: 600;
    font-size: 11px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    transition: all 0.2s ease;
  }

  .debug-toggle:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  .debug-content {
    position: absolute;
    top: 40px;
    right: 0;
    width: 300px;
    background: rgba(28, 28, 30, 0.95);
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    color: white;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .debug-content h4 {
    margin: 0 0 12px 0;
    font-size: 14px;
    font-weight: 600;
    color: #007AFF;
  }

  .debug-content h5 {
    margin: 12px 0 6px 0;
    font-size: 12px;
    font-weight: 600;
    color: #ffd60a;
  }

  .status-grid {
    display: grid;
    gap: 8px;
    margin-bottom: 16px;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
  }

  .label {
    color: #8e8e93;
    font-weight: 500;
  }

  .value {
    font-weight: 600;
    color: white;
  }

  .value.good {
    color: #32d74b;
  }

  .value.warn {
    color: #ffd60a;
  }

  .value.bad {
    color: #ff453a;
  }

  .debug-actions {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .action-btn {
    flex: 1;
    padding: 6px 8px;
    border: none;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .action-btn.refresh {
    background-color: #007AFF;
    color: white;
  }

  .action-btn.clear {
    background-color: #ff453a;
    color: white;
  }

  .action-btn.update {
    background-color: #32d74b;
    color: white;
  }

  .action-btn:hover {
    opacity: 0.8;
    transform: translateY(-1px);
  }

  .tips {
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    padding-top: 12px;
  }

  .tips ul {
    margin: 4px 0 0 0;
    padding-left: 16px;
    color: #8e8e93;
  }

  .tips li {
    margin-bottom: 2px;
  }

  .tips code {
    background: rgba(255, 255, 255, 0.1);
    padding: 2px 4px;
    border-radius: 3px;
    font-size: 10px;
  }

  /* Animation for panel expansion */
  .csrf-debug-panel:not(.expanded) .debug-content {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-10px);
  }

  .csrf-debug-panel.expanded .debug-content {
    opacity: 1;
    pointer-events: auto;
    transform: translateY(0);
    transition: all 0.3s ease;
  }
</style>