import Tag from "@/components/ui/tag";
import { getChartColorVar } from "@/lib/utils/getChartColor";
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
  const color = getChartColorVar(colorIndex);

  return (
    <Tag
      role="listitem"
      key={project}
      style={{
        border: `2px solid ${error ? "red" : color}`,
        backgroundColor: error ? "hsl(0deg 100% 50% / 25%)" : undefined,
      }}
      onRemove={onRemove}
      removeLabel={`Remove ${project}`}
    >
      {project}
    </Tag>
  );
};

export default ProjectTag;
