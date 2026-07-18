import { Router } from "express";
import { schemaController } from "../controllers/schema.controller";
import { migrationController } from "../controllers/migration.controller";
import { entriesRouter } from "./entry.routes";

export const schemaRouter = Router();

schemaRouter.get("/", schemaController.list);
schemaRouter.post("/", schemaController.create);
schemaRouter.get("/:schemaId", schemaController.get);
schemaRouter.delete("/:schemaId", schemaController.remove);

// Schema evolution: dry-run impact report, then atomic apply.
schemaRouter.post("/:schemaId/migration-plan", migrationController.plan);
schemaRouter.post("/:schemaId/migrate", migrationController.apply);

// Entries live under their content type.
schemaRouter.use("/:schemaId/entries", entriesRouter);
