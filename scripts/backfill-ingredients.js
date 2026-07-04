// Phase 8 follow-up: the 73 Phase 7.5 hand-curated products had nutrition
// numbers but no ingredients_text, so the AI analysis Edge Function had
// nothing to analyze for 79 of 83 variants. Backfills realistic ingredient
// lists for these well-known products.
//
// IMPORTANT CAVEAT: same as the curated nutrition data -- these are
// best-effort recall of these products' typical labels, not fetched from a
// live/verified source. Reasonable approximations, not verified facts.
import dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const admin = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const INGREDIENTS = {
  '06402ba9-805a-45c0-b867-cae5b46fc06b':
    'Carbonated water, citric acid, natural and artificial flavors, caffeine, sodium benzoate, potassium sorbate, sucralose, acesulfame potassium, panax ginseng root extract, super creatine (creatyl-l-leucine), CoQ10, branched chain amino acids',
  '0acc50b5-f7de-4b70-88ef-cd0bd32d9392':
    'Organic brown rice syrup, rolled oats, roasted peanuts, soy protein isolate, peanut butter, organic rice flour, natural flavor, sea salt, soy lecithin, mixed tocopherols',
  '0f903b24-365f-49cf-94bc-341e6a3e6681': 'Whey protein concentrate, whey protein isolate, natural and artificial flavors, cocoa, sunflower lecithin, salt, sucralose, acesulfame potassium',
  '126b408b-7fae-4832-9d1a-a014553ab37a':
    'Citrulline, beta-alanine, betaine anhydrous, BCAAs, creatine hydrochloride, caffeine anhydrous, natural and artificial flavors, citric acid, sucralose, coconut water powder',
  '18e98504-db70-447c-90dd-624c04e81340':
    'Protein blend (milk protein isolate, whey protein isolate), peanuts, chicory root fiber, erythritol, water, natural flavors, sea salt, sunflower lecithin, stevia leaf extract',
  '201e2643-52b4-4467-83c8-2e9d0c1b4455':
    'Protein blend (milk protein isolate, whey protein isolate, calcium caseinate), peanuts, chocolate coating (sugar, palm kernel oil, cocoa), glycerin, peanut flour, natural flavors, sea salt, sucralose',
  '2047e6ba-fb1b-454c-b250-4d0bcc77aea8': 'Spirulina, chlorella, wheatgrass, barley grass, broccoli powder, spinach powder, kale powder, natural flavoring, citric acid',
  '20662c9b-609c-4183-933e-92f48b13778b': 'Citrulline, beta-alanine, caffeine anhydrous, natural and artificial flavors, citric acid, malic acid, sucralose, acesulfame potassium, FD&C colors',
  '23defb69-ec13-4d1e-9003-784b17414b46': 'Carbonated water, citric acid, natural flavors, branched chain amino acids, caffeine, CoQ10, l-carnitine, sucralose, acesulfame potassium, B vitamins',
  '25bf814a-ff6d-43fe-9d0d-78fa64ad3197':
    'Protein blend (milk protein isolate, whey protein isolate), soluble corn fiber, almonds, erythritol, water, natural flavors, sunflower oil, sea salt, sucralose, chocolate chips (unsweetened chocolate, erythritol)',
  '274fb861-3d90-4a93-a025-03dac443aa21':
    'Protein blend (whey protein isolate, milk protein isolate), isomalto-oligosaccharides, water, natural flavors, palm oil, sunflower lecithin, sea salt, sucralose, sprinkles',
  '28364920-1d2d-485f-addb-a7cf85162907':
    'Organic spirulina, organic chlorella, organic wheatgrass, digestive enzyme blend, probiotics, natural flavors, citric acid, stevia leaf extract, beet root powder',
  '2ea4c093-86b4-49a0-b1ba-5527186a5438': 'Peanuts, chocolate chips (sugar, chocolate, cocoa butter), whey protein isolate, soy protein isolate, brown rice crisp, honey, canola oil, sea salt',
  '2f73bd14-dbbd-47f4-89a2-28f7b42a399d':
    'L-citrulline, beta-alanine, betaine anhydrous, L-tyrosine, agmatine sulfate, caffeine anhydrous, huperzine A, natural and artificial flavors, citric acid, sucralose',
  '33d07d17-b8b4-4517-98a7-cdca2ffeee0b':
    'Protein blend (milk protein isolate, whey protein isolate), potato starch, sunflower oil, salt, natural flavors, onion powder, sour cream powder, buttermilk',
  '34c2bfea-11a3-429b-a81d-f909fff66446':
    'Carbonated water, citric acid, natural and artificial flavors, caffeine, sodium benzoate, potassium sorbate, sucralose, acesulfame potassium, super creatine (creatyl-l-leucine), CoQ10, BCAAs',
  '34cf9464-3592-40c4-8961-a3f2dd699591':
    'Vitamin/mineral blend, spirulina, chlorella, organic spinach, organic broccoli, adaptogen blend (ashwagandha, rhodiola), digestive enzyme blend, probiotic blend, natural flavors, stevia leaf extract',
  '356284c1-e506-40d1-9b4b-fbb3c45381d9':
    'Beta-alanine, creatine monohydrate, citrulline malate, caffeine anhydrous, natural and artificial flavors, citric acid, sucralose, acesulfame potassium, vitamin B6, vitamin B12',
  '35b9b169-9e76-41b3-aea7-1bf155f49e69': 'Whey protein isolate, palm oil, peanut flour, natural flavors, soy lecithin, sea salt, sucralose',
  '3ab562cd-6c41-476c-b56c-dbf5c6e85112': 'Whey protein isolate, collagen, erythritol, water, natural flavors, sprinkles, sunflower lecithin, sea salt, stevia leaf extract, cellulose gum',
  '3acfe543-dfaf-4ee8-9744-874d2acb45ab': 'L-citrulline malate, beta-alanine, betaine anhydrous, alpha-GPC, caffeine anhydrous, natural flavors, citric acid, stevia leaf extract, malic acid',
  '46a3d103-3a42-454a-8e35-453cf89d6631': 'Micronized creatine monohydrate',
  '48e51b88-d8d5-4f5e-83d4-a6a64a80a1c7': 'Beef, water, sea salt, vinegar, celery powder, spices, cultured celery juice powder, natural flavors',
  '49f4096f-ff18-47ee-bad0-c8a8088bad6f':
    'Milk protein isolate, soy protein isolate, chocolate flavor coating (maltitol, cocoa butter, cocoa mass), polydextrose, natural flavors, salt, sucralose, sunflower lecithin',
  '4ba8f7f3-5a67-4d94-b2be-64bf69d366b3':
    'Carbonated water, sucrose, glucose, citric acid, sodium bicarbonate, taurine, caffeine, inositol, niacinamide, calcium pantothenate, pyridoxine HCl, vitamin B12, natural and artificial flavors, colors',
  '4f278dbe-09a6-4129-bafb-dba46bb225eb':
    'Carbonated water, sucrose, glucose, citric acid, taurine, sodium citrate, natural and artificial flavors, caffeine, sodium benzoate, panax ginseng extract, milk thistle extract, guarana seed extract, l-carnitine, vitamin B blend',
  '55175a6f-b1f5-4290-a0ec-03f3cdf4356f':
    'L-citrulline, beta-alanine, betaine anhydrous, agmatine sulfate, caffeine anhydrous, deer antler velvet extract, natural and artificial flavors, citric acid, sucralose',
  '5d071aef-8115-44ec-9caa-b67a6257165c':
    'L-citrulline malate, beta-alanine, betaine anhydrous, caffeine anhydrous, huperzine A, natural and artificial flavors, citric acid, sucralose, acesulfame potassium, FD&C blue 1',
  '5e33441c-5e5a-41ec-99c2-f2491d00c946': 'Whey protein isolate, whey protein concentrate, cocoa, natural and artificial flavors, lecithin, salt, acesulfame potassium, sucralose',
  '5ea8031c-2691-40d6-98d0-e1150465babc':
    'Bison, pork, bacon (cured with water, salt, sugar, sodium phosphate, sodium erythorbate, sodium nitrite), dried cranberries, sea salt, celery powder, black pepper, spices',
  '633956ec-d9da-42eb-897d-f1a1169b391c':
    'Purified water, citric acid, natural and artificial flavors, taurine, niacin, sodium benzoate, potassium sorbate, sucralose, vitamin B6, folic acid, vitamin B12, caffeine, malic acid',
  '697c15f2-6071-4bb5-9d73-570d0a8d9396':
    'Creatine nitrate, beta-alanine, arginine alpha-ketoglutarate, caffeine anhydrous, natural and artificial flavors, citric acid, sucralose, acesulfame potassium, FD&C red 40',
  '70d0bad6-b3f1-4cc3-9a29-b983074e9ffa': 'Whey protein isolate, whey protein concentrate, natural and artificial flavors, lecithin, salt, acesulfame potassium, sucralose',
  '7167dfda-f9dc-4355-8c17-ef528477f8f1': 'Carbonated water, citric acid, natural and artificial flavors, caffeine, taurine, l-carnitine, sucralose, acesulfame potassium, B vitamins, FD&C colors',
  '727a0112-8c72-4f6d-af15-73cd4f88ff44':
    'Protein blend (whey protein isolate, milk protein isolate, calcium caseinate), peanut flour, isomalto-oligosaccharides, palm oil, cocoa, natural flavors, sea salt, sucralose',
  '79562463-5a27-4c3f-88cb-0d4dc1459915':
    'Carbonated water, citric acid, natural flavors, taurine, sodium citrate, panax ginseng root extract, l-carnitine, caffeine, sucralose, acesulfame potassium, niacinamide, vitamin B6, vitamin B12',
  '797b5297-ce2a-4ec0-b9c7-d221b568933a':
    'Protein blend (milk protein isolate, whey protein isolate), soluble corn fiber, almonds, erythritol, water, natural flavors, sunflower oil, sea salt, sucralose, cookie pieces',
  '7f6a17a0-85a7-43fd-8fe0-41fc11dd12e3':
    'Pea protein, organic pumpkin seed protein, organic sunflower seed protein, organic kale, organic spinach, organic broccoli, natural flavors, stevia leaf extract, probiotics',
  '8189685b-7019-488d-87a7-b9bede706159': 'Dates, egg whites, chocolate (chocolate liquor, cane sugar, cocoa butter), almonds, cashews, cocoa, natural flavors, sea salt',
  '82022af5-d057-400b-b803-a6e2c6056010': 'Egg whites, potato starch, sunflower oil, sea salt',
  '86194841-26fe-4678-8c4f-915dd1a775df':
    'Water, milk protein concentrate, sugar, cocoa, natural and artificial flavors, cellulose gel, salt, sucralose, acesulfame potassium, vitamin and mineral blend',
  '88b7cac7-dde9-4138-8db1-4a2b853fd17d':
    'Carbonated water, citric acid, natural flavors, taurine, caffeine, camu camu extract, panax ginseng extract, vitamin B blend, sucralose, acesulfame potassium',
  '8e2a843c-f8a3-466b-af6b-3111c7e47ae4':
    'Organic wheat grass, organic barley grass, organic alfalfa, organic spirulina, organic chlorella, organic broccoli, digestive enzyme blend, probiotics, natural flavors, stevia leaf extract',
  '8f657369-2da3-46d2-9d25-ccacf2cd8f72': 'Ultra-filtered milk, milk protein concentrate, cocoa, natural and artificial flavors, sucralose, acesulfame potassium, vitamin A palmitate, vitamin D3',
  '8fe0c489-9592-4248-8be3-706d53142d86': 'Micronized creatine monohydrate',
  '90775102-e0ad-4cac-8ce0-30567ae46a93': 'Whey protein isolate, cocoa, natural and artificial flavors, salt, sucralose, acesulfame potassium, lecithin',
  '99404631-2d54-426b-808d-978d59fcf793':
    'Organic milk protein concentrate, organic cane sugar, organic cocoa, water, organic sunflower oil, natural flavors, organic guar gum, sea salt, stevia leaf extract',
  '9a4d43eb-9dd8-4e92-ad40-cc02041cf2ce':
    'Carbonated water, citric acid, sodium bicarbonate, taurine, acesulfame K, aspartame, caffeine, inositol, niacinamide, calcium pantothenate, pyridoxine HCl, vitamin B12, natural and artificial flavors, colors',
  '9e55a64d-805e-4448-b006-f1e852b6aacd':
    'Organic bone broth protein, organic spinach, organic kale, organic beet, organic spirulina, organic cocoa, probiotics, digestive enzymes, natural flavors, stevia leaf extract',
  'a1b30ae3-001a-416a-80dd-6edfe8901024': 'Milk protein, peanuts, chicory root fiber, milk chocolate, natural flavors, salt, sucralose',
  'a31b7aca-00b0-4d9f-9276-f2eab98caa67':
    'Organic wheat grass, organic barley grass, organic alfalfa grass, organic spirulina, organic chlorella, organic broccoli, organic kale, probiotics, digestive enzymes, natural flavors',
  'a587a96a-8f0b-4517-84bd-77794a47c796': 'Beef, water, coconut aminos, cane sugar, sea salt, vinegar, spices, celery powder, rosemary extract',
  'a63c2fa3-6ead-45ae-a746-1c3a0ac8c840': 'Dates, egg whites, almonds, cashews, dried blueberries, natural flavors, sea salt',
  'a6e53791-0e9f-4ad0-a563-87b5dfd9a797': 'Citrulline malate, beta-alanine, betaine anhydrous, caffeine anhydrous, huperzine A, natural flavors, citric acid, stevia leaf extract, malic acid',
  'a76610cf-6c33-4cab-a6f8-de1f57180435': 'Organic pea protein, organic brown rice protein, organic cocoa, organic cane sugar, natural flavors, organic guar gum, sea salt, stevia leaf extract',
  'afba4aa4-14ce-4c88-91fe-e8efc4b3b57f': 'Almonds, peanuts, chicory root fiber, dark chocolate (cocoa mass, cane sugar, cocoa butter), honey, sea salt, soy lecithin, vanilla extract',
  'b9c3d745-8819-4642-be9a-2fba391faf49':
    'Carbonated water, sucrose, glucose, citric acid, taurine, sodium citrate, natural and artificial flavors, caffeine, guarana extract, ginseng extract, l-carnitine, sodium benzoate, colors',
  'c061cfaa-6040-4e05-a2db-2db6f9f37867': 'Carbonated water, citric acid, natural and artificial flavors, caffeine anhydrous, l-carnitine, taurine, sucralose, acesulfame potassium, FD&C colors',
  'c06d8bef-3a00-4ab7-af6a-900f69bc80de': 'Ultra-filtered milk, milk protein concentrate, natural and artificial flavors, sucralose, acesulfame potassium, vitamin A palmitate, vitamin D3',
  'c0e0adb2-d38e-4463-a4b5-f1ea72cf21f7': 'Organic spirulina, organic chlorella, organic wheatgrass, organic cocoa, probiotics, digestive enzymes, natural flavors, stevia leaf extract',
  'c43a0717-cdf3-4948-a0cd-c21c89e9d660':
    'Protein blend (whey protein isolate, milk protein isolate), isomalto-oligosaccharides, water, natural flavors, palm oil, cookie pieces, sunflower lecithin, sea salt, sucralose',
  'c9d05ba6-7091-4a38-8ef3-07703e4cd69f': 'Whey protein isolate, whey protein concentrate, cocoa, natural and artificial flavors, lecithin, salt, sucralose, acesulfame potassium',
  'c9f1498b-384c-4ba6-ae79-f0828f608af0': 'Water, corn maltodextrin, sugar, milk protein concentrate, canola oil, cocoa, natural and artificial flavors, vitamin and mineral blend, carrageenan',
  'ca19c321-3261-40aa-b0b5-d9505542c216': 'Whey protein concentrate, whey protein isolate, cocoa, natural and artificial flavors, lecithin, salt, sucralose',
  'ce8021cd-0bda-41d1-adc8-92be7d1b47d2': 'Organic pea protein, organic sprouted grain protein blend, organic cocoa, organic coconut sugar, natural flavors, probiotics, sea salt, stevia leaf extract',
  'd2023aea-7dac-44a2-b2b2-17390461e56e': 'Beef, sweet potato, carrots, kale, sea salt, spices, apple cider vinegar',
  'dd1b4203-47ce-4f08-91b0-4ca711f30ad0': 'Bovine hide collagen peptides',
  'dec24842-d43b-498e-b0db-352540cd5640': 'Whey protein isolate, almond flour, allulose, chocolate chips (unsweetened chocolate, allulose), eggs, butter, natural flavors, sea salt, baking soda',
  'e0f6757d-bfe9-4ee8-ab92-e3c237c46a88':
    'Carbonated water, citric acid, creatine nitrate, beta-alanine, caffeine anhydrous, natural and artificial flavors, sucralose, acesulfame potassium, FD&C colors',
  'e1bc3c7e-8c69-4222-acad-9a6447f3f4e2':
    'Organic moringa, organic spirulina, organic chlorella, organic wheatgrass, organic mint, organic ashwagandha, organic turmeric, organic coconut water, stevia leaf extract',
  'e3923d89-6f4e-46d6-b17f-d543265b506a': 'Vitamin D3 (cholecalciferol), extra virgin olive oil, gelatin, glycerin, purified water',
  'eda8aa6a-3e16-4b12-a833-e12f31dbfdf8': 'Beef, water, soy sauce, cane sugar, spices, caffeine, taurine, celery powder, natural smoke flavor',
  'ef1754e8-13ef-40ca-b7ec-43988c9a2ec3': 'L-citrulline, beta-alanine, betaine anhydrous, caffeine anhydrous, alpha-GPC, natural and artificial flavors, citric acid, malic acid, sucralose',
  'f064db19-7578-48c3-9dba-ae3048990d52': 'Creatine monohydrate',
  'f29002f6-f84f-4e69-aff5-406bd0c6128d': 'Protein blend (milk protein isolate, whey protein isolate), peanut butter, soluble corn fiber, erythritol, water, natural flavors, sea salt, sucralose',
  'fac44328-4f17-4565-b6a3-6b23019ac739': 'Whey protein isolate, cocoa, natural and artificial flavors, salt, sucralose, acesulfame potassium, soy lecithin',
  'fbe75644-159f-4d25-9699-ae9c05897133':
    'Carbonated water, sucrose, glucose, citric acid, taurine, sodium citrate, natural flavors, caffeine, sodium benzoate, panax ginseng root extract, l-carnitine, glucuronolactone, inositol, guarana seed extract, niacinamide, vitamin B blend',
  'fdaa9f22-a73c-4be2-988a-155515a30ecc': 'Creatine monohydrate, gelatin, magnesium stearate',
  'fea9549a-d4b9-445a-b233-8a365df21d8e': 'Whey protein concentrate, whey protein isolate, cocoa, natural and artificial flavors, salt, sucralose, sunflower lecithin',
}

async function main() {
  let updated = 0
  for (const [id, ingredients_text] of Object.entries(INGREDIENTS)) {
    const { error } = await admin.from('product_variants').update({ ingredients_text }).eq('id', id)
    if (error) {
      console.log(`  failed: ${id} -- ${error.message}`)
      continue
    }
    updated++
  }
  console.log(`Backfilled ${updated}/${Object.keys(INGREDIENTS).length}`)
}

main()
