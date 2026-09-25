import { Image } from 'expo-image';
import { View } from 'react-native';

import { useData } from '@/store/data';
import { useT } from '@/theme';
import { Icon } from './Icon';
import { Txt } from './ui';

/** The profile picture: Google photo, else the first initial, else a person icon. */
export function Avatar({ size = 52 }: { size?: number }) {
  const { p } = useT();
  const profile = useData((s) => s.profile);
  const initial = (profile.name || profile.email || '').trim().charAt(0).toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.act, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: `inset 0px 0px 0px 1px ${p.ac}` }}>
      {profile.photo ? (
        <Image source={{ uri: profile.photo }} style={{ width: size, height: size }} accessibilityIgnoresInvertColors />
      ) : initial ? (
        <Txt size={size * 0.46} w={500} color={p.acx}>{initial}</Txt>
      ) : (
        <Icon name="user" size={size * 0.46} color={p.acx} />
      )}
    </View>
  );
}
