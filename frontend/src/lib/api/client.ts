import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { ApiError, ApiResponse, RequestConfig, AuthResponse } from '$lib/types/api';
import { csrfTokenManager } from './csrf';

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;
  private requestQueue: Array<() => void> = [];

  constructor() {
    this.baseURL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  private async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      method = 'GET',
      data,
      headers = {},
      skipAuth = false,
      retryOnUnauthorized = true
    } = config;

    const url = `${this.baseURL}${endpoint}`;
    
    // Get CSRF token for state-changing requests
    let csrfToken = null;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      csrfToken = await csrfTokenManager.getToken();
      console.log('CSRF token for request:', csrfToken ? `present (${csrfToken.substring(0, 10)}...)` : 'missing');
      
      // If we still don't have a token, try once more
      if (!csrfToken) {
        console.warn('No CSRF token found, attempting to fetch again...');
        csrfTokenManager.clearToken();
        csrfToken = await csrfTokenManager.getToken();
        console.log('Second attempt CSRF token:', csrfToken ? `present (${csrfToken.substring(0, 10)}...)` : 'still missing');
      }
    }

    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers
    };

    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken;
      console.log('Added CSRF token to request headers');
    } else if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      console.warn('No CSRF token available for state-changing request');
    }

    const requestConfig: globalThis.RequestInit = {
      method,
      headers: requestHeaders,
      // Always include credentials for all API requests to send cookies
      credentials: 'include',
    };

    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestConfig);

      // Update CSRF token from response headers if present
      csrfTokenManager.setTokenFromResponse(response);

      // Handle 401 Unauthorized - for cookie auth, just redirect to login
      if (response.status === 401 && retryOnUnauthorized && !skipAuth) {
        // For cookie-based auth, don't try to refresh - just redirect to login
        if (browser) {
          goto('/login');
        }
        throw new Error('Authentication failed');
      }

      const responseData = await response.json();

      if (!response.ok) {
        // Special handling for rate limiting
        if (response.status === 429) {
          const error: ApiError = {
            status: response.status,
            code: 'RATE_LIMITED',
            message: 'Too many requests. Please wait a moment and try again.',
            errors: responseData.errors || []
          };
          throw error;
        }

        // Special handling for CSRF token errors
        if (response.status === 403 && responseData.code === 'INVALID_CSRF_TOKEN') {
          console.warn('CSRF token invalid, clearing token cache');
          csrfTokenManager.clearToken();
          
          const error: ApiError = {
            status: response.status,
            code: responseData.code,
            message: responseData.message || 'CSRF token is invalid or missing',
            errors: responseData.errors || []
          };
          throw error;
        }

        const error: ApiError = {
          status: response.status,
          code: responseData.errors?.[0]?.code || responseData.code || 'UNKNOWN_ERROR',
          message: responseData.errors?.[0]?.detail || responseData.message || responseData.error || 'An error occurred',
          errors: responseData.errors || []
        };
        throw error;
      }

      return {
        data: responseData,
        status: response.status,
        headers: response.headers
      };
    } catch (error) {
      // Network errors or other exceptions
      if ((error as ApiError).status) {
        throw error; // Re-throw API errors
      }
      
      const networkError: ApiError = {
        status: 0,
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network request failed',
        errors: []
      };
      throw networkError;
    }
  }

  private async refreshToken(): Promise<boolean> {
    // Prevent multiple concurrent refresh attempts
    if (this.isRefreshing && this.refreshPromise) {
      return this.refreshPromise;
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      
      // Process queued requests
      if (result) {
        this.processRequestQueue();
      } else {
        // Clear queue on failure
        this.requestQueue = [];
      }
      
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private processRequestQueue(): void {
    const queue = [...this.requestQueue];
    this.requestQueue = [];
    
    // Execute queued requests with staggered timing to prevent rate limiting
    queue.forEach((callback, index) => {
      // Add 50ms delay between each request to prevent rate limiting
      setTimeout(() => {
        callback();
      }, index * 50);
    });
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      // For cookie-based auth, try to refresh by calling a lightweight endpoint
      // This will either succeed if cookies are valid or fail and redirect to login
      const response = await this.request<any>('/health', {
        method: 'GET',
        skipAuth: true,
        retryOnUnauthorized: false
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Token refresh failed:', error);
      // Clear any stored tokens on refresh failure
      csrfTokenManager.clearToken();
      return false;
    }
  }

  // Public API methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'data'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...config, method: 'GET' });
    return response.data;
  }

  async post<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'data'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...config, method: 'POST', data });
    return response.data;
  }

  async put<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'data'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...config, method: 'PUT', data });
    return response.data;
  }

  async patch<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'data'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...config, method: 'PATCH', data });
    return response.data;
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'data'>): Promise<T> {
    const response = await this.request<T>(endpoint, { ...config, method: 'DELETE' });
    return response.data;
  }
}

// Export a singleton instance
export const api = new ApiClient();

// Export the class for testing or custom instances
export { ApiClient };