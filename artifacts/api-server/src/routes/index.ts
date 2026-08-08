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

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(learnRouter);
router.use(dashboardRouter);
router.use(productsRouter);
router.use(generationRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(coversRouter);

export default router;
