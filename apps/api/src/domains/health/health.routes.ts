import { Router } from 'express';
import { asyncHandler } from '../../common/middleware/async-handler';
import { healthCheck } from './health.controller';

const router = Router();

router.get('/health', asyncHandler(healthCheck));

export default router;
