import { cn } from "@/lib/utils/cn";

type TextLinkProps = React.AnchorHTMLAttributes<HTMLAnchorElement> & {
  outside?: boolean;
};

const TextLink = ({ children, outside, ...props }: TextLinkProps) => {
  return (
    <a
      target={outside ? "_blank" : undefined}
      rel={outside ? "noopener noreferrer" : undefined}
      {...props}
      className={cn(
        "inline-flex items-center gap-1 text-blue-500 hover:underline",
        props.className,
      )}
    >
      {children}
    </a>
  );
};

export default TextLink;
