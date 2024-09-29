"use client";
import { ProjectsSearchFormValues } from "@/app/(home)/components/projects-form/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { cn } from "@/lib/utils/cn";
import { CheckIcon } from "@radix-ui/react-icons";
import { KeyboardEvent, useCallback, useRef, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { Input } from "./input";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./list";

type ComboboxProps<T> = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  disabled: boolean;
  options: T[] | undefined;
  isLoadingOptions: boolean;
  fullwidth?: boolean;
  onSelectItem: (item: string) => void;
  optionValuePredicate: (option: T) => string;
};

export function Combobox<T>({
  form,
  disabled,
  options,
  isLoadingOptions,
  fullwidth,
  onSelectItem,
  optionValuePredicate,
}: ComboboxProps<T>) {
  const [isPopoverOpen, openPopover, closePopover] = useBooleanState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const optionsElements = popoverContentRef.current?.querySelectorAll("li");

  const focusNextOption = useCallback(
    (index: number) => {
      const nextOption = optionsElements?.[index];
      if (nextOption) {
        nextOption.focus();
      }
      setActiveIndex(index);
    },
    [optionsElements, setActiveIndex],
  );

  const handleInputKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "ArrowDown" &&
        isPopoverOpen &&
        e.currentTarget.selectionStart === e.currentTarget.value.length
      ) {
        e.preventDefault();
        const nextIndex =
          activeIndex < (optionsElements?.length ?? 0) - 1
            ? activeIndex + 1
            : 0;
        focusNextOption(nextIndex);
      } else if (e.key === "Tab") {
        closePopover();
      }
    },
    [
      isPopoverOpen,
      activeIndex,
      optionsElements,
      focusNextOption,
      closePopover,
    ],
  );

  const handleOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLLIElement>, option: T) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex =
          activeIndex < (optionsElements?.length ?? 0) - 1
            ? activeIndex + 1
            : activeIndex;
        focusNextOption(nextIndex);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        if (activeIndex === 0) {
          form.setFocus("search");
          setActiveIndex(-1);
        } else {
          const nextIndex = activeIndex > 0 ? activeIndex - 1 : activeIndex;
          focusNextOption(nextIndex);
        }
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelectItem(optionValuePredicate(option));
        closePopover();
      }
    },
    [
      activeIndex,
      optionsElements,
      focusNextOption,
      form,
      onSelectItem,
      optionValuePredicate,
      closePopover,
    ],
  );

  return (
    <FormField
      control={form.control}
      name="search"
      disabled={disabled}
      render={({ field }) => (
        <FormItem className="w-full grow">
          <Popover
            open={isPopoverOpen}
            onOpenChange={(isOpen) => (isOpen ? openPopover() : closePopover())}
          >
            <PopoverTrigger asChild>
              <FormControl>
                <div
                  className={cn(
                    "relative w-full max-w-full sm:w-[var(--combobox-width)]",
                    fullwidth && "sm:w-full",
                  )}
                >
                  <FormLabel
                    className={cn(
                      "absolute -top-3 left-2 z-10 text-xs bg-background py-1 px-2 text-muted-foreground transition-all",
                      field.value ? "opacity-100" : "opacity-0",
                    )}
                    htmlFor={field.name}
                  >
                    Search project...
                  </FormLabel>
                  <Input
                    {...field}
                    id={field.name}
                    role="combobox"
                    placeholder="Search project..."
                    autoComplete="off"
                    className={cn(
                      "w-full sm:w-[var(--combobox-width)] justify-between max-w-full",
                      !field.value && "text-muted-foreground",
                      fullwidth && "sm:w-full",
                    )}
                    autoFocus
                    onChangeCapture={() => {
                      if (field.value) {
                        form.setFocus("search");
                        openPopover();
                      }
                    }}
                    onKeyDown={handleInputKeyDown}
                  />
                </div>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent
              className={cn("p-0 max-w-full", !field.value && "hidden")}
              onOpenAutoFocus={(e) => e.preventDefault()}
              ref={popoverContentRef}
            >
              <ListGroup>
                <ListEmpty
                  className={options?.length === 0 ? "block" : "hidden"}
                >
                  No project found.
                </ListEmpty>
                <ListLoading
                  className={isLoadingOptions ? "block" : "hidden"}
                />
                <List role="listbox">
                  {options?.map((option, index) => {
                    const optionValue = optionValuePredicate(option);
                    return (
                      <ListItem
                        role="option"
                        key={optionValue}
                        onClick={() => onSelectItem(optionValue)}
                        tabIndex={-1}
                        aria-selected={index === activeIndex}
                        onKeyDown={(e) => handleOptionKeyDown(e, option)}
                      >
                        {optionValue}
                        <CheckIcon
                          className={cn(
                            "ml-auto h-4 w-4",
                            form.watch("projects").includes(optionValue)
                              ? "opacity-100"
                              : "opacity-0",
                          )}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              </ListGroup>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}
