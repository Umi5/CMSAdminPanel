import { Router } from 'express';
import { entryController } from '../controllers/entry.controller';

// mergeParams so `:schemaId` from the parent schema route is visible here.
export const entriesRouter = Router({ mergeParams: true });

entriesRouter.get('/', entryController.list);
entriesRouter.post('/', entryController.create);
entriesRouter.get('/:entryId', entryController.get);
entriesRouter.put('/:entryId', entryController.update);
entriesRouter.delete('/:entryId', entryController.remove);
