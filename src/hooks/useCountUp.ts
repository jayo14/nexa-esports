import { useEffect, useState, useRef } from 'react';

interface UseCountUpOptions {
  end: number;
  duration?: number; // in milliseconds
  start?: number;
}

export const useCountUp = ({ end, duration = 1000, start = 0 }: UseCountUpOptions) => {
  const [count, setCount] = useState(start);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const hasAnimatedRef = useRef(false);

  useEffect(() => {
    // If we have already performed the initial animation round
    // to the first loaded value, snap to the new value immediately.
    if (hasAnimatedRef.current) {
      setCount(end);
      return;
    }

    if (end > 0) {
      hasAnimatedRef.current = true;
    }

    // Reset animation when end value changes
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const progress = timestamp - startTimeRef.current;
      const percentage = Math.min(progress / duration, 1);

      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - percentage, 3);
      const currentCount = start + (end - start) * easeOut;

      setCount(currentCount);

      if (percentage < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [end, duration, start]);

  return count;
};
