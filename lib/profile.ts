// Helpers d'affichage du profil client (initiales pastille, prenom message
// d'accueil). Le nom de contact est stocke dans user_metadata.nom (saisi a
// l'inscription, ex. "Dr. Camille Mercier" ou "Theo Vidal").

// Titres civils ignores pour deriver initiales et prenom.
const TITLES = new Set([
  "dr",
  "dr.",
  "pr",
  "pr.",
  "m",
  "m.",
  "mr",
  "mr.",
  "mme",
  "mme.",
  "mlle",
  "mlle.",
]);

function nameTokens(name: string | undefined | null): string[] {
  if (!name) return [];
  return name
    .trim()
    .split(/\s+/)
    .filter((tok) => tok && !TITLES.has(tok.toLowerCase()));
}

// Initiales (max 2 lettres) pour la pastille. "Theo Vidal" -> "TV".
export function initialsOf(name: string | undefined | null): string {
  const parts = nameTokens(name).slice(0, 2);
  const out = parts.map((p) => p[0]?.toUpperCase() ?? "").join("");
  return out || "?";
}

// Prenom pour le message d'accueil. "Dr. Camille Mercier" -> "Camille".
export function firstNameOf(name: string | undefined | null): string {
  return nameTokens(name)[0] ?? "";
}
