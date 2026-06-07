// ============================================================
// module-fields.js — Field Definitions for Production Modules
// ============================================================
// ============================================================
// MODULE FIELD DEFINITIONS
// ============================================================
function getModuleFields(mod) {
  switch (mod) {
    case 'rawMaterials':
      return [
        {
          key: 'supplier', labelKey: 'rm_supplier', type: 'select', required: true,
          options: SUPPLIERS_RAW.map(s => ({ value: s, labelKey: s }))
        },
        { key: 'date', labelKey: 'rm_receiveDate', type: 'date', required: true, default: todayStr() },
        {
          key: 'category', labelKey: 'rm_category', type: 'select', required: true,
          options: CATEGORIES.map(c => ({ value: c, labelKey: c }))
        },
        { key: 'item', labelKey: 'rm_item', type: 'cascading-select', required: true, parentKey: 'category' },
        { key: 'weight', labelKey: 'rm_weight', type: 'number', required: true, step: '0.01', min: 0 },
        { key: 'expiry', labelKey: 'rm_expiry', type: 'date' },
        { key: 'tithing', labelKey: 'rm_tithing', type: 'toggle' },
        { key: 'healthCert', labelKey: 'rm_healthCert', type: 'toggle' },
        { key: 'kosher', labelKey: 'rm_kosher', type: 'toggle' },
      ];

    case 'dateReceiving':
      return [
        {
          key: 'supplier', labelKey: 'dr_supplier', type: 'select', required: true,
          options: SUPPLIERS_DATES.map(s => ({ value: s, labelKey: s }))
        },
        { key: 'date', labelKey: 'dr_receiveDate', type: 'date', required: true, default: todayStr() },
        { key: 'weight', labelKey: 'dr_weight', type: 'number', required: true, step: '0.1', min: 0 },
        { key: 'tithing', labelKey: 'dr_tithing', type: 'toggle' },
        {
          key: 'expiryPeriod', labelKey: 'dr_expiryPeriod', type: 'select',
          options: [
            { value: '1year', labelKey: 'dr_expiryPeriod_1year' },
            { value: 'custom', labelKey: 'dr_expiryPeriod_custom' },
          ]
        },
      ];

    case 'fermentation':
      return [
        { key: 'date', labelKey: 'fm_date', type: 'date', required: true, default: todayStr() },
        {
          key: 'tankSize', labelKey: 'fm_tankSize', type: 'select', required: true, noCustom: true,
          options: TANK_SIZES.map(s => ({ value: String(s), label: s + ' L' }))
        },
        { key: 'datesCrates', labelKey: 'fm_datesCrates', type: 'number', required: true, step: '1', min: '0' },
        { key: 'temperature', labelKey: 'fm_temperature', type: 'number', step: '0.1' },
        { key: 'sugar', labelKey: 'fm_sugar', type: 'number', step: '0.1' },
        { key: 'ph', labelKey: 'fm_ph', type: 'number', step: '0.01', min: 0, max: 14 },
        { key: 'sentToDistillation', labelKey: 'fm_sentToDistillation', type: 'toggle' },
      ];

    case 'distillation1':
      return [
        { key: 'date', labelKey: 'd1_date', type: 'date', required: true, default: todayStr() },
        {
          key: 'type', labelKey: 'd1_type', type: 'select', required: true,
          options: D1_TYPES.map(t => ({ value: t, labelKey: t }))
        },
        {
          key: 'stillName', labelKey: 'd1_stillName', type: 'select', required: true,
          options: STILL_NAMES.map(s => ({ value: s, labelKey: s }))
        },
        { key: 'fermDate', labelKey: 'd1_fermDate', type: 'date' },
        { key: 'distQty', labelKey: 'd1_distQty', type: 'number', step: '0.1' },
        { key: 'initAlcohol', labelKey: 'd1_initAlcohol', type: 'number', step: '0.1', min: 0, max: 100 },
        { key: 'finalAlcohol', labelKey: 'd1_finalAlcohol', type: 'number', step: '0.1', min: 0, max: 100 },
        { key: 'temp', labelKey: 'd1_temp', type: 'number', step: '0.1', default: '99.9' },
        { key: 'timeRange', labelKey: 'd1_timeRange', type: 'time-range' },
        { key: 'distilledQty', labelKey: 'd1_distilledQty', type: 'number', required: true, step: '0.1' },
      ];

    case 'distillation2':
      return [
        { key: 'date', labelKey: 'd2_date', type: 'date', required: true, default: todayStr() },
        {
          key: 'productType', labelKey: 'd2_productType', type: 'select', required: true,
          options: D2_PRODUCT_TYPES.map(t => ({ value: t, labelKey: t }))
        },
        { key: 'd1Dates', labelKey: 'd2_d1Dates', type: 'text', placeholder: 'e.g. 1.1 / 2.1 / 5.1' },
        { key: 'batchNumber', labelKey: 'd2_batchNumber', type: 'text', required: true, placeholder: 'e.g. E51, A102, G7' },
        { key: 'initAlcohol', labelKey: 'd2_initAlcohol', type: 'number', step: '0.1', min: 0, max: 100 },
        { key: 'headSep', labelKey: 'd2_headSep', type: 'toggle', default: true },
        { key: 'tailAlcohol', labelKey: 'd2_tailAlcohol', type: 'number', step: '0.01', default: '0.55' },
        { key: 'temp', labelKey: 'd2_temp', type: 'number', step: '0.1', default: '99.9' },
        { key: 'timeRange', labelKey: 'd2_timeRange', type: 'time-range' },
        { key: 'quantity', labelKey: 'd2_quantity', type: 'number', required: true, step: '0.1' },
        { key: 'd1InputQty', labelKey: 'd2_d1InputQty', type: 'number', step: '0.1', min: 0 },
      ];

    case 'bottling':
      return [
        {
          key: 'drinkType', labelKey: 'bt_drinkType', type: 'select', required: true,
          options: DRINK_TYPES.map(t => ({ value: t, labelKey: t }))
        },
        { key: 'date', labelKey: 'bt_bottlingDate', type: 'date', required: true, default: todayStr() },
        { key: 'batchNumber', labelKey: 'bt_batchNumber', type: 'text', required: true, placeholder: 'e.g. E51, A102' },
        { key: 'barrelNumber', labelKey: 'bt_barrelNumber', type: 'text', placeholder: 'e.g. B1, B2' },
        { key: 'd2Date', labelKey: 'bt_d2Date', type: 'date' },
        { key: 'alcohol', labelKey: 'bt_alcohol', type: 'number', required: true, step: '0.001', min: 0, max: 1, hint: '0.40 = 40%' },
        { key: 'filtered', labelKey: 'bt_filtered', type: 'toggle' },
        {
          key: 'color', labelKey: 'bt_color', type: 'select', noCustom: true,
          options: [
            { value: 'normal', labelKey: 'normal' },
            { value: 'abnormal', labelKey: 'abnormal' },
          ]
        },
        {
          key: 'taste', labelKey: 'bt_taste', type: 'select', noCustom: true,
          options: [
            { value: 'normal', labelKey: 'normal' },
            { value: 'abnormal', labelKey: 'abnormal' },
          ]
        },
        { key: 'contaminants', labelKey: 'bt_contaminants', type: 'toggle' },
        { key: 'bottleCount', labelKey: 'bt_bottleCount', type: 'number', required: true, min: 0 },
        { key: 'd2InputQty', labelKey: 'bt_d2InputQty', type: 'number', step: '0.1', min: 0 },
        ...(hasPermission('canApproveBottling') ? [
          { key: 'decision', labelKey: 'bt_decision', type: 'decision', required: true },
        ] : []),
      ];

    default:
      return [];
  }
}
