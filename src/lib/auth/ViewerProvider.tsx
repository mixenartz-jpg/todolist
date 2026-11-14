"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Role } from "./roles";

export interface ViewerValue {
  userId: string;
  role: Role;
  coachId: string | null;
  studentId: string | null;
  studentName: string | null;
  /**
   * Öğrenci ekranı salt okunur mu? Koç `/ogrenci/*`'ı açtığında true
   * ("öğrenci gözüyle önizle"). Yazma zaten RLS'te reddedilir; bu
   * bayrak arayüzün yazmayı DENEMEMESİ içindir.
   */
  readOnly: boolean;
}

const ViewerContext = createContext<ViewerValue | null>(null);

export function ViewerProvider({
  value,
  children,
}: {
  value: ViewerValue;
  children: ReactNode;
}) {
  return <ViewerContext.Provider value={value}>{children}</ViewerContext.Provider>;
}

export function useViewer(): ViewerValue {
  const value = useContext(ViewerContext);
  if (!value) throw new Error("useViewer, ViewerProvider dışında çağrıldı");
  return value;
}

/** Sağlayıcı olmayan yerlerde (testler, eski ekranlar) güvenli okuma. */
export function useOptionalViewer(): ViewerValue | null {
  return useContext(ViewerContext);
}
