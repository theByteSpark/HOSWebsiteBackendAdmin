import { PrismaClient, AdminRole, FAQContext } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'node:fs';
import path from 'node:path';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive House of Seya database seeding from extracted storefront data...');

  const dataFilePath = path.join(__dirname, 'data', 'storefront_data.json');
  if (!fs.existsSync(dataFilePath)) {
    throw new Error(`Data file not found at ${dataFilePath}. Please run data extraction first.`);
  }

  const dataset = JSON.parse(fs.readFileSync(dataFilePath, 'utf8'));

  // 1. Seed Super Admin User
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const admin = await prisma.adminUser.upsert({
    where: { email: 'admin@houseofseya.com' },
    update: {
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
    },
    create: {
      name: 'Super Admin',
      email: 'admin@houseofseya.com',
      passwordHash,
      role: AdminRole.SUPER_ADMIN,
      isActive: true,
      permissions: { all: true },
    },
  });
  console.log(`✅ Super Admin verified: ${admin.email}`);

  // 2. Seed Categories & Subcategories
  // Delete legacy dummy category rings if present
  const legacyRings = await prisma.productCategory.findUnique({ where: { slug: 'rings' } });
  if (legacyRings) {
    const subcats = await prisma.subcategory.findMany({ where: { categoryId: legacyRings.id } });
    for (const s of subcats) {
      await prisma.subcategorySEO.deleteMany({ where: { subcategoryId: s.id } });
      await prisma.subcategory.delete({ where: { id: s.id } });
    }
    await prisma.categorySEO.deleteMany({ where: { categoryId: legacyRings.id } });
    await prisma.productCategory.delete({ where: { id: legacyRings.id } });
  }

  // Delete legacy FAQ category/faqs if present
  await prisma.fAQ.deleteMany({});
  await prisma.fAQCategory.deleteMany({});

  const categoryMap = new Map<string, string>(); // slug -> id
  const subcategoryMap = new Map<string, string>(); // slug -> id

  // Map of category slug to subcategories
  const categorySubcategoryMap: Record<string, string[]> = {
    earrings: ['solitaire-studs', 'halo-studs', 'other-studs', 'hoops-huggies', 'all-earrings'],
    bracelets: ['tennis-bracelet', 'station-bracelet', 'all-bracelets'],
    necklaces: ['pendants', 'pendant-sets', 'mangalsutra', 'trinket-necklace', 'all-necklaces'],
  };

  for (let i = 0; i < dataset.categories.length; i++) {
    const cat = dataset.categories[i];
    const catRecord = await prisma.productCategory.upsert({
      where: { slug: cat.id },
      update: {
        name: cat.name,
        image: cat.image,
        sortOrder: i + 1,
        isPublished: true,
      },
      create: {
        slug: cat.id,
        name: cat.name,
        image: cat.image,
        sortOrder: i + 1,
        isPublished: true,
      },
    });
    categoryMap.set(cat.id, catRecord.id);

    // Upsert subcategories under this category
    const subSlugs = categorySubcategoryMap[cat.id] || [];
    for (let j = 0; j < subSlugs.length; j++) {
      const subSlug = subSlugs[j];
      const subInfo = dataset.subcategoryContent[subSlug] || {
        title: subSlug.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      };

      const subRecord = await prisma.subcategory.upsert({
        where: { slug: subSlug },
        update: {
          name: subInfo.title || subSlug,
          categoryId: catRecord.id,
          sortOrder: j + 1,
          isPublished: true,
        },
        create: {
          slug: subSlug,
          name: subInfo.title || subSlug,
          categoryId: catRecord.id,
          sortOrder: j + 1,
          isPublished: true,
        },
      });
      subcategoryMap.set(subSlug, subRecord.id);

      // Upsert rich subcategory SEO / Content
      if (dataset.subcategoryContent[subSlug]) {
        await prisma.subcategorySEO.upsert({
          where: { subcategoryId: subRecord.id },
          update: {
            metaTitle: `${subInfo.title} | House of Seya`,
            metaDescription: subInfo.description || `Explore ${subInfo.title} in 24K Gold Vermeil.`,
            seoHeading: subInfo.seoHeading,
            seoIntro: subInfo.seoIntro,
            seoSections: subInfo.seoSections || null,
            whyUs: subInfo.whyUs || null,
            closingTitle: subInfo.closingTitle,
            closing: subInfo.closing,
            faqs: subInfo.faqs || null,
          },
          create: {
            subcategoryId: subRecord.id,
            metaTitle: `${subInfo.title} | House of Seya`,
            metaDescription: subInfo.description || `Explore ${subInfo.title} in 24K Gold Vermeil.`,
            seoHeading: subInfo.seoHeading,
            seoIntro: subInfo.seoIntro,
            seoSections: subInfo.seoSections || null,
            whyUs: subInfo.whyUs || null,
            closingTitle: subInfo.closingTitle,
            closing: subInfo.closing,
            faqs: subInfo.faqs || null,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${categoryMap.size} categories and ${subcategoryMap.size} subcategories with SEO/content.`);

  // 3. Seed Products
  // Clean up any initial dummy products from prior seed template
  const dummySlugs = ['celestial-solitaire-ring', 'luminary-diamond-studs'];
  const dummyProducts = await prisma.product.findMany({ where: { slug: { in: dummySlugs } } });
  for (const dp of dummyProducts) {
    await prisma.stockMovement.deleteMany({ where: { inventoryItem: { productId: dp.id } } });
    await prisma.inventoryItem.deleteMany({ where: { productId: dp.id } });
    await prisma.productVariant.deleteMany({ where: { productId: dp.id } });
    await prisma.productImage.deleteMany({ where: { productId: dp.id } });
    await prisma.productSEO.deleteMany({ where: { productId: dp.id } });
    await prisma.orderItem.deleteMany({ where: { productId: dp.id } });
    await prisma.product.delete({ where: { id: dp.id } });
  }

  for (let i = 0; i < dataset.products.length; i++) {
    const p = dataset.products[i];
    const categoryId = categoryMap.get(p.category);
    if (!categoryId) {
      console.warn(`Category not found for product ${p.name}: ${p.category}`);
      continue;
    }
    const subcategoryId = p.subcategorySlug ? subcategoryMap.get(p.subcategorySlug) : null;
    const sku = `HOS-${p.id.toUpperCase()}`;

    const productRecord = await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        name: p.name,
        sku,
        categoryId,
        subcategoryId,
        price: p.price,
        description: p.description,
        isPublished: true,
        inStock: p.inStock ?? true,
        totalDiamondCt: p.carat ? parseFloat(p.carat) : null,
        diamondGrade: 'EF VVS-VS',
        sortOrder: i + 1,
      },
      create: {
        slug: p.slug,
        name: p.name,
        sku,
        categoryId,
        subcategoryId,
        price: p.price,
        description: p.description,
        isPublished: true,
        inStock: p.inStock ?? true,
        totalDiamondCt: p.carat ? parseFloat(p.carat) : null,
        diamondGrade: 'EF VVS-VS',
        sortOrder: i + 1,
      },
    });

    // Delete existing product images to prevent duplicates on rerun
    await prisma.productImage.deleteMany({ where: { productId: productRecord.id } });

    // Insert main image
    if (p.image) {
      await prisma.productImage.create({
        data: {
          productId: productRecord.id,
          url: p.image,
          altText: `${p.name} - Primary Image`,
          sortOrder: 1,
          isHover: false,
        },
      });
    }

    // Insert hover image
    if (p.hoverImage) {
      await prisma.productImage.create({
        data: {
          productId: productRecord.id,
          url: p.hoverImage,
          altText: `${p.name} - Hover Image`,
          sortOrder: 2,
          isHover: true,
        },
      });
    }

    // Upsert variant
    const existingVariant = await prisma.productVariant.findFirst({
      where: { productId: productRecord.id, metalFinish: p.metal || '24K Gold Vermeil' },
    });
    if (!existingVariant) {
      await prisma.productVariant.create({
        data: {
          productId: productRecord.id,
          metalFinish: p.metal || '24K Gold Vermeil',
          swatchColor: '#E6C158',
          priceOffset: 0,
          isDefault: true,
          inStock: true,
        },
      });
    }

    // Upsert inventory
    const existingInventory = await prisma.inventoryItem.findFirst({
      where: { productId: productRecord.id },
    });
    if (!existingInventory) {
      await prisma.inventoryItem.create({
        data: {
          productId: productRecord.id,
          quantity: 10,
          reorderLevel: 2,
        },
      });
    }
  }
  console.log(`✅ Seeded ${dataset.products.length} products with images, variants, and stock.`);

  // 4. Seed Hero Slides
  await prisma.heroSlide.deleteMany(); // Refresh slides
  for (let i = 0; i < dataset.heroSlides.length; i++) {
    const s = dataset.heroSlides[i];
    await prisma.heroSlide.create({
      data: {
        title: s.title,
        tagline: s.tagline || null,
        image: s.image,
        cta: s.cta || 'Shop Now',
        href: s.href || '/collections/earrings',
        sortOrder: i + 1,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${dataset.heroSlides.length} hero slides.`);

  // 5. Seed Reviews
  await prisma.review.deleteMany(); // Refresh reviews
  for (let i = 0; i < dataset.testimonials.length; i++) {
    const r = dataset.testimonials[i];
    await prisma.review.create({
      data: {
        name: r.name,
        location: r.location || 'India',
        quote: r.quote,
        rating: r.rating || 5,
        productName: r.productName || null,
        verified: true,
        isPublished: true,
        source: 'Website',
      },
    });
  }
  console.log(`✅ Seeded ${dataset.testimonials.length} reviews.`);

  // 6. Seed Blogs
  const blogCategory = await prisma.blogCategory.upsert({
    where: { slug: 'jewelry-guide' },
    update: { name: 'Jewelry Guide' },
    create: { slug: 'jewelry-guide', name: 'Jewelry Guide' },
  });

  for (const b of dataset.blogs) {
    await prisma.blogPost.upsert({
      where: { slug: b.slug },
      update: {
        title: b.title,
        excerpt: b.excerpt || null,
        body: b.excerpt || null,
        sections: b.sections || null,
        imageUrl: b.image || null,
        categoryId: blogCategory.id,
        isPublished: true,
        publishedAt: new Date(),
      },
      create: {
        slug: b.slug,
        title: b.title,
        excerpt: b.excerpt || null,
        body: b.excerpt || null,
        sections: b.sections || null,
        imageUrl: b.image || null,
        categoryId: blogCategory.id,
        isPublished: true,
        publishedAt: new Date(),
      },
    });
  }
  console.log(`✅ Seeded ${dataset.blogs.length} journal blog posts.`);

  // 7. Seed FAQs
  const faqGroups = Array.from(new Set(dataset.faqs.map((f: any) => f.group || 'General')));
  const faqCategoryMap = new Map<string, string>();

  for (let i = 0; i < faqGroups.length; i++) {
    const groupName = faqGroups[i] as string;
    const cat = await prisma.fAQCategory.create({
      data: {
        name: groupName,
        sortOrder: i + 1,
      },
    });
    faqCategoryMap.set(groupName, cat.id);
  }

  for (let i = 0; i < dataset.faqs.length; i++) {
    const f = dataset.faqs[i];
    const categoryId = faqCategoryMap.get(f.group || 'General') || faqCategoryMap.values().next().value!;
    await prisma.fAQ.create({
      data: {
        categoryId,
        question: f.q,
        answer: f.a,
        context: FAQContext.GENERAL,
        sortOrder: i + 1,
        isPublished: true,
      },
    });
  }
  console.log(`✅ Seeded ${dataset.faqs.length} FAQs across ${faqGroups.length} categories.`);

  // 8. Seed Navigation Items
  await prisma.navigationItem.deleteMany();
  for (let i = 0; i < dataset.navLinks.length; i++) {
    const rootNav = dataset.navLinks[i];
    const parent = await prisma.navigationItem.create({
      data: {
        label: rootNav.label,
        href: rootNav.href,
        sortOrder: i + 1,
        isActive: true,
      },
    });

    if (rootNav.sub && rootNav.sub.length > 0) {
      for (let j = 0; j < rootNav.sub.length; j++) {
        const subNav = rootNav.sub[j];
        await prisma.navigationItem.create({
          data: {
            label: subNav.label,
            href: subNav.href,
            parentId: parent.id,
            sortOrder: j + 1,
            isActive: true,
          },
        });
      }
    }
  }
  console.log(`✅ Seeded ${dataset.navLinks.length} navigation root groups and sub-items.`);

  // 9. Seed 5 Structured Pages
  const pageEntries = [
    { slug: 'about', title: 'About House of Seya', content: dataset.pages.about },
    { slug: 'diamond-education', title: 'Diamond Education', content: dataset.pages.diamondEducation },
    { slug: 'gold-vermeil', title: 'Gold & Metals Guide', content: dataset.pages.goldVermeil },
    { slug: 'gifting', title: 'Gifting Service', content: dataset.pages.gifting },
    { slug: 'customise', title: 'Customisation Service', content: dataset.pages.customise },
  ];

  for (const p of pageEntries) {
    await prisma.page.upsert({
      where: { slug: p.slug },
      update: {
        title: p.title,
        content: p.content,
        isPublished: true,
      },
      create: {
        slug: p.slug,
        title: p.title,
        content: p.content,
        isPublished: true,
      },
    });
  }
  console.log(`✅ Seeded ${pageEntries.length} structured pages (About, Diamond Education, Gold Vermeil, Gifting, Customise).`);

  // 10. Seed SiteSettings Singleton
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {
      whatsappNumber: dataset.whatsappNumber,
      contactEmail: 'care@houseofseya.com',
      contactPhone: dataset.whatsappNumber,
      instagramUrl: 'https://instagram.com/houseofseya',
      facebookUrl: 'https://facebook.com/houseofseya',
      footerTagline: 'Fine Jewellery in Lab-Grown Diamonds & 24K Gold Vermeil.',
      footerCopyright: '© 2026 House of Seya. All rights reserved.',
      announcementMessages: [
        'Complimentary insured shipping on all orders',
        'Certified Lab-Grown Diamonds • 24K Gold Vermeil',
      ],
      promises: dataset.promises || [],
      pressNames: dataset.press || [],
      heroTiles: dataset.heroTiles || [],
      diamondSectionVideo: dataset.diamondSectionVideo || null,
      diamondSectionHeading: 'Diamonds Made To Move With You',
      diamondSectionBody: 'Every House of Seya diamond is IGI certified, lab-grown with ethical precision and crafted in solid 24K Gold Vermeil.',
    },
    create: {
      id: 'singleton',
      whatsappNumber: dataset.whatsappNumber,
      contactEmail: 'care@houseofseya.com',
      contactPhone: dataset.whatsappNumber,
      instagramUrl: 'https://instagram.com/houseofseya',
      facebookUrl: 'https://facebook.com/houseofseya',
      footerTagline: 'Fine Jewellery in Lab-Grown Diamonds & 24K Gold Vermeil.',
      footerCopyright: '© 2026 House of Seya. All rights reserved.',
      announcementMessages: [
        'Complimentary insured shipping on all orders',
        'Certified Lab-Grown Diamonds • 24K Gold Vermeil',
      ],
      promises: dataset.promises || [],
      pressNames: dataset.press || [],
      heroTiles: dataset.heroTiles || [],
      diamondSectionVideo: dataset.diamondSectionVideo || null,
      diamondSectionHeading: 'Diamonds Made To Move With You',
      diamondSectionBody: 'Every House of Seya diamond is IGI certified, lab-grown with ethical precision and crafted in solid 24K Gold Vermeil.',
    },
  });
  console.log('✅ SiteSettings singleton seeded.');

  console.log('🎉 ALL WEBSITE DATA SUCCESSFULLY IMPORTED INTO POSTGRESQL!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
