import type { Metadata } from "next";
import { JournalScreen } from "@/features/journal/JournalScreen";

export const metadata: Metadata = { title: "Notlar · Rutin" };

export default function NotesPage() {
  return <JournalScreen />;
}
