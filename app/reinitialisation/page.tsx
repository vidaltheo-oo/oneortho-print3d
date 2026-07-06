import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import ResetForm from "./ResetForm";

export const metadata: Metadata = {
  title: "Réinitialisation du mot de passe — ONE PRINT",
};

export default function ReinitialisationPage() {
  return (
    <>
      <EspaceHeader />
      <ResetForm />
    </>
  );
}
