/**
 * Server Health Monitoring for Test Suite
 *
 * Ensures all required servers are running and healthy before tests execute.
 * Helps identify "zombie server" issues where old processes are still running.
 */

import { execSync } from 'child_process';

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
    expectedResponse: /ok|healthy/i,
  },
  {
    name: 'Zero.js Cache',
    port: 4850,
    healthEndpoint: '/',
    expectedResponse: /zero|cache|ok/i, // Zero.js returns "OK" from dispatcher
  },
  {
    name: 'Frontend Dev Server',
    port: 6173,
    healthEndpoint: '/',
    expectedResponse: /<!doctype html>/i, // Case insensitive for Vite's lowercase DOCTYPE
  },
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
      issues.forEach((issue) => console.error(`  - ${issue}`));
      console.error('\n💡 Try running: bin/testkill && bin/test-servers');
    }

    return {
      healthy: issues.length === 0,
      issues,
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
        console.error(`❌ ${server.name} port ${server.port} is not open`);
        return false;
      }

      // If health endpoint specified, check it
      if (server.healthEndpoint) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        try {
          const response = await fetch(`http://localhost:${server.port}${server.healthEndpoint}`, {
            signal: controller.signal,
            headers: { 'User-Agent': 'test-health-check' },
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            console.error(`❌ ${server.name} health endpoint returned ${response.status}`);
            return false;
          }

          if (server.expectedResponse) {
            const text = await response.text();
            // eslint-disable-next-line no-console
            console.log(`🔍 ${server.name} response: ${text.substring(0, 200)}...`);

            if (typeof server.expectedResponse === 'string') {
              const matches = text.includes(server.expectedResponse);
              if (!matches) {
                console.error(
                  `❌ ${server.name} response doesn't contain expected string: "${server.expectedResponse}"`
                );
              }
              return matches;
            } else {
              const matches = server.expectedResponse.test(text);
              if (!matches) {
                console.error(
                  `❌ ${server.name} response doesn't match expected pattern: ${server.expectedResponse}`
                );
              }
              return matches;
            }
          }
        } finally {
          clearTimeout(timeoutId);
        }
      }

      return true;
    } catch (error) {
      console.error(`❌ ${server.name} health check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a port is open
   */
  private static async isPortOpen(port: number): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

      try {
        await fetch(`http://localhost:${port}`, {
          signal: controller.signal,
          headers: { 'User-Agent': 'test-health-check' },
        });
        clearTimeout(timeoutId);
        return true; // Port is open if we get any response (even 404, 500, etc.)
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      // Port is open if we get any response, even HTTP errors
      // Only connection refused means port is closed
      if (error.name === 'AbortError') {
        console.error(`⏱️ Port ${port} check timed out`);
        return false;
      }

      const isConnectionRefused =
        error.message.includes('ECONNREFUSED') || error.message.includes('fetch failed');

      if (isConnectionRefused) {
        console.error(`🔌 Port ${port} connection refused`);
        return false;
      }

      // Other errors (like HTTP errors) mean port is open but server had issues
      console.error(`⚠️ Port ${port} responded with error: ${error.message}`);
      return true;
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
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return false;
  }

  /**
   * Kill zombie server processes (but not fresh ones)
   */
  static async killZombieServers(): Promise<void> {
    // Skip cleanup if explicitly disabled
    if (process.env.SKIP_ZOMBIE_CLEANUP === 'true') {
      // eslint-disable-next-line no-console
      console.log('⏭️ Zombie server cleanup skipped (SKIP_ZOMBIE_CLEANUP=true)');
      return;
    }

    // eslint-disable-next-line no-console
    console.log('🧹 Cleaning up zombie test servers (preserving fresh processes)...');

    for (const server of TEST_SERVERS) {
      try {
        // Get detailed process information
        const psOutput = execSync(
          `lsof -ti:${server.port} | xargs -I {} ps -o pid,etime,comm -p {} 2>/dev/null || true`,
          { encoding: 'utf8' }
        ).trim();

        if (!psOutput || psOutput.includes('PID')) {
          continue; // No processes or just header
        }

        const processLines = psOutput.split('\n').filter((line) => line.trim());

        for (const line of processLines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 3) {
            const pid = parts[0];
            const etime = parts[1]; // elapsed time like "00:05" or "01:23:45"
            const command = parts[2];

            // Skip if process is very young (less than 30 seconds)
            if (!this.isProcessOldEnough(etime)) {
              console.log(`⏭️ Skipping fresh process ${pid} (${etime}) on port ${server.port}`);
              continue;
            }

            // Skip if it's not a server process
            if (!this.isServerProcess(command)) {
              console.log(
                `⏭️ Skipping non-server process ${pid} (${command}) on port ${server.port}`
              );
              continue;
            }

            console.log(
              `🔥 Killing zombie process ${pid} (${command}, age: ${etime}) on port ${server.port}`
            );

            // Try graceful termination first
            try {
              execSync(`kill -TERM ${pid}`);
              await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2s

              // Check if process still exists
              try {
                execSync(`kill -0 ${pid}`); // Check if process exists
                console.log(`💀 Force killing stubborn process ${pid}`);
                execSync(`kill -9 ${pid}`);
              } catch {
                // Process already terminated, good
              }
            } catch (error) {
              console.log(`⚠️ Could not kill process ${pid}: ${error.message}`);
            }
          }
        }
      } catch (error) {
        // No processes found on this port or other error
        if (!error.message.includes('No such process')) {
          console.log(`⚠️ Error checking port ${server.port}: ${error.message}`);
        }
      }
    }

    console.log('✅ Zombie server cleanup complete');
  }

  /**
   * Check if process has been running long enough to be considered a zombie
   */
  private static isProcessOldEnough(etime: string): boolean {
    // Parse elapsed time formats: "MM:SS", "HH:MM:SS", or "DD-HH:MM:SS"
    const parts = etime.split(/[-:]/);

    if (parts.length === 2) {
      // MM:SS format
      const minutes = parseInt(parts[0]);
      const seconds = parseInt(parts[1]);
      return minutes > 0 || seconds > 30; // > 30 seconds
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const hours = parseInt(parts[0]);
      return hours > 0 || parseInt(parts[1]) > 0 || parseInt(parts[2]) > 30;
    } else if (parts.length === 4) {
      // DD-HH:MM:SS format
      return true; // Any process running for days is definitely old
    }

    return false; // Default to not killing if we can't parse
  }

  /**
   * Check if this looks like a server process we should kill
   */
  private static isServerProcess(command: string): boolean {
    const serverProcesses = [
      'ruby',
      'rails',
      'puma', // Rails server
      'node',
      'npm', // Node.js processes
      'vite',
      'dev', // Vite dev server
      'zero-cache', // Zero.js cache
      'python', // Python processes
    ];

    return serverProcesses.some((proc) => command.toLowerCase().includes(proc.toLowerCase()));
  }
}
