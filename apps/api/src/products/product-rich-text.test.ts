import { strict as assert } from "node:assert";
import { test } from "node:test";
import { extractProductDescriptionFileIds, sanitizeProductRichText } from "./product-rich-text";

test("sanitization removes executable markup while preserving supported product content", () => {
  const html = '<h2 onclick="steal()">标题</h2><p>正文 <strong>重点</strong></p><script>alert(1)</script><img src="https://cdn.example/image.png" data-file-id="file-1" onerror="steal()">';

  assert.equal(
    sanitizeProductRichText(html),
    '<h2>标题</h2><p>正文 <strong>重点</strong></p><img src="/files/public/file-1" data-file-id="file-1" />'
  );
});

test("description image extraction returns unique valid file references in document order", () => {
  const html = '<p><img src="/first" data-file-id="file-1"></p><img src="/duplicate" data-file-id="file-1"><img src="/second" data-file-id="file-2"><img src="/invalid" data-file-id="not valid">';

  assert.deepEqual(extractProductDescriptionFileIds(html), ["file-1", "file-2"]);
});
