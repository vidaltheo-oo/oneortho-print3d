import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import MonCompteView from "./MonCompteView";

export const metadata: Metadata = {
  title: "Ma fiche — ONE PRINT",
};

export default function MonComptePage() {
  return (
    <>
      <EspaceHeader />
      <MonCompteView />
    </>
  );
}
