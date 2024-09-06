import { GitHubLogoIcon } from "@radix-ui/react-icons";
import TextLink from "./ui/text-link";

const Footer = () => {
  return (
    <footer className="flex flex-col items-center gap-6 border-t border-gray-200 px-4 py-8 md:flex-row md:justify-between">
      <div className="flex w-1/2 flex-col text-center md:text-left">
        <span className="flex flex-wrap items-center justify-center md:justify-start">
          Created by Dominik Rycharski (
          <TextLink
            href="https://github.com/Doryski"
            className="flex items-center gap-1 px-0.5"
            outside
          >
            <GitHubLogoIcon className="text-black" /> Doryski
          </TextLink>
          ).
        </span>
        <span className="flex flex-wrap items-center justify-center md:justify-start">
          For any questions, bugs or feature requests, please contact me through
          the contact form at{" "}
          <TextLink
            href="https://dominikrycharski.com/"
            outside
            className="px-1"
          >
            dominikrycharski.com
          </TextLink>{" "}
          or open an issue on{" "}
          <TextLink
            href="https://github.com/Doryski/package-pulse"
            outside
            className="flex items-center gap-1 px-1"
          >
            <GitHubLogoIcon className="text-black" /> Github repository
          </TextLink>
          .
        </span>
      </div>
      <div className="flex w-1/2 items-center gap-2">
        <span>If you find this project helpful, consider:</span>
        <TextLink
          href="https://www.buymeacoffee.com/doryski"
          outside
          className="inline-flex items-center rounded bg-yellow-400 px-4 py-2 font-bold text-black"
        >
          Buying me a coffee ☕
        </TextLink>
      </div>
    </footer>
  );
};

export default Footer;
