import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const subs = await prisma.subcategory.findMany({
    select: { slug: true, name: true, category: { select: { slug: true } } },
    orderBy: { name: 'asc' },
  });
  subs.forEach(s => console.log(`${s.category.slug} / ${s.slug}  →  "${s.name}"`));
}
main().catch(console.error).finally(() => prisma.$disconnect());
