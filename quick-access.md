# Quick Access — Criteria & Items Reference

> **Firestore collection:** `factory_quickAccess`
> **API endpoint:** `/api/quick-access`
> **Last updated:** 2026-03-19

---

## suppliers_raw — Raw Materials Suppliers

| Key | Label |
|-----|-------|
| sup_tamartushka | Tamartushka |
| sup_nichuchot | Nichuchot Argaman |
| sup_iherb | I-HERB |
| sup_shlr | SH.L.R |
| sup_pcsi | PCSI |
| sup_yakev | Yakev HaEla |
| sup_selfHarvest | Self-harvest |
| sup_other | Other |

## suppliers_dates — Date Receiving Suppliers

| Key | Label |
|-----|-------|
| sup_gamliel | Gamliel |
| sup_lara | Lara |
| sup_selfHarvest | Self-harvest |
| sup_other | Other |

## categories — Raw Material Categories

| Key | Label |
|-----|-------|
| rm_cat_spices | Spices |
| rm_cat_labels | Labels |
| rm_cat_packaging | Packaging |

## items_spices — Spice Items

| Key | Label |
|-----|-------|
| anise_seeds | Anise Seeds |
| star_anise | Star Anise |
| licorice | Licorice |
| juniper | Juniper |
| cardamom | Cardamom |
| cinnamon | Cinnamon |
| chamomile | Chamomile |
| coriander_seeds | Coriander Seeds |
| citrus_orange | Citrus Orange |
| citrus_lemon | Citrus Lemon |
| jujube | Jujube |
| carob | Carob |
| pennyroyal | Pennyroyal |
| allspice | Allspice |
| katlav | Katlav |
| mastic | Mastic |
| terebinth | Terebinth |

## items_labels — Label Items

| Key | Label |
|-----|-------|
| arak_neck | Arak Neck |
| arak_body | Arak Body |
| gin_neck | Gin Neck |
| gin_body | Gin Body |
| edv_neck | EDV Neck |
| edv_body | EDV Body |
| licorice_neck | Licorice Neck |
| licorice_body | Licorice Body |
| brandy_vs_neck | Brandy VS Neck |
| brandy_vs_body | Brandy VS Body |
| brandy_vsop_neck | Brandy VSOP Neck |
| brandy_vsop_body | Brandy VSOP Body |
| cork_label_copper | Cork Label Copper |
| cork_label_gold | Cork Label Gold |

## items_packaging — Packaging Items

| Key | Label |
|-----|-------|
| bottle_obulo | Obulo Bottle (Brandy) |
| bottle_demos | Demos Bottle (Gin, EDV) |
| bottle_lov | Lov Bottle (Arak, Licorice) |
| cork_demos | Demos Cork |
| cork_obulo_lov | Obulo/Lov Cork |
| carton_6_obulo | Carton 6-Obulo |
| carton_6_demos | Carton 6-Demos |
| carton_6_lov | Carton 6-Lov |
| carton_single | Carton Single |
| carton_12_obulo | Carton 12-Obulo |
| carton_12_demos | Carton 12-Demos |
| carton_12_lov | Carton 12-Lov |
| barrels | Barrels |

## drink_types — Drink Types

| Key | Label |
|-----|-------|
| drink_arak | Arak |
| drink_gin | Gin |
| drink_edv | EDV |
| drink_licorice | Licorice |
| drink_brandyVS | Brandy VS |
| drink_brandyVSOP | Brandy VSOP |
| drink_brandyMed | Mediterranean Brandy |

## tank_sizes — Fermentation Tank Sizes

| Key | Label |
|-----|-------|
| 400 | 400 L |
| 500 | 500 L |
| 900 | 900 L |
| 1000 | 1000 L |

## d1_types — Distillation 1 Types

| Key | Label |
|-----|-------|
| d1_type_dist1 | Distillation 1 |
| d1_type_tailsArak | Tails - Arak |
| d1_type_tailsGin | Tails - Gin |
| d1_type_tailsEDV | Tails - EDV |
| d1_type_cleaning | Cleaning Distillation |

## still_names — Still Names

| Key | Label |
|-----|-------|
| d1_still_amiti | Amiti |
| d1_still_aladdin | Aladdin |

## d2_product_types — Distillation 2 Product Types

| Key | Label |
|-----|-------|
| drink_edv | EDV |
| drink_arak | Arak |
| drink_gin | Gin |

## bottling_color — Bottling Color Options

| Key | Label |
|-----|-------|
| normal | Normal |
| abnormal | Abnormal |

## bottling_taste — Bottling Taste Options

| Key | Label |
|-----|-------|
| normal | Normal |
| abnormal | Abnormal |

## bottling_decision — Bottling Decision Options

| Key | Label |
|-----|-------|
| approved | Approved |
| notApproved | Not Approved |

## user_roles — User Roles

| Key | Label |
|-----|-------|
| worker | Worker |
| manager | Manager |
| admin | Admin |

---

## API Usage

```bash
# List all criteria
GET /api/quick-access

# Get one criterion
GET /api/quick-access?criterion=drink_types

# Add a new criterion with items
POST /api/quick-access
{ "criterion": "my_criterion", "label": "My Criterion", "items": [{ "key": "item1", "label": "Item 1" }] }

# Add items to existing criterion
PUT /api/quick-access
{ "criterion": "drink_types", "action": "add_items", "items": [{ "key": "drink_new", "label": "New Drink" }] }

# Remove items from a criterion
PUT /api/quick-access
{ "criterion": "drink_types", "action": "remove_items", "keys": ["drink_new"] }

# Delete an entire criterion
DELETE /api/quick-access
{ "criterion": "my_criterion" }
```
