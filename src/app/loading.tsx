import Favicon from "@/components/favicon";

const Loading = () => {
  return (
    <div className="flex h-screen items-center justify-center">
      <div className="animate-pulse">
        <Favicon />
      </div>
    </div>
  );
};

export default Loading;
