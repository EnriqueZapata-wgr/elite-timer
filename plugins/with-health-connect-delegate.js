/**
 * MB-5 Bloque 0.3 — Health Connect: registro del permission delegate (P0).
 *
 * Causa raíz del crash de "CONECTAR Y LEER" (Sentry issue 7634111992):
 * react-native-health-connect exige llamar
 * `HealthConnectPermissionDelegate.setPermissionDelegate(this)` en
 * `MainActivity.onCreate`. Su app.plugin.js SOLO agrega el intent-filter de
 * rationale al manifest — NO toca MainActivity. Sin el registro,
 * `requestPermission()` ejecuta `requestPermission.launch(...)` sobre una
 * `lateinit var` sin inicializar dentro de una corrutina SIN try/catch →
 * `UninitializedPropertyAccessException` nativa → muere el proceso
 * (inatrapable desde JS; el promise nunca se rechaza).
 *
 * Este plugin (corre en prebuild, requiere BUILD nativo):
 *  1. Inyecta el import + setPermissionDelegate(this) en MainActivity.kt.
 *  2. Agrega el activity-alias VIEW_PERMISSION_USAGE / HEALTH_PERMISSIONS
 *     que Android 14+ exige para el link de política de privacidad del
 *     diálogo de permisos de Health Connect.
 */
const { withMainActivity, withAndroidManifest } = require('@expo/config-plugins');

const DELEGATE_IMPORT =
  'import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate';
const DELEGATE_CALL = 'HealthConnectPermissionDelegate.setPermissionDelegate(this)';

function addDelegateToMainActivity(config) {
  return withMainActivity(config, (cfg) => {
    if (cfg.modResults.language !== 'kt') {
      throw new Error(
        '[with-health-connect-delegate] MainActivity no es Kotlin — ajustar el plugin antes de buildear.',
      );
    }
    let src = cfg.modResults.contents;
    if (!src.includes(DELEGATE_IMPORT)) {
      src = src.replace(/^(package .*\r?\n)/, `$1\n${DELEGATE_IMPORT}\n`);
    }
    if (!src.includes(DELEGATE_CALL)) {
      const superOnCreate = /(super\.onCreate\((?:null|savedInstanceState)\))/;
      if (!superOnCreate.test(src)) {
        throw new Error(
          '[with-health-connect-delegate] no encontré super.onCreate en MainActivity — plantilla cambió, ajustar el plugin.',
        );
      }
      src = src.replace(superOnCreate, `$1\n    ${DELEGATE_CALL}`);
    }
    cfg.modResults.contents = src;
    return cfg;
  });
}

function addViewPermissionUsageAlias(config) {
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (!app) return cfg;
    if (!Array.isArray(app['activity-alias'])) app['activity-alias'] = [];
    const yaExiste = app['activity-alias'].some(
      (a) => a?.$?.['android:name'] === 'ViewPermissionUsageActivity',
    );
    if (!yaExiste) {
      app['activity-alias'].push({
        $: {
          'android:name': 'ViewPermissionUsageActivity',
          'android:exported': 'true',
          'android:targetActivity': '.MainActivity',
          'android:permission': 'android.permission.START_VIEW_PERMISSION_USAGE',
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.VIEW_PERMISSION_USAGE' } }],
            category: [{ $: { 'android:name': 'android.intent.category.HEALTH_PERMISSIONS' } }],
          },
        ],
      });
    }
    return cfg;
  });
}

module.exports = function withHealthConnectDelegate(config) {
  return addViewPermissionUsageAlias(addDelegateToMainActivity(config));
};
