import { Queue } from "bullmq";
import { URL } from "url";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

function parseRedisUrl(url: string) {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
    password: parsed.password || undefined,
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

export function getRedisOpts() {
  return parseRedisUrl(redisUrl);
}

export const assessmentQueue = new Queue("assessment-generation", {
  connection: getRedisOpts(),
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export { redisUrl };
