"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import ClientOnly from "./client-only";

const THEME_OPTIONS = [
  { value: "system", label: "System", Icon: null },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
] as const;

const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();
  const isMobile = useIsMobile();

  const SystemIcon = isMobile === true ? Smartphone : Monitor;

  return (
    <ToggleGroup
      type="single"
      value={theme}
      onValueChange={(value) => value && setTheme(value)}
      variant="outline"
      aria-label="Theme"
    >
      {THEME_OPTIONS.map(({ value, label, Icon }) => (
        <ToggleGroupItem key={value} value={value} aria-label={label}>
          {value === "system" ? (
            <SystemIcon className="size-4" />
          ) : (
            Icon && <Icon className="size-4" />
          )}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
};

const ThemeSwitchClientOnly = () => (
  <ClientOnly>
    <ThemeSwitch />
  </ClientOnly>
);

export default ThemeSwitchClientOnly;
