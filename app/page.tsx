import { redirect } from "next/navigation";

// La page d'accueil redirige vers le configurateur (filet de securite en plus
// de la redirection definie dans next.config.ts). Remplace le template par
// defaut de create-next-app.
export default function Home() {
  redirect("/configurateur");
}
