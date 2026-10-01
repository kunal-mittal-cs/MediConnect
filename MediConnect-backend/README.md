# MediConnect Backend v2

FastAPI + MySQL backend aligned to the MediConnect frontend.

## Setup
1. Create MySQL database: `CREATE DATABASE mediconnect;`
2. Copy `.env.example` to `.env` and set DATABASE_URL/SECRET_KEY.
3. Use the existing project's Python venv or create one.
4. `pip install -r requirements.txt`
5. `python run.py`
6. Open `http://127.0.0.1:8000/docs`

The API creates tables automatically on startup. Existing compatible tables are reused; review migrations if you already have production data.

AI currently uses a deterministic navigation layer. Add GEMINI_API_KEY/GROQ_API_KEY later and implement provider calls server-side only.

Payments are intentionally demo/sandbox: no real money is moved. Replace `/consultations/{id}/payment` with verified Razorpay/Stripe webhook handling before production.
