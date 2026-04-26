import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import workflowsRouter from "./workflows";
import sessionsRouter from "./sessions";
import analyzeRouter from "./analyze";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(workflowsRouter);
router.use(sessionsRouter);
router.use(analyzeRouter);
router.use(documentsRouter);

export default router;
