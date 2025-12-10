import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "focus" | "light" | "ocean" | "forest" | "dracula" | "minimal" | "sunset" | "retro" | "cyber";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const stored = localStorage.getItem("typemasterai-theme");
    return (stored as Theme) || "focus";
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove("focus", "light", "ocean", "forest", "dracula", "minimal", "sunset", "retro", "cyber");
    root.classList.add(theme);
    localStorage.setItem("typemasterai-theme", theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
