"use client";

import { useEffect, useRef, useState } from "react";

const THEME_KEY = "frienda_theme";
const THEME_ATTR = "data-theme";

type Theme = "light" | "dark";

const applyTheme = (theme: Theme) => {
  document.documentElement.setAttribute(THEME_ATTR, theme);
};

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);
  const manualTheme = useRef(false);

  useEffect(() => {
    setMounted(true);
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "light" || stored === "dark") {
      manualTheme.current = true;
      setTheme(stored);
      applyTheme(stored);
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applySystem = () => {
      if (manualTheme.current) return;
      const attr = document.documentElement.getAttribute(THEME_ATTR);
      const nextTheme =
        attr === "light" || attr === "dark" ? attr : media.matches ? "dark" : "light";
      setTheme(nextTheme);
      applyTheme(nextTheme);
    };

    applySystem();
    if (media.addEventListener) {
      media.addEventListener("change", applySystem);
      return () => media.removeEventListener("change", applySystem);
    }

    media.addListener(applySystem);
    return () => media.removeListener(applySystem);
  }, []);

  const handleToggle = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    manualTheme.current = true;
    window.localStorage.setItem(THEME_KEY, nextTheme);
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  return (
    <button
      type="button"
      className="btn-icon"
      onClick={handleToggle}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      aria-pressed={theme === "dark"}
      title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
      suppressHydrationWarning
    >
      {!mounted ? null : theme === "dark" ? (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2.5M12 18.5V21M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M3 12h2.5M18.5 12H21M4.8 19.2l1.8-1.8M17.4 6.6l1.8-1.8" />
        </svg>
      ) : (
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
        </svg>
      )}
    </button>
  );
}
