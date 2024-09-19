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
      <label className="text-sm font-medium">Theme:</label>
      <Select value={theme} onValueChange={(value) => setTheme(value)}>
        <SelectTrigger className="w-24">
          <SelectValue placeholder="Select theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="system">System</SelectItem>
          <SelectItem value="dark">Dark</SelectItem>
          <SelectItem value="light">Light</SelectItem>
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
