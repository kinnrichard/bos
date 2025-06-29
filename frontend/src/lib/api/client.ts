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
    }

    const requestHeaders: Record<string, string> = {
      ...this.defaultHeaders,
      ...headers
    };

    if (csrfToken) {
      requestHeaders['X-CSRF-Token'] = csrfToken;
    }

    const requestConfig: globalThis.RequestInit = {
      method,
      headers: requestHeaders,
      // Only include credentials for state-changing requests
      credentials: ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) ? 'include' : 'same-origin',
    };

    if (data && method !== 'GET') {
      requestConfig.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, requestConfig);

      // Update CSRF token from response headers if present
      csrfTokenManager.setTokenFromResponse(response);

      // Handle 401 Unauthorized - try to refresh token
      if (response.status === 401 && retryOnUnauthorized && !skipAuth) {
        // If we're already refreshing, queue this request
        if (this.isRefreshing) {
          return new Promise<ApiResponse<T>>((resolve, reject) => {
            this.requestQueue.push(() => {
              // Retry the original request after refresh completes
              this.request<T>(endpoint, { ...config, retryOnUnauthorized: false })
                .then(resolve)
                .catch(reject);
            });
          });
        }

        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry the original request
          return this.request<T>(endpoint, { ...config, retryOnUnauthorized: false });
        } else {
          // Refresh failed, redirect to login
          if (browser) {
            goto('/login');
          }
          throw new Error('Authentication failed');
        }
      }

      const responseData = await response.json();

      if (!response.ok) {
        const error: ApiError = {
          status: response.status,
          code: responseData.errors?.[0]?.code || 'UNKNOWN_ERROR',
          message: responseData.errors?.[0]?.detail || responseData.error || 'An error occurred',
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
    
    // Execute all queued requests
    queue.forEach(callback => callback());
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const response = await this.request<AuthResponse>('/auth/refresh', {
        method: 'POST',
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