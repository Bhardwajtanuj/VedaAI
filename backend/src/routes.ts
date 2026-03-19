import { Router, Request, Response } from "express";
import multer from "multer";
import { Assignment } from "./models";
import { assessmentQueue, getRedisOpts, redisUrl } from "./queue";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

// Lazy Redis client using bullmq's bundled ioredis
let _redis: any = null;
async function getRedis() {
  if (!_redis) {
    const IORedis = (await import("ioredis")).default;
    _redis = new IORedis(redisUrl);
  }
  return _redis;
}

router.post("/assignments", upload.single("file"), async (req: Request, res: Response) => {
  try {
    const {
      title,
      subject,
      dueDate,
      questionTypes,
      totalQuestions,
      totalMarks,
      difficulty,
      additionalInstructions,
    } = req.body;

    if (!title || !subject || !dueDate || !totalQuestions || !totalMarks) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    if (Number(totalQuestions) <= 0 || Number(totalMarks) <= 0) {
      return res.status(400).json({ error: "Questions and marks must be positive numbers" });
    }

    let fileContent: string | undefined;
    if (req.file) {
      if (req.file.mimetype === "application/pdf") {
        try {
          const pdfParse = await import("pdf-parse");
          const data = await pdfParse.default(req.file.buffer);
          fileContent = data.text;
        } catch {
          fileContent = req.file.buffer.toString("utf-8");
        }
      } else {
        fileContent = req.file.buffer.toString("utf-8");
      }
    }

    const parsedTypes = Array.isArray(questionTypes)
      ? questionTypes
      : typeof questionTypes === "string"
      ? JSON.parse(questionTypes)
      : ["short-answer"];

    const assignment = await Assignment.create({
      title,
      subject,
      dueDate: new Date(dueDate),
      questionTypes: parsedTypes,
      totalQuestions: Number(totalQuestions),
      totalMarks: Number(totalMarks),
      difficulty: difficulty || "medium",
      additionalInstructions: additionalInstructions || "",
      fileContent,
      status: "pending",
    });

    const job = await assessmentQueue.add("generate", {
      assignmentId: assignment._id.toString(),
    });
    await Assignment.findByIdAndUpdate(assignment._id, { jobId: job.id });

    return res.status(201).json({
      success: true,
      assignmentId: assignment._id.toString(),
      jobId: job.id,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments/:id", async (req: Request, res: Response) => {
  try {
    const cacheKey = `assignment:${req.params.id}`;
    try {
      const redis = await getRedis();
      const cached = await redis.get(cacheKey);
      if (cached) return res.json(JSON.parse(cached));
    } catch {}

    const assignment = await Assignment.findById(req.params.id).lean();
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    if (assignment.status === "completed") {
      try {
        const redis = await getRedis();
        await redis.setex(cacheKey, 3600, JSON.stringify(assignment));
      } catch {}
    }

    return res.json(assignment);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.get("/assignments", async (_req: Request, res: Response) => {
  try {
    const assignments = await Assignment.find({}, { result: 0 })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    return res.json(assignments);
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/assignments/:id/regenerate", async (req: Request, res: Response) => {
  try {
    const assignment = await Assignment.findById(req.params.id);
    if (!assignment) return res.status(404).json({ error: "Assignment not found" });

    await Assignment.findByIdAndUpdate(req.params.id, {
      status: "pending",
      result: undefined,
      error: undefined,
    });

    try {
      const redis = await getRedis();
      await redis.del(`assignment:${req.params.id}`);
    } catch {}

    const job = await assessmentQueue.add("generate", { assignmentId: req.params.id });
    await Assignment.findByIdAndUpdate(req.params.id, { jobId: job.id });

    return res.json({ success: true, jobId: job.id });
  } catch (err) {
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
