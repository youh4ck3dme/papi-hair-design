import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { auth, db, functions } from "@/integrations/firebase/config";
import { onAuthStateChanged, signOut as firebaseSignOut, User } from "firebase/auth";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

interface Profile {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Membership {
  id: string;
  business_id: string;
  profile_id: string;
  role: "owner" | "admin" | "employee" | "customer";
}

export interface AuthUser {
  id: string;
  email: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  fbUser: User | null; // Keep raw firebase user for lower level operations
  profile: Profile | null;
  memberships: Membership[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  fbUser: null,
  profile: null,
  memberships: [],
  loading: true,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [fbUser, setFbUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeMemberships = useCallback(async () => {
    try {
      const fn = httpsCallable<{ business_id?: string }, { success: boolean; normalized: number }>(
        functions,
        "normalizeMemberships"
      );
      await fn({});
    } catch (err) {
      console.warn("AuthContext: normalizeMemberships skipped:", err);
    }
  }, []);

  const refreshProfile = useCallback(async (uid?: string) => {
    const targetUid = uid || fbUser?.uid;
    if (!targetUid) return;

    try {
      const profileSnap = await getDoc(doc(db, "profiles", targetUid));

      if (profileSnap.exists()) {
        const data = profileSnap.data();
        setProfile({
          id: profileSnap.id,
          full_name: data.full_name ?? null,
          email: data.email ?? null,
          phone: data.phone ?? null,
          avatar_url: data.avatar_url ?? null,
        });
      }

      const membershipsSnap = await getDocs(query(
        collection(db, "memberships"),
        where("profile_id", "==", targetUid)
      ));

      setMemberships(membershipsSnap.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as Membership[]);

    } catch (err) {
      console.error("AuthContext: Error fetching profile/memberships:", err);
    }
  }, [fbUser]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentFbUser) => {
      setFbUser(currentFbUser);

      if (currentFbUser) {
        setUser({
          id: currentFbUser.uid,
          email: currentFbUser.email ?? null
        });
        try {
          await normalizeMemberships();
          await refreshProfile(currentFbUser.uid);
        } catch (err) {
          console.error("AuthContext: Failed to refresh profile on auth change:", err);
        }
      } else {
        setUser(null);
        setProfile(null);
        setMemberships([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [normalizeMemberships, refreshProfile]);

  const signOut = useCallback(async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setFbUser(null);
      setProfile(null);
      setMemberships([]);
    } catch (err) {
      console.error("AuthContext: Error during signOut:", err);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, fbUser, profile, memberships, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
