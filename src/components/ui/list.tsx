"use client";

import { cn } from "@/lib/utils";
import { ClassValue } from "class-variance-authority/types";
import * as React from "react";
import { Skeleton } from "./skeleton";

type ListProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLUListElement>,
  HTMLUListElement
>;
const List = ({ className, ...props }: ListProps) => (
  <ul
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
);

type ListEmptyProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;
const ListEmpty = ({ className, ...props }: ListEmptyProps) => (
  <div className={cn("py-6 text-center text-sm", className)} {...props} />
);

type ListGroupProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;
const ListGroup = ({ className, ...props }: ListGroupProps) => (
  <div
    className={cn(
      "overflow-hidden p-1 text-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground",
      className,
    )}
    {...props}
  />
);

type ListSeparatorProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
>;
const ListSeparator = ({ className, ...props }: ListSeparatorProps) => (
  <div className={cn("-mx-1 h-px bg-border", className)} {...props} />
);
type ListItemProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLLIElement>,
  HTMLLIElement
>;
const ListItem = ({ className, ...props }: ListItemProps) => (
  <li
    className={cn(
      `relative flex cursor-default select-none items-center rounded-sm
      px-2 py-1.5 text-sm outline-none
      aria-selected:bg-accent aria-selected:text-accent-foreground
      data-[disabled]:pointer-events-none data-[disabled]:opacity-50
      hover:bg-accent hover:text-accent-foreground`,
      className,
    )}
    {...props}
  />
);

type ListLoadingProps = React.DetailedHTMLProps<
  React.HTMLAttributes<HTMLDivElement>,
  HTMLDivElement
> & {
  itemClassName?: ClassValue;
  length?: number;
};
const ListLoading = ({
  className,
  itemClassName,
  length = 3,
  ...props
}: ListLoadingProps) => (
  <div className={cn("space-y-1", className)} {...props}>
    {Array.from({ length }, (_, i) => (
      <Skeleton key={i} className={cn("h-[1.625rem] w-full", itemClassName)} />
    ))}
  </div>
);

export { List, ListEmpty, ListGroup, ListItem, ListLoading, ListSeparator };
