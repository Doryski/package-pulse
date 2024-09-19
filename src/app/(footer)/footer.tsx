import TextLink from "@/components/ui/text-link";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const Footer = () => {
  return (
    <footer className="flex flex-col items-start gap-2 border-t border-gray-200 py-4 dark:border-gray-800">
      <span className="inline-flex items-center justify-center sm:flex-wrap md:justify-start">
        Created by Dominik Rycharski (
        <TextLink href="https://github.com/Doryski" className="px-0.5" outside>
          <GitHubLogoIcon className="text-black dark:text-white" /> Doryski
        </TextLink>
        ).
      </span>
      <span className="flex items-end">
        For any questions, bugs or feature requests,
        <br />
        please contact me through the contact form at{" "}
        <TextLink href="https://dominikrycharski.com/" outside className="px-1">
          dominikrycharski.com
        </TextLink>{" "}
        or open an issue on{" "}
        <TextLink
          href="https://github.com/Doryski/package-pulse"
          outside
          className="px-1"
        >
          <GitHubLogoIcon className="text-black dark:text-white" /> Github
          repository
        </TextLink>
        .
      </span>
      <div className="flex items-center gap-2">
        If you find this project helpful, consider supporting me to keep this
        project running:
        <TextLink
          href="https://www.buymeacoffee.com/doryski"
          outside
          className="rounded bg-yellow-400 px-2 py-1 text-black"
        >
          Buy me a coffee ☕
        </TextLink>
      </div>
    </footer>
  );
};

export default Footer;
