import { createApp } from './app.js';
import { env } from './config/env.js';
import { closePool } from './db/pool.js';

const server = createApp().listen(env.port, () => {
  console.log(`[api] Xepa ouvindo em http://localhost:${env.port}/api (${env.nodeEnv})`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`[api] ${signal} recebido, encerrando…`);
    server.close(() => {
      void closePool().then(() => process.exit(0));
    });
  });
}
