"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";
import ClientOnly from "./client-only";

const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex items-center gap-2">
      <label
        htmlFor="theme-switch"
        className="hidden text-nowrap text-sm font-medium sm:block"
      >
        Theme:
      </label>
      <Select value={theme} onValueChange={(value) => setTheme(value)}>
        <SelectTrigger className="w-24" id="theme-switch" aria-label="Theme">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent role="menu">
          <SelectItem role="menuitem" value="system">
            System
          </SelectItem>
          <SelectItem role="menuitem" value="dark">
            Dark
          </SelectItem>
          <SelectItem role="menuitem" value="light">
            Light
          </SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const ThemeSwitchClientOnly = () => (
  <ClientOnly>
    <ThemeSwitch />
  </ClientOnly>
);

export default ThemeSwitchClientOnly;
