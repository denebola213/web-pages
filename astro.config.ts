import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import mermaid from './src/lib/mermaid.satteri.ts';
import dropH1 from './src/lib/drop-h1.satteri.ts';
import figure from './src/lib/figure.satteri.ts';
import imageAttrs from './src/lib/image-attrs.integration.ts';

export default defineConfig({
  site: 'https://www.st-albireo.net',
  // legacy URLs all end with a slash: /diary/20201104/
  trailingSlash: 'always',
  build: { format: 'directory' },
  markdown: {
    // standard ```mermaid fences -> diagrams, no shortcode in the article
    processor: satteri({ mdastPlugins: [dropH1, mermaid, figure] }),
    shikiConfig: { theme: 'github-light', wrap: true },
  },
  // 生成 HTML の <img> に width/height を付ける（CLS 対策）
  integrations: [imageAttrs()],
  // no adapter, no runtime: dist/ is plain static files
});
