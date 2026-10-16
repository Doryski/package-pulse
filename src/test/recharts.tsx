import {
  Children,
  cloneElement,
  isValidElement,
  PropsWithChildren,
  ReactNode,
} from "react";

export const RESPONSIVE_CONTAINER_SIZE = { width: 800, height: 400 } as const;

type SizedChildProps = { width?: number; height?: number };

function withFixedSize(child: ReactNode) {
  if (!isValidElement<SizedChildProps>(child)) return child;
  return cloneElement(child, RESPONSIVE_CONTAINER_SIZE);
}

export function ResponsiveContainerStub({ children }: PropsWithChildren) {
  return (
    <div data-testid="responsive-container" style={RESPONSIVE_CONTAINER_SIZE}>
      {Children.map(children, withFixedSize)}
    </div>
  );
}

type RechartsModule = typeof import("recharts");

export async function mockRecharts(
  importOriginal: () => Promise<RechartsModule>,
) {
  const original = await importOriginal();
  return { ...original, ResponsiveContainer: ResponsiveContainerStub };
}
