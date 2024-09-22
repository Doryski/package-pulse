import TextLink from "@/components/ui/text-link";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const Footer = () => {
  return (
    <footer className="mt-4 flex flex-col items-start gap-2 border-t border-gray-200 py-4 text-sm dark:border-gray-800 md:mt-8 md:text-base">
      <p className="inline">
        Created by Dominik Rycharski (
        <TextLink
          href="https://github.com/Doryski"
          className="inline-flex px-0.5"
          outside
        >
          <GitHubLogoIcon className="text-black dark:text-white" />
          <span>Doryski</span>
        </TextLink>
        ).
      </p>
      <p className="inline">
        For any questions, bugs or feature requests, please contact me through
        the contact form at{" "}
        <TextLink
          href="https://dominikrycharski.com/"
          outside
          className="inline px-1"
        >
          dominikrycharski.com
        </TextLink>{" "}
        or open an issue on{" "}
        <TextLink
          href="https://github.com/Doryski/package-pulse"
          outside
          className="inline-flex items-center px-1"
        >
          <GitHubLogoIcon className="text-black dark:text-white" /> Github
          repository
        </TextLink>
        .
      </p>
      <div className="flex w-full flex-col items-start lg:flex-row lg:items-center">
        <p className="inline">
          If you find this project helpful, consider supporting me to keep this
          project running:
        </p>
        <TextLink
          href="https://www.buymeacoffee.com/doryski"
          outside
          className="mx-auto mt-1 inline-block rounded bg-yellow-400 px-2 py-1 text-black lg:ml-2 lg:mr-0"
        >
          Buy me a coffee ☕
        </TextLink>
      </div>
    </footer>
  );
};

export default Footer;
