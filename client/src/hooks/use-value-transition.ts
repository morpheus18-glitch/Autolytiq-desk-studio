import { useEffect, useState, useRef } from 'react';

interface UseValueTransitionOptions {
  duration?: number;
  precision?: number;
}

export function useValueTransition(
  targetValue: number,
  options: UseValueTransitionOptions = {}
) {
  const { duration = 200, precision = 2 } = options;
  const [displayValue, setDisplayValue] = useState(targetValue);
  const frameRef = useRef<number>();
  const startTimeRef = useRef<number | null>(null);
  const startValueRef = useRef(targetValue);
  const targetValueRef = useRef(targetValue);
  
  useEffect(() => {
    // Target hasn't changed, no animation needed
    if (targetValue === targetValueRef.current) return;
    
    // Cancel any in-progress animation
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
    
    // Set up new animation
    targetValueRef.current = targetValue;
    startValueRef.current = displayValue;
    startTimeRef.current = performance.now();
    
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return;
      
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth deceleration (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      
      const current = startValueRef.current + (targetValueRef.current - startValueRef.current) * eased;
      setDisplayValue(current);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        // Snap to exact target value
        setDisplayValue(targetValueRef.current);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [targetValue, duration]); // Only depend on targetValue and duration
  
  return parseFloat(displayValue.toFixed(precision));
}
