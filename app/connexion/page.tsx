import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — ONE PRINT",
};

export default function ConnexionPage() {
  return (
    <>
      <EspaceHeader />
      <LoginForm />
    </>
  );
}
