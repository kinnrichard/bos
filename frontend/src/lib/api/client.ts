import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import type { ApiError, ApiResponse, RequestConfig } from '$lib/types/api';
import { csrfTokenManager } from './csrf';

class ApiClient {
  private baseURL: string;
  private defaultHeaders: Record<string, string>;
  private isRefreshing: boolean = false;
  private refreshPromise: Promise<boolean> | null = null;

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

    const requestConfig: RequestInit = {
      method,
      headers: requestHeaders,
      credentials: 'include', // Include cookies for authentication
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
    if (this.isRefreshing) {
      return this.refreshPromise || Promise.resolve(false);
    }

    this.isRefreshing = true;
    this.refreshPromise = this.performTokenRefresh();

    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.isRefreshing = false;
      this.refreshPromise = null;
    }
  }

  private async performTokenRefresh(): Promise<boolean> {
    try {
      const response = await this.request<any>('/auth/refresh', {
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