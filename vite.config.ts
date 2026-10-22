import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'

// The product name lives in src/site.ts only; index.html gets it here (read as text, because
// site.ts uses import.meta.env, which the config does not have).
const productName = readFileSync(new URL('./src/site.ts', import.meta.url), 'utf8').match(/PRODUCT_NAME = '([^']+)'/)?.[1] ?? ''

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    { name: 'product-name', transformIndexHtml: (html) => html.replaceAll('%PRODUCT_NAME%', productName) },
  ],
})
