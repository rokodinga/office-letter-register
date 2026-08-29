import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { auth, db } from './config';
import {
  createUserWithEmailAndPassword, sendPasswordResetEmail, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile, updateEmail,
  reauthenticateWithCredential, EmailAuthProvider, updatePassword,
} from 'firebase/auth';
import type { User, AuthError } from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

export type UserRole = 'admin' | 'user';
export type UserStatus = 'active' | 'disabled';

export interface UserProfile {
  uid: string; displayName: string; email: string; photoURL: string;
  role: UserRole; status: UserStatus; createdAt?: unknown; updatedAt?: unknown;
}

interface AuthContextType {
  user: User | null; userProfile: UserProfile | null; loading: boolean;
  signup: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>; logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updateUserProfile: (displayName: string, photoURL?: string) => Promise<void>;
  changeEmail: (newEmail: string, currentPassword: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function loadUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid);
  const snapshot = await getDoc(ref);
  if (snapshot.exists()) return snapshot.data() as UserProfile;
  const profile: UserProfile = {
    uid: user.uid, displayName: user.displayName || '', email: user.email || '',
    photoURL: user.photoURL || '', role: 'user', status: 'active',
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  };
  await setDoc(ref, profile, { merge: true });
  return profile;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      try {
        if (!currentUser) { setUser(null); setUserProfile(null); setLoading(false); return; }
        const profile = await loadUserProfile(currentUser);
        if (profile.status === 'disabled') { await signOut(auth); setUser(null); setUserProfile(null); return; }
        setUser(currentUser); setUserProfile(profile);
      } catch (error) {
        console.error('Failed to load user profile:', error);
        setUser(currentUser); setUserProfile(null);
      } finally { setLoading(false); }
    });
    return unsubscribe;
  }, []);

  const signup = async (email: string, password: string, displayName: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const name = displayName.trim();
      await updateProfile(credential.user, { displayName: name });
      const profile: UserProfile = {
        uid: credential.user.uid, displayName: name, email: credential.user.email || email.trim(),
        photoURL: '', role: 'user', status: 'active',
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, 'users', credential.user.uid), profile);
      await credential.user.reload(); setUser(auth.currentUser); setUserProfile(profile);
    } catch (error) { console.error('Signup error:', (error as AuthError).message); throw error; }
  };

  const login = async (email: string, password: string) => {
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await loadUserProfile(credential.user);
      if (profile.status === 'disabled') { await signOut(auth); throw new Error('This account has been disabled. Please contact an administrator.'); }
      setUser(credential.user); setUserProfile(profile);
    } catch (error) { console.error('Login error:', (error as AuthError).message); throw error; }
  };

  const logout = async () => { await signOut(auth); setUser(null); setUserProfile(null); };
  const resetPassword = async (email: string) => { await sendPasswordResetEmail(auth, email.trim()); };

  const updateUserProfile = async (displayName: string, photoURL?: string) => {
    if (!auth.currentUser) throw new Error('You must be signed in.');
    const cleanName = displayName.trim(), cleanPhoto = photoURL?.trim() || '';
    await updateProfile(auth.currentUser, { displayName: cleanName, photoURL: cleanPhoto || null });
    await auth.currentUser.reload();
    const updated = { displayName: cleanName, photoURL: cleanPhoto, email: auth.currentUser.email || '', updatedAt: serverTimestamp() };
    await setDoc(doc(db, 'users', auth.currentUser.uid), updated, { merge: true });
    setUser(auth.currentUser); setUserProfile(current => current ? { ...current, ...updated } : current);
  };

  const changeEmail = async (newEmail: string, currentPassword: string) => {
    if (!auth.currentUser?.email) throw new Error('No signed-in email account found.');
    if (!currentPassword) throw new Error('Current password is required.');
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, currentPassword));
    await updateEmail(auth.currentUser, newEmail.trim()); await auth.currentUser.reload();
    await setDoc(doc(db, 'users', auth.currentUser.uid), { email: auth.currentUser.email || newEmail.trim(), updatedAt: serverTimestamp() }, { merge: true });
    setUser(auth.currentUser); setUserProfile(current => current ? { ...current, email: auth.currentUser?.email || newEmail.trim() } : current);
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!auth.currentUser?.email) throw new Error('No signed-in email account found.');
    if (!currentPassword) throw new Error('Current password is required.');
    if (newPassword.length < 6) throw new Error('New password must be at least 6 characters.');
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, currentPassword));
    await updatePassword(auth.currentUser, newPassword);
  };

  return <AuthContext.Provider value={{ user, userProfile, loading, signup, login, logout, resetPassword, updateUserProfile, changeEmail, changePassword }}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
