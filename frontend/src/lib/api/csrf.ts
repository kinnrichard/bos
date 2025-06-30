import { browser } from '$app/environment';

class CsrfTokenManager {
  private token: string | null = null;
  private tokenFetchTime: number = 0;
  private readonly TOKEN_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get CSRF token from various sources in order of preference:
   * 1. Previously stored token
   * 2. Meta tag in document head
   * 3. Fetch from API
   */
  async getToken(): Promise<string | null> {
    if (!browser) return null;

    // Return cached token if available and not expired
    if (this.token && this.isTokenFresh()) {
      console.log('Using cached CSRF token');
      return this.token;
    }

    // Try to get from meta tag first
    const metaToken = this.getTokenFromMeta();
    if (metaToken) {
      console.log('Found CSRF token in meta tag');
      this.token = metaToken;
      return this.token;
    }

    // If no meta tag, try to fetch from API (with rate limiting protection)
    try {
      console.log('Fetching CSRF token from API...');
      const fetchedToken = await this.fetchTokenFromApi();
      if (fetchedToken) {
        console.log('Successfully fetched CSRF token from API');
        this.setToken(fetchedToken);
        return this.token;
      } else {
        console.warn('No CSRF token received from API');
      }
    } catch (error) {
      console.warn('Failed to fetch CSRF token:', error);
    }

    console.warn('No CSRF token available');
    return null;
  }

  /**
   * Check if current token is still fresh (within cache duration)
   */
  private isTokenFresh(): boolean {
    return Date.now() - this.tokenFetchTime < this.TOKEN_CACHE_DURATION;
  }

  /**
   * Set token with timestamp
   */
  private setToken(token: string): void {
    this.token = token;
    this.tokenFetchTime = Date.now();
    this.updateMetaTag(token);
  }

  /**
   * Set token from response headers
   */
  setTokenFromResponse(response: Response): void {
    const newToken = response.headers.get('X-CSRF-Token');
    if (newToken) {
      this.setToken(newToken);
    }
  }

  /**
   * Clear the stored token
   */
  clearToken(): void {
    this.token = null;
    this.tokenFetchTime = 0;
    this.removeMetaTag();
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
      const response = await fetch(`${baseURL}/health`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      if (response.ok) {
        const token = response.headers.get('X-CSRF-Token');
        return token;
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
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
}

// Export singleton instance
export const csrfTokenManager = new CsrfTokenManager();