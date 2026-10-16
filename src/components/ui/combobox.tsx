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
import { MULTI_SEARCH_DELIMITER } from "@/lib/config/constants";
import useBooleanState from "@/lib/hooks/useBooleanState";
import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";
import {
  KeyboardEvent,
  useCallback,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { Input } from "./input";
import { List, ListEmpty, ListGroup, ListItem, ListLoading } from "./list";

type ComboboxProps<T> = {
  form: UseFormReturn<ProjectsSearchFormValues>;
  disabled: boolean;
  options: T[] | undefined;
  isLoadingOptions: boolean;
  hasOptionsError?: boolean;
  fullwidth?: boolean;
  onSelectItem: (item: string) => void;
  optionValuePredicate: (option: T) => string;
};

export const COMBOBOX_EMPTY_MESSAGES = {
  unavailable: "Search unavailable, press Enter to add by exact name",
  tooShort: "Type at least 2 characters to search",
  noResults: "No project found.",
} as const;

const getEmptyMessage = (searchValue: string, hasOptionsError: boolean) => {
  if (hasOptionsError) return COMBOBOX_EMPTY_MESSAGES.unavailable;
  if (searchValue.length === 1) return COMBOBOX_EMPTY_MESSAGES.tooShort;
  return COMBOBOX_EMPTY_MESSAGES.noResults;
};

const useFocusWhenPageIdle = () => {
  const hasRunRef = useRef(false);

  return useCallback((node: HTMLInputElement | null) => {
    if (!node || hasRunRef.current) return;
    hasRunRef.current = true;
    if (document.activeElement !== document.body) return;
    node.focus();
  }, []);
};

export function Combobox<T>({
  form,
  disabled,
  options,
  isLoadingOptions,
  hasOptionsError = false,
  fullwidth,
  onSelectItem,
  optionValuePredicate,
}: ComboboxProps<T>) {
  const [isPopoverRequested, openPopover, closePopover] =
    useBooleanState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const popoverContentRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const focusWhenPageIdle = useFocusWhenPageIdle();
  const searchValue = useWatch({ control: form.control, name: "search" });
  const selectedProjects = useWatch({
    control: form.control,
    name: "projects",
  });
  const selectedNames = useMemo(
    () => new Set(selectedProjects),
    [selectedProjects],
  );
  const isEmptyVisible = hasOptionsError || options?.length === 0;
  const isPopoverOpen =
    isPopoverRequested && !searchValue.includes(MULTI_SEARCH_DELIMITER);

  const getOptionsElements = useCallback(
    () => popoverContentRef.current?.querySelectorAll("li"),
    [],
  );

  const focusNextOption = useCallback(
    (index: number) => {
      const nextOption = getOptionsElements()?.[index];
      if (nextOption) {
        nextOption.focus();
      }
      setActiveIndex(index);
    },
    [getOptionsElements, setActiveIndex],
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
          activeIndex < (getOptionsElements()?.length ?? 0) - 1
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
      getOptionsElements,
      focusNextOption,
      closePopover,
    ],
  );

  const handleOptionKeyDown = useCallback(
    (e: KeyboardEvent<HTMLLIElement>, option: T) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex =
          activeIndex < (getOptionsElements()?.length ?? 0) - 1
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
      getOptionsElements,
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
                    "relative w-full max-w-full sm:w-(--combobox-width)",
                    fullwidth && "sm:w-full",
                  )}
                >
                  <FormLabel
                    className={cn(
                      "absolute -top-3 left-2 z-10 bg-background px-2 py-1 text-xs text-muted-foreground transition-all",
                      field.value ? "opacity-100" : "opacity-0",
                    )}
                    htmlFor={field.name}
                  >
                    Search projects...
                  </FormLabel>
                  <Input
                    {...field}
                    ref={(node) => {
                      field.ref(node);
                      focusWhenPageIdle(node);
                    }}
                    id={field.name}
                    role="combobox"
                    aria-expanded={isPopoverOpen}
                    aria-controls={listboxId}
                    placeholder="Search projects..."
                    autoComplete="off"
                    className={cn(
                      "w-full max-w-full justify-between sm:w-(--combobox-width)",
                      !field.value && "text-muted-foreground",
                      fullwidth && "sm:w-full",
                    )}
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
              className={cn("max-w-full p-0", !field.value && "hidden")}
              onOpenAutoFocus={(e) => e.preventDefault()}
              ref={popoverContentRef}
            >
              <ListGroup>
                <ListEmpty className={isEmptyVisible ? "block" : "hidden"}>
                  {getEmptyMessage(searchValue, hasOptionsError)}
                </ListEmpty>
                <ListLoading
                  className={isLoadingOptions ? "block" : "hidden"}
                />
                <List role="listbox" id={listboxId}>
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
                        <Check
                          className={cn(
                            "ml-auto size-4",
                            selectedNames.has(optionValue)
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
