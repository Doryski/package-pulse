import TextLink from "@/components/ui/text-link";
import { links } from "@/lib/config/constants";
import { GithubIcon } from "@/components/icons/brand-icons";

const Footer = () => {
  return (
    <footer className="mt-4 flex flex-col items-start gap-2 border-t border-gray-200 py-4 text-sm md:mt-8 md:text-base dark:border-gray-800">
      <p className="inline">
        Developed by Dominik Rycharski (
        <TextLink href={links.githubProfile} className="px-0.5" outside>
          <GithubIcon className="mr-1 inline-block size-4 align-[-0.125em] text-black dark:text-white" />
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
        <TextLink href={links.githubRepository} outside>
          <GithubIcon className="mr-1 inline-block size-4 align-[-0.125em] text-black dark:text-white" />
          GitHub repository
        </TextLink>
      </p>
    </footer>
  );
};

export default Footer;
