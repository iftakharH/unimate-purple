"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Light default, dark via the persisted toggle (ADR-010). `enableSystem` is
 * false on purpose: the brand decision is "light default", not "follow OS".
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
