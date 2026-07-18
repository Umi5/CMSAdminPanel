import { Router } from 'express';
import { contentController } from '../controllers/content.controller';

// Read-only public API. `:type` is a schema's apiId slug.
export const contentRouter = Router();

contentRouter.get('/:type', contentController.list);
contentRouter.get('/:type/:id', contentController.get);
