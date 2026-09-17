import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User, signOut } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

import { logger } from '../utils/logger';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/gmail.readonly');

const GOOGLE_TOKEN_KEY = 'syncsheet_google_access_token';
const GOOGLE_USER_KEY = 'syncsheet_google_user_data';

let isSigningIn = false;
let cachedAccessToken: string | null = (() => {
  try {
    return localStorage.getItem(GOOGLE_TOKEN_KEY);
  } catch {
    return null;
  }
})();

export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(GOOGLE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Initialize auth state listener. Call this on app load.
export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    } catch {
      cachedAccessToken = null;
    }
  }

  // If we already have stored token and user data, immediately notify listener on start
  const existingStored = getStoredUser();
  if (cachedAccessToken && existingStored && onAuthSuccess) {
    onAuthSuccess(existingStored as any, cachedAccessToken);
  }

  return onAuthStateChanged(auth, async (user: User | null) => {
    if (!cachedAccessToken) {
      try {
        cachedAccessToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
      } catch {
        cachedAccessToken = null;
      }
    }

    if (user && cachedAccessToken) {
      try {
        const profile = {
          uid: user.uid,
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
        };
        localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
      } catch (e) {
        // ignore
      }
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else if (cachedAccessToken) {
      const stored = getStoredUser();
      if (stored && onAuthSuccess) {
        onAuthSuccess(stored as any, cachedAccessToken);
      } else if (!isSigningIn && onAuthFailure) {
        onAuthFailure();
      }
    } else if (!isSigningIn) {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

// Must be called from a button click or user interaction
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to get access token from Firebase Auth');
    }

    cachedAccessToken = credential.accessToken;
    try {
      localStorage.setItem(GOOGLE_TOKEN_KEY, credential.accessToken);
      if (result.user) {
        const profile = {
          uid: result.user.uid,
          displayName: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
        };
        localStorage.setItem(GOOGLE_USER_KEY, JSON.stringify(profile));
      }
    } catch (e) {
      logger.error('Failed to store Google credentials in localStorage:', e);
    }

    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    logger.error('Sign in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  if (!cachedAccessToken) {
    try {
      cachedAccessToken = localStorage.getItem(GOOGLE_TOKEN_KEY);
    } catch {
      cachedAccessToken = null;
    }
  }
  return cachedAccessToken;
};

export const setAccessTokenInMemory = (token: string) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(GOOGLE_TOKEN_KEY, token);
  } catch {
    // ignore
  }
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error: any) {
    logger.error('Sign out error:', error);
  } finally {
    cachedAccessToken = null;
    try {
      localStorage.removeItem(GOOGLE_TOKEN_KEY);
      localStorage.removeItem(GOOGLE_USER_KEY);
    } catch (e) {
      // ignore
    }
  }
};

