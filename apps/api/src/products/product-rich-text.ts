import sanitizeHtml = require("sanitize-html");

const PRODUCT_RICH_TEXT_TAGS = [
  "p", "h1", "h2", "h3", "ul", "ol", "li", "strong", "em", "u", "s",
  "blockquote", "pre", "code", "br", "hr", "a", "img"
];
const FILE_ID_PATTERN = /^[A-Za-z0-9_-]{1,191}$/;

export function sanitizeProductRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: PRODUCT_RICH_TEXT_TAGS,
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title", "data-file-id"]
    },
    allowedSchemes: ["http", "https"],
    allowedSchemesByTag: { img: ["http", "https"] },
    allowProtocolRelative: false,
    enforceHtmlBoundary: true,
    transformTags: {
      a: (_tagName, attribs) => ({ tagName: "a", attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" } }),
      img: (_tagName, attribs) => ({
        tagName: "img",
        attribs: isFileId(attribs["data-file-id"])
          ? { ...attribs, src: `/files/public/${attribs["data-file-id"]}` }
          : attribs
      })
    },
    exclusiveFilter: (frame) => frame.tag === "img" && !isFileId(frame.attribs["data-file-id"])
  }).trim();
}

export function extractProductDescriptionFileIds(html: string): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const sanitized = sanitizeProductRichText(html);
  for (const match of sanitized.matchAll(/\sdata-file-id="([^"]+)"/g)) {
    const id = match[1];
    if (isFileId(id) && !seen.has(id)) {
      ids.push(id);
      seen.add(id);
    }
  }
  return ids;
}

function isFileId(value: string | undefined): value is string {
  return typeof value === "string" && FILE_ID_PATTERN.test(value);
}
