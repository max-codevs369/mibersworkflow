"use client";

import { createContext, useContext } from "react";

export type ThemeMode = "light" | "dark" | "system";

const InitialTheme = createContext<ThemeMode>("system");

export function ThemeProvider({ initial, children }: { initial: ThemeMode; children: React.ReactNode }) {
  return <InitialTheme.Provider value={initial}>{children}</InitialTheme.Provider>;
}

export const useInitialTheme = () => useContext(InitialTheme);
