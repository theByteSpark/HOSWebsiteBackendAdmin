/**
 * backfill-thumbnails.ts
 *
 * One-off script: generates 400px WebP thumbnails for existing uploads
 * that were created before thumbnail generation shipped, and updates
 * MediaAsset / VariantImage / ProductImage rows with thumbnailUrl.
 *
 * Run on the VPS (or locally) AFTER `prisma db push`:
 *   npx ts-node backfill-thumbnails.ts
 */

import { PrismaClient } from '@prisma/client';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { env } from './src/config/env';

const prisma = new PrismaClient();

const THUMBABLE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const THUMB_WIDTH = 400;

function thumbPathFor(filePath: string): string {
  const dir = path.dirname(filePath);
  const stem = path.basename(filePath, path.extname(filePath));
  return path.join(dir, `${stem}-thumb.webp`);
}

async function main() {
  const assets = await prisma.mediaAsset.findMany({
    where: { thumbnailUrl: null, mimeType: { in: THUMBABLE_MIME } },
  });
  console.log(`📸 ${assets.length} media assets missing thumbnails`);

  const urlToThumb = new Map<string, string>();

  for (const asset of assets) {
    if (!fs.existsSync(asset.path)) {
      console.log(`  ⚠️  file missing on disk: ${asset.path} — skipping`);
      continue;
    }
    try {
      const thumbPath = thumbPathFor(asset.path);
      if (!fs.existsSync(thumbPath)) {
        await sharp(asset.path)
          .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
          .webp({ quality: 80 })
          .toFile(thumbPath);
      }
      const folder = asset.folder || 'general';
      const thumbnailUrl = `${env.PUBLIC_MEDIA_URL}/${folder}/${path.basename(thumbPath)}`;

      await prisma.mediaAsset.update({
        where: { id: asset.id },
        data: { thumbnailUrl },
      });
      urlToThumb.set(asset.url, thumbnailUrl);
      console.log(`  ✅ ${asset.filename}`);
    } catch (err) {
      console.error(`  ❌ ${asset.filename}:`, err);
    }
  }

  // Propagate thumbnailUrl to VariantImage / ProductImage rows whose url matches
  for (const [url, thumbnailUrl] of urlToThumb) {
    await prisma.variantImage.updateMany({ where: { url }, data: { thumbnailUrl } });
    await prisma.productImage.updateMany({ where: { url }, data: { thumbnailUrl } });
  }

  console.log('\n✅ Backfill complete');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
