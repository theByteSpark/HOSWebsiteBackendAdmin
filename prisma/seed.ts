/**
 * prisma/seed.ts
 *
 * Seeds the House of Seya product catalogue using the same image URLs
 * currently used by the static frontend (src/mock.js).
 *
 * Image mapping follows the confirmed 5-image-per-product structure:
 *   Images 0-2 → Yellow Gold (3 images)
 *   Image  3   → White Gold  (1 image)
 *   Image  4   → Rose Gold   (1 image)
 *
 * Run: npx ts-node prisma/seed.ts
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

// ── Source images ─────────────────────────────────────────────────────────────
// These match PRODUCT_IMAGES in houseofseyaStaticwebsite/src/mock.js exactly.
const IMGS = [
  'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',   // 0
  'https://images.unsplash.com/photo-1624588057318-5f1b2eb81012?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 1
  'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 2
  'https://images.pexels.com/photos/2735981/pexels-photo-2735981.jpeg?auto=compress&cs=tinysrgb&w=900',   // 3
  'https://images.unsplash.com/photo-1605100804763-247f67b3557e?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 4
  'https://images.unsplash.com/photo-1633934542430-0905ccb5f050?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 5
  'https://images.unsplash.com/photo-1512163143273-bde0e3cc7407?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 6
  'https://images.pexels.com/photos/10075092/pexels-photo-10075092.jpeg?auto=compress&cs=tinysrgb&w=900', // 7
  'https://images.unsplash.com/photo-1693212793204-bcea856c75fe?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 8
  'https://images.unsplash.com/photo-1693213085235-ea6deadf8cee?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 9
  'https://images.pexels.com/photos/5370644/pexels-photo-5370644.jpeg?auto=compress&cs=tinysrgb&w=900',   // 10
  'https://images.pexels.com/photos/10976654/pexels-photo-10976654.jpeg?auto=compress&cs=tinysrgb&w=900', // 11
  'https://images.unsplash.com/photo-1631897817977-a1005c199b36?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',  // 12
  'https://images.pexels.com/photos/30720972/pexels-photo-30720972.jpeg?auto=compress&cs=tinysrgb&w=900', // 13
];

const SWATCH: Record<string, string> = {
  'Yellow Gold': '#E6C158',
  'White Gold':  '#E4E1D8',
  'Rose Gold':   '#E6B7A0',
};

function pickImages(offset: number) {
  const pick = (i: number) => IMGS[i % IMGS.length];
  return {
    yg: [pick(offset), pick(offset + 1), pick(offset + 2)],
    wg:  pick(offset + 3),
    rg:  pick(offset + 4),
  };
}

interface ProductDef {
  name: string; slug: string; subcategoryName: string;
  price: number; description: string; netWeightGrams: number;
  totalDiamondCt: number; totalDiamondPcs: number;
  diamondGrade: string; imgOffset: number;
}

const EARRING_PRODUCTS: ProductDef[] = [
  { name: 'Solitaire Studs',  slug: 'solitaire-studs',  subcategoryName: 'Solitaire Studs',  price: 85000,  description: 'The Solitaire Studs are crafted for everyday luxury — a single, brilliant lab-grown diamond in a timeless four-prong setting. IGI certified, finished in 24K gold vermeil over BIS hallmarked sterling silver.', netWeightGrams: 2.40, totalDiamondCt: 0.60, totalDiamondPcs: 2,  diamondGrade: 'EF VVS-VS', imgOffset: 8  },
  { name: 'Hoops & Huggies',  slug: 'hoops-huggies',    subcategoryName: 'Hoops & Huggies',   price: 112000, description: 'Versatile diamond-set hoops that sit close to the lobe for all-day comfort. IGI certified, finished in 24K gold vermeil.', netWeightGrams: 3.20, totalDiamondCt: 0.85, totalDiamondPcs: 21, diamondGrade: 'EF VVS-VS', imgOffset: 9  },
  { name: 'Other Studs',      slug: 'other-studs',       subcategoryName: 'Other Studs',       price: 72000,  description: 'Beautifully detailed diamond stud earrings beyond the solitaire — halos, clusters, and geometric settings. IGI certified, 24K gold vermeil.', netWeightGrams: 2.80, totalDiamondCt: 0.72, totalDiamondPcs: 18, diamondGrade: 'EF VVS-VS', imgOffset: 10 },
  { name: 'Halo Studs',       slug: 'halo-studs',        subcategoryName: 'Halo Studs',        price: 145000, description: 'A central lab-grown diamond surrounded by a brilliant halo of smaller stones. IGI certified, 24K gold vermeil finish.', netWeightGrams: 3.60, totalDiamondCt: 1.20, totalDiamondPcs: 34, diamondGrade: 'EF VVS-VS', imgOffset: 11 },
];

const NECKLACE_PRODUCTS: ProductDef[] = [
  { name: 'Pendants',         slug: 'pendants',          subcategoryName: 'Pendants',          price: 98000,  description: 'A single lab-grown diamond pendant — understated, everyday, and endlessly wearable. IGI certified diamond, 24K gold vermeil over BIS hallmarked sterling silver.', netWeightGrams: 2.10, totalDiamondCt: 0.50, totalDiamondPcs: 1,  diamondGrade: 'EF VVS-VS', imgOffset: 12 },
  { name: 'Pendant Sets',     slug: 'pendant-sets',      subcategoryName: 'Pendant Sets',      price: 185000, description: 'Matching necklace and earring sets in lab-grown diamonds — crafted to wear together or apart. IGI certified, 24K gold vermeil finish.', netWeightGrams: 5.80, totalDiamondCt: 1.45, totalDiamondPcs: 38, diamondGrade: 'EF VVS-VS', imgOffset: 0  },
  { name: 'Mangalsutra',      slug: 'mangalsutra',       subcategoryName: 'Mangalsutra',       price: 135000, description: 'A contemporary diamond mangalsutra — honoring tradition with modern design sensibility. Lab-grown diamonds, IGI certified, 24K gold vermeil.', netWeightGrams: 6.20, totalDiamondCt: 0.95, totalDiamondPcs: 28, diamondGrade: 'EF VVS-VS', imgOffset: 1  },
  { name: 'Trinket Necklace', slug: 'trinket-necklace',  subcategoryName: 'Trinket Necklace',  price: 68000,  description: 'A fine chain with a delicate diamond-set trinket — layerable and effortless. IGI certified diamonds, 24K gold vermeil.', netWeightGrams: 1.80, totalDiamondCt: 0.30, totalDiamondPcs: 8,  diamondGrade: 'EF VVS-VS', imgOffset: 2  },
];

const BRACELET_PRODUCTS: ProductDef[] = [
  { name: 'Tennis Bracelet',  slug: 'tennis-bracelet',   subcategoryName: 'Tennis Bracelet',   price: 225000, description: 'A continuous line of IGI certified lab-grown diamonds in a classic four-prong setting — the definitive wearable fine jewelry piece, finished in 24K gold vermeil.', netWeightGrams: 7.50, totalDiamondCt: 3.20, totalDiamondPcs: 32, diamondGrade: 'EF VVS-VS', imgOffset: 10 },
  { name: 'Station Bracelet', slug: 'station-bracelet',  subcategoryName: 'Station Bracelet',  price: 165000, description: 'Evenly spaced diamond stations on a delicate chain — elegant, minimal, and endlessly stackable. IGI certified lab-grown diamonds in 24K gold vermeil.', netWeightGrams: 4.30, totalDiamondCt: 1.80, totalDiamondPcs: 18, diamondGrade: 'EF VVS-VS', imgOffset: 11 },
];

async function upsertSub(name: string, catId: string, order: number) {
  const slug = name.toLowerCase().replace(/&/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  return prisma.subcategory.upsert({ where: { slug }, update: {}, create: { slug, name, categoryId: catId, sortOrder: order, isPublished: true } });
}

async function upsertProduct(def: ProductDef, categoryId: string) {
  const imgs = pickImages(def.imgOffset);
  const existing = await prisma.product.findUnique({ where: { slug: def.slug } });
  if (existing) { console.log(`  ⚠️  "${def.name}" already exists — skipping`); return; }

  const sub = await upsertSub(def.subcategoryName, categoryId, 0);
  const product = await prisma.product.create({
    data: {
      slug: def.slug, name: def.name, categoryId, subcategoryId: sub.id,
      price: new Prisma.Decimal(def.price), description: def.description,
      netWeightGrams: new Prisma.Decimal(def.netWeightGrams),
      totalDiamondCt: new Prisma.Decimal(def.totalDiamondCt),
      totalDiamondPcs: def.totalDiamondPcs, diamondGrade: def.diamondGrade,
      isPublished: true, inStock: true, isMadeToOrder: false,
    },
  });

  // Yellow Gold — 3 images
  const yg = await prisma.productVariant.create({ data: { productId: product.id, metalFinish: 'Yellow Gold', swatchColor: SWATCH['Yellow Gold'], isDefault: true,  inStock: true } });
  await prisma.variantImage.createMany({ data: [
    { variantId: yg.id, url: imgs.yg[0], sortOrder: 0, isPrimary: true,  altText: `${def.name} – Yellow Gold 1` },
    { variantId: yg.id, url: imgs.yg[1], sortOrder: 1, isPrimary: false, altText: `${def.name} – Yellow Gold 2` },
    { variantId: yg.id, url: imgs.yg[2], sortOrder: 2, isPrimary: false, altText: `${def.name} – Yellow Gold 3` },
  ]});

  // White Gold — 1 image
  const wg = await prisma.productVariant.create({ data: { productId: product.id, metalFinish: 'White Gold', swatchColor: SWATCH['White Gold'], isDefault: false, inStock: true } });
  await prisma.variantImage.create({ data: { variantId: wg.id, url: imgs.wg, sortOrder: 0, isPrimary: true, altText: `${def.name} – White Gold` } });

  // Rose Gold — 1 image
  const rg = await prisma.productVariant.create({ data: { productId: product.id, metalFinish: 'Rose Gold', swatchColor: SWATCH['Rose Gold'], isDefault: false, inStock: true } });
  await prisma.variantImage.create({ data: { variantId: rg.id, url: imgs.rg, sortOrder: 0, isPrimary: true, altText: `${def.name} – Rose Gold` } });

  console.log(`  ✅ ${def.name} — YG(3) WG(1) RG(1)`);
}

async function main() {
  console.log('🌱 Starting seed...');

  const [earringsCat, necklacesCat, braceletsCat] = await Promise.all([
    prisma.productCategory.upsert({ where: { slug: 'earrings' },  update: {}, create: { slug: 'earrings',  name: 'Earrings',  image: 'https://images.unsplash.com/photo-1693212793204-bcea856c75fe?crop=entropy&cs=srgb&fm=jpg&w=1000&q=85', sortOrder: 1, isPublished: true } }),
    prisma.productCategory.upsert({ where: { slug: 'necklaces' }, update: {}, create: { slug: 'necklaces', name: 'Necklaces', image: 'https://images.pexels.com/photos/20838859/pexels-photo-20838859.jpeg?auto=compress&cs=tinysrgb&w=1000', sortOrder: 2, isPublished: true } }),
    prisma.productCategory.upsert({ where: { slug: 'bracelets' }, update: {}, create: { slug: 'bracelets', name: 'Bracelets', image: 'https://images.pexels.com/photos/5370644/pexels-photo-5370644.jpeg?auto=compress&cs=tinysrgb&w=1000', sortOrder: 3, isPublished: true } }),
  ]);
  console.log('✅ Categories OK');

  console.log('\n📦 Earrings...');
  for (const d of EARRING_PRODUCTS) await upsertProduct(d, earringsCat.id);

  console.log('\n📦 Necklaces...');
  for (const d of NECKLACE_PRODUCTS) await upsertProduct(d, necklacesCat.id);

  console.log('\n📦 Bracelets...');
  for (const d of BRACELET_PRODUCTS) await upsertProduct(d, braceletsCat.id);

  console.log('\n✅ Seed complete!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
