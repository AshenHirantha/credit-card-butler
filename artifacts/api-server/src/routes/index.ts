import { Router, type IRouter } from "express";
import healthRouter from "./health";
import cardsRouter from "./cards";
import transactionsRouter from "./transactions";
import dashboardRouter from "./dashboard";
import statementsRouter from "./statements";

const router: IRouter = Router();

router.use(healthRouter);
router.use(cardsRouter);
router.use(transactionsRouter);
router.use(dashboardRouter);
router.use(statementsRouter);

export default router;
