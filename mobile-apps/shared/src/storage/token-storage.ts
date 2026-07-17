// Author: Robert Massey | Created: 2026-07-16 | Module: @attune-sb/mobile-shared
// Purpose: Typed wrapper over expo-secure-store.
// Tokens are always in secure storage — never in AsyncStorage or memory alone.
import * as SecureStore from 'expo-secure-store';

const KEYS = {
  ACCESS_TOKEN: 'attune_sb_access_token',
  REFRESH_TOKEN: 'attune_sb_refresh_token',
  USER_ID: 'attune_sb_user_id',
  ORG_ID: 'attune_sb_org_id',
  DISPLAY_NAME: 'attune_sb_display_name',
} as const;

export const TokenStorage = {
  async saveTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.ACCESS_TOKEN, accessToken),
      SecureStore.setItemAsync(KEYS.REFRESH_TOKEN, refreshToken),
    ]);
  },

  getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.ACCESS_TOKEN);
  },

  getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(KEYS.REFRESH_TOKEN);
  },

  async saveUserMeta(userId: string, orgId: string, displayName?: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(KEYS.USER_ID, userId),
      SecureStore.setItemAsync(KEYS.ORG_ID, orgId),
      displayName ? SecureStore.setItemAsync(KEYS.DISPLAY_NAME, displayName) : Promise.resolve(),
    ]);
  },

  async getUserMeta(): Promise<{
    userId: string | null;
    orgId: string | null;
    displayName: string | null;
  }> {
    const [userId, orgId, displayName] = await Promise.all([
      SecureStore.getItemAsync(KEYS.USER_ID),
      SecureStore.getItemAsync(KEYS.ORG_ID),
      SecureStore.getItemAsync(KEYS.DISPLAY_NAME),
    ]);
    return { userId, orgId, displayName };
  },

  async clear(): Promise<void> {
    await Promise.all(Object.values(KEYS).map((k) => SecureStore.deleteItemAsync(k)));
  },
};
