// controllers/visitController.ts
import type { Request, Response } from "express";
import { PrismaClient } from "@prisma/client";
import crypto from "crypto";

const prisma = new PrismaClient();

// helper: hash IP + User-Agent for uniqueness
const getVisitorHash = (req: Request) => {
  const ip = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const ua = req.headers["user-agent"] || "unknown";
  return crypto.createHash("sha256").update(ip + ua).digest("hex");
};

export const hitVisit = async (req: Request, res: Response) => {
  try {
    const key = (req.query.key as string) || "site";
    const visitorHash = getVisitorHash(req);

    // check if already visited recently
    const existing = await prisma.visitLog.findFirst({
      where: {
        key,
        visitorHash,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hrs
        },
      },
    });

    if (existing) {
      // ✅ already counted today — don’t increment
      return res.json({ ok: true, counted: false });
    }

    // else increment counter and log visit
    const counter = await prisma.visitCounter.upsert({
      where: { key },
      update: { count: { increment: 1 } },
      create: { key, count: 1 },
    });

    await prisma.visitLog.create({
      data: { key, visitorHash },
    });

    // set cookie (optional — acts as quick cache)
    res.cookie(`visited_${key}`, "true", {
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      httpOnly: true,
    });

   res.json({ ok: true, counted: true, count: Number(counter.count) });

  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false });
  }
};



// 🧾 Controller: Get all visit stats
export const getVisits = async (req: Request, res: Response) => {
  try {
    // Get all counters (total visits per key)
    const counters = await prisma.visitCounter.findMany({
      select: {
        key: true,
        count: true,
        updatedAt: true,
      },
    });

    // Get total visits (sum of all counts)
    const totalVisits = counters.reduce(
      (sum, item) => sum + Number(item.count),
      0
    );

    // Get total unique visitors (from logs)
    const uniqueVisitors = await prisma.visitLog.groupBy({
      by: ["visitorHash"],
      _count: { visitorHash: true },
    });

    res.json({
      ok: true,
      totalVisits,
      uniqueVisitors: uniqueVisitors.length,
      details: counters.map((c) => ({
        key: c.key,
        count: Number(c.count),
        lastUpdated: c.updatedAt,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ ok: false, message: "Failed to fetch visit data" });
  }
};
