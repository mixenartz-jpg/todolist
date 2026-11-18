"use client";

import { createContext, useContext, type ReactNode } from "react";
import { setActiveStudentId } from "./activeStudent";
import type { Role } from "./roles";
import type { StudentOption } from "./students";

export interface ViewerValue {
  userId: string;
  role: Role;
  coachId: string | null;
  studentId: string | null;
  studentName: string | null;
  /** Koçun bütün öğrencileri; öğrencide boş. */
  students: StudentOption[];
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
  /*
   * Render sırasında, efektte DEĞİL: çocukların sorguları ilk
   * render'dan sonra başlar ve süzgeci/başlığı hazır bulmalı. Değer
   * yalnızca tam sayfa yüklemesinde değişir (`switchStudent`), yani
   * yarışacak iki farklı değer yok.
   */
  setActiveStudentId(value.studentId);
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
