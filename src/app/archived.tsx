import { Pressable, View } from 'react-native';

import { Icon } from '@/components/Icon';
import { AppBar, IconBtn, Page, Txt } from '@/components/ui';
import { streakOf } from '@/domain/status';
import { restoreArchived } from '@/store/actions';
import { useData } from '@/store/data';
import { useStreakOpts, useToday } from '@/store/hooks';
import { useUI } from '@/store/ui';
import { useT } from '@/theme';

export default function Archived() {
  const { p } = useT();
  const today = useToday();
  const opts = useStreakOpts();
  const habits = useData((s) => s.habits);
  const log = useData((s) => s.log);
  const arch = habits.filter((h) => h.archived);
  return (
    <Page bar={<AppBar title="Archived" />}>
      {arch.map((h) => (
        <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingLeft: 20, paddingRight: 12 }}>
          <Icon name={h.icon} size={19} color={p.tx} />
          <View style={{ flex: 1 }}>
            <Txt size={13.5} w={500}>{h.name}</Txt>
            <Txt size={11} color={p.mu}>Best streak {streakOf(h, log, today, opts).best} days · history kept</Txt>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={'Restore ' + h.name} onPress={() => restoreArchived(h.id)} style={{ height: 36, paddingHorizontal: 10, borderWidth: 1, borderColor: p.ln2, borderRadius: 14, justifyContent: 'center' }}>
            <Txt size={11.5} w={500}>Restore</Txt>
          </Pressable>
          <IconBtn icon="trash" label={'Delete ' + h.name} size={15.5} color={p.acx} style={{ width: 40, height: 40 }} onPress={() => useUI.getState().openDialog({ k: 'delete', id: h.id })} />
        </View>
      ))}
      {!arch.length && (
        <View style={{ paddingVertical: 32, paddingHorizontal: 20, gap: 6 }}>
          <Txt size={20} w={500}>Nothing archived.</Txt>
          <Txt size={12.5} lh={1.5} color={p.mu}>Archive a habit you’re done with to keep its history without seeing it every day.</Txt>
        </View>
      )}
    </Page>
  );
}
