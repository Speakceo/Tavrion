#!/usr/bin/env bash
# Run Tavrion Bot API locally — no Docker required.
# Requires: Python 3.11+, OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

set -e
cd "$(dirname "$0")"

if [ -z "$OPENAI_API_KEY" ]; then
  echo "Set OPENAI_API_KEY first, e.g.: export OPENAI_API_KEY=sk-..."
  exit 1
fi
if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

if [ ! -d ".venv" ]; then
  echo "Creating virtual environment..."
  python3 -m venv .venv
fi

source .venv/bin/activate
pip install -q -r requirements.txt

if ! python -c "import playwright" 2>/dev/null; then
  echo "Installing Crawl4AI browser (one-time, ~2 min)..."
  crawl4ai-setup
fi

PORT="${PORT:-8000}"
echo ""
echo "Tavrion Bot API running at http://localhost:$PORT"
echo "Add to Supabase app_secrets:"
echo "  TAVRION_BOT_API_URL = http://YOUR_PUBLIC_URL  (use ngrok if testing from cloud)"
echo ""
uvicorn main:app --host 0.0.0.0 --port "$PORT" --reload
