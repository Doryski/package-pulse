"use client";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from "next-themes";

const ThemeSwitch = () => {
  const { theme, setTheme } = useTheme();

  return (
    <SelectGroup className="flex items-center space-x-2">
      <SelectLabel className="text-sm font-medium">Theme:</SelectLabel>
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
    </SelectGroup>
  );
};

export default ThemeSwitch;
