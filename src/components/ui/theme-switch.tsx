"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIsMobile } from "@/lib/hooks/useIsMobile";
import { Monitor, Moon, Smartphone, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import ClientOnly from "./client-only";
import { TogglePosition, toggleVariants } from "./toggle";

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

const PLACEHOLDER_POSITIONS = [
  "first",
  "middle",
  "last",
] as const satisfies TogglePosition[];

const ThemeSwitchPlaceholder = () => (
  <div
    aria-hidden="true"
    data-testid="theme-switch-placeholder"
    className="flex items-center justify-center"
  >
    {PLACEHOLDER_POSITIONS.map((position) => (
      <span
        key={position}
        className={toggleVariants({ variant: "outline", position })}
      >
        <span className="size-4" />
      </span>
    ))}
  </div>
);

const ThemeSwitchClientOnly = () => (
  <ClientOnly fallback={<ThemeSwitchPlaceholder />}>
    <ThemeSwitch />
  </ClientOnly>
);

export default ThemeSwitchClientOnly;
