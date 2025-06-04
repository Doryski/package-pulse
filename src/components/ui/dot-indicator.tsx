type DotIndicatorProps = {
  color: string | undefined;
};

const DotIndicator = ({ color }: DotIndicatorProps) => {
  return (
    <span
      className="size-3 rounded-full md:size-4"
      style={{ backgroundColor: color }}
    />
  );
};

export default DotIndicator;
