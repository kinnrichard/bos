/**
 * Server Health Monitoring for Test Suite
 * 
 * Ensures all required servers are running and healthy before tests execute.
 * Helps identify "zombie server" issues where old processes are still running.
 */

interface ServerConfig {
  name: string;
  port: number;
  healthEndpoint?: string;
  expectedResponse?: string | RegExp;
}

const TEST_SERVERS: ServerConfig[] = [
  {
    name: 'Rails API',
    port: 4000,
    healthEndpoint: '/api/v1/health',
    expectedResponse: /ok|healthy/i
  },
  {
    name: 'Zero.js Cache',
    port: 4850,
    healthEndpoint: '/',
    expectedResponse: /zero|cache/i
  },
  {
    name: 'Frontend Dev Server',
    port: 6173,
    healthEndpoint: '/',
    expectedResponse: /<!DOCTYPE html>/
  }
];

export class ServerHealthMonitor {
  /**
   * Check if all required test servers are running and healthy
   */
  static async validateAllServers(): Promise<{ healthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    console.log('🔍 Validating test server health...');
    
    for (const server of TEST_SERVERS) {
      try {
        const isHealthy = await this.checkServerHealth(server);
        if (!isHealthy) {
          issues.push(`${server.name} (port ${server.port}) is not responding correctly`);
        } else {
          console.log(`✅ ${server.name} (port ${server.port}) is healthy`);
        }
      } catch (error) {
        issues.push(`${server.name} (port ${server.port}) is not accessible: ${error.message}`);
      }
    }
    
    if (issues.length > 0) {
      console.error('❌ Server health issues detected:');
      issues.forEach(issue => console.error(`  - ${issue}`));
      console.error('\n💡 Try running: bin/testkill && bin/test-servers');
    }
    
    return {
      healthy: issues.length === 0,
      issues
    };
  }
  
  /**
   * Check if a specific server is healthy
   */
  private static async checkServerHealth(server: ServerConfig): Promise<boolean> {
    try {
      // First check if port is listening
      const portOpen = await this.isPortOpen(server.port);
      if (!portOpen) {
        return false;
      }
      
      // If health endpoint specified, check it
      if (server.healthEndpoint) {
        const response = await fetch(`http://localhost:${server.port}${server.healthEndpoint}`, {
          timeout: 5000
        });
        
        if (!response.ok) {
          return false;
        }
        
        if (server.expectedResponse) {
          const text = await response.text();
          if (typeof server.expectedResponse === 'string') {
            return text.includes(server.expectedResponse);
          } else {
            return server.expectedResponse.test(text);
          }
        }
      }
      
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check if a port is open
   */
  private static async isPortOpen(port: number): Promise<boolean> {
    try {
      const response = await fetch(`http://localhost:${port}`, { 
        timeout: 2000,
        // Don't throw on HTTP errors, just check if port responds
        headers: { 'User-Agent': 'test-health-check' }
      });
      return true; // Port is open if we get any response
    } catch (error) {
      // Check if it's a connection error vs other error
      return !error.message.includes('ECONNREFUSED');
    }
  }
  
  /**
   * Wait for servers to become healthy (useful after starting servers)
   */
  static async waitForServersHealthy(timeoutMs: number = 30000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeoutMs) {
      const { healthy } = await this.validateAllServers();
      if (healthy) {
        return true;
      }
      
      console.log('⏳ Waiting for servers to become healthy...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    return false;
  }
  
  /**
   * Kill any processes running on test server ports
   */
  static async killZombieServers(): Promise<void> {
    console.log('🧹 Cleaning up any zombie test servers...');
    
    const { execSync } = await import('child_process');
    
    for (const server of TEST_SERVERS) {
      try {
        // Use lsof to find processes on the port
        const lsofOutput = execSync(`lsof -ti:${server.port}`, { encoding: 'utf8' }).trim();
        
        if (lsofOutput) {
          const pids = lsofOutput.split('\n').filter(pid => pid.trim());
          for (const pid of pids) {
            console.log(`🔥 Killing process ${pid} on port ${server.port} (${server.name})`);
            execSync(`kill -9 ${pid}`);
          }
        }
      } catch (error) {
        // No processes found on this port, which is good
      }
    }
    
    console.log('✅ Zombie server cleanup complete');
  }
}