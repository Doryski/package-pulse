import Tag from "@/components/ui/tag";
import getChartColor from "@/lib/utils/getChartColor";
import { useTheme } from "next-themes";
import { FieldError } from "react-hook-form";

type ProjectTagProps = {
  project: string;
  onRemove: () => void;
  colorIndex: number;
  error: FieldError | undefined;
};

const ProjectTag = ({
  project,
  error,
  onRemove,
  colorIndex,
}: ProjectTagProps) => {
  const { resolvedTheme } = useTheme();
  const color = getChartColor(resolvedTheme, colorIndex);

  return (
    <Tag
      key={project}
      style={{
        border: `2px solid ${error ? "red" : color}`,
        backgroundColor: error ? "hsl(0deg 100% 50% / 25%)" : undefined,
      }}
      onRemove={onRemove}
    >
      {project}
    </Tag>
  );
};

export default ProjectTag;
