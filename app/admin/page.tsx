import type { Metadata } from "next";
import AdminApp from "./AdminApp";

export const metadata: Metadata = {
  title: "Administration — ONE PRINT",
};

export default function AdminPage() {
  return <AdminApp />;
}
