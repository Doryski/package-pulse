import Logo from "@/components/logo";
import ThemeSwitch from "@/components/ui/theme-switch";

const Header = () => {
  return (
    <header className="flex items-center justify-between py-4">
      <a href="/">
        <Logo />
      </a>
      <ThemeSwitch />
    </header>
  );
};

export default Header;
