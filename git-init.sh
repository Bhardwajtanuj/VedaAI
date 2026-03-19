#!/bin/bash
# Run this from inside the vedaai/ folder after extracting the zip

set -e

echo ""
echo "  Initialising git repository..."
echo ""

git init
git add .
git commit -m "feat: initial VedaAI assessment creator

Full-stack AI-powered exam paper generator.

Backend:
- Node.js + Express + TypeScript
- MongoDB (Mongoose) for assignment + result storage
- Redis caching of completed papers (1h TTL)
- BullMQ background job queue with retry logic
- WebSocket server for real-time generation updates
- Anthropic Claude for structured question generation

Frontend:
- Next.js 14 + TypeScript
- Zustand state management with devtools
- WebSocket client with 4s polling fallback
- Assignment creation form with full validation
- Real-time progress tracker (5 steps)
- Print-ready structured question paper output
- Difficulty badges, marks, student info fields

Infrastructure:
- Docker Compose (mongo, redis, backend, worker, frontend)
- Separate Dockerfiles for server and worker processes"

echo ""
echo "  Committed. Now push to GitHub:"
echo ""
echo "    git remote add origin https://github.com/YOUR_USERNAME/vedaai.git"
echo "    git branch -M main"
echo "    git push -u origin main"
echo ""
