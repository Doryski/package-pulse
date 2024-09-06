import { GitHubLogoIcon } from "@radix-ui/react-icons";
import TextLink from "./ui/text-link";

const Footer = () => {
  return (
    <footer className="flex items-center justify-between border-t border-gray-200 py-8">
      <div className="flex flex-col">
        <span className="flex items-center">
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
        <span className="flex items-center">
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
      <div className="flex flex-col items-end">
        <span className="mb-2">If you find this project helpful:</span>
        <TextLink
          href="https://www.buymeacoffee.com/doryski"
          outside
          className="inline-flex items-center bg-yellow-400 text-black px-4 py-2 rounded font-bold"
        >
          Buy me a coffee ☕
        </TextLink>
      </div>
    </footer>
  );
};

export default Footer;
