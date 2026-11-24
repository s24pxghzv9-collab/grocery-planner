import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { handle, memoryStore } from './api/_lib/household';
import { GET as importGet } from './api/import';

/**
 * In local development there's no Vercel, so serve /api/household from memory.
 * Run with SYNC=off to simulate a deployment without a database.
 */
function devApi(): Plugin {
  const store = process.env.SYNC === 'off' ? null : memoryStore();
  return {
    name: 'dev-api',
    configureServer(server) {
      server.middlewares.use('/api/import', async (req, res) => {
        const response = await importGet(new Request(`http://localhost${req.originalUrl}`));
        res.statusCode = response.status;
        res.setHeader('content-type', 'application/json');
        res.end(await response.text());
      });
      server.middlewares.use('/api/household', async (req, res) => {
        const chunks: Buffer[] = [];
        for await (const c of req) chunks.push(c as Buffer);
        const request = new Request(`http://localhost${req.originalUrl}`, {
          method: req.method,
          headers: { 'content-type': req.headers['content-type'] ?? '' },
          body: req.method === 'GET' || req.method === 'HEAD' ? undefined : Buffer.concat(chunks),
        });
        const response = await handle(request, store);
        res.statusCode = response.status;
        response.headers.forEach((v, k) => res.setHeader(k, v));
        res.end(await response.text());
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), devApi()],
});
