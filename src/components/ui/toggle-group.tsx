"use client";

import * as ToggleGroupPrimitive from "@radix-ui/react-toggle-group";
import { type VariantProps } from "class-variance-authority";

import { TogglePosition, toggleVariants } from "@/components/ui/toggle";
import { cn } from "@/lib/utils/cn";
import {
  Children,
  ComponentPropsWithoutRef,
  createContext,
  ElementRef,
  forwardRef,
  ReactElement,
  useCallback,
  useContext,
} from "react";

const ToggleGroupContext = createContext<
  VariantProps<typeof toggleVariants> & {
    items: ReactElement<any>[];
  }
>({
  size: "default",
  variant: "default",
  items: [],
});

const ToggleGroup = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Root>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Root> &
    VariantProps<typeof toggleVariants>
>(({ className, variant, size, children, ...props }, ref) => {
  const items = Children.toArray(children) as ReactElement<any>[];

  return (
    <ToggleGroupPrimitive.Root
      ref={ref}
      className={cn("flex items-center justify-center", className)}
      {...props}
    >
      <ToggleGroupContext.Provider value={{ variant, size, items }}>
        {children}
      </ToggleGroupContext.Provider>
    </ToggleGroupPrimitive.Root>
  );
});

ToggleGroup.displayName = ToggleGroupPrimitive.Root.displayName;

const ToggleGroupItem = forwardRef<
  ElementRef<typeof ToggleGroupPrimitive.Item>,
  ComponentPropsWithoutRef<typeof ToggleGroupPrimitive.Item> &
    VariantProps<typeof toggleVariants>
>(({ className, children, variant, size, value, ...props }, ref) => {
  const {
    items,
    variant: contextVariant,
    size: contextSize,
  } = useContext(ToggleGroupContext);
  const index = items.findIndex((item) => item.props.value === value);
  const getPosition = useCallback((): TogglePosition => {
    if (items.length === 1) return "single";
    if (index === 0) return "first";
    if (index === items.length - 1) return "last";
    return "middle";
  }, [index, items]);

  return (
    <ToggleGroupPrimitive.Item
      ref={ref}
      className={cn(
        toggleVariants({
          variant: contextVariant || variant,
          size: contextSize || size,
          position: getPosition(),
        }),
        className,
      )}
      value={value}
      {...props}
    >
      {children}
    </ToggleGroupPrimitive.Item>
  );
});

ToggleGroupItem.displayName = ToggleGroupPrimitive.Item.displayName;

export { ToggleGroup, ToggleGroupItem };
