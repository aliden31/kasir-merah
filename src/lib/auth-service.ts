import { auth, db } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { UserRole } from './types';

// Register a new user
export const register = async (email: string, password: string, role: UserRole) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Store user role in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email: user.email,
      role: role,
    });

    return user;
  } catch (error: any) {
    // Provide more specific error messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password terlalu lemah. Gunakan minimal 6 karakter.');
    }
    throw new Error('Terjadi kesalahan saat pendaftaran.');
  }
};

// Login an existing user
export const login = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
      throw new Error('Email atau password salah.');
    }
    throw new Error('Terjadi kesalahan saat login.');
  }
};

// Logout the current user
export const logout = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error('Terjadi kesalahan saat logout.');
  }
};

// Get user role from Firestore
export const getUserRole = async (uid: string): Promise<UserRole | null> => {
  const userDocRef = doc(db, 'users', uid);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return userDoc.data().role as UserRole;
  }
  return null;
};
