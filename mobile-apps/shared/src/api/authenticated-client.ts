// Author: Robert Massey | Created: 2026-07-16 | Module: @attune-sb/mobile-shared
// Purpose: Creates an axios instance with automatic JWT refresh and retry logic.
// On 401: refresh the token, save new tokens, then replay the failed request once.
// On refresh failure: call onLogout so the app can navigate to login.
import axios from 'axios';
import type { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

import { TokenStorage } from '../storage/token-storage';

interface AuthClientOptions {
  readonly baseURL: string;
  readonly onLogout: () => void;
  /** Override the token-refresh endpoint. Defaults to /api/v1/auth/refresh. */
  readonly refreshEndpoint?: string;
}

// Matches the NestJS TransformInterceptor envelope:
// POST /auth/refresh → { success: true, data: { accessToken, refreshToken, expiresIn } }
interface RefreshResponse {
  success: boolean;
  data: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
}

export function createAuthenticatedClient({
  baseURL,
  onLogout,
  refreshEndpoint = '/api/v1/auth/refresh',
}: AuthClientOptions): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json', 'X-App-Client': 'attune-sb-mobile' },
  });

  let isRefreshing = false;
  let pendingQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> =
    [];

  function processQueue(error: unknown, token: string | null): void {
    for (const p of pendingQueue) {
      if (error) {
        p.reject(error);
      } else if (token) {
        p.resolve(token);
      } else {
        p.reject(new Error('Refresh produced no token'));
      }
    }
    pendingQueue = [];
  }

  client.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const token = await TokenStorage.getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  });

  client.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      if (error.response?.status !== 401 || original._retry) {
        return Promise.reject(error);
      }
      original._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({
            resolve: (token: string) => {
              if (original.headers) {
                original.headers['Authorization'] = `Bearer ${token}`;
              }
              resolve(client(original));
            },
            reject,
          });
        });
      }

      isRefreshing = true;
      try {
        const refreshToken = await TokenStorage.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token');
        }

        const resp = await axios.post<RefreshResponse>(`${baseURL}${refreshEndpoint}`, {
          refreshToken,
        });
        if (!resp.data.success) {
          throw new Error('Refresh rejected by server');
        }
        const { accessToken, refreshToken: newRefresh } = resp.data.data;
        await TokenStorage.saveTokens(accessToken, newRefresh);

        processQueue(null, accessToken);
        if (original.headers) {
          original.headers['Authorization'] = `Bearer ${accessToken}`;
        }
        return client(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        await TokenStorage.clear();
        onLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    },
  );

  return client;
}
