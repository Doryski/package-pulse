import clsx from "clsx";

type PulsatingDotIndicatorProps = {
  color: string;
  active?: boolean;
};

const PulsatingDotIndicator = ({
  color,
  active = true,
}: PulsatingDotIndicatorProps) => {
  return (
    <div className="relative size-2.5">
      <div
        className={clsx(
          "size-2.5 rounded-full",
          active && "animate-pulse-dot motion-reduce:animate-none",
        )}
        style={{
          backgroundColor: color,
        }}
      />
      {active && (
        <div
          className="absolute -inset-1/2 size-5 animate-pulse-ring rounded-full motion-reduce:animate-none"
          style={{
            backgroundColor: color,
          }}
        />
      )}
    </div>
  );
};

export default PulsatingDotIndicator;
