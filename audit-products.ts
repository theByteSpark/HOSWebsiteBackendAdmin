/**
 * audit-products.ts
 *
 * Read-only audit script — inspects all active products and reports
 * variant image counts against the actual Prisma schema relations.
 *
 * Schema relations (from prisma/schema.prisma):
 *   Product.variants   → ProductVariant[]
 *   ProductVariant.images → VariantImage[]
 *
 * Run: npx ts-node audit-products.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      category: { select: { name: true } },
      variants: {
        include: { images: { orderBy: { sortOrder: 'asc' } } },
        orderBy: { metalFinish: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  console.log(`\n📦 House of Seya — Product Image Audit (${products.length} products)\n`);
  console.log('─'.repeat(60));

  let allOk = true;

  for (const product of products) {
    const totalImages = product.variants.reduce(
      (sum, variant) => sum + variant.images.length,
      0
    );

    const status = totalImages === 5 ? '✅' : '⚠️ ';
    if (totalImages !== 5) allOk = false;

    console.log(`\n${status} ${product.name}`);
    console.log(`   Published: ${product.isPublished} | InStock: ${product.inStock}`);

    for (const variant of product.variants) {
      const count = variant.images.length;
      const expected = variant.metalFinish === 'Yellow Gold' ? 3 : 1;
      const ok = count === expected ? '✓' : '✗';
      console.log(`   ${ok} ${variant.metalFinish}: ${count} image${count !== 1 ? 's' : ''}`);
    }

    console.log(`   → Total images: ${totalImages}`);
  }

  console.log('\n' + '─'.repeat(60));
  if (allOk) {
    console.log('✅ All products have the expected 5-image structure.\n');
  } else {
    console.log('⚠️  Some products do not match the expected 5-image structure.\n');
    process.exit(1);
  }
}

main()
  .catch((err: unknown) => {
    console.error('Audit failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
