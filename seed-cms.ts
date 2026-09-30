import { PrismaClient, FAQContext } from '@prisma/client';

const prisma = new PrismaClient();

async function seedCMS() {
  console.log('🚀 Seeding House of Seya CMS content into PostgreSQL...');

  // 1. Site Settings
  await prisma.siteSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      whatsappNumber: '918722447768',
      contactEmail: 'care@houseofseya.com',
      contactPhone: '+91 8722447768',
      instagramUrl: 'https://instagram.com/houseofseya',
      facebookUrl: 'https://facebook.com/houseofseya',
      youtubeUrl: 'https://youtube.com/houseofseya',
      footerTagline: 'Real Diamonds. Without the Weight. Fine Jewellery in Lab-Grown Diamonds & 24K Gold Vermeil.',
      footerCopyright: '© 2026 House of Seya. All Rights Reserved.',
      announcementMessages: [
        'Complimentary Insured Shipping Across India',
        'Complimentary 100-Day Insured Warranty',
      ],
      promises: [
        'IGI Certified Diamonds',
        '24K Gold Vermeil',
        'BIS Hallmarked Silver',
        'Secure Shipping',
        'Lifetime Buyback',
        '7-Day Easy Returns',
      ],
      pressNames: ['Vogue', 'ELLE', 'Grazia', 'Femina', 'The Hindu', 'Mid-day'],
      heroTiles: [
        {
          title: 'Crafted by us,\nDesigned by you',
          cta: 'Customise',
          image: 'https://images.unsplash.com/photo-1633934542430-0905ccb5f050?crop=entropy&cs=srgb&fm=jpg&w=1400&q=85',
          href: '/services/customise',
        },
        {
          title: 'Follow The Feeling',
          cta: 'About us',
          image: 'https://images.pexels.com/photos/10976654/pexels-photo-10976654.jpeg?auto=compress&cs=tinysrgb&w=1400',
          href: '/about',
        },
      ],
      diamondSectionVideo: 'https://cdn.coverr.co/videos/coverr-close-up-of-a-diamond-ring-2633/1080p.mp4',
      diamondSectionHeading: 'Diamonds that don’t cost the Earth',
      diamondSectionBody: 'Every House of Seya diamond is lab-grown — chemically, physically, and optically identical to a mined diamond, IGI certified, and priced with a lot more sense.',
    },
  });
  console.log('✅ SiteSettings seeded');

  // 2. Hero Slides
  const heroCount = await prisma.heroSlide.count();
  if (heroCount === 0) {
    await prisma.heroSlide.createMany({
      data: [
        {
          title: 'A New Language of Luxury',
          tagline: 'The Autumn Edit',
          image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
          cta: 'Explore',
          href: '/collections/earrings',
          sortOrder: 1,
          isActive: true,
        },
        {
          title: 'Same gold. New feeling.',
          tagline: 'Gold Reimagined',
          image: 'https://images.unsplash.com/photo-1573408301185-9146fe634ad0?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
          cta: 'Explore Jewellery',
          href: '/collections/necklaces',
          sortOrder: 2,
          isActive: true,
        },
        {
          title: 'Diamonds Made To Move With You',
          tagline: 'Follow The Feeling',
          image: 'https://images.pexels.com/photos/36599395/pexels-photo-36599395.jpeg?auto=compress&cs=tinysrgb&w=2000',
          cta: 'Explore Bracelets',
          href: '/collections/bracelets',
          sortOrder: 3,
          isActive: true,
        },
      ],
    });
    console.log('✅ HeroSlides seeded');
  }

  // 3. Navigation Items
  const navCount = await prisma.navigationItem.count();
  if (navCount === 0) {
    const earrings = await prisma.navigationItem.create({
      data: { label: 'Earrings', href: '/collections/earrings', sortOrder: 1, isActive: true },
    });
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Solitaire Studs', href: '/collections/earrings/solitaire-studs', parentId: earrings.id, sortOrder: 1 },
        { label: 'Hoops & Huggies', href: '/collections/earrings/hoops-huggies', parentId: earrings.id, sortOrder: 2 },
        { label: 'Other Studs', href: '/collections/earrings/other-studs', parentId: earrings.id, sortOrder: 3 },
        { label: 'Halo Studs', href: '/collections/earrings/halo-studs', parentId: earrings.id, sortOrder: 4 },
        { label: 'All Earrings', href: '/collections/earrings', parentId: earrings.id, sortOrder: 5 },
      ],
    });

    const necklaces = await prisma.navigationItem.create({
      data: { label: 'Necklaces', href: '/collections/necklaces', sortOrder: 2, isActive: true },
    });
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Pendants', href: '/collections/necklaces/pendants', parentId: necklaces.id, sortOrder: 1 },
        { label: 'Pendant Sets', href: '/collections/necklaces/pendant-sets', parentId: necklaces.id, sortOrder: 2 },
        { label: 'Mangalsutra', href: '/collections/necklaces/mangalsutra', parentId: necklaces.id, sortOrder: 3 },
        { label: 'Trinket Necklace', href: '/collections/necklaces/trinket-necklace', parentId: necklaces.id, sortOrder: 4 },
        { label: 'All Necklaces', href: '/collections/necklaces', parentId: necklaces.id, sortOrder: 5 },
      ],
    });

    const bracelets = await prisma.navigationItem.create({
      data: { label: 'Bracelets', href: '/collections/bracelets', sortOrder: 3, isActive: true },
    });
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Tennis Bracelet', href: '/collections/bracelets/tennis-bracelet', parentId: bracelets.id, sortOrder: 1 },
        { label: 'Station Bracelet', href: '/collections/bracelets/station-bracelet', parentId: bracelets.id, sortOrder: 2 },
        { label: 'All Bracelets', href: '/collections/bracelets', parentId: bracelets.id, sortOrder: 3 },
      ],
    });

    const services = await prisma.navigationItem.create({
      data: { label: 'Services', href: '/services/gifting', sortOrder: 4, isActive: true },
    });
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Gifting', href: '/services/gifting', parentId: services.id, sortOrder: 1 },
        { label: 'Customise', href: '/services/customise', parentId: services.id, sortOrder: 2 },
      ],
    });

    const guide = await prisma.navigationItem.create({
      data: { label: 'Jewellery Guide', href: '/pages/diamond-education', sortOrder: 5, isActive: true },
    });
    await prisma.navigationItem.createMany({
      data: [
        { label: 'Diamond Education', href: '/pages/diamond-education', parentId: guide.id, sortOrder: 1 },
        { label: 'Gold Vermeil', href: '/pages/gold-vermeil', parentId: guide.id, sortOrder: 2 },
        { label: "FAQ's", href: '/faqs', parentId: guide.id, sortOrder: 3 },
        { label: 'Blogs', href: '/blogs', parentId: guide.id, sortOrder: 4 },
      ],
    });

    console.log('✅ Navigation items seeded');
  }

  // 4. Customer Reviews
  const reviewCount = await prisma.review.count();
  if (reviewCount === 0) {
    await prisma.review.createMany({
      data: [
        {
          name: 'Priya',
          location: 'London',
          quote: "I ordered from the UK and I honestly can't thank the HouseOfSeya team enough. From the very beginning, the whole experience felt personal and truly special.",
          imageUrl: 'https://images.unsplash.com/photo-1541679368093-5c967ac6de11?crop=entropy&cs=srgb&fm=jpg&w=800&q=85',
          rating: 5,
          productName: 'Solitaire Studs',
          verified: true,
          isPublished: true,
        },
        {
          name: 'Shivani & Jason',
          location: 'Mumbai',
          quote: 'Working with HouseOfSeya was seamless! Got my personalised piece done, and it came out beautiful. Thank you!',
          imageUrl: 'https://images.unsplash.com/photo-1540076156429-35ffe82b7870?crop=entropy&cs=srgb&fm=jpg&w=800&q=85',
          rating: 5,
          productName: 'Custom Order',
          verified: true,
          isPublished: true,
        },
        {
          name: 'Rashi',
          location: 'London',
          quote: 'Great experience! I bought a piece from HouseOfSeya, and it was perfect. I would 100% recommend if you are looking for diamond jewellery.',
          imageUrl: 'https://images.unsplash.com/photo-1631897817977-a1005c199b36?crop=entropy&cs=srgb&fm=jpg&w=800&q=85',
          rating: 5,
          productName: 'Hoops & Huggies',
          verified: true,
          isPublished: true,
        },
      ],
    });
    console.log('✅ Reviews seeded');
  }

  // 5. Blog Posts
  const blogCount = await prisma.blogPost.count();
  if (blogCount === 0) {
    await prisma.blogPost.createMany({
      data: [
        {
          title: 'The Solitaire Stud: A Guide to Everyday Sparkle',
          slug: 'solitaire-studs-everyday-guide',
          excerpt: 'Why a single, brilliant diamond is the most versatile piece in your jewellery box.',
          imageUrl: 'https://images.unsplash.com/photo-1693212793204-bcea856c75fe?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',
          body: 'A solitaire stud features a single, brilliant lab-grown diamond as the centerpiece — clean, timeless, and endlessly wearable. Every House of Seya solitaire diamond is IGI certified, so the brilliance you see is backed by independent, verifiable documentation.',
          isPublished: true,
          publishedAt: new Date(),
        },
        {
          title: 'Hoops vs. Huggies: Which Earring Style Fits Your Day?',
          slug: 'hoops-huggies-styling',
          excerpt: 'From close-to-the-lobe huggies to statement hoops — how to pick your everyday go-to.',
          imageUrl: 'https://images.pexels.com/photos/5370644/pexels-photo-5370644.jpeg?auto=compress&cs=tinysrgb&w=900',
          body: 'Huggies sit close to the earlobe, ideal for all-day, low-profile wear. Larger hoops make more of a statement and are great for adding instant polish to a simple outfit. Both are finished in 24K gold vermeil, built for daily wear.',
          isPublished: true,
          publishedAt: new Date(),
        },
        {
          title: 'Gold Vermeil vs. Gold Plated: What the Label Actually Means',
          slug: 'gold-vermeil-vs-plated',
          excerpt: 'The 2.5-micron standard that separates real vermeil from ordinary gold plating.',
          imageUrl: 'https://images.unsplash.com/photo-1633934542430-0905ccb5f050?crop=entropy&cs=srgb&fm=jpg&w=900&q=85',
          body: 'Gold vermeil is a real, regulated jewelry standard — a rich layer of genuine gold bonded over a sterling silver base, at least 2.5 microns thick. Ordinary "gold plated" jewelry has no such minimum and is often closer to 0.5 microns, which fades within weeks.',
          isPublished: true,
          publishedAt: new Date(),
        },
      ],
    });
    console.log('✅ Blog Posts seeded');
  }

  // 6. FAQ Categories & FAQs
  let generalCat = await prisma.fAQCategory.findFirst({ where: { name: 'General & Craft' } });
  if (!generalCat) {
    generalCat = await prisma.fAQCategory.create({ data: { name: 'General & Craft', sortOrder: 1 } });
  }

  const faqCount = await prisma.fAQ.count();
  if (faqCount === 0) {
    await prisma.fAQ.createMany({
      data: [
        {
          categoryId: generalCat.id,
          question: 'What are lab-grown diamonds?',
          answer: 'Lab-grown diamonds are real diamonds, created using the same carbon-crystallization process that forms diamonds underground, replicated in a controlled lab environment. They are chemically, physically, and optically identical to mined diamonds. Every House of Seya diamond comes with IGI certification.',
          context: FAQContext.GENERAL,
          isPublished: true,
          sortOrder: 1,
        },
        {
          categoryId: generalCat.id,
          question: 'What is 24K Gold Vermeil?',
          answer: 'Gold vermeil is a regulated jewelry standard — a rich layer of genuine 24K gold bonded over a BIS hallmarked sterling silver base, at least 2.5 microns thick. Built to handle daily wear and water exposure.',
          context: FAQContext.GENERAL,
          isPublished: true,
          sortOrder: 2,
        },
      ],
    });
    console.log('✅ FAQs seeded');
  }

  // 7. Pages (About, Diamond Education, Gold Vermeil, Customise, Gifting)
  const pagesToSeed = [
    {
      slug: 'about',
      title: 'About House of Seya',
      content: {
        hero: {
          image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
          tagline: 'Our Story',
          title: 'Real Diamonds. Without the Weight.',
          body: 'Fine jewelry has always asked you to choose — between what’s real and what’s affordable, between wearing it and protecting it, between today and someday. We think you should have both.',
        },
        philosophy: {
          tagline: 'Because it Feels Right',
          title: 'Diamonds that don’t cost the Earth',
          body: 'Every House of Seya diamond is lab-grown — chemically, physically, and optically identical to a mined diamond, IGI certified, and priced with a lot more sense.',
          image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&w=1200&q=85',
        },
        founder: {
          tagline: 'Homegrown in India',
          name: 'Seya Kapoor',
          title: 'Founder, House of Seya',
          image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?crop=entropy&cs=srgb&fm=jpg&w=800&q=85',
          body: 'House of Seya began out of a frustration with an industry that made fine jewellery feel distant and transactional.',
        },
      },
    },
    {
      slug: 'diamond-education',
      title: 'Diamond Education & Guide',
      content: {
        hero: {
          title: 'The Complete Diamond Guide',
          image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
        },
        fourCs: {
          title: "THE 4C'S OF DIAMONDS",
          intro: 'Every diamond, lab-grown or mined, is evaluated on Cut, Colour, Clarity, and Carat.',
        },
      },
    },
    {
      slug: 'gold-vermeil',
      title: '24K Gold Vermeil Guide',
      content: {
        hero: {
          title: 'Understanding 24K Gold Vermeil',
          image: 'https://images.unsplash.com/photo-1633934542430-0905ccb5f050?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
        },
      },
    },
    {
      slug: 'customise',
      title: 'Customise Your Jewellery',
      content: {
        hero: {
          title: 'Your Diamond, Your Design',
          subhead: 'Build a bespoke piece around an IGI certified lab-grown diamond.',
          image: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&w=2000&q=85',
        },
      },
    },
    {
      slug: 'gifting',
      title: 'The Art of Gifting',
      content: {
        hero: {
          title: "A Gift They'll Actually Wear",
          image: 'https://images.pexels.com/photos/28146843/pexels-photo-28146843.jpeg?auto=compress&cs=tinysrgb&w=2000',
        },
      },
    },
  ];

  for (const pageItem of pagesToSeed) {
    await prisma.page.upsert({
      where: { slug: pageItem.slug },
      update: {},
      create: {
        slug: pageItem.slug,
        title: pageItem.title,
        content: pageItem.content,
        isPublished: true,
      },
    });
  }
  console.log('✅ Structured Pages seeded');

  console.log('\n🎉 Complete CMS seeding finished successfully!');
}

seedCMS()
  .catch((e) => {
    console.error('❌ Error seeding CMS:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
