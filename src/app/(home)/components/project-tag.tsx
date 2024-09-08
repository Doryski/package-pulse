import Tag from "@/components/ui/tag";
import getChartColor from "@/lib/utils/getChartColor";
import { useTheme } from "next-themes";

type ProjectTagProps = {
  project: string;
  onRemove: () => void;
  colorIndex: number;
};

const ProjectTag = ({ project, onRemove, colorIndex }: ProjectTagProps) => {
  const { theme } = useTheme();
  const color = getChartColor(theme, colorIndex);

  return (
    <Tag
      key={project}
      style={{
        border: `2px solid ${color}`,
      }}
      onRemove={onRemove}
    >
      {project}
    </Tag>
  );
};

export default ProjectTag;
