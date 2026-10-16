import { cn } from "@/lib/utils/cn";
import { forwardRef } from "react";

type TextLinkProps = {
  outside?: boolean;
} & React.AnchorHTMLAttributes<HTMLAnchorElement>;

const TextLink = forwardRef<HTMLAnchorElement, TextLinkProps>(
  ({ className, outside, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "hover:underline hover:opacity-80 transition-opacity",
          className,
        )}
        {...props}
        {...(outside ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      >
        {children}
      </a>
    );
  },
);

TextLink.displayName = "TextLink";

export default TextLink;
