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
        {...(outside ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        {...props}
      >
        {children}
      </a>
    );
  },
);

TextLink.displayName = "TextLink";

export default TextLink;
