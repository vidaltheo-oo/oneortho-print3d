import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import MesCommandesView from "./MesCommandesView";

export const metadata: Metadata = {
  title: "Mes commandes — ONE PRINT",
};

export default function MesCommandesPage() {
  return (
    <>
      <EspaceHeader />
      <MesCommandesView />
    </>
  );
}
