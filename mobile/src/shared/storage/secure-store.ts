import * as SecureStore from 'expo-secure-store';

/**
 * Thin wrapper over expo-secure-store for the auth token.
 * The JWT lives in the device keychain/keystore — never in plain AsyncStorage.
 */
const TOKEN_KEY = 'campuscafe.token';

export const tokenStorage = {
  get: (): Promise<string | null> => SecureStore.getItemAsync(TOKEN_KEY),
  set: (token: string): Promise<void> => SecureStore.setItemAsync(TOKEN_KEY, token),
  clear: (): Promise<void> => SecureStore.deleteItemAsync(TOKEN_KEY),
};
