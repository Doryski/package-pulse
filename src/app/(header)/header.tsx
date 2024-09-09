import Logo from "@/components/logo";

const Header = () => {
  return (
    <header className="flex items-center justify-between py-2">
      <a href="/">
        <Logo />
      </a>
    </header>
  );
};

export default Header;
