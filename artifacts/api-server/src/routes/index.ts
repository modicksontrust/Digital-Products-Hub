import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import learnRouter from "./learn";
import dashboardRouter from "./dashboard";
import productsRouter from "./products";
import generationRouter from "./generation";
import adminRouter from "./admin";
import storageRouter from "./storage";
import coversRouter from "./covers";
import publicRouter from "./public";
import sellRouter from "./sell";
import bioRouter from "./bio";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
// publicRouter must be mounted before any router whose internal `router.use(requireAuth)`
// applies unconditionally (no path prefix) -- those middlewares run for every request that
// reaches that router (e.g. productsRouter), even ones with no matching route inside it,
// which would otherwise 401 unauthenticated public sales-page requests before they're reached.
router.use(publicRouter);
router.use(learnRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(generationRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(coversRouter);
router.use(sellRouter);
router.use(bioRouter);

export default router;
