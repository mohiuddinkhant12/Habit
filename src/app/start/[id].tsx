import { Redirect, useLocalSearchParams } from 'expo-router';

import { startTimer } from '@/store/actions';

/** Deep link from the Today widget's ▶ button: habitflow://start/<habitId>. */
export default function StartTimer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  if (id) startTimer(id);
  return <Redirect href="/timer" />;
}
