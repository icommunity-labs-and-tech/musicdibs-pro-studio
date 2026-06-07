import { supabase } from "@/integrations/supabase/client";

/**
 * Accepts a pending tenant invitation for the given user. Safe to call right
 * after sign-up (even before email confirmation) or after sign-in — the
 * accept-invitation edge function runs with the service role and links the
 * profile to the invited tenant. Returns true on success.
 */
export async function acceptInvitation(token: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase.functions.invoke("accept-invitation", {
    body: { token, user_id: userId },
  });
  if (error || data?.error) {
    return false;
  }
  return Boolean(data?.success);
}
