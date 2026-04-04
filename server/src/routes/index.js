/* ============================================================
   ROYAL FLUSH — API Routes
   ============================================================ */

import { Router } from 'express';
import { listRooms, getRoom, healthCheck } from '../controllers/roomController.js';

const router = Router();

// Health
router.get('/health', healthCheck);

// Rooms
router.get('/rooms', listRooms);
router.get('/rooms/:id', getRoom);

export default router;
