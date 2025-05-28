import { useEffect, useRef } from "react";

type PerformanceMetrics = {
  componentName: string;
  renderTime: number;
  timestamp: number;
};

const performanceLog: PerformanceMetrics[] = [];

export function usePerformanceMonitor(componentName: string) {
  const renderStartTime = useRef<number>(performance.now());
  renderStartTime.current = performance.now();

  useEffect(() => {
    const renderEndTime = performance.now();
    const renderTime = renderEndTime - renderStartTime.current;

    const metrics: PerformanceMetrics = {
      componentName,
      renderTime,
      timestamp: Date.now(),
    };

    performanceLog.push(metrics);

    // Keep only last 100 entries
    if (performanceLog.length > 100) {
      performanceLog.shift();
    }

    // Log slow renders (> 16ms for 60fps)
    if (renderTime > 16) {
      console.warn(
        `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`,
      );
    }
  });

  return {
    getPerformanceLog: () => [...performanceLog],
    clearPerformanceLog: () => (performanceLog.length = 0),
  };
}
