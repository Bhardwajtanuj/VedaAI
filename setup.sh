#!/bin/bash
set -e

echo ""
echo "  VedaAI — Local Setup"
echo "  ===================="
echo ""

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created root .env — add your ANTHROPIC_API_KEY"
fi

echo "  Installing backend dependencies..."
cd backend
[ ! -f ".env" ] && cp .env.example .env
npm install
npm run build
cd ..

echo "  Installing frontend dependencies..."
cd frontend
[ ! -f ".env.local" ] && cp .env.example .env.local
npm install
cd ..

echo ""
echo "  Done. To run:"
echo ""
echo "    Terminal 1:  cd backend && npm run dev"
echo "    Terminal 2:  cd backend && npm run dev:worker"
echo "    Terminal 3:  cd frontend && npm run dev"
echo ""
echo "  Or with Docker:"
echo ""
echo "    docker compose up --build"
echo ""
