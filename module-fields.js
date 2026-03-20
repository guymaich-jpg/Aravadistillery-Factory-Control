// ============================================================
// module-fields.js — Module field definitions & sync field maps
// ============================================================

// Field definitions used by syncModuleToSheets (bypasses permission filter)
const ALL_MODULE_SYNC_FIELDS = {
  rawMaterials: [
    { key: 'date', labelKey: 'rm_receiveDate' },
    { key: 'supplier', labelKey: 'rm_supplier' },
    { key: 'category', labelKey: 'rm_category' },
    { key: 'item', labelKey: 'rm_item' },
    { key: 'weight', labelKey: 'rm_weight' },
    { key: 'unit', labelKey: 'rm_unit' },
    { key: 'expiry', labelKey: 'rm_expiry' },
    { key: 'tithing', labelKey: 'rm_tithing' },
    { key: 'healthCert', labelKey: 'rm_healthCert' },
    { key: 'kosher', labelKey: 'rm_kosher' },
  ],
  dateReceiving: [
    { key: 'date', labelKey: 'dr_receiveDate' },
    { key: 'supplier', labelKey: 'dr_supplier' },
    { key: 'weight', labelKey: 'dr_weight' },
    { key: 'tithing', labelKey: 'dr_tithing' },
    { key: 'expiryPeriod', labelKey: 'dr_expiryPeriod' },
    { key: 'qtyInDate', labelKey: 'dr_qtyInDate' },
  ],
  fermentation: [
    { key: 'date', labelKey: 'fm_date' },
    { key: 'tankSize', labelKey: 'fm_tankSize' },
    { key: 'datesCrates', labelKey: 'fm_datesCrates' },
    { key: 'temperature', labelKey: 'fm_temperature' },
    { key: 'sugar', labelKey: 'fm_sugar' },
    { key: 'ph', labelKey: 'fm_ph' },
    { key: 'sentToDistillation', labelKey: 'fm_sentToDistillation' },
  ],
  distillation1: [
    { key: 'date', labelKey: 'd1_date' },
    { key: 'type', labelKey: 'd1_type' },
    { key: 'stillName', labelKey: 'd1_stillName' },
    { key: 'fermDate', labelKey: 'd1_fermDate' },
    { key: 'distQty', labelKey: 'd1_distQty' },
    { key: 'initAlcohol', labelKey: 'd1_initAlcohol' },
    { key: 'finalAlcohol', labelKey: 'd1_finalAlcohol' },
    { key: 'temp', labelKey: 'd1_temp' },
    { key: 'timeRange', labelKey: 'd1_timeRange' },
    { key: 'distilledQty', labelKey: 'd1_distilledQty' },
  ],
  distillation2: [
    { key: 'date', labelKey: 'd2_date' },
    { key: 'productType', labelKey: 'd2_productType' },
    { key: 'd1Dates', labelKey: 'd2_d1Dates' },
    { key: 'batchNumber', labelKey: 'd2_batchNumber' },
    { key: 'initAlcohol', labelKey: 'd2_initAlcohol' },
    { key: 'headSep', labelKey: 'd2_headSep' },
    { key: 'tailAlcohol', labelKey: 'd2_tailAlcohol' },
    { key: 'temp', labelKey: 'd2_temp' },
    { key: 'timeRange', labelKey: 'd2_timeRange' },
    { key: 'quantity', labelKey: 'd2_quantity' },
    { key: 'd1InputQty', labelKey: 'd2_d1InputQty' },
  ],
  bottling: [
    { key: 'date', labelKey: 'bt_bottlingDate' },
    { key: 'drinkType', labelKey: 'bt_drinkType' },
    { key: 'batchNumber', labelKey: 'bt_batchNumber' },
    { key: 'barrelNumber', labelKey: 'bt_barrelNumber' },
    { key: 'd2Date', labelKey: 'bt_d2Date' },
    { key: 'alcohol', labelKey: 'bt_alcohol' },
    { key: 'filtered', labelKey: 'bt_filtered' },
    { key: 'color', labelKey: 'bt_color' },
    { key: 'taste', labelKey: 'bt_taste' },
    { key: 'contaminants', labelKey: 'bt_contaminants' },
    { key: 'bottleCount', labelKey: 'bt_bottleCount' },
    { key: 'd2InputQty', labelKey: 'bt_d2InputQty' },
    { key: 'decision', labelKey: 'bt_decision' },
  ],
};

// Dropdown fields per module for sync formatting
const SYNC_DROPDOWN_FIELDS = {
  rawMaterials: { supplier: SUPPLIERS_RAW, category: CATEGORIES, unit: null },
  dateReceiving: { supplier: SUPPLIERS_DATES },
  fermentation: {},
  distillation1: { type: D1_TYPES, stillName: STILL_NAMES },
  distillation2: { productType: D2_PRODUCT_TYPES },
  bottling: { drinkType: DRINK_TYPES, filtered: null, color: null, taste: null, decision: null },
};

// Module form field definitions (UI-facing, permission-aware)
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
        { key: 'qtyInDate', labelKey: 'dr_qtyInDate', type: 'number', step: '1', min: 0 },
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
        { key: 'alcohol', labelKey: 'bt_alcohol', type: 'number', required: true, step: '0.001', min: 0, max: 1 },
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
