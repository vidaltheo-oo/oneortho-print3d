import type { Metadata } from "next";
import EspaceHeader from "@/components/EspaceHeader";
import CartView from "./CartView";

export const metadata: Metadata = {
  title: "Mon panier — ONE PRINT",
};

export default function PanierPage() {
  return (
    <>
      <EspaceHeader />
      <CartView />
    </>
  );
}
