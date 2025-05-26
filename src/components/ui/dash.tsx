import { HTMLAttributes } from "react";

type DashProps = HTMLAttributes<HTMLDivElement>;
export default function Dash(props: DashProps) {
  return (
    <div
      className="h-px w-3 border-t border-dashed border-[--color-border]"
      style={props.style}
      {...props}
    />
  );
}
