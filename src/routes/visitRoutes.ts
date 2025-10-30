// routes/visitRoutes.ts
import express from "express";
import { getVisits, hitVisit } from "../controllers/hitVisit.js";

const router = express.Router();

// POST /api/visits/hit
router.post("/hit", hitVisit);
router.get("/stats", getVisits);

export default router;
