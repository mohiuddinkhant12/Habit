import 'expo-router/entry';

import { Platform } from 'react-native';
import { registerWidgetTaskHandler } from 'react-native-android-widget';

import { registerBackgroundActions } from '@/services/notifications';
import { widgetTaskHandler } from '@/widgets/task-handler';

// Both must be registered at module scope so Android can run them headless.
if (Platform.OS === 'android') {
  registerWidgetTaskHandler(widgetTaskHandler);
  registerBackgroundActions();
}
