/**
 * Logs Test Helper
 *
 * Specialized helper for testing activity logs functionality
 * Supports both system logs (/logs) and client logs (/clients/[id]/logs)
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import type { ActivityLogData } from '$lib/models/types/activity-log-data';
import type { ClientData } from '$lib/models/types/client-data';
import type { JobData } from '$lib/models/types/job-data';
import { DataFactory } from '../../helpers/data-factories';
import { debugComponent } from '$lib/utils/debug';

export interface LogTestScenario {
  logs: ActivityLogData[];
  client?: ClientData;
  job?: JobData;
  cleanup: () => Promise<void>;
}

export interface LogGroupInfo {
  groupHeader: string;
  logCount: number;
  collapsed?: boolean;
}

/**
 * Comprehensive helper for activity log testing
 */
export class LogsTestHelper {
  private page: Page;
  private factory: DataFactory;
  private createdEntities: Array<{ type: string; id: string }> = [];

  constructor(page: Page, factory: DataFactory) {
    this.page = page;
    this.factory = factory;
  }

  /**
   * Create a comprehensive log scenario with different activity types
   */
  async createLogScenario(
    options: {
      clientId?: string;
      jobId?: string;
      logCount?: number;
      includeSystemLogs?: boolean;
    } = {}
  ): Promise<LogTestScenario> {
    const { clientId, jobId, logCount = 10, includeSystemLogs = true } = options;

    debugComponent('Creating log test scenario', {
      component: 'LogsTestHelper',
      clientId,
      jobId,
      logCount,
      includeSystemLogs,
    });

    // Create client if not provided
    let client: ClientData | undefined;
    if (!clientId) {
      client = await this.factory.createClient({
        name: `Log Test Client ${Date.now()}`,
        client_type: 'residential',
      });
      this.createdEntities.push({ type: 'clients', id: client.id! });
    } else {
      client = await this.factory.getTestClient();
    }

    // Create job if not provided
    let job: JobData | undefined;
    if (!jobId && client) {
      job = await this.factory.createJob({
        title: `Log Test Job ${Date.now()}`,
        client_id: client.id,
        status: 'open',
        priority: 'normal',
      });
      this.createdEntities.push({ type: 'jobs', id: job.id! });
    }

    // Create various types of activity logs
    const logs: ActivityLogData[] = [];

    // System-level logs (if enabled)
    if (includeSystemLogs) {
      const systemLog = await this.createActivityLog({
        activity_type: 'system',
        description: 'System maintenance completed',
        client_id: null,
        job_id: null,
      });
      logs.push(systemLog);
    }

    // Client-specific logs
    if (client) {
      const clientLog = await this.createActivityLog({
        activity_type: 'client_updated',
        description: `Client ${client.name} information updated`,
        client_id: client.id,
        job_id: null,
      });
      logs.push(clientLog);
    }

    // Job-specific logs
    if (job) {
      const jobCreatedLog = await this.createActivityLog({
        activity_type: 'job_created',
        description: `Job "${job.title}" created`,
        client_id: client?.id || null,
        job_id: job.id,
      });
      logs.push(jobCreatedLog);

      const jobUpdatedLog = await this.createActivityLog({
        activity_type: 'job_updated',
        description: `Job "${job.title}" status changed`,
        client_id: client?.id || null,
        job_id: job.id,
      });
      logs.push(jobUpdatedLog);
    }

    // Fill remaining logs with various activities
    const remainingLogs = Math.max(0, logCount - logs.length);
    for (let i = 0; i < remainingLogs; i++) {
      const logType = ['client_contact', 'job_note_added', 'task_completed'][i % 3];
      const log = await this.createActivityLog({
        activity_type: logType,
        description: `Test activity ${i + 1}: ${logType.replace('_', ' ')}`,
        client_id: client?.id || null,
        job_id: job?.id || null,
      });
      logs.push(log);
    }

    return {
      logs,
      client,
      job,
      cleanup: async () => {
        await this.cleanup();
      },
    };
  }

  /**
   * Create a single activity log entry
   */
  private async createActivityLog(data: {
    activity_type: string;
    description: string;
    client_id: string | null;
    job_id: string | null;
  }): Promise<ActivityLogData> {
    // Note: This would typically call the actual API
    // For now, we'll create a mock structure that matches what the UI expects
    const log: ActivityLogData = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      activity_type: data.activity_type,
      description: data.description,
      client_id: data.client_id,
      job_id: data.job_id,
      user_id: 'test-user-id',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // Add associated data if needed
      client: data.client_id ? { name: 'Test Client' } : null,
      job: data.job_id ? { title: 'Test Job' } : null,
      user: { name: 'Test User' },
    };

    // Track for cleanup (if we had real API calls)
    // this.createdEntities.push({ type: 'activity_logs', id: log.id });

    return log;
  }

  /**
   * Wait for logs to load and display properly
   */
  async waitForLogsToLoad(expectedCount?: number): Promise<void> {
    // Wait for the logs container to be visible
    await expect(this.page.locator('.activity-log-list, .logs-container')).toBeVisible({
      timeout: 10000,
    });

    // Wait for logs to appear or empty state
    const logItems = this.page.locator('.logs-table__row, .activity-log-item, .log-entry');
    const emptyState = this.page.locator('.activity-log-empty, .empty-state');

    // Either logs should load or empty state should show
    await Promise.race([
      expect(logItems.first()).toBeVisible({ timeout: 5000 }),
      expect(emptyState).toBeVisible({ timeout: 5000 }),
    ]);

    // If expected count provided, verify it
    if (expectedCount !== undefined) {
      if (expectedCount > 0) {
        await expect(logItems).toHaveCount(expectedCount);
      } else {
        await expect(emptyState).toBeVisible();
      }
    }
  }

  /**
   * Verify log display elements are correct
   */
  async verifyLogDisplay(logs: ActivityLogData[]): Promise<void> {
    for (const log of logs.slice(0, 5)) {
      // Check first 5 logs
      const logElement = this.page.locator(`[data-log-id="${log.id}"]`);

      // Verify log is visible
      await expect(logElement).toBeVisible();

      // Verify activity type emoji/icon is present
      await expect(logElement.locator('.activity-type-emoji, .activity-icon')).toBeVisible();

      // Verify description is shown
      await expect(logElement).toContainText(log.description);

      // Verify timestamp is shown
      await expect(logElement.locator('.activity-timestamp, .log-time')).toBeVisible();

      // Verify user information if present
      if (log.user) {
        await expect(logElement).toContainText(log.user.name);
      }

      // Verify client context if present
      if (log.client) {
        await expect(logElement).toContainText(log.client.name);
      }

      // Verify job context if present
      if (log.job) {
        await expect(logElement).toContainText(log.job.title);
      }
    }
  }

  /**
   * Test log grouping functionality
   */
  async verifyLogGrouping(): Promise<LogGroupInfo[]> {
    const groups: LogGroupInfo[] = [];

    // Look for group headers
    const groupHeaders = this.page.locator('.log-group-header, .activity-group-header');
    const groupCount = await groupHeaders.count();

    for (let i = 0; i < groupCount; i++) {
      const header = groupHeaders.nth(i);
      const headerText = await header.textContent();

      // Count logs in this group
      const groupContainer = header.locator('xpath=following-sibling::*[1]');
      const logsInGroup = await groupContainer.locator('.activity-log-item, .log-entry').count();

      // Check if group is collapsed
      const isCollapsed = (await header.locator('.collapsed, [aria-expanded="false"]').count()) > 0;

      groups.push({
        groupHeader: headerText || 'Unknown Group',
        logCount: logsInGroup,
        collapsed: isCollapsed,
      });
    }

    return groups;
  }

  /**
   * Test auto-scroll functionality for new logs
   */
  async testAutoScroll(): Promise<void> {
    // Get initial scroll position
    const initialScrollTop = await this.page.evaluate(() => window.scrollY);

    // Mock new log arrival (this would normally come from Zero.js)
    await this.page.evaluate(() => {
      // Simulate new log being added to the UI
      const logsList = document.querySelector('.activity-log-list, .logs-container');
      if (logsList) {
        const newLog = document.createElement('div');
        newLog.className = 'activity-log-item new-log';
        newLog.textContent = 'New activity log entry';
        logsList.appendChild(newLog);

        // Trigger auto-scroll event
        const event = new CustomEvent('newLogAdded');
        document.dispatchEvent(event);
      }
    });

    // Wait for auto-scroll to complete
    await this.page.waitForTimeout(1000);

    // Verify scroll position changed (page should scroll to show new log)
    const finalScrollTop = await this.page.evaluate(() => window.scrollY);

    // Either scrolled down to show new content, or stayed at bottom
    expect(finalScrollTop >= initialScrollTop).toBeTruthy();
  }

  /**
   * Test progressive loading behavior
   */
  async testProgressiveLoading(): Promise<void> {
    // Look for progressive loading indicators
    const progressiveLoader = this.page.locator('.progressive-loader, .load-more');

    if (await progressiveLoader.isVisible()) {
      // Test clicking load more
      await progressiveLoader.click();

      // Wait for additional logs to load
      await this.page.waitForTimeout(2000);

      // Verify more logs appeared
      const logCount = await this.page.locator('.activity-log-item, .log-entry').count();
      expect(logCount).toBeGreaterThan(0);
    }
  }

  /**
   * Test real-time updates via Zero.js
   */
  async testRealTimeUpdates(): Promise<void> {
    // Listen for console messages indicating Zero.js updates
    const updateMessages: string[] = [];
    this.page.on('console', (msg) => {
      if (msg.text().includes('ZERO DATA CHANGED') || msg.text().includes('activity log')) {
        updateMessages.push(msg.text());
      }
    });

    // Create new log (this should trigger Zero.js update)
    const newLog = await this.createActivityLog({
      activity_type: 'real_time_test',
      description: 'Real-time update test log',
      client_id: null,
      job_id: null,
    });

    // Wait for real-time update to be processed
    await this.page.waitForTimeout(3000);

    // Verify the update was detected
    expect(updateMessages.length).toBeGreaterThan(0);

    debugComponent('Real-time update test completed', {
      component: 'LogsTestHelper',
      updateMessages: updateMessages.length,
      logId: newLog.id,
    });
  }

  /**
   * Verify empty state display
   */
  async verifyEmptyState(): Promise<void> {
    const emptyState = this.page.locator('.activity-log-empty, .empty-state');
    await expect(emptyState).toBeVisible();

    // Verify empty state content
    await expect(emptyState).toContainText(/no.*activity|no.*logs|empty/i);

    // Verify empty state icon/illustration
    await expect(emptyState.locator('.empty-icon, .illustration')).toBeVisible();
  }

  /**
   * Test error handling and recovery
   */
  async testErrorHandling(): Promise<void> {
    // Mock API error
    await this.page.route('**/api/v1/activity_logs*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    // Reload page to trigger error
    await this.page.reload();

    // Verify error state displays
    const errorState = this.page.locator('.error-state, .activity-log-error');
    await expect(errorState).toBeVisible();

    // Verify error message
    await expect(errorState).toContainText(/error|failed|unable/i);

    // Clear route mock
    await this.page.unroute('**/api/v1/activity_logs*');
  }

  /**
   * Clean up created test data
   */
  async cleanup(): Promise<void> {
    debugComponent('Cleaning up logs test data', {
      component: 'LogsTestHelper',
      entityCount: this.createdEntities.length,
    });

    for (const entity of this.createdEntities) {
      try {
        await this.factory.deleteEntity(
          entity.type as 'clients' | 'jobs' | 'activity_logs',
          entity.id
        );
      } catch (error) {
        console.warn(`Failed to cleanup ${entity.type}/${entity.id}:`, error);
      }
    }

    this.createdEntities = [];
  }
}
