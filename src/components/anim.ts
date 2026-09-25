import { useState } from 'react';
import { Animated } from 'react-native';

/** A stable Animated.Value for the component's lifetime. */
export function useAnim(initial: number): Animated.Value {
  const [v] = useState(() => new Animated.Value(initial));
  return v;
}
