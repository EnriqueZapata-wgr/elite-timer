/**
 * Entry custom (MB-32). Antes: "main": "expo-router/entry" directo.
 *
 * El HeadlessJsTaskService de los widgets (AtpWidgetActionService) arranca
 * este bundle SIN Activity y busca su tarea por nombre en AppRegistry — el
 * registro tiene que vivir en el entry, no en un componente que solo se
 * evalúa al renderizar. La tarea drena la cola de taps del widget por los
 * writers canónicos (candado MB-32 pieza 0).
 */
import { AppRegistry, Platform } from 'react-native';
import 'expo-router/entry';

if (Platform.OS === 'android') {
  AppRegistry.registerHeadlessTask(
    'AtpWidgetActions',
    () => require('./src/services/widgets/widget-actions').runWidgetActionsTask,
  );
}
