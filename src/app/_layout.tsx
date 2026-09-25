import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, useFonts } from '@expo-google-fonts/inter';
import { SplashScreen, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { DialogHost, MilestoneOverlay, SheetHost, Snackbar } from '@/components/overlays';
import { useBackgroundSync } from '@/services/sync';
import { useData } from '@/store/data';
import { ThemeProvider, useT } from '@/theme';

SplashScreen.preventAutoHideAsync();

const isHydrated = () => useData.persist.hasHydrated();
const onHydrated = (cb: () => void) => useData.persist.onFinishHydration(cb);

function useHydrated() {
  return useSyncExternalStore(onHydrated, isHydrated, isHydrated);
}

export default function RootLayout() {
  const [fonts] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold });
  const hydrated = useHydrated();
  const ready = fonts && hydrated;
  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);
  if (!ready) return null;
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Shell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function Shell() {
  const { p, reduceMotion } = useT();
  useBackgroundSync();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(p.bg).catch(() => undefined);
  }, [p.bg]);
  const slide = reduceMotion ? 'none' : 'slide_from_right';
  const up = reduceMotion ? 'none' : 'slide_from_bottom';
  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <StatusBar style={p.name === 'Dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg }, animation: slide }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="welcome" options={{ animation: reduceMotion ? 'none' : 'fade', gestureEnabled: false }} />
        <Stack.Screen name="habit/form" options={{ animation: up }} />
        <Stack.Screen name="timer" options={{ animation: up }} />
        <Stack.Screen name="routine/new" options={{ animation: up }} />
        <Stack.Screen name="routine/run/[id]" options={{ animation: up }} />
        <Stack.Screen name="review" options={{ animation: up }} />
        <Stack.Screen name="search" options={{ animation: reduceMotion ? 'none' : 'fade' }} />
      </Stack>
      <Snackbar />
      <SheetHost />
      <DialogHost />
      <MilestoneOverlay />
    </View>
  );
}
