import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

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

/** Normalized user for components that expect .id (Firebase uses .uid) */
export interface AuthUser {
  id: string;
  email: string | null;
  uid: string;
}

interface AuthContextType {
  user: AuthUser | null;
  session: any | null;
  profile: Profile | null;
  memberships: Membership[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: (userId?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  profile: null,
  memberships: [],
  loading: true,
  signOut: async () => { },
  refreshProfile: async () => { },
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshProfile = useCallback(async (uid: string) => {
    if (!uid) return;

    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", uid)
        .single();

      if (profileData) {
        setProfile({
          id: profileData.id,
          full_name: profileData.full_name,
          email: profileData.email,
          phone: profileData.phone,
          avatar_url: profileData.avatar_url,
        });
      }

      const { data: membershipsData } = await supabase
        .from("memberships")
        .select("*")
        .eq("profile_id", uid);

      if (membershipsData) {
        setMemberships(membershipsData as Membership[]);
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initSession() {
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      if (!mounted) return;

      setSession(currentSession);
      if (currentSession?.user) {
        const u = currentSession.user;
        setUser({ id: u.id, uid: u.id, email: u.email ?? null });
        await refreshProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
        setMemberships([]);
      }
      setLoading(false);
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, currentSession) => {
      if (!mounted) return;

      setSession(currentSession);
      if (currentSession?.user) {
        const u = currentSession.user;
        // Only update user if ID actually changed to prevent loops
        setUser(prev => (prev?.id === u.id ? prev : { id: u.id, uid: u.id, email: u.email ?? null }));
        await refreshProfile(u.id);
      } else {
        setUser(null);
        setProfile(null);
        setMemberships([]);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setMemberships([]);
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, profile, memberships, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
