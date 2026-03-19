/**
 * Seed script — populates factory_quickAccess collection in Firestore
 * with all current criteria and items from the factory control app.
 *
 * Usage:
 *   npx ts-node backend/scripts/seed-quick-access.ts
 *
 * Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 * environment variables (same as Vercel backend).
 */

import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const db = admin.firestore();
const COLLECTION = 'factory_quickAccess';

interface CriterionSeed {
  criterion: string;
  label: string;
  items: { key: string; label: string }[];
}

const SEED_DATA: CriterionSeed[] = [
  {
    criterion: 'suppliers_raw',
    label: 'Raw Materials Suppliers',
    items: [
      { key: 'sup_tamartushka', label: 'Tamartushka' },
      { key: 'sup_nichuchot', label: 'Nichuchot Argaman' },
      { key: 'sup_iherb', label: 'I-HERB' },
      { key: 'sup_shlr', label: 'SH.L.R' },
      { key: 'sup_pcsi', label: 'PCSI' },
      { key: 'sup_yakev', label: 'Yakev HaEla' },
      { key: 'sup_selfHarvest', label: 'Self-harvest' },
      { key: 'sup_other', label: 'Other' },
    ],
  },
  {
    criterion: 'suppliers_dates',
    label: 'Date Receiving Suppliers',
    items: [
      { key: 'sup_gamliel', label: 'Gamliel' },
      { key: 'sup_lara', label: 'Lara' },
      { key: 'sup_selfHarvest', label: 'Self-harvest' },
      { key: 'sup_other', label: 'Other' },
    ],
  },
  {
    criterion: 'categories',
    label: 'Raw Material Categories',
    items: [
      { key: 'rm_cat_spices', label: 'Spices' },
      { key: 'rm_cat_labels', label: 'Labels' },
      { key: 'rm_cat_packaging', label: 'Packaging' },
    ],
  },
  {
    criterion: 'items_spices',
    label: 'Spice Items',
    items: [
      { key: 'anise_seeds', label: 'Anise Seeds' },
      { key: 'star_anise', label: 'Star Anise' },
      { key: 'licorice', label: 'Licorice' },
      { key: 'juniper', label: 'Juniper' },
      { key: 'cardamom', label: 'Cardamom' },
      { key: 'cinnamon', label: 'Cinnamon' },
      { key: 'chamomile', label: 'Chamomile' },
      { key: 'coriander_seeds', label: 'Coriander Seeds' },
      { key: 'citrus_orange', label: 'Citrus Orange' },
      { key: 'citrus_lemon', label: 'Citrus Lemon' },
      { key: 'jujube', label: 'Jujube' },
      { key: 'carob', label: 'Carob' },
      { key: 'pennyroyal', label: 'Pennyroyal' },
      { key: 'allspice', label: 'Allspice' },
      { key: 'katlav', label: 'Katlav' },
      { key: 'mastic', label: 'Mastic' },
      { key: 'terebinth', label: 'Terebinth' },
    ],
  },
  {
    criterion: 'items_labels',
    label: 'Label Items',
    items: [
      { key: 'arak_neck', label: 'Arak Neck' },
      { key: 'arak_body', label: 'Arak Body' },
      { key: 'gin_neck', label: 'Gin Neck' },
      { key: 'gin_body', label: 'Gin Body' },
      { key: 'edv_neck', label: 'EDV Neck' },
      { key: 'edv_body', label: 'EDV Body' },
      { key: 'licorice_neck', label: 'Licorice Neck' },
      { key: 'licorice_body', label: 'Licorice Body' },
      { key: 'brandy_vs_neck', label: 'Brandy VS Neck' },
      { key: 'brandy_vs_body', label: 'Brandy VS Body' },
      { key: 'brandy_vsop_neck', label: 'Brandy VSOP Neck' },
      { key: 'brandy_vsop_body', label: 'Brandy VSOP Body' },
      { key: 'cork_label_copper', label: 'Cork Label Copper' },
      { key: 'cork_label_gold', label: 'Cork Label Gold' },
    ],
  },
  {
    criterion: 'items_packaging',
    label: 'Packaging Items',
    items: [
      { key: 'bottle_obulo', label: 'Obulo Bottle (Brandy)' },
      { key: 'bottle_demos', label: 'Demos Bottle (Gin, EDV)' },
      { key: 'bottle_lov', label: 'Lov Bottle (Arak, Licorice)' },
      { key: 'cork_demos', label: 'Demos Cork' },
      { key: 'cork_obulo_lov', label: 'Obulo/Lov Cork' },
      { key: 'carton_6_obulo', label: 'Carton 6-Obulo' },
      { key: 'carton_6_demos', label: 'Carton 6-Demos' },
      { key: 'carton_6_lov', label: 'Carton 6-Lov' },
      { key: 'carton_single', label: 'Carton Single' },
      { key: 'carton_12_obulo', label: 'Carton 12-Obulo' },
      { key: 'carton_12_demos', label: 'Carton 12-Demos' },
      { key: 'carton_12_lov', label: 'Carton 12-Lov' },
      { key: 'barrels', label: 'Barrels' },
    ],
  },
  {
    criterion: 'drink_types',
    label: 'Drink Types',
    items: [
      { key: 'drink_arak', label: 'Arak' },
      { key: 'drink_gin', label: 'Gin' },
      { key: 'drink_edv', label: 'EDV' },
      { key: 'drink_licorice', label: 'Licorice' },
      { key: 'drink_brandyVS', label: 'Brandy VS' },
      { key: 'drink_brandyVSOP', label: 'Brandy VSOP' },
      { key: 'drink_brandyMed', label: 'Mediterranean Brandy' },
    ],
  },
  {
    criterion: 'tank_sizes',
    label: 'Fermentation Tank Sizes',
    items: [
      { key: '400', label: '400 L' },
      { key: '500', label: '500 L' },
      { key: '900', label: '900 L' },
      { key: '1000', label: '1000 L' },
    ],
  },
  {
    criterion: 'd1_types',
    label: 'Distillation 1 Types',
    items: [
      { key: 'd1_type_dist1', label: 'Distillation 1' },
      { key: 'd1_type_tailsArak', label: 'Tails - Arak' },
      { key: 'd1_type_tailsGin', label: 'Tails - Gin' },
      { key: 'd1_type_tailsEDV', label: 'Tails - EDV' },
      { key: 'd1_type_cleaning', label: 'Cleaning Distillation' },
    ],
  },
  {
    criterion: 'still_names',
    label: 'Still Names',
    items: [
      { key: 'd1_still_amiti', label: 'Amiti' },
      { key: 'd1_still_aladdin', label: 'Aladdin' },
    ],
  },
  {
    criterion: 'd2_product_types',
    label: 'Distillation 2 Product Types',
    items: [
      { key: 'drink_edv', label: 'EDV' },
      { key: 'drink_arak', label: 'Arak' },
      { key: 'drink_gin', label: 'Gin' },
    ],
  },
  {
    criterion: 'bottling_color',
    label: 'Bottling Color Options',
    items: [
      { key: 'normal', label: 'Normal' },
      { key: 'abnormal', label: 'Abnormal' },
    ],
  },
  {
    criterion: 'bottling_taste',
    label: 'Bottling Taste Options',
    items: [
      { key: 'normal', label: 'Normal' },
      { key: 'abnormal', label: 'Abnormal' },
    ],
  },
  {
    criterion: 'bottling_decision',
    label: 'Bottling Decision Options',
    items: [
      { key: 'approved', label: 'Approved' },
      { key: 'notApproved', label: 'Not Approved' },
    ],
  },
  {
    criterion: 'user_roles',
    label: 'User Roles',
    items: [
      { key: 'worker', label: 'Worker' },
      { key: 'manager', label: 'Manager' },
      { key: 'admin', label: 'Admin' },
    ],
  },
];

async function seed() {
  const now = new Date().toISOString();
  const batch = db.batch();

  for (const entry of SEED_DATA) {
    const ref = db.collection(COLLECTION).doc(entry.criterion);
    batch.set(ref, {
      criterion: entry.criterion,
      label: entry.label,
      items: entry.items,
      createdAt: now,
      updatedAt: now,
    });
  }

  await batch.commit();
  console.log(`Seeded ${SEED_DATA.length} criteria into ${COLLECTION}`);
}

seed()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
