// Message d'accueil post-connexion. Le layout racine (et donc WelcomeToast)
// persiste a travers la navigation client : declencher l'evenement suffit pour
// que le toast survive a la redirection vers /configurateur. La sessionStorage
// sert de secours si la destination est atteinte par un chargement complet
// (ex. lien de confirmation email -> /connexion).

export const WELCOME_KEY = "oneprint_welcome";
export const WELCOME_EVENT = "oneprint-welcome";

export function triggerWelcome(firstName: string): void {
  if (typeof window === "undefined" || !firstName) return;
  try {
    window.sessionStorage.setItem(WELCOME_KEY, firstName);
  } catch {
    /* storage indisponible : l'evenement suffit */
  }
  window.dispatchEvent(new CustomEvent(WELCOME_EVENT, { detail: firstName }));
}
