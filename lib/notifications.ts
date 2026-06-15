import { supabase } from "./supabaseClient";

// Appels best-effort vers les route handlers d'emails. N'echouent jamais de
// maniere bloquante : une erreur d'email ne doit pas casser le flux metier.

async function authHeaders(): Promise<Record<string, string> | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${session.access_token}`,
  };
}

export async function notifyOrderCreated(commandeIds: string[]): Promise<void> {
  if (!commandeIds.length) return;
  try {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch("/api/emails/order-created", {
      method: "POST",
      headers,
      body: JSON.stringify({ commandeIds }),
    });
  } catch {
    /* best-effort */
  }
}

export async function notifyOrderStatus(
  commandeId: string,
  statut: string
): Promise<void> {
  try {
    const headers = await authHeaders();
    if (!headers) return;
    await fetch("/api/emails/order-status", {
      method: "POST",
      headers,
      body: JSON.stringify({ commandeId, statut }),
    });
  } catch {
    /* best-effort */
  }
}
