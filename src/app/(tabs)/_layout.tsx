import { Redirect, Tabs } from 'expo-router';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/Icon';
import { Txt } from '@/components/ui';
import { useData } from '@/store/data';
import { useT } from '@/theme';
import { alpha } from '@/theme/color';

const NAV: Record<string, { label: string; icon: string }> = {
  index: { label: 'Today', icon: 'check-square' },
  routines: { label: 'Routines', icon: 'repeat' },
  insights: { label: 'Insights', icon: 'chart-bar' },
  you: { label: 'You', icon: 'user' },
};

type BarProps = { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (name: string) => void; emit: (e: { type: 'tabPress'; target: string; canPreventDefault: true }) => { defaultPrevented: boolean } } };

function TabBar({ state, navigation }: BarProps) {
  const { p } = useT();
  const ins = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={{ height: 72 + ins.bottom, paddingBottom: ins.bottom, flexDirection: 'row', backgroundColor: p.navBg }}>
      {state.routes.map((r, i) => {
        const cur = state.index === i;
        const n = NAV[r.name];
        if (!n) return null;
        return (
          <Pressable
            key={r.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: cur }}
            accessibilityLabel={n.label}
            onPress={() => {
              const e = navigation.emit({ type: 'tabPress', target: r.key, canPreventDefault: true });
              if (!cur && !e.defaultPrevented) navigation.navigate(r.name);
            }}
            style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 4 }}
          >
            <View style={{ width: 56, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: cur ? p.act : 'transparent', boxShadow: cur ? `inset 0px 0px 0px 1px ${alpha(p.ac, 0.4)}` : undefined }}>
              <Icon name={n.icon} size={20} color={cur ? p.acx : p.mu} />
            </View>
            <Txt size={11.5} w={cur ? 600 : 500} color={cur ? p.acx : p.mu}>{n.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabsLayout() {
  const { p } = useT();
  const onboarded = useData((s) => s.onboarded);
  if (!onboarded) return <Redirect href="/welcome" />;
  return (
    <Tabs screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: p.bg }, animation: 'none' }} tabBar={(props) => <TabBar {...(props as unknown as BarProps)} />}>
      <Tabs.Screen name="index" />
      <Tabs.Screen name="routines" />
      <Tabs.Screen name="insights" />
      <Tabs.Screen name="you" />
    </Tabs>
  );
}
