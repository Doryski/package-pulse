type DotIndicatorProps = {
  color: string | undefined;
};

const DotIndicator = ({ color }: DotIndicatorProps) => {
  return (
    <span
      className={"size-2 rounded-full"}
      style={{ backgroundColor: color }}
    />
  );
};

export default DotIndicator;
