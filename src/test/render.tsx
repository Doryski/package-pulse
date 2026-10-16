import {
  ProjectsSearchFormSchema,
  ProjectsSearchFormValues,
} from "@/app/(home)/components/projects-form/schema";
import { TooltipProvider } from "@/components/ui/tooltip";
import { zodResolver } from "@hookform/resolvers/zod";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, RenderOptions } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemeProvider } from "next-themes";
import {
  createRef,
  PropsWithChildren,
  ReactElement,
  RefObject,
  useImperativeHandle,
} from "react";
import { FormProvider, useForm, UseFormReturn } from "react-hook-form";

const DEFAULT_FORM_VALUES = {
  search: "",
  projects: [],
} as const satisfies ProjectsSearchFormValues;

type ProvidersProps = PropsWithChildren<{ queryClient: QueryClient }>;

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

function Providers({ queryClient, children }: ProvidersProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class">
        <TooltipProvider>{children}</TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export type RenderWithProvidersOptions = Omit<RenderOptions, "wrapper"> & {
  queryClient?: QueryClient;
};

export function renderWithProviders(
  ui: ReactElement,
  {
    queryClient = createTestQueryClient(),
    ...options
  }: RenderWithProvidersOptions = {},
) {
  const user = userEvent.setup();
  const wrapper = ({ children }: PropsWithChildren) => (
    <Providers queryClient={queryClient}>{children}</Providers>
  );
  return { ...render(ui, { wrapper, ...options }), queryClient, user };
}

type ProjectsSearchForm = UseFormReturn<ProjectsSearchFormValues>;

type FormHostProps = PropsWithChildren<{
  defaultValues: Partial<ProjectsSearchFormValues>;
  formRef: RefObject<ProjectsSearchForm | null>;
}>;

function FormHost({ defaultValues, formRef, children }: FormHostProps) {
  const form = useForm<ProjectsSearchFormValues>({
    resolver: zodResolver(ProjectsSearchFormSchema),
    defaultValues: { ...DEFAULT_FORM_VALUES, ...defaultValues },
  });
  useImperativeHandle(formRef, () => form, [form]);
  return <FormProvider {...form}>{children}</FormProvider>;
}

export function renderWithForm(
  ui: ReactElement,
  defaultValues: Partial<ProjectsSearchFormValues> = {},
  options: RenderWithProvidersOptions = {},
) {
  const formRef = createRef<ProjectsSearchForm>();
  const result = renderWithProviders(
    <FormHost defaultValues={defaultValues} formRef={formRef}>
      {ui}
    </FormHost>,
    options,
  );
  const form = formRef.current;
  if (!form) throw new Error("renderWithForm: form was not initialised");
  return { ...result, form };
}
