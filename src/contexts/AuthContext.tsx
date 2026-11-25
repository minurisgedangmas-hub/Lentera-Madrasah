import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { clampString, LIMITS } from '../lib/validation';
import { PortalPreviewMode, RoleInvite, UserProfile, UserRole } from '../types/school';

const BOOTSTRAP_ADMIN_EMAIL = 'hagoyalitu@gmail.com';

function roleToLabel(role: UserRole): 'Admin' | 'Guru' | 'Siswa' | 'Orang Tua' | 'Menunggu Verifikasi' {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'guru':
      return 'Guru';
    case 'siswa':
      return 'Siswa';
    case 'orangtua':
      return 'Orang Tua';
    default:
      return 'Menunggu Verifikasi';
  }
}

interface AuthContextValue {
  firebaseUser: User | null;
  profile: UserProfile | null;
  authReady: boolean;
  authError: string | null;
  previewMode: PortalPreviewMode;
  setPreviewMode: (mode: PortalPreviewMode) => void;
  effectiveRole: PortalPreviewMode | 'pending';
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<PortalPreviewMode>('admin');

  const syncUserProfile = async (user: User) => {
    const userRef = doc(db, 'users', user.uid);
    const publicRef = doc(db, 'publicProfiles', user.uid);
    const emailLower = (user.email || '').trim().toLowerCase();
    const isBootstrapAdmin = emailLower === BOOTSTRAP_ADMIN_EMAIL && user.emailVerified;
    const displayName = clampString(user.displayName || emailLower.split('@')[0] || 'Pengguna Madrasah', LIMITS.DISPLAY_NAME_MAX);

    let matchingInvite: RoleInvite | null = null;
    if (emailLower && user.emailVerified && !isBootstrapAdmin) {
      try {
        const inviteSnap = await getDocs(
          query(collection(db, 'roleInvites'), where('email', '==', emailLower))
        );
        if (!inviteSnap.empty) {
          matchingInvite = {
            id: inviteSnap.docs[0].id,
            ...inviteSnap.docs[0].data(),
          } as RoleInvite;
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'roleInvites');
      }
    }

    let existingSnap;
    try {
      existingSnap = await getDoc(userRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
    }

    if (!existingSnap.exists()) {
      const assignedRole: UserRole = isBootstrapAdmin
        ? 'admin'
        : matchingInvite
        ? matchingInvite.role
        : 'pending';

      const newUserPayload = {
        uid: user.uid,
        email: emailLower,
        displayName,
        role: assignedRole,
        linkedStudentIds: matchingInvite ? matchingInvite.linkedStudentIds : [],
        classIds: matchingInvite ? matchingInvite.classIds : [],
        assignedSubjects: matchingInvite?.assignedSubjects || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      try {
        await setDoc(userRef, newUserPayload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `users/${user.uid}`);
      }

      try {
        await setDoc(publicRef, {
          uid: user.uid,
          displayName,
          roleLabel: roleToLabel(assignedRole),
          departmentOrClass: '',
          isPublic: true,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `publicProfiles/${user.uid}`);
      }

      if (assignedRole !== 'pending') {
        setPreviewMode(assignedRole);
      }
      return;
    }

    const currentData = existingSnap.data() as UserProfile;

    // Claim invite if user was pending and now has a matching invite
    if (currentData.role === 'pending' && matchingInvite) {
      try {
        await updateDoc(userRef, {
          role: matchingInvite.role,
          linkedStudentIds: matchingInvite.linkedStudentIds,
          classIds: matchingInvite.classIds,
          assignedSubjects: matchingInvite.assignedSubjects || [],
          updatedAt: serverTimestamp(),
        });
        await setDoc(
          publicRef,
          {
            uid: user.uid,
            displayName,
            roleLabel: roleToLabel(matchingInvite.role),
            departmentOrClass: '',
            isPublic: true,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setPreviewMode(matchingInvite.role);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
      return;
    }

    // Ensure publicProfile exists
    try {
      const pubSnap = await getDoc(publicRef);
      if (!pubSnap.exists()) {
        await setDoc(publicRef, {
          uid: user.uid,
          displayName: currentData.displayName || displayName,
          roleLabel: roleToLabel(currentData.role),
          departmentOrClass: '',
          isPublic: true,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `publicProfiles/${user.uid}`);
    }

    if (currentData.role !== 'pending') {
      setPreviewMode(currentData.role === 'admin' ? 'guru' : currentData.role);
    }
  };

  useEffect(() => {
    let unsubProfile: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      if (unsubProfile) {
        unsubProfile();
        unsubProfile = null;
      }

      setFirebaseUser(user);
      setAuthError(null);

      if (!user) {
        setProfile(null);
        setAuthReady(true);
        return;
      }

      try {
        await syncUserProfile(user);
        unsubProfile = onSnapshot(
          doc(db, 'users', user.uid),
          (snap) => {
            if (snap.exists()) {
              const data = snap.data() as UserProfile;
              setProfile(data);
              if (data.role !== 'admin' && data.role !== 'pending') {
                setPreviewMode(data.role);
              }
            }
            setAuthReady(true);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, `users/${user.uid}`);
          }
        );
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Gagal memuat profil pengguna.');
        setAuthReady(true);
      }
    });

    return () => {
      unsubAuth();
      if (unsubProfile) unsubProfile();
    };
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal masuk dengan Google.';
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError(msg);
      }
    }
  };

  const signOut = async () => {
    setAuthError(null);
    await firebaseSignOut(auth);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (firebaseUser) {
      await syncUserProfile(firebaseUser);
    }
  };

  const effectiveRole: PortalPreviewMode | 'pending' = !profile
    ? 'pending'
    : profile.role === 'admin'
    ? previewMode
    : profile.role;

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        profile,
        authReady,
        authError,
        previewMode,
        setPreviewMode,
        effectiveRole,
        signInWithGoogle,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider');
  }
  return ctx;
}
