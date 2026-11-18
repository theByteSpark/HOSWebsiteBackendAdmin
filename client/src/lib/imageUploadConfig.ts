/**
 * imageUploadConfig.ts
 *
 * Centralized aspect-ratio configuration for every image upload context
 * in the House of Seya Admin CMS.
 *
 * Rules:
 *  - ratio: required crop ratio (width / height)
 *  - label: human-readable description shown in the crop modal header
 *  - minWidth / minHeight: optional minimum resolution guard
 *  - tolerance: how close the uploaded image ratio must be before we skip
 *    the crop dialog (default 0.02 = ±2%)
 */

export interface ImageUploadConfig {
  ratio: number;
  label: string;
  guidance: string;    // Short string shown next to the upload field
  minWidth?: number;
  minHeight?: number;
  tolerance?: number;  // Default: 0.02
}

// ─── Ratio constants ────────────────────────────────────────────────────────

const R_3_2    = 3 / 2;       // 1.500 – product gallery images
const R_16_9   = 16 / 9;      // 1.778 – hero / landscape banners
const R_4_5    = 4 / 5;       // 0.800 – portrait editorial shots
const R_4_3    = 4 / 3;       // 1.333 – informational / editorial
const R_1_1    = 1 / 1;       // 1.000 – category thumbnails (square)

// ─── Upload context configurations ──────────────────────────────────────────

export const IMAGE_UPLOAD_CONFIGS = {
  // ── Products ──────────────────────────────────────────────────────────────
  PRODUCT_GALLERY: {
    ratio: R_3_2,
    label: 'Product Gallery Image',
    guidance: 'Required: 3:2 (e.g. 1500 × 1000 px)',
    minWidth: 600,
    minHeight: 400,
  },

  // ── Home Page ─────────────────────────────────────────────────────────────
  HOME_HERO_SLIDE: {
    ratio: R_16_9,
    label: 'Home Hero Slide Image',
    guidance: 'Required: 16:9 (e.g. 1920 × 1080 px)',
    minWidth: 1200,
    minHeight: 675,
  },

  // ── About Page ────────────────────────────────────────────────────────────
  ABOUT_HERO: {
    ratio: R_16_9,
    label: 'About Hero Cover Image',
    guidance: 'Required: 16:9 Desktop',
    minWidth: 1200,
    minHeight: 675,
  },
  ABOUT_SECTION_PORTRAIT: {
    ratio: R_4_5,
    label: 'About Section Image (Portrait)',
    guidance: 'Required: 4:5 Portrait',
    minWidth: 400,
    minHeight: 500,
  },

  // ── Gifting Page ──────────────────────────────────────────────────────────
  GIFTING_HERO: {
    ratio: R_16_9,
    label: 'Gifting Hero Image',
    guidance: 'Required: 16:9 Landscape',
    minWidth: 1200,
    minHeight: 675,
  },

  // ── Diamond Education Page ────────────────────────────────────────────────
  DIAMOND_HERO: {
    ratio: R_16_9,
    label: 'Diamond Education Hero',
    guidance: 'Required: 16:9 Landscape',
    minWidth: 1200,
    minHeight: 675,
  },
  DIAMOND_SECTION: {
    ratio: R_4_3,
    label: 'Diamond Education Section Image',
    guidance: 'Required: 4:3',
    minWidth: 400,
    minHeight: 300,
  },

  // ── Gold Vermeil Page ─────────────────────────────────────────────────────
  GOLD_VERMEIL_HERO: {
    ratio: R_16_9,
    label: 'Gold Vermeil Hero Image',
    guidance: 'Required: 16:9 Landscape',
    minWidth: 1200,
    minHeight: 675,
  },

  // ── Blog / Journal ────────────────────────────────────────────────────────
  BLOG_COVER: {
    ratio: R_16_9,
    label: 'Article Cover Image',
    guidance: 'Required: 16:9 (e.g. 1200 × 675 px)',
    minWidth: 600,
    minHeight: 338,
  },

  // ── Collections / Categories ──────────────────────────────────────────────
  CATEGORY_COVER: {
    ratio: R_1_1,
    label: 'Category Cover Image',
    guidance: 'Required: 1:1 Square',
    minWidth: 400,
    minHeight: 400,
  },
} as const satisfies Record<string, ImageUploadConfig>;

export type ImageUploadContextKey = keyof typeof IMAGE_UPLOAD_CONFIGS;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export const DEFAULT_TOLERANCE = 0.03; // ±3% tolerance before crop dialog triggers

/**
 * Returns true when the uploaded image dimensions already satisfy the
 * required aspect ratio (within tolerance).
 */
export function isRatioCorrect(
  width: number,
  height: number,
  config: ImageUploadConfig,
): boolean {
  const uploaded = width / height;
  const tol = config.tolerance ?? DEFAULT_TOLERANCE;
  return Math.abs(uploaded - config.ratio) <= tol;
}

/**
 * Returns true when the image meets the minimum resolution requirement.
 */
export function meetsMinResolution(
  width: number,
  height: number,
  config: ImageUploadConfig,
): boolean {
  if (config.minWidth && width < config.minWidth) return false;
  if (config.minHeight && height < config.minHeight) return false;
  return true;
}
