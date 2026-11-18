import sanitizeHtml from 'sanitize-html';

// Allow-list for blog body HTML produced by the rich text editor.
// Anything else (scripts, iframes, event handlers, inline styles other than text-align) is stripped.
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    'h2', 'h3', 'h4', 'p', 'br', 'hr',
    'strong', 'b', 'em', 'i', 'u', 's', 'code', 'pre', 'blockquote',
    'ul', 'ol', 'li',
    'a', 'img', 'figure', 'figcaption',
    'table', 'thead', 'tbody', 'tr', 'th', 'td',
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel', 'title'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    th: ['colspan', 'rowspan'],
    td: ['colspan', 'rowspan'],
    p: ['style'],
    h2: ['style'],
    h3: ['style'],
    h4: ['style'],
  },
  allowedStyles: {
    '*': { 'text-align': [/^(left|right|center|justify)$/] },
  },
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: { img: ['http', 'https'] },
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      const out: Record<string, string> = { ...attribs };
      if (out.target === '_blank') out.rel = 'noopener noreferrer';
      return { tagName, attribs: out };
    },
  },
};

export const sanitizeBlogHtml = (html: string): string => sanitizeHtml(html || '', OPTIONS);

export const htmlToPlainText = (html: string): string =>
  // put a space at block boundaries so "<p>a</p><p>b</p>" reads "a b", not "ab"
  sanitizeHtml((html || '').replace(/<\/(p|h[1-6]|li|blockquote|tr|figcaption)>|<br\s*\/?>/gi, '$& '), {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
