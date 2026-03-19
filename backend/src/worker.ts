import "dotenv/config";
import mongoose from "mongoose";
import { Worker, Job } from "bullmq";
import { getRedisOpts } from "./queue";
import { Assignment } from "./models";
import { generateAssessment } from "./ai";
import { notifyClients } from "./websocket";

async function processJob(job: Job) {
  const { assignmentId } = job.data;

  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) throw new Error(`Assignment ${assignmentId} not found`);

  await Assignment.findByIdAndUpdate(assignmentId, { status: "processing" });
  notifyClients(assignmentId, { type: "status", status: "processing", progress: 10 });
  await job.updateProgress(10);

  notifyClients(assignmentId, { type: "progress", progress: 30, message: "Building prompt..." });
  await job.updateProgress(30);

  const result = await generateAssessment({
    title: assignment.title,
    subject: assignment.subject,
    questionTypes: assignment.questionTypes,
    totalQuestions: assignment.totalQuestions,
    totalMarks: assignment.totalMarks,
    difficulty: assignment.difficulty,
    additionalInstructions: assignment.additionalInstructions,
    fileContent: assignment.fileContent,
  });

  notifyClients(assignmentId, { type: "progress", progress: 80, message: "Processing results..." });
  await job.updateProgress(80);

  await Assignment.findByIdAndUpdate(assignmentId, { status: "completed", result });

  notifyClients(assignmentId, {
    type: "completed",
    status: "completed",
    progress: 100,
    result,
  });
  await job.updateProgress(100);
  return result;
}

async function startWorker() {
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/vedaai");
  console.log("Worker connected to MongoDB");

  const worker = new Worker("assessment-generation", processJob, {
    connection: getRedisOpts(),
    concurrency: 3,
  });

  worker.on("completed", (job) => console.log(`Job ${job.id} completed`));

  worker.on("failed", async (job, err) => {
    console.error(`Job ${job?.id} failed:`, err.message);
    if (job?.data?.assignmentId) {
      await Assignment.findByIdAndUpdate(job.data.assignmentId, {
        status: "failed",
        error: err.message,
      });
      notifyClients(job.data.assignmentId, {
        type: "failed",
        status: "failed",
        error: err.message,
      });
    }
  });

  console.log("Worker started, waiting for jobs...");
}

startWorker().catch(console.error);
