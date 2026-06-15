import { supabase } from "./supabaseClient";

// Appels best-effort vers les route handlers d'emails. N'echouent jamais de
// maniere bloquante : une erreur d'email ne doit pas casser le flux metier.

async function token(): Promise<string | null> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

// Le token est passe dans le body (fiable) ET dans l'en-tete (fallback) :
// certaines plateformes ne transmettent pas toujours l'en-tete Authorization
// aux fonctions serverless.
export async function notifyOrderCreated(commandeIds: string[]): Promise<void> {
  if (!commandeIds.length) return;
  try {
    const accessToken = await token();
    if (!accessToken) return;
    await fetch("/api/emails/order-created", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ commandeIds, accessToken }),
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
    const accessToken = await token();
    if (!accessToken) return;
    await fetch("/api/emails/order-status", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ commandeId, statut, accessToken }),
    });
  } catch {
    /* best-effort */
  }
}
