import { Request, Response } from 'express';
import ExcelJS from 'exceljs';
import { prisma } from '../../config/db';
import { generateSlug } from '../../utils/slug';

const PRODUCTS_SHEET = 'Products';
const MAX_ROWS = 500;

// Every product is created with all three finishes; Yellow Gold is the default.
const FINISHES = [
  { metalFinish: 'Yellow Gold', swatchColor: '#E6C158', isDefault: true },
  { metalFinish: 'White Gold', swatchColor: '#E4E1D8', isDefault: false },
  { metalFinish: 'Rose Gold', swatchColor: '#E6B7A0', isDefault: false },
];

// Column order is also the order in the template.
const COLUMNS = [
  { key: 'name', header: 'Product Name', width: 30 },
  { key: 'sku', header: 'SKU', width: 16 },
  { key: 'category', header: 'Category', width: 18 },
  { key: 'subcategory', header: 'Subcategory', width: 20 },
  { key: 'price', header: 'Price (INR)', width: 14 },
  { key: 'netWeight', header: 'Net Weight (g)', width: 16 },
  { key: 'totalDiamondCt', header: 'Total Diamond Weight (ct)', width: 26 },
  { key: 'smallDiamondCt', header: 'Small Diamond Weight (ct)', width: 26 },
  { key: 'totalDiamondPcs', header: 'Total Diamond Pieces', width: 20 },
  { key: 'description', header: 'Description', width: 50 },
] as const;

type ColumnKey = (typeof COLUMNS)[number]['key'];

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
    ws.columns = COLUMNS.map((c) => ({ header: `${c.header} *`, key: c.key, width: c.width }));
    const headerRow = ws.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF3F4A2A' } };
    headerRow.alignment = { vertical: 'middle', wrapText: true };
    headerRow.height = 30;

    const allSubs = Array.from(new Set(categories.flatMap((c) => c.subcategories.map((s) => s.name))));
    const notes: Record<ColumnKey, string> = {
      name: 'Required. Product title. Fill one product per row starting at row 2.',
      sku: 'Required. Must be unique across all products and within this file.',
      category: `Required. One of: ${categories.map((c) => c.name).join(', ') || 'existing category names'}.`,
      subcategory: `Required. Must belong to the chosen category. Available: ${allSubs.join(', ') || 'existing subcategory names'}.`,
      price: 'Required. Number greater than 0, e.g. 45000.',
      netWeight: 'Required. Number, e.g. 3.2.',
      totalDiamondCt: 'Required. Number, e.g. 0.85.',
      smallDiamondCt: 'Required. Number, e.g. 0.25. Cannot exceed the total diamond weight.',
      totalDiamondPcs: 'Required. Whole number of 1 or more, e.g. 21.',
      description: 'Required. Text shown on the product page.',
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
    addList('C', categories.map((c) => c.name));
    addList('D', allSubs);

    const buffer = await wb.xlsx.writeBuffer();
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="product-upload-template.xlsx"');
    return res.send(Buffer.from(buffer as ArrayBuffer));
  } catch (error) {
    console.error('Template generation failed', error);
    return res.status(500).json({ success: false, message: 'Failed to generate template' });
  }
};

// ── Bulk create ───────────────────────────────────────────────────────────

interface RowError {
  row: number;
  message: string;
}

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
    const missingCols = COLUMNS.filter((c) => !colIndex[c.key]).map((c) => c.header);
    if (missingCols.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing columns: ${missingCols.join(', ')}. Please use the downloaded template.`,
      });
    }

    // Reference data
    const [categories, existingProducts] = await Promise.all([
      prisma.productCategory.findMany({ include: { subcategories: true } }),
      prisma.product.findMany({ select: { sku: true, slug: true } }),
    ]);
    const usedSkus = new Set(existingProducts.map((p) => (p.sku || '').toLowerCase()).filter(Boolean));
    const usedSlugs = new Set(existingProducts.map((p) => p.slug));

    const errors: RowError[] = [];
    const parsed: any[] = [];
    const seenSkus = new Set<string>();
    let dataRows = 0;

    for (let r = 2; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (k: ColumnKey) => cellText(row.getCell(colIndex[k]!).value);
      const raw = Object.fromEntries(COLUMNS.map((c) => [c.key, get(c.key)])) as Record<ColumnKey, string>;
      if (Object.values(raw).every((v) => v === '')) continue; // blank row

      dataRows++;
      if (dataRows > MAX_ROWS) {
        return res.status(400).json({ success: false, message: `Too many rows. Maximum is ${MAX_ROWS} products per file.` });
      }

      const rowErrors: string[] = [];
      const empty = COLUMNS.filter((c) => raw[c.key] === '').map((c) => c.header);
      if (empty.length > 0) rowErrors.push(`Missing: ${empty.join(', ')}`);

      const num = (k: ColumnKey) => Number(raw[k].replace(/,/g, ''));

      let categoryId = '';
      let subcategoryId = '';
      if (raw.category && raw.subcategory) {
        const cat = categories.find((c) => c.name.toLowerCase() === raw.category.toLowerCase() || c.slug === raw.category.toLowerCase());
        if (!cat) {
          rowErrors.push(`Category "${raw.category}" does not exist`);
        } else {
          categoryId = cat.id;
          const sub = cat.subcategories.find((s) => s.name.toLowerCase() === raw.subcategory.toLowerCase() || s.slug === raw.subcategory.toLowerCase());
          if (!sub) rowErrors.push(`Subcategory "${raw.subcategory}" does not exist under "${cat.name}"`);
          else subcategoryId = sub.id;
        }
      }

      const price = num('price');
      const netWeight = num('netWeight');
      const totalCt = num('totalDiamondCt');
      const smallCt = num('smallDiamondCt');
      const pcs = num('totalDiamondPcs');
      if (raw.price && !(price > 0)) rowErrors.push('Price must be a number greater than 0');
      if (raw.netWeight && !(netWeight >= 0)) rowErrors.push('Net Weight must be a number');
      if (raw.totalDiamondCt && !(totalCt >= 0)) rowErrors.push('Total Diamond Weight must be a number');
      if (raw.smallDiamondCt && !(smallCt >= 0)) rowErrors.push('Small Diamond Weight must be a number');
      if (raw.totalDiamondCt && raw.smallDiamondCt && smallCt > totalCt) rowErrors.push('Small Diamond Weight cannot exceed Total Diamond Weight');
      if (raw.totalDiamondPcs && !(Number.isInteger(pcs) && pcs >= 1)) rowErrors.push('Total Diamond Pieces must be a whole number of 1 or more');

      if (raw.sku) {
        const skuKey = raw.sku.toLowerCase();
        if (usedSkus.has(skuKey)) rowErrors.push(`SKU "${raw.sku}" already exists`);
        if (seenSkus.has(skuKey)) rowErrors.push(`SKU "${raw.sku}" is repeated in this file`);
        seenSkus.add(skuKey);
      }

      if (rowErrors.length > 0) {
        errors.push({ row: r, message: rowErrors.join('; ') });
        continue;
      }

      // Unique slug
      const baseSlug = generateSlug(raw.name) || 'product';
      let slug = baseSlug;
      let n = 1;
      while (usedSlugs.has(slug)) slug = `${baseSlug}-${n++}`;
      usedSlugs.add(slug);

      parsed.push({
        name: raw.name,
        slug,
        sku: raw.sku,
        categoryId,
        subcategoryId,
        price,
        description: raw.description,
        isPublished: true,
        inStock: true,
        netWeightGrams: netWeight,
        totalDiamondCt: totalCt,
        smallDiamondCt: smallCt,
        totalDiamondPcs: pcs,
        diamondGrade: 'EF VVS-VS',
        variants: {
          create: FINISHES.map((f) => ({ ...f, inStock: true })),
        },
        inventory: { create: { quantity: 0, reorderLevel: 3 } },
      });
    }

    if (dataRows === 0) {
      return res.status(400).json({ success: false, message: 'No product rows found. Fill in the "Products" sheet starting at row 2.' });
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: `${errors.length} row(s) have errors. Nothing was imported. Fix them and upload again.`,
        errors,
      });
    }

    await prisma.$transaction(parsed.map((data) => prisma.product.create({ data })));

    return res.status(201).json({
      success: true,
      message: `${parsed.length} product(s) created and published.`,
      data: { created: parsed.length },
    });
  } catch (error) {
    console.error('Bulk product upload failed', error);
    return res.status(500).json({ success: false, message: 'Bulk upload failed. No products were created.' });
  }
};
