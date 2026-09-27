import {
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, googleProvider } from './firebase';

export interface UserProfile {
  id: string; // Firebase UID
  name: string;
  email: string;
  role: 'SOC Analyst' | 'Lead Engineer' | 'Security Officer' | 'Red Team Architect';
  organization: string;
  photoURL?: string;
  createdAt: string;
  lastLogin: string;
  provider: 'google' | 'password' | 'demo';
}

const LOCAL_STORAGE_FALLBACK_USER = 'adversim_current_session_v1';
const LOCAL_STORAGE_USERS = 'adversim_registered_users_v1';

export const authService = {
  // Subscribe to real-time auth state updates from Firebase
  onAuthChange(callback: (user: UserProfile | null) => void): () => void {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      if (fbUser) {
        try {
          const profile = await this.syncUserProfile(fbUser);
          callback(profile);
        } catch (err) {
          console.warn('Sync profile error, fallback to Auth profile:', err);
          const fallbackProfile: UserProfile = {
            id: fbUser.uid,
            name: fbUser.displayName || fbUser.email?.split('@')[0] || 'SOC Operator',
            email: fbUser.email || '',
            role: 'SOC Analyst',
            organization: 'Cyber Defense Division',
            photoURL: fbUser.photoURL || undefined,
            createdAt: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            provider: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password'
          };
          callback(fallbackProfile);
        }
      } else {
        // Check if there is an offline or demo session
        try {
          const cached = localStorage.getItem(LOCAL_STORAGE_FALLBACK_USER);
          if (cached) {
            callback(JSON.parse(cached));
            return;
          }
        } catch {
          // ignore
        }
        callback(null);
      }
    });

    return unsubscribe;
  },

  // Synchronize or create user document in Firestore
  async syncUserProfile(
    fbUser: FirebaseUser,
    additionalData?: {
      role?: 'SOC Analyst' | 'Lead Engineer' | 'Security Officer' | 'Red Team Architect';
      organization?: string;
      customName?: string;
    }
  ): Promise<UserProfile> {
    const userDocRef = doc(db, 'users', fbUser.uid);
    let existingProfile: Partial<UserProfile> = {};

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        existingProfile = snap.data() as Partial<UserProfile>;
      }
    } catch (e) {
      console.warn('Could not read existing user doc from Firestore:', e);
    }

    const nowIso = new Date().toISOString();
    const finalProfile: UserProfile = {
      id: fbUser.uid,
      name: additionalData?.customName || existingProfile.name || fbUser.displayName || fbUser.email?.split('@')[0] || 'SOC Operator',
      email: fbUser.email || existingProfile.email || 'operator@range.local',
      role: additionalData?.role || existingProfile.role || 'SOC Analyst',
      organization: additionalData?.organization || existingProfile.organization || 'Autonomous Defense Division',
      photoURL: fbUser.photoURL || existingProfile.photoURL || undefined,
      createdAt: existingProfile.createdAt || nowIso,
      lastLogin: nowIso,
      provider: fbUser.providerData[0]?.providerId === 'google.com' ? 'google' : 'password'
    };

    // Save to Firestore
    try {
      await setDoc(userDocRef, {
        uid: finalProfile.id,
        name: finalProfile.name,
        email: finalProfile.email,
        role: finalProfile.role,
        organization: finalProfile.organization,
        photoURL: finalProfile.photoURL || '',
        createdAt: finalProfile.createdAt,
        lastLogin: finalProfile.lastLogin
      }, { merge: true });
    } catch (e) {
      console.warn('Could not persist profile in Firestore (offline or rule constraint):', e);
    }

    // Also mirror to local storage for instant offline availability
    try {
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_USER, JSON.stringify(finalProfile));
    } catch {}

    return finalProfile;
  },

  // Sign in with Google Popup
  async loginWithGoogle(): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const profile = await this.syncUserProfile(result.user);
      return { success: true, user: profile };
    } catch (error: any) {
      console.error('Google Sign-in failed:', error);
      let message = 'Google authentication was cancelled or failed.';
      if (error?.code === 'auth/popup-closed-by-user') {
        message = 'Sign-in popup was closed before completion.';
      } else if (error?.code === 'auth/network-request-failed') {
        message = 'Network error during Google authentication. Check your internet connection.';
      } else if (error?.message) {
        message = error.message;
      }
      return { success: false, error: message };
    }
  },

  // Register with Email and Password
  async registerWithEmail(params: {
    name: string;
    email: string;
    password: string;
    role?: 'SOC Analyst' | 'Lead Engineer' | 'Security Officer' | 'Red Team Architect';
    organization?: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    if (!cleanEmail || !params.name.trim() || !params.password) {
      return { success: false, error: 'All fields are required.' };
    }
    if (params.password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters.' };
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
      if (params.name) {
        await updateProfile(cred.user, { displayName: params.name });
      }
      const profile = await this.syncUserProfile(cred.user, {
        customName: params.name,
        role: params.role || 'SOC Analyst',
        organization: params.organization || 'Autonomous Defense Division'
      });
      return { success: true, user: profile };
    } catch (error: any) {
      console.warn('Firebase email registration error:', error);
      // Fallback to local storage vault if Firebase Email Auth isn't enabled in console yet
      if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/configuration-not-found') {
        return this.localVaultRegister(params);
      }
      if (error?.code === 'auth/email-already-in-use') {
        return { success: false, error: 'An account with this email already exists. Please log in.' };
      }
      if (error?.code === 'auth/weak-password') {
        return { success: false, error: 'Password is too weak. Please use at least 6 characters.' };
      }
      return { success: false, error: error.message || 'Registration failed.' };
    }
  },

  // Sign in with Email and Password
  async loginWithEmail(params: {
    email: string;
    password: string;
  }): Promise<{ success: boolean; user?: UserProfile; error?: string }> {
    const cleanEmail = params.email.trim().toLowerCase();
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, params.password);
      const profile = await this.syncUserProfile(cred.user);
      return { success: true, user: profile };
    } catch (error: any) {
      console.warn('Firebase email sign in error:', error);
      if (error?.code === 'auth/operation-not-allowed' || error?.code === 'auth/configuration-not-found') {
        return this.localVaultLogin(params);
      }
      if (error?.code === 'auth/user-not-found' || error?.code === 'auth/invalid-credential') {
        // Try local vault before giving up
        const localAttempt = this.localVaultLogin(params);
        if (localAttempt.success) return localAttempt;
        return { success: false, error: 'Invalid credentials or user not found.' };
      }
      if (error?.code === 'auth/wrong-password') {
        return { success: false, error: 'Incorrect password. Please re-enter.' };
      }
      return { success: false, error: error.message || 'Sign in failed.' };
    }
  },

  // Logout
  async logout(): Promise<void> {
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      console.error('Firebase sign out error:', e);
    }
    try {
      localStorage.removeItem(LOCAL_STORAGE_FALLBACK_USER);
    } catch {}
  },

  getCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_FALLBACK_USER);
      if (raw) {
        return JSON.parse(raw) as UserProfile;
      }
    } catch {}
    return null;
  },

  // Fallback Local Vault for offline/demo scenarios
  localVaultRegister(params: {
    name: string;
    email: string;
    password: string;
    role?: 'SOC Analyst' | 'Lead Engineer' | 'Security Officer' | 'Red Team Architect';
    organization?: string;
  }): { success: boolean; user?: UserProfile; error?: string } {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS);
      const users: any[] = raw ? JSON.parse(raw) : [];
      const cleanEmail = params.email.trim().toLowerCase();

      if (users.some(u => u.email === cleanEmail)) {
        return { success: false, error: 'An account with this email already exists.' };
      }

      const newUser: UserProfile = {
        id: 'usr_' + Date.now().toString(36),
        name: params.name.trim(),
        email: cleanEmail,
        role: params.role || 'SOC Analyst',
        organization: params.organization?.trim() || 'Autonomous Defense Division',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        provider: 'password'
      };

      users.push({ ...newUser, password: params.password });
      localStorage.setItem(LOCAL_STORAGE_USERS, JSON.stringify(users));
      localStorage.setItem(LOCAL_STORAGE_FALLBACK_USER, JSON.stringify(newUser));
      return { success: true, user: newUser };
    } catch (err: any) {
      return { success: false, error: 'Failed to access local credential vault.' };
    }
  },

  localVaultLogin(params: {
    email: string;
    password: string;
  }): { success: boolean; user?: UserProfile; error?: string } {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_USERS);
      const users: any[] = raw ? JSON.parse(raw) : [];
      const cleanEmail = params.email.trim().toLowerCase();

      // Check default demo account
      if (cleanEmail === 'sarah.vance@defensesim.ai' && params.password === 'defense2026!') {
        const demoUser: UserProfile = {
          id: 'usr_demo_commander',
          name: 'Commander Sarah Vance',
          email: 'sarah.vance@defensesim.ai',
          role: 'Lead Engineer',
          organization: 'Apex Cyber Defense Labs',
          createdAt: new Date(Date.now() - 86400000 * 30).toISOString(),
          lastLogin: new Date().toISOString(),
          provider: 'demo'
        };
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_USER, JSON.stringify(demoUser));
        return { success: true, user: demoUser };
      }

      const match = users.find(u => u.email === cleanEmail && u.password === params.password);
      if (match) {
        const { password: _, ...userProf } = match;
        userProf.lastLogin = new Date().toISOString();
        localStorage.setItem(LOCAL_STORAGE_FALLBACK_USER, JSON.stringify(userProf));
        return { success: true, user: userProf };
      }
      return { success: false, error: 'Invalid credentials.' };
    } catch {
      return { success: false, error: 'Could not access credentials storage.' };
    }
  }
};
