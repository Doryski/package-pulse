import { formatSelectionHeading } from "@/lib/utils/projectsLabel";

type SelectionHeadingProps = {
  projects: string[];
};

const SelectionHeading = ({ projects }: SelectionHeadingProps) => {
  if (projects.length === 0) return null;
  return (
    <h1 className="text-center text-3xl font-bold wrap-break-word md:text-4xl">
      {formatSelectionHeading(projects)}
    </h1>
  );
};

export default SelectionHeading;
