import express from 'express';
import cors from 'cors';
import { store } from './store';
import { seedIfEmpty } from './seed';
import { registerRoutes } from './routes';
import { errorHandler, notFoundHandler } from './middleware';

store.load();
seedIfEmpty(store);

const app = express();
app.use(cors());
app.use(express.json());

registerRoutes(app);
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4100;
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
