type LoaderProps = {
  children: React.ReactNode;
  isLoading: boolean;
  fallback: React.ReactNode;
};

export default function Loader({ children, isLoading, fallback }: LoaderProps) {
  if (isLoading) return fallback;
  return children;
}
