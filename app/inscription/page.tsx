import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import SignupForm from "./SignupForm";

export const metadata: Metadata = {
  title: "Créer mon compte — ONE PRINT",
};

export default function InscriptionPage() {
  return (
    <>
      <EspaceHeader />
      <SignupForm />
    </>
  );
}
