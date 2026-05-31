import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  tenant: Tenant | null;
  /** True until the initial session check + profile load resolves. */
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  // Avoid overlapping profile fetches when auth events fire in bursts.
  const fetchingFor = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    fetchingFor.current = userId;
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (fetchingFor.current !== userId) return;
    setProfile(prof ?? null);

    if (prof?.tenant_id) {
      const { data: ten } = await supabase
        .from("tenants")
        .select("*")
        .eq("id", prof.tenant_id)
        .maybeSingle();
      if (fetchingFor.current !== userId) return;
      setTenant(ten ?? null);
    } else {
      setTenant(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    // 1) Register listener first so we never miss an auth event.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      if (nextSession?.user) {
        // Defer Supabase calls out of the callback to avoid deadlocks.
        setTimeout(() => {
          if (active) void loadProfile(nextSession.user.id);
        }, 0);
      } else {
        fetchingFor.current = null;
        setProfile(null);
        setTenant(null);
      }
    });

    // 2) Then hydrate the existing session.
    void supabase.auth.getSession().then(async ({ data: { session: existing } }) => {
      if (!active) return;
      setSession(existing);
      if (existing?.user) {
        await loadProfile(existing.user.id);
      }
      if (active) setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const refresh = useCallback(async () => {
    if (session?.user) await loadProfile(session.user.id);
  }, [session, loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setTenant(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      tenant,
      loading,
      refresh,
      signOut,
    }),
    [session, profile, tenant, loading, refresh, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
