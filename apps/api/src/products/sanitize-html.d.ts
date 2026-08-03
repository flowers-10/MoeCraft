declare module "sanitize-html" {
  interface Attributes { [key: string]: string; }
  interface TagFrame { tag: string; attribs: Attributes; text: string; tagPosition: number; mediaChildren: string[]; }
  interface Transformer { tagName: string; attribs: Attributes; text?: string; }
  type TransformFunction = (tagName: string, attribs: Attributes) => Transformer;
  interface Options {
    allowedTags?: string[];
    allowedAttributes?: Record<string, string[]>;
    allowedSchemes?: string[];
    allowedSchemesByTag?: Record<string, string[]>;
    allowProtocolRelative?: boolean;
    enforceHtmlBoundary?: boolean;
    transformTags?: Record<string, TransformFunction>;
    exclusiveFilter?: (frame: TagFrame) => boolean;
  }
  function sanitizeHtml(dirty: string, options?: Options): string;
  export = sanitizeHtml;
}
