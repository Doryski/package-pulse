import TextLink from "@/components/ui/text-link";
import { links } from "@/lib/config/constants";
import { GitHubLogoIcon } from "@radix-ui/react-icons";

const Footer = () => {
  return (
    <footer className="mt-4 flex flex-col items-start gap-2 border-t border-gray-200 py-4 text-sm dark:border-gray-800 md:mt-8 md:text-base">
      <p className="inline">
        Developed by Dominik Rycharski (
        <TextLink
          href={links.githubProfile}
          className="inline-flex items-center px-0.5"
          outside
        >
          <GitHubLogoIcon className="mr-1 text-black dark:text-white" />
          <span>Doryski</span>
        </TextLink>
        )
      </p>
      <p className="inline">
        For inquiries, bug reports, or feature requests, please use the contact
        form at{" "}
        <TextLink href={links.personalWebsite} outside className="inline">
          dominikrycharski.com
        </TextLink>{" "}
        or submit an issue on{" "}
        <TextLink
          href={links.githubRepository}
          outside
          className="inline-flex items-center"
        >
          <GitHubLogoIcon className="mr-1 text-black dark:text-white" /> GitHub
          repository
        </TextLink>
      </p>
    </footer>
  );
};

export default Footer;
