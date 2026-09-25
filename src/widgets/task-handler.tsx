import { requestWidgetUpdate, type WidgetTaskHandlerProps } from 'react-native-android-widget';

import { todayKey } from '@/domain/dates';
import { isDoneOn } from '@/domain/status';
import { increment, toggle } from '@/store/actions';
import { getData, useData } from '@/store/data';
import { widgetModel } from './model';
import { renderWidget, WIDGETS } from './widgets';

/** Runs headless when a widget is added, updated or tapped. Taps write straight to local storage. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  await useData.persist.rehydrate();
  if (props.widgetAction === 'WIDGET_DELETED') return;
  if (props.widgetAction === 'WIDGET_CLICK' && props.clickAction === 'LOG') {
    const id = String(props.clickActionData?.id ?? '');
    const d = getData();
    const h = d.habits.find((x) => x.id === id);
    const today = todayKey();
    if (h) {
      if (h.type === 'qty') increment(id, 1, { quiet: true });
      else if (!isDoneOn(h, d.log, today, today)) toggle(id, { quiet: true });
    }
    // Keep the other widgets in step with the change.
    await refreshWidgets();
  }
  props.renderWidget(renderWidget(props.widgetInfo.widgetName, widgetModel(getData())));
}

export async function refreshWidgets() {
  const m = widgetModel(getData());
  await Promise.all(WIDGETS.map((name) => requestWidgetUpdate({ widgetName: name, renderWidget: () => renderWidget(name, m), widgetNotFound: () => undefined }).catch(() => undefined)));
}
