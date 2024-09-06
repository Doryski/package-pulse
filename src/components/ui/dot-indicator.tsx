type DotIndicatorProps = {
  color: string | undefined;
};

const DotIndicator = ({ color }: DotIndicatorProps) => {
  return (
    <span
      className={"h-2 w-2 rounded-full"}
      style={{ backgroundColor: color }}
    />
  );
};

export default DotIndicator;
