// Phase 7.5: blank-slate catalog re-curation. Wipes everything except the 5
// products that already have real reviews/list items attached (from real
// people testing the app, not synthetic data -- deleting those would cascade
// away their reviews), then re-authors the catalog by hand against
// CATALOG_STYLE.md so naming is consistent and duplicates can't sneak in via
// three different data sources anymore.
//
// IMPORTANT CAVEAT: nutrition figures are best-effort recall of commonly
// published label data for these well-known products, not fetched from a
// live/verified source. Reasonable approximations, not verified facts.
//
// Deliberately smaller than Phase 7's 306 products -- every entry here is a
// real, recognizable product, correctly modeled as one product with 1-3
// flavor/size variants (not one product per flavor, which was a real source
// of Phase 7's duplicate-ish sprawl), consistently named, English only.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

// These 5 variants have real reviews/list items from actual people testing
// the app -- preserved as-is, not touched by the wipe below.
const PRESERVED_VARIANT_IDS = [
  '0f567355-520e-4bdc-81bf-fbffa032221b', // Barebells - Brownie Batter
  '24f00b6f-b963-4a4c-b031-0a1c71d0e2b2', // Ghost - Ghost Energy - Blue Raspberry
  '76043339-afea-4e20-bb69-de09d566ac9b', // Optimum Nutrition - Gold Standard Whey - Double Rich Chocolate
  '9d5b3de7-7dce-4c5c-bf75-ce1749995778', // Celsius - Celsius - Sparkling Orange
  'a1b30ae3-001a-416a-80dd-6edfe8901024', // Barebells - Protein Bar - Peanut Butter
]

const CATALOG = [
  // ---- energy_drink ----
  {
    brand: 'Red Bull',
    name: 'Red Bull Energy Drink',
    category: 'energy_drink',
    variants: [
      { size: '8.4 fl oz can', calories: 110, protein_g: 0, carbs_g: 28, sugar_g: 27, fat_g: 0, caffeine_mg: 80, sodium_mg: 105 },
      { flavor: 'Sugar Free', size: '8.4 fl oz can', calories: 10, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 80, sodium_mg: 105 },
    ],
  },
  {
    brand: 'Monster Energy',
    name: 'Monster Energy',
    category: 'energy_drink',
    variants: [
      { size: '16 fl oz can', calories: 210, protein_g: 0, carbs_g: 54, sugar_g: 54, fat_g: 0, caffeine_mg: 160, sodium_mg: 370 },
      { flavor: 'Zero Ultra', size: '16 fl oz can', calories: 10, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 140, sodium_mg: 150 },
    ],
  },
  {
    brand: 'Bang Energy',
    name: 'Bang',
    category: 'energy_drink',
    variants: [
      { flavor: 'Star Blast', size: '16 fl oz can', calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0, caffeine_mg: 300, sodium_mg: 40 },
      { flavor: 'Purple Guava Pear', size: '16 fl oz can', calories: 0, protein_g: 0, carbs_g: 0, sugar_g: 0, fat_g: 0, caffeine_mg: 300, sodium_mg: 40 },
    ],
  },
  {
    brand: 'Rockstar',
    name: 'Rockstar Original',
    category: 'energy_drink',
    variants: [{ size: '16 fl oz can', calories: 140, protein_g: 0, carbs_g: 31, sugar_g: 31, fat_g: 0, caffeine_mg: 160, sodium_mg: 200 }],
  },
  {
    brand: 'Reign',
    name: 'Reign Total Body Fuel',
    category: 'energy_drink',
    variants: [{ flavor: 'Melon Mania', size: '16 fl oz can', calories: 10, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 300, sodium_mg: 200 }],
  },
  {
    brand: 'Alani Nu',
    name: 'Alani Nu Energy',
    category: 'energy_drink',
    variants: [{ flavor: 'Hawaiian Shaved Ice', size: '12 fl oz can', calories: 10, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 200, sodium_mg: 20 }],
  },
  {
    brand: 'Ghost',
    name: 'Ghost Energy',
    category: 'energy_drink',
    variants: [{ flavor: 'Sour Watermelon', size: '16 fl oz can', calories: 5, protein_g: 0, carbs_g: 2, sugar_g: 0, fat_g: 0, caffeine_mg: 200, sodium_mg: 10 }],
  },
  {
    brand: 'NOS',
    name: 'NOS Energy',
    category: 'energy_drink',
    variants: [{ size: '16 fl oz can', calories: 210, protein_g: 0, carbs_g: 54, sugar_g: 54, fat_g: 0, caffeine_mg: 160, sodium_mg: 180 }],
  },
  {
    brand: '5-hour Energy',
    name: '5-hour Energy Extra Strength',
    category: 'energy_drink',
    variants: [{ flavor: 'Berry', size: '1.93 fl oz shot', calories: 4, protein_g: 0, carbs_g: 1, sugar_g: 0, fat_g: 0, caffeine_mg: 230, sodium_mg: 20 }],
  },
  {
    brand: 'Zoa Energy',
    name: 'Zoa',
    category: 'energy_drink',
    variants: [{ flavor: 'Tropical Punch', size: '16 fl oz can', calories: 20, protein_g: 0, carbs_g: 5, sugar_g: 0, fat_g: 0, caffeine_mg: 160, sodium_mg: 200 }],
  },
  {
    brand: 'C4 Energy',
    name: 'C4 Energy Drink',
    category: 'energy_drink',
    variants: [{ flavor: 'Frozen Bombsicle', size: '16 fl oz can', calories: 15, protein_g: 0, carbs_g: 4, sugar_g: 0, fat_g: 0, caffeine_mg: 200, sodium_mg: 50 }],
  },

  // ---- protein_bar ----
  {
    brand: 'Quest Nutrition',
    name: 'Quest Bar',
    category: 'protein_bar',
    variants: [
      { flavor: 'Cookies & Cream', size: '60g', calories: 190, protein_g: 21, carbs_g: 22, sugar_g: 1, fiber_g: 14, fat_g: 8 },
      { flavor: 'Chocolate Chip Cookie Dough', size: '60g', calories: 200, protein_g: 21, carbs_g: 21, sugar_g: 1, fiber_g: 13, fat_g: 8 },
      { flavor: 'Peanut Butter Supreme', size: '60g', calories: 200, protein_g: 21, carbs_g: 23, sugar_g: 1, fiber_g: 13, fat_g: 9 },
    ],
  },
  {
    brand: 'RXBAR',
    name: 'RXBAR',
    category: 'protein_bar',
    variants: [
      { flavor: 'Chocolate Sea Salt', size: '52g', calories: 210, protein_g: 12, carbs_g: 24, sugar_g: 13, fiber_g: 5, fat_g: 9 },
      { flavor: 'Blueberry', size: '52g', calories: 210, protein_g: 12, carbs_g: 23, sugar_g: 13, fiber_g: 5, fat_g: 8 },
    ],
  },
  {
    brand: 'Pure Protein',
    name: 'Pure Protein Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Chocolate Peanut Butter', size: '50g', calories: 200, protein_g: 20, carbs_g: 17, sugar_g: 2, fiber_g: 2, fat_g: 7 }],
  },
  {
    brand: 'Think!',
    name: 'think! High Protein Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Chunky Peanut Butter', size: '60g', calories: 210, protein_g: 20, carbs_g: 20, sugar_g: 1, fiber_g: 10, fat_g: 8 }],
  },
  {
    brand: 'ONE Brands',
    name: 'ONE Bar',
    category: 'protein_bar',
    variants: [
      { flavor: 'Birthday Cake', size: '60g', calories: 220, protein_g: 20, carbs_g: 24, sugar_g: 1, fiber_g: 14, fat_g: 8 },
      { flavor: 'Cookies & Creme', size: '60g', calories: 220, protein_g: 20, carbs_g: 23, sugar_g: 1, fiber_g: 13, fat_g: 8 },
    ],
  },
  {
    brand: 'Kind',
    name: 'KIND Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Dark Chocolate Nuts & Sea Salt', size: '40g', calories: 200, protein_g: 6, carbs_g: 16, sugar_g: 5, fiber_g: 7, fat_g: 15 }],
  },
  {
    brand: 'Clif Bar',
    name: 'CLIF Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Crunchy Peanut Butter', size: '68g', calories: 250, protein_g: 10, carbs_g: 45, sugar_g: 21, fiber_g: 5, fat_g: 6 }],
  },
  {
    brand: 'Nature Valley',
    name: 'Nature Valley Protein Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Peanut Butter Dark Chocolate', size: '40g', calories: 190, protein_g: 10, carbs_g: 15, sugar_g: 7, fiber_g: 5, fat_g: 12 }],
  },
  {
    brand: 'Built Bar',
    name: 'Built Bar',
    category: 'protein_bar',
    variants: [{ flavor: 'Birthday Cake', size: '49g', calories: 130, protein_g: 15, carbs_g: 16, sugar_g: 0, fiber_g: 6, fat_g: 4 }],
  },
  {
    brand: 'Power Crunch',
    name: 'Power Crunch',
    category: 'protein_bar',
    variants: [{ flavor: 'French Vanilla Creme', size: '40g', calories: 200, protein_g: 13, carbs_g: 15, sugar_g: 8, fat_g: 10 }],
  },
  {
    brand: 'MusclePharm',
    name: 'Combat Crunch',
    category: 'protein_bar',
    variants: [{ flavor: 'Chocolate Peanut Butter', size: '63g', calories: 200, protein_g: 20, carbs_g: 25, sugar_g: 1, fiber_g: 10, fat_g: 7 }],
  },
  {
    brand: 'Grenade',
    name: 'Grenade Carb Killa',
    category: 'protein_bar',
    variants: [{ flavor: 'Chocolate Chip Salted Caramel', size: '60g', calories: 215, protein_g: 21, carbs_g: 15, sugar_g: 1, fiber_g: 8, fat_g: 10 }],
  },

  // ---- protein_powder ----
  {
    brand: 'Optimum Nutrition',
    name: 'Gold Standard 100% Whey',
    category: 'protein_powder',
    variants: [
      { flavor: 'Extreme Milk Chocolate', size: '30g scoop', calories: 120, protein_g: 24, carbs_g: 3, sugar_g: 1, fat_g: 1 },
      { flavor: 'Vanilla Ice Cream', size: '30g scoop', calories: 120, protein_g: 24, carbs_g: 3, sugar_g: 2, fat_g: 1 },
    ],
  },
  {
    brand: 'Dymatize',
    name: 'ISO100',
    category: 'protein_powder',
    variants: [{ flavor: 'Gourmet Chocolate', size: '32g scoop', calories: 110, protein_g: 25, carbs_g: 1, sugar_g: 1, fat_g: 0 }],
  },
  {
    brand: 'MuscleTech',
    name: 'Nitro-Tech 100% Whey Gold',
    category: 'protein_powder',
    variants: [{ flavor: 'Milk Chocolate', size: '32g scoop', calories: 120, protein_g: 24, carbs_g: 3, sugar_g: 2, fat_g: 1 }],
  },
  {
    brand: 'Ghost',
    name: 'Ghost Whey',
    category: 'protein_powder',
    variants: [{ flavor: 'Cereal Milk', size: '32g scoop', calories: 130, protein_g: 25, carbs_g: 4, sugar_g: 2, fat_g: 2.5 }],
  },
  {
    brand: 'Garden of Life',
    name: 'Sport Organic Plant-Based Protein',
    category: 'protein_powder',
    variants: [{ flavor: 'Chocolate', size: '39g scoop', calories: 140, protein_g: 30, carbs_g: 8, sugar_g: 1, fiber_g: 6, fat_g: 2 }],
  },
  {
    brand: 'Orgain',
    name: 'Organic Protein Powder',
    category: 'protein_powder',
    variants: [{ flavor: 'Creamy Chocolate Fudge', size: '46g scoop', calories: 150, protein_g: 21, carbs_g: 15, sugar_g: 1, fiber_g: 7, fat_g: 4 }],
  },
  {
    brand: 'Vega',
    name: 'Vega Protein & Greens',
    category: 'protein_powder',
    variants: [{ flavor: 'Chocolate', size: '42g scoop', calories: 150, protein_g: 20, carbs_g: 10, sugar_g: 1, fiber_g: 6, fat_g: 4 }],
  },
  {
    brand: 'Isopure',
    name: 'Isopure Zero Carb',
    category: 'protein_powder',
    variants: [{ flavor: 'Dutch Chocolate', size: '31g scoop', calories: 100, protein_g: 25, carbs_g: 0, sugar_g: 0, fat_g: 0 }],
  },
  {
    brand: 'Ascent',
    name: 'Ascent Native Fuel Whey',
    category: 'protein_powder',
    variants: [{ flavor: 'Chocolate', size: '33g scoop', calories: 120, protein_g: 25, carbs_g: 3, sugar_g: 1, fat_g: 1 }],
  },
  {
    brand: 'Kirkland Signature',
    name: 'Whey Protein',
    category: 'protein_powder',
    variants: [{ flavor: 'Chocolate', size: '36g scoop', calories: 160, protein_g: 25, carbs_g: 7, sugar_g: 3, fat_g: 3 }],
  },

  // ---- pre_workout ----
  {
    brand: 'Cellucor',
    name: 'C4 Original',
    category: 'pre_workout',
    variants: [{ flavor: 'Fruit Punch', size: '6g scoop', calories: 5, protein_g: 0, carbs_g: 1, sugar_g: 0, fat_g: 0, caffeine_mg: 150 }],
  },
  {
    brand: 'Ghost',
    name: 'Ghost Legend',
    category: 'pre_workout',
    variants: [{ flavor: 'Warheads Sour Watermelon', size: '15g scoop', calories: 25, protein_g: 0, carbs_g: 4, sugar_g: 0, fat_g: 0, caffeine_mg: 202 }],
  },
  {
    brand: 'Bucked Up',
    name: 'Bucked Up Pre-Workout',
    category: 'pre_workout',
    variants: [{ flavor: 'Woke AF', size: '13g scoop', calories: 5, protein_g: 0, carbs_g: 1, sugar_g: 0, fat_g: 0, caffeine_mg: 300 }],
  },
  {
    brand: 'Transparent Labs',
    name: 'Bulk Black',
    category: 'pre_workout',
    variants: [{ flavor: 'Blue Raspberry', size: '22g scoop', calories: 15, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 200 }],
  },
  {
    brand: 'Gorilla Mind',
    name: 'Gorilla Mode',
    category: 'pre_workout',
    variants: [{ flavor: 'Fruit Punch', size: '14g scoop', calories: 10, protein_g: 0, carbs_g: 2, sugar_g: 0, fat_g: 0, caffeine_mg: 282 }],
  },
  {
    brand: 'Legion',
    name: 'Legion Pulse',
    category: 'pre_workout',
    variants: [{ flavor: 'Fruit Punch', size: '14g scoop', calories: 10, protein_g: 0, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 350 }],
  },
  {
    brand: 'Optimum Nutrition',
    name: 'Gold Standard Pre-Workout',
    category: 'pre_workout',
    variants: [{ flavor: 'Fruit Fusion', size: '8.1g scoop', calories: 30, protein_g: 0, carbs_g: 7, sugar_g: 0, fat_g: 0, caffeine_mg: 175 }],
  },
  {
    brand: 'Alani Nu',
    name: 'Alani Nu Pre-Workout',
    category: 'pre_workout',
    variants: [{ flavor: 'Hawaiian Shaved Ice', size: '13.5g scoop', calories: 10, protein_g: 0, carbs_g: 2, sugar_g: 0, fat_g: 0, caffeine_mg: 200 }],
  },
  {
    brand: 'Redcon1',
    name: 'Total War',
    category: 'pre_workout',
    variants: [{ flavor: 'Blue Raspberry', size: '21g scoop', calories: 5, protein_g: 0, carbs_g: 1, sugar_g: 0, fat_g: 0, caffeine_mg: 325 }],
  },
  {
    brand: 'Kaged',
    name: 'Pre-Kaged',
    category: 'pre_workout',
    variants: [{ flavor: 'Fruit Punch', size: '18.7g scoop', calories: 15, protein_g: 1, carbs_g: 3, sugar_g: 0, fat_g: 0, caffeine_mg: 274 }],
  },

  // ---- greens_powder ----
  {
    brand: 'AG1',
    name: 'AG1',
    category: 'greens_powder',
    variants: [{ size: '12g scoop', calories: 50, protein_g: 2, carbs_g: 8, sugar_g: 2, fiber_g: 2, fat_g: 1 }],
  },
  {
    brand: 'Bloom Nutrition',
    name: 'Bloom Greens & Superfoods',
    category: 'greens_powder',
    variants: [{ flavor: 'Mixed Berry', size: '8g scoop', calories: 25, protein_g: 0, carbs_g: 6, sugar_g: 2, fiber_g: 2, fat_g: 0 }],
  },
  {
    brand: 'Amazing Grass',
    name: 'Green Superfood',
    category: 'greens_powder',
    variants: [{ size: '8g scoop', calories: 30, protein_g: 1, carbs_g: 6, sugar_g: 3, fiber_g: 3, fat_g: 0 }],
  },
  {
    brand: 'Garden of Life',
    name: 'Perfect Food Green Superfood',
    category: 'greens_powder',
    variants: [{ size: '8.4g scoop', calories: 40, protein_g: 2, carbs_g: 7, sugar_g: 1, fiber_g: 3, fat_g: 0 }],
  },
  {
    brand: 'Organifi',
    name: 'Organifi Green Juice',
    category: 'greens_powder',
    variants: [{ size: '8g scoop', calories: 30, protein_g: 1, carbs_g: 5, sugar_g: 1, fiber_g: 2, fat_g: 0 }],
  },
  {
    brand: 'Ancient Nutrition',
    name: 'Organic Super Greens',
    category: 'greens_powder',
    variants: [{ flavor: 'Chocolate', size: '10.7g scoop', calories: 35, protein_g: 1, carbs_g: 6, sugar_g: 2, fiber_g: 2, fat_g: 0 }],
  },
  {
    brand: 'Huel',
    name: 'Huel Daily Greens',
    category: 'greens_powder',
    variants: [{ size: '6.4g scoop', calories: 20, protein_g: 1, carbs_g: 3, sugar_g: 1, fiber_g: 1, fat_g: 0 }],
  },
  {
    brand: 'Nested Naturals',
    name: 'Super Greens',
    category: 'greens_powder',
    variants: [{ flavor: 'Chocolate', size: '11g scoop', calories: 35, protein_g: 1, carbs_g: 7, sugar_g: 2, fiber_g: 3, fat_g: 0 }],
  },

  // ---- supplement ----
  {
    brand: 'Optimum Nutrition',
    name: 'Micronized Creatine Monohydrate Powder',
    category: 'supplement',
    variants: [{ size: '5g scoop' }],
  },
  {
    brand: 'MuscleTech',
    name: 'Platinum Creatine',
    category: 'supplement',
    variants: [{ size: '5g scoop' }],
  },
  {
    brand: 'Nature Made',
    name: 'Creatine Monohydrate Capsules',
    category: 'supplement',
    variants: [{ size: '2 capsules' }],
  },
  {
    brand: 'Vital Proteins',
    name: 'Collagen Peptides',
    category: 'supplement',
    variants: [{ size: '2 scoops (20g)', calories: 70, protein_g: 18, carbs_g: 0 }],
  },
  {
    brand: 'Ensure',
    name: 'Ensure Original Nutrition Shake',
    category: 'supplement',
    variants: [{ flavor: 'Chocolate', size: '8 fl oz bottle', calories: 220, protein_g: 9, carbs_g: 33, sugar_g: 19, fat_g: 6 }],
  },
  {
    brand: 'Premier Protein',
    name: 'Premier Protein Shake',
    category: 'supplement',
    variants: [{ flavor: 'Chocolate', size: '11 fl oz bottle', calories: 160, protein_g: 30, carbs_g: 5, sugar_g: 1, fat_g: 3 }],
  },
  {
    brand: 'Fairlife',
    name: 'Core Power',
    category: 'supplement',
    variants: [
      { flavor: 'Chocolate', size: '14 fl oz bottle', calories: 170, protein_g: 26, carbs_g: 9, sugar_g: 7, fat_g: 4.5 },
      { flavor: 'Vanilla Elite', size: '14 fl oz bottle', calories: 170, protein_g: 42, carbs_g: 7, sugar_g: 3, fat_g: 4.5 },
    ],
  },
  {
    brand: 'Orgain',
    name: 'Organic Nutritional Shake',
    category: 'supplement',
    variants: [{ flavor: 'Creamy Chocolate Fudge', size: '11 fl oz bottle', calories: 250, protein_g: 16, carbs_g: 33, sugar_g: 20, fiber_g: 5, fat_g: 7 }],
  },
  {
    brand: 'NOW Foods',
    name: 'Vitamin D3 Softgels',
    category: 'supplement',
    variants: [{ flavor: '5000 IU', size: '1 softgel' }],
  },
  {
    brand: 'Nutricost',
    name: 'Creatine Monohydrate Micronized Powder',
    category: 'supplement',
    variants: [{ size: '5g scoop' }],
  },

  // ---- snack ----
  {
    brand: 'Chomps',
    name: 'Chomps Beef Stick',
    category: 'snack',
    variants: [{ flavor: 'Original', size: '30g', calories: 80, protein_g: 9, carbs_g: 0, sugar_g: 0, fat_g: 4, sodium_mg: 220 }],
  },
  {
    brand: 'Country Archer',
    name: 'Country Archer Beef Jerky',
    category: 'snack',
    variants: [{ flavor: 'Original', size: '28g', calories: 70, protein_g: 11, carbs_g: 4, sugar_g: 3, fat_g: 1.5, sodium_mg: 480 }],
  },
  {
    brand: 'Quest Nutrition',
    name: 'Quest Protein Chips',
    category: 'snack',
    variants: [{ flavor: 'Sour Cream & Onion', size: '32g', calories: 130, protein_g: 21, carbs_g: 7, sugar_g: 1, fat_g: 4 }],
  },
  {
    brand: 'Epic Provisions',
    name: 'Epic Bar',
    category: 'snack',
    variants: [{ flavor: 'Bison Bacon Cranberry', size: '40g', calories: 150, protein_g: 10, carbs_g: 7, sugar_g: 5, fat_g: 10 }],
  },
  {
    brand: 'Wild Zora',
    name: 'Wild Zora Meat & Veggie Bar',
    category: 'snack',
    variants: [{ flavor: 'Beef', size: '28g', calories: 70, protein_g: 8, carbs_g: 4, sugar_g: 1, fat_g: 3 }],
  },
  {
    brand: 'Perky Jerky',
    name: 'Perky Jerky',
    category: 'snack',
    variants: [{ flavor: 'Original Beef', size: '28g', calories: 80, protein_g: 13, carbs_g: 4, sugar_g: 3, fat_g: 1, sodium_mg: 500 }],
  },
  {
    brand: 'Quevos',
    name: 'Quevos Egg White Chips',
    category: 'snack',
    variants: [{ flavor: 'Sea Salt', size: '28g', calories: 120, protein_g: 13, carbs_g: 10, sugar_g: 0, fat_g: 3 }],
  },
  {
    brand: 'Legendary Foods',
    name: 'Legendary Foods Protein Cookie',
    category: 'snack',
    variants: [{ flavor: 'Chocolate Chip', size: '60g', calories: 230, protein_g: 16, carbs_g: 26, sugar_g: 1, fiber_g: 15, fat_g: 10 }],
  },
]

function normalizedKey(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function deleteEverythingExceptPreserved() {
  const { data: allProducts } = await admin.from('products').select('id, product_variants(id)')
  const preservedProductIds = new Set(allProducts.filter((p) => p.product_variants.some((v) => PRESERVED_VARIANT_IDS.includes(v.id))).map((p) => p.id))
  const toDelete = allProducts.filter((p) => !preservedProductIds.has(p.id)).map((p) => p.id)

  console.log(`Deleting ${toDelete.length} products (preserving ${preservedProductIds.size})...`)
  const { error: deleteErr, count } = await admin.from('products').delete({ count: 'exact' }).in('id', toDelete)
  if (deleteErr) throw deleteErr
  console.log(`Deleted ${count} products (cascade removed their variants).`)

  // Delete brands no longer referenced by any surviving product.
  const { data: remainingProducts } = await admin.from('products').select('brand_id')
  const stillReferenced = new Set(remainingProducts.map((p) => p.brand_id))
  const { data: allBrands } = await admin.from('brands').select('id')
  const orphanBrandIds = allBrands.filter((b) => !stillReferenced.has(b.id)).map((b) => b.id)
  const { error: brandDeleteErr, count: brandCount } = await admin.from('brands').delete({ count: 'exact' }).in('id', orphanBrandIds)
  if (brandDeleteErr) throw brandDeleteErr
  console.log(`Deleted ${brandCount} orphaned brands.`)
}

async function upsertBrand(rawName) {
  const key = normalizedKey(rawName)
  const { data: allBrands } = await admin.from('brands').select('id, name')
  const existing = allBrands.find((b) => normalizedKey(b.name) === key)
  if (existing) return existing

  const { data: created, error } = await admin.from('brands').insert({ name: rawName }).select('id, name').single()
  if (error) throw error
  return created
}

// Returns the existing product row if one already matches this brand+name
// (e.g. a preserved product from before the wipe), so a duplicate product
// entry isn't created for a flavor that belongs on an existing product --
// the new variant gets attached to it instead.
async function findExistingProduct(brandId, name) {
  const { data } = await admin.from('products').select('id, name').eq('brand_id', brandId)
  const key = normalizedKey(name)
  return (data || []).find((p) => normalizedKey(p.name) === key) || null
}

async function variantAlreadyExists(productId, flavor) {
  const { data } = await admin.from('product_variants').select('flavor').eq('product_id', productId)
  const key = normalizedKey(flavor || '')
  return (data || []).some((v) => normalizedKey(v.flavor || '') === key)
}

async function main() {
  await deleteEverythingExceptPreserved()

  let productCount = 0
  let variantCount = 0
  for (const item of CATALOG) {
    const brand = await upsertBrand(item.brand)
    let product = await findExistingProduct(brand.id, item.name)

    if (product) {
      console.log(`  existing product: ${brand.name} - ${item.name} -- adding any new variants`)
    } else {
      const { data: created, error: productErr } = await admin
        .from('products')
        .insert({ brand_id: brand.id, brand_name: brand.name, name: item.name, category: item.category, status: 'approved' })
        .select('id')
        .single()
      if (productErr) {
        console.log(`  skip (product insert failed): ${brand.name} ${item.name} -- ${productErr.message}`)
        continue
      }
      product = created
      productCount++
    }

    for (const v of item.variants) {
      if (await variantAlreadyExists(product.id, v.flavor)) {
        console.log(`  skip (duplicate variant): ${brand.name} ${item.name} ${v.flavor || ''}`)
        continue
      }
      const { error: variantErr } = await admin.from('product_variants').insert({
        product_id: product.id,
        flavor: v.flavor || null,
        size: v.size || null,
        calories: v.calories ?? null,
        protein_g: v.protein_g ?? null,
        carbs_g: v.carbs_g ?? null,
        fat_g: v.fat_g ?? null,
        sugar_g: v.sugar_g ?? null,
        fiber_g: v.fiber_g ?? null,
        caffeine_mg: v.caffeine_mg ?? null,
        sodium_mg: v.sodium_mg ?? null,
        data_source: 'manual',
        status: 'approved',
      })
      if (variantErr) {
        console.log(`  skip (variant insert failed): ${brand.name} ${item.name} ${v.flavor || ''} -- ${variantErr.message}`)
        continue
      }
      variantCount++
    }
    console.log(`  [${productCount}] ${brand.name} - ${item.name} (${item.variants.length} variant${item.variants.length !== 1 ? 's' : ''})`)
  }

  console.log(`\nTotal: ${productCount} products, ${variantCount} variants`)
}

main().catch((err) => {
  console.error('Curation failed:', err)
  process.exit(1)
})
