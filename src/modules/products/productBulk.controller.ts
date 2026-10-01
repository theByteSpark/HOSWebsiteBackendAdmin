import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/db';
import { generateSlug } from '../../utils/slug';

const PRODUCTS_SHEET = 'Products';
const MAX_ROWS = 500;
const MAX_IMAGES = 5;

// Every new product is created with all three finishes; Yellow Gold is the default.
const FINISHES = [
  { metalFinish: 'Yellow Gold', swatchColor: '#E6C158', isDefault: true },
  { metalFinish: 'White Gold', swatchColor: '#E4E1D8', isDefault: false },
  { metalFinish: 'Rose Gold', swatchColor: '#E6B7A0', isDefault: false },
];

// Column order is also the order in the template. Image columns are optional.
const COLUMNS = [
  { key: 'name', header: 'Product Name', width: 30 },
  { key: 'sku', header: 'SKU', width: 16 },
  { key: 'subcategory', header: 'Subcategory', width: 20 },
  { key: 'price', header: 'Price (INR)', width: 14 },
  { key: 'netWeight', header: 'Net Weight (g)', width: 16 },
  { key: 'totalDiamondCt', header: 'Total Diamond Weight (ct)', width: 26 },
  { key: 'smallDiamondCt', header: 'Small Diamond Weight (ct)', width: 26 },
  { key: 'totalDiamondPcs', header: 'Total Diamond Pieces', width: 20 },
  { key: 'description', header: 'Description', width: 50 },
  { key: 'image1', header: 'Image 1', width: 24, optional: true },
  { key: 'image2', header: 'Image 2', width: 24, optional: true },
  { key: 'image3', header: 'Image 3', width: 24, optional: true },
  { key: 'image4', header: 'Image 4', width: 24, optional: true },
  { key: 'image5', header: 'Image 5', width: 24, optional: true },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];
type Raw = Record<ColumnKey, string>;

const REQUIRED = COLUMNS.filter((c) => !('optional' in c));
const IMAGE_KEYS: ColumnKey[] = ['image1', 'image2', 'image3', 'image4', 'image5'];

const headerLabel = (c: (typeof COLUMNS)[number]) => ('optional' in c ? c.header : `${c.header} *`);
const norm = (v: string) => v.replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    const v: any = value;
    if (v.text !== undefined) return String(v.text).trim();
    if (v.richText) return v.richText.map((r: any) => r.text).join('').trim();
    if (v.result !== undefined) return String(v.result).trim();
    return '';
  }
  return String(value).trim();
}

// ── Template download ─────────────────────────────────────────────────────

export const downloadProductTemplate = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { subcategories: { orderBy: { sortOrder: 'asc' } } },
    });

    const wb = new ExcelJS.Workbook();

    // Single "Products" sheet. Rules live in header notes (hover over a header).
    const ws = wb.addWorksheet(PRODUCTS_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
    ws.columns = COLUMNS.map((c) => ({ header: headerLabel(c), key: c.key, width: c.width }));
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F4A2A' } };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.height = 30;

    const allSubs = Array.from(new Set(categories.flatMap((c) => c.subcategories.map((s) => s.name))));
    const imageNote =
      'Optional. File name of an image already uploaded on the Images page, including the extension, e.g. ring-front.png (not case-sensitive). ' +
      'Image 1 is the main image, Image 2 shows on hover. Leave all 5 empty to keep a product\'s existing images.';
    const notes: Record<ColumnKey, string> = {
      name: 'Required for new products. Fill one product per row starting at row 2.',
      sku: 'Required. Unique code. If the SKU already exists, that product is UPDATED (empty cells are left unchanged).',
      subcategory: `Required for new products. The category is set automatically from it. Available: ${allSubs.join(', ') || 'existing subcategory names'}.`,
      price: 'Required for new products. Number greater than 0, e.g. 45000.',
      netWeight: 'Required for new products. Number, e.g. 3.2.',
      totalDiamondCt: 'Required for new products. Number, e.g. 0.85.',
      smallDiamondCt: 'Required for new products. Number, e.g. 0.25. Cannot exceed the total diamond weight.',
      totalDiamondPcs: 'Required for new products. Whole number of 1 or more, e.g. 21.',
      description: 'Required for new products. Text shown on the product page.',
      image1: imageNote,
      image2: imageNote,
      image3: imageNote,
      image4: imageNote,
      image5: imageNote,
    };
    COLUMNS.forEach((c, i) => {
      ws.getCell(1, i + 1).note = { texts: [{ text: notes[c.key] }] } as any;
    });

    // Dropdowns (Excel limits an inline list to 255 characters and no commas inside names)
    const addList = (col: string, names: string[]) => {
      const list = names.join(',');
      if (names.length === 0 || list.length > 250 || names.some((n) => n.includes(',') || n.includes('"'))) return;
      for (let r = 2; r <= MAX_ROWS + 1; r++) {
        ws.getCell(`${col}${r}`).dataValidation = { type: 'list', allowBlank: false, formulae: [`"${list}"`] };
      }
    };
    addList('C', allSubs);

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-upload-template.xlsx"');
    return res.send(Buffer.from(buffer as ArrayBuffer));
  } catch (error) {
    console.error('Template generation failed', error);
    return res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

// ── Failed-rows report ────────────────────────────────────────────────────

interface RowError {
  row: number;
  message: string;
}

// Same columns as the template (so the sheet can be fixed and re-uploaded as is) plus
// "Original Row" and "Reason" at the end, which the importer ignores.
async function buildFailureReport(failed: { row: number; raw: Raw; message: string }[]): Promise<string> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(PRODUCTS_SHEET, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.columns = [
    ...COLUMNS.map((c) => ({ header: headerLabel(c), key: c.key, width: c.width })),
    { header: 'Original Row', key: 'originalRow', width: 14 },
    { header: 'Reason', key: 'reason', width: 70 },
  ];
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  head.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F4A2A' } };
  head.height = 30;
  const reasonHeader = ws.getCell(1, COLUMNS.length + 2);
  reasonHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB91C1C' } };

  for (const f of failed) {
    const row = ws.addRow({ ...f.raw, originalRow: f.row, reason: f.message });
    row.getCell(COLUMNS.length + 2).font = { color: { argb: 'FFB91C1C' } };
    row.getCell(COLUMNS.length + 2).alignment = { wrapText: true, vertical: 'top' };
  }
  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer).toString('base64');
}

// ── Bulk create / update ──────────────────────────────────────────────────

export const bulkCreateProducts = async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as { buffer: Buffer } | undefined;
    if (!file) {
      return res.status(400).json({ success: false, message: 'No Excel file uploaded.' });
    }

    const wb = new ExcelJS.Workbook();
    try {
      await wb.xlsx.load(file.buffer as any);
    } catch {
      return res.status(400).json({ success: false, message: 'Could not read the file. Please upload a valid .xlsx file.' });
    }

    const ws = wb.getWorksheet(PRODUCTS_SHEET) || wb.worksheets[0];
    if (!ws) {
      return res.status(400).json({ success: false, message: 'The workbook has no sheets.' });
    }

    // Map header names to column numbers
    const colIndex: Partial<Record<ColumnKey, number>> = {};
    ws.getRow(1).eachCell((cell, col) => {
      const h = norm(cellText(cell.value));
      const match = COLUMNS.find((c) => norm(c.header) === h);
      if (match) colIndex[match.key] = col;
    });
    const missingCols = REQUIRED.filter((c) => !colIndex[c.key]).map((c) => c.header);
    if (missingCols.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing columns: ${missingCols.join(', ')}. Please use the downloaded template.`,
      });
    }

    // Reference data
    const [categories, existingProducts, mediaAssets] = await Promise.all([
      prisma.productCategory.findMany({ include: { subcategories: true } }),
      prisma.product.findMany({
        select: {
          id: true, sku: true, slug: true, categoryId: true, subcategoryId: true,
          totalDiamondCt: true, smallDiamondCt: true,
        },
      }),
      prisma.mediaAsset.findMany({
        select: { originalName: true, url: true, thumbnailUrl: true, mimeType: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const bySku = new Map(existingProducts.filter((p) => p.sku).map((p) => [p.sku!.toLowerCase(), p]));
    const usedSlugs = new Set(existingProducts.map((p) => p.slug));

    // Newest upload wins if two assets ever share a name.
    const assetByName = new Map<string, (typeof mediaAssets)[number]>();
    for (const a of mediaAssets) {
      const key = a.originalName.trim().toLowerCase();
      if (!assetByName.has(key)) assetByName.set(key, a);
    }

    const errors: RowError[] = [];
    const failedRows: { row: number; raw: Raw; message: string }[] = [];
    const seenSkus = new Set<string>();
    let created = 0;
    let updated = 0;
    let dataRows = 0;

    const fail = (row: number, raw: Raw, messages: string[]) => {
      const message = messages.join('; ');
      errors.push({ row, message });
      failedRows.push({ row, raw, message });
    };

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const raw = Object.fromEntries(
        COLUMNS.map((c) => [c.key, colIndex[c.key] ? cellText(row.getCell(colIndex[c.key]!).value) : '']),
      ) as Raw;
      if (Object.values(raw).every((v) => v === '')) continue; // blank row

      dataRows++;
      if (dataRows > MAX_ROWS) {
        return res.status(400).json({ success: false, message: `Too many rows. Maximum is ${MAX_ROWS} products per file.` });
      }

      const problems: string[] = [];

      // ── SKU / create-or-update ──
      const skuKey = raw.sku.toLowerCase();
      if (!raw.sku) problems.push('Missing: SKU');
      if (raw.sku && seenSkus.has(skuKey)) problems.push(`SKU "${raw.sku}" is repeated in this file`);
      if (raw.sku) seenSkus.add(skuKey);
      const existing = raw.sku ? bySku.get(skuKey) : undefined;
      const isUpdate = !!existing;

      // ── Required fields (only for new products) ──
      if (!isUpdate) {
        const empty = REQUIRED.filter((c) => c.key !== 'sku' && raw[c.key] === '').map((c) => c.header);
        if (empty.length > 0) problems.push(`Missing: ${empty.join(', ')}`);
      }

      // ── Subcategory (the category follows from it) ──
      let categoryId: string | undefined;
      let subcategoryId: string | undefined;
      if (raw.subcategory) {
        const wanted = raw.subcategory.toLowerCase();
        const matches = categories.flatMap((c) =>
          c.subcategories
            .filter((s) => s.name.toLowerCase() === wanted || s.slug === wanted)
            .map((s) => ({ sub: s, cat: c })),
        );
        if (matches.length === 0) {
          problems.push(`Subcategory "${raw.subcategory}" does not exist`);
        } else if (matches.length > 1) {
          problems.push(`Subcategory "${raw.subcategory}" exists in several categories (${matches.map((m) => m.cat.name).join(', ')}); use its URL slug instead`);
        } else {
          subcategoryId = matches[0].sub.id;
          categoryId = matches[0].cat.id;
        }
      }

      // ── Numbers (validate only the ones provided) ──
      const num = (k: ColumnKey) => Number(raw[k].replace(/,/g, ''));
      const price = num('price');
      const netWeight = num('netWeight');
      const totalCt = num('totalDiamondCt');
      const smallCt = num('smallDiamondCt');
      const pcs = num('totalDiamondPcs');
      if (raw.price && !(price > 0)) problems.push('Price must be a number greater than 0');
      if (raw.netWeight && !(netWeight >= 0)) problems.push('Net Weight must be a number');
      if (raw.totalDiamondCt && !(totalCt >= 0)) problems.push('Total Diamond Weight must be a number');
      if (raw.smallDiamondCt && !(smallCt >= 0)) problems.push('Small Diamond Weight must be a number');
      if (raw.totalDiamondPcs && !(Number.isInteger(pcs) && pcs >= 1)) problems.push('Total Diamond Pieces must be a whole number of 1 or more');

      const effTotal = raw.totalDiamondCt ? totalCt : existing?.totalDiamondCt != null ? Number(existing.totalDiamondCt) : undefined;
      const effSmall = raw.smallDiamondCt ? smallCt : existing?.smallDiamondCt != null ? Number(existing.smallDiamondCt) : undefined;
      if (effTotal !== undefined && effSmall !== undefined && effSmall > effTotal) {
        problems.push('Small Diamond Weight cannot exceed Total Diamond Weight');
      }

      // ── Images ──
      const imageNames = IMAGE_KEYS.map((k) => raw[k]).filter(Boolean);
      const images: { url: string; thumbnailUrl: string | null }[] = [];
      const seenImages = new Set<string>();
      for (const name of imageNames) {
        const key = name.trim().toLowerCase();
        const asset = assetByName.get(key);
        if (!asset) {
          problems.push(`Image "${name}" has not been uploaded`);
        } else if (!asset.mimeType.startsWith('image/')) {
          problems.push(`"${name}" is not an image`);
        } else if (seenImages.has(key)) {
          problems.push(`Image "${name}" is listed more than once`);
        } else {
          seenImages.add(key);
          images.push({ url: asset.url, thumbnailUrl: asset.thumbnailUrl });
        }
      }

      if (problems.length > 0) {
        fail(r, raw, problems);
        continue;
      }

      const imageRows = images.slice(0, MAX_IMAGES).map((img, i) => ({
        url: img.url,
        thumbnailUrl: img.thumbnailUrl,
        altText: `${raw.name || 'Product'} view ${i + 1}`,
        sortOrder: i,
        isHover: i === 1,
      }));

      try {
        if (isUpdate) {
          const data: any = {};
          if (raw.name) data.name = raw.name;
          if (categoryId) data.categoryId = categoryId;
          if (subcategoryId) data.subcategoryId = subcategoryId;
          if (raw.price) data.price = price;
          if (raw.description) data.description = raw.description;
          if (raw.netWeight) data.netWeightGrams = netWeight;
          if (raw.totalDiamondCt) data.totalDiamondCt = totalCt;
          if (raw.smallDiamondCt) data.smallDiamondCt = smallCt;
          if (raw.totalDiamondPcs) data.totalDiamondPcs = pcs;

          const ops: any[] = [];
          if (Object.keys(data).length > 0) ops.push(prisma.product.update({ where: { id: existing!.id }, data }));
          if (imageRows.length > 0) {
            ops.push(prisma.productImage.deleteMany({ where: { productId: existing!.id } }));
            ops.push(prisma.productImage.createMany({ data: imageRows.map((i) => ({ ...i, productId: existing!.id })) }));
          }
          if (ops.length === 0) {
            fail(r, raw, ['Nothing to update: the SKU exists but no other cell is filled in']);
            continue;
          }
          await prisma.$transaction(ops);
          updated++;
        } else {
          const baseSlug = generateSlug(raw.name) || 'product';
          let slug = baseSlug;
          let n = 1;
          while (usedSlugs.has(slug)) slug = `${baseSlug}-${n++}`;
          usedSlugs.add(slug);

          await prisma.product.create({
            data: {
              name: raw.name,
              slug,
              sku: raw.sku,
              categoryId: categoryId!,
              subcategoryId: subcategoryId!,
              price,
              description: raw.description,
              isPublished: true,
              inStock: true,
              netWeightGrams: netWeight,
              totalDiamondCt: totalCt,
              smallDiamondCt: smallCt,
              totalDiamondPcs: pcs,
              diamondGrade: 'EF VVS-VS',
              images: imageRows.length > 0 ? { create: imageRows } : undefined,
              variants: { create: FINISHES.map((f) => ({ ...f, inStock: true })) },
              inventory: { create: { quantity: 0, reorderLevel: 3 } },
            },
          });
          created++;
        }
      } catch (err) {
        console.error(`Bulk upload: row ${r} failed`, err);
        fail(r, raw, ['Could not be saved (database error)']);
      }
    }

    if (dataRows === 0) {
      return res.status(400).json({ success: false, message: 'No product rows found. Fill in the "Products" sheet starting at row 2.' });
    }

    const report = failedRows.length > 0 ? await buildFailureReport(failedRows) : null;

    const parts = [];
    if (created) parts.push(`${created} created`);
    if (updated) parts.push(`${updated} updated`);
    if (failedRows.length) parts.push(`${failedRows.length} failed`);

    return res.status(200).json({
      success: true,
      message: parts.join(', ') + '.',
      data: { created, updated, failed: failedRows.length, errors, report },
    });
  } catch (error) {
    console.error('Bulk product upload failed', error);
    return res.status(500).json({ success: false, message: 'Bulk upload failed unexpectedly.' });
  }
};
