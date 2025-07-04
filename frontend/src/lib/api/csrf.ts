import { browser } from '$app/environment';

// Types for better type safety
interface PendingRequest {
  resolve: (token: string | null) => void;
  reject: (error: Error) => void;
}

class CsrfTokenManager {
  private token: string | null = null;
  private tokenFetchTime: number = 0;
  private readonly TOKEN_CACHE_DURATION = 4 * 60 * 1000; // 4 minutes (refresh before 5min expiry)
  private readonly REFRESH_THRESHOLD = 2 * 60 * 1000; // Refresh when 2 minutes left
  
  // Request queuing for concurrent token requests
  private isRefreshing: boolean = false;
  private pendingRequests: PendingRequest[] = [];
  
  // Proactive refresh tracking
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Get CSRF token with proactive refresh and request queuing
   * This is the main method that components should call
   */
  async getToken(): Promise<string | null> {
    if (!browser) return null;

    // If we have a fresh token, return it immediately
    if (this.token && this.isTokenFresh()) {
      this.scheduleProactiveRefresh();
      return this.token;
    }

    // If we're already refreshing, queue this request
    if (this.isRefreshing) {
      return this.queueRequest();
    }

    // Start token refresh process
    return this.refreshToken();
  }

  /**
   * Queue a request while token refresh is in progress
   */
  private queueRequest(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      this.pendingRequests.push({ resolve, reject });
    });
  }

  /**
   * Process all queued requests with the new token
   */
  private processQueue(token: string | null, error?: Error): void {
    const requests = [...this.pendingRequests];
    this.pendingRequests = [];

    requests.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token);
      }
    });
  }

  /**
   * Refresh token from various sources with fallback strategy
   */
  private async refreshToken(): Promise<string | null> {
    if (this.isRefreshing) {
      return this.queueRequest();
    }

    this.isRefreshing = true;
    this.clearRefreshTimer();

    try {
      let newToken: string | null = null;

      // Strategy 1: Try meta tag first (fastest)
      newToken = this.getTokenFromMeta();
      if (newToken) {
        console.log('[CSRF] Found token in meta tag');
        this.setToken(newToken);
        this.processQueue(newToken);
        return newToken;
      }

      // Strategy 2: Fetch from API
      console.log('[CSRF] Fetching fresh token from API...');
      newToken = await this.fetchTokenFromApi();
      
      if (newToken) {
        console.log('[CSRF] Successfully fetched fresh token');
        this.setToken(newToken);
        this.processQueue(newToken);
        return newToken;
      }

      // Strategy 3: No token available
      console.warn('[CSRF] No token available from any source');
      this.processQueue(null);
      return null;

    } catch (error) {
      console.error('[CSRF] Token refresh failed:', error);
      this.processQueue(null, error as Error);
      return null;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Schedule proactive token refresh before expiry
   */
  private scheduleProactiveRefresh(): void {
    if (this.refreshTimer) return; // Already scheduled

    const timeUntilRefresh = Math.max(
      this.REFRESH_THRESHOLD - (Date.now() - this.tokenFetchTime),
      30000 // Minimum 30 seconds
    );

    this.refreshTimer = setTimeout(() => {
      console.log('[CSRF] Proactively refreshing token before expiry');
      this.refreshTimer = null;
      this.refreshToken();
    }, timeUntilRefresh);
  }

  /**
   * Clear the proactive refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if current token is still fresh
   */
  private isTokenFresh(): boolean {
    if (!this.token || !this.tokenFetchTime) return false;
    const age = Date.now() - this.tokenFetchTime;
    return age < this.TOKEN_CACHE_DURATION;
  }

  /**
   * Check if token needs proactive refresh
   */
  private needsProactiveRefresh(): boolean {
    if (!this.token || !this.tokenFetchTime) return true;
    const age = Date.now() - this.tokenFetchTime;
    return age > this.REFRESH_THRESHOLD;
  }

  /**
   * Set token with timestamp and schedule refresh
   */
  private setToken(token: string): void {
    this.token = token;
    this.tokenFetchTime = Date.now();
    this.updateMetaTag(token);
    this.scheduleProactiveRefresh();
    
    if (import.meta.env.DEV) {
      console.log(`[CSRF] Token set: ${token.substring(0, 12)}... (expires in ${this.TOKEN_CACHE_DURATION/1000/60}min)`);
    }
  }

  /**
   * Set token from response headers (called by API client)
   */
  setTokenFromResponse(response: Response): void {
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken && newToken !== this.token) {
      console.log('[CSRF] Updated token from response headers');
      this.setToken(newToken);
    }
  }

  /**
   * Clear the stored token and stop refresh timer
   */
  clearToken(): void {
    console.log('[CSRF] Clearing token cache');
    this.token = null;
    this.tokenFetchTime = 0;
    this.clearRefreshTimer();
    this.removeMetaTag();
  }

  /**
   * Force refresh of token (for error recovery)
   */
  async forceRefresh(): Promise<string | null> {
    console.log('[CSRF] Force refreshing token');
    this.clearToken();
    return this.refreshToken();
  }

  /**
   * Get token from meta tag in document head
   */
  private getTokenFromMeta(): string | null {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    return metaTag?.getAttribute('content') || null;
  }

  /**
   * Fetch CSRF token from the API
   */
  private async fetchTokenFromApi(): Promise<string | null> {
    try {
      const baseURL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1';
      console.log('[CSRF] Fetching token from:', `${baseURL}/health`);
      
      const response = await fetch(`${baseURL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('[CSRF] Health response status:', response.status);
      console.log('[CSRF] Health response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const token = response.headers.get('X-CSRF-Token');
        if (token) {
          console.log('[CSRF] Successfully received token from API:', token.substring(0, 10) + '...');
          return token;
        } else {
          console.warn('[CSRF] API response was OK but did not include X-CSRF-Token header');
        }
      } else {
        console.warn('[CSRF] API response was not OK:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('[CSRF] Error fetching token from API:', error);
    }

    return null;
  }

  /**
   * Update or create meta tag with new token
   */
  private updateMetaTag(token: string): void {
    let metaTag = document.querySelector('meta[name="csrf-token"]');
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'csrf-token');
      document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute('content', token);
  }

  /**
   * Remove CSRF meta tag
   */
  private removeMetaTag(): void {
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
      metaTag.remove();
    }
  }

  /**
   * Get debug information about current token state
   */
  getDebugInfo(): object {
    return {
      hasToken: !!this.token,
      tokenAge: this.token ? Date.now() - this.tokenFetchTime : 0,
      isFresh: this.isTokenFresh(),
      needsRefresh: this.needsProactiveRefresh(),
      isRefreshing: this.isRefreshing,
      queueLength: this.pendingRequests.length,
      hasRefreshTimer: !!this.refreshTimer
    };
  }
}

// Export singleton instance
export const csrfTokenManager = new CsrfTokenManager();

// Development debugging helper
if (import.meta.env.DEV && typeof window !== 'undefined') {
  // @ts-ignore - Development only
  window.csrfDebug = () => {
    console.log('[CSRF Debug]', csrfTokenManager.getDebugInfo());
  };
}