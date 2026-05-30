## Campaign Performance Dashboard

A full-stack dashboard that ingests advertising campaign data from a CSV and displays key performance metrics such as ROAS and CPA in a clean, filterable UI.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript
- **Frontend:** React, TypeScript, Vite
- **Data:** CSV, parsed at runtime with `csv-parser`
- **AI insights (Part 2):** OpenAI API

## Project Structure

```
technical_assessment/
├── backend/        # Express + TypeScript API
│   ├── data/       # campaigns.csv (sample data)
│   └── src/        # routes + metrics logic
└── frontend/       # React + Vite dashboard UI
```

## Prerequisites

- Node.js 20.19+ or 22.12+ (developed on v22.14.0)
- npm

## Running Locally

The app has two parts that run separately so use two terminals.

### Backend (API)

```bash
cd backend
npm install
npm run dev
```

Runs on http://localhost:3000.

For a production build:

```bash
npm run build
npm start
```

### Frontend (UI)

```bash
cd frontend
npm install
npm run dev
```

Runs on http://localhost:5173 and talks to the backend API.

## Environment Variables

The Campaign Insights feature (Part 2) calls the OpenAI API. Create a `.env` file in `backend/`:

```
OPENAI_API_KEY=your_key_here
```

This file is gitignored and never committed.

## API Endpoints

- `GET /api/campaigns` — all campaigns with calculated ROAS and CPA
- `GET /api/summary` — total spend, total revenue, and overall ROAS
- `POST /api/insights` — AI-generated plain-English performance summary (Part 2)

## Assessment Notes

This repository covers Parts 1 and 2 (the dashboard and the OpenAI integration). The written responses for Part 3 (Bug Hunt) and Part 4 (System Design) are in the document submitted alongside this repo.