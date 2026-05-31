// =========================================================
//  SkyHouse Agency — Full Stack Developer Assessment
//  Part 3: Bug Hunt
//  File: campaign-dashboard.js
//  This file contains FIVE intentional bugs. Find and fix them.
// =========================================================

const express = require('express');
const fs = require('fs');
const csv = require('csv-parser');

const app = express();
app.use(express.json);   // BUG 1: express.json is a function — must be called as express.json()

// Load campaign data from CSV
async function loadCampaignData(filePath) {
  return new Promise((resolve, reject) => {
    const results = [];
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => results.push(row))
      .on('end', () => resolve(results))
      .on('error', (err) => reject(err));
  });
}

// Calculate ROAS for each campaign
function calculateMetrics(campaigns) {
  return campaigns.map(c => {
    const spend = parseFloat(c.spend);
    const revenue = parseFloat(c.revenue);
    const roas = spend / revenue;  // BUG 2: ROAS = revenue / spend, not spend / revenue
    const cpa = spend / parseInt(c.conversions);
    return { ...c, roas: roas.toFixed(2), cpa: cpa.toFixed(2) };
  });
}

// GET /api/campaigns — return all campaigns with metrics
app.get('/api/campaigns', async (req, res) => {
  try {
    const raw = await loadCampaignData('./data/campaigns.csv');
    const campaigns = calculateMetrics(raw);
    res.json({ success: true, data: campaigns });
  } catch (err) {
    res.status(500).json({ success: false, error: err });  // BUG 3: Should send err.message, not the full Error object (exposes stack trace)
  }
});

// POST /api/campaigns/filter — filter by min ROAS
app.post('/api/campaigns/filter', async (req, res) => {
  const { minRoas } = req.body;
  const raw = await loadCampaignData('./data/campaigns.csv');
  const campaigns = calculateMetrics(raw);
  const filtered = campaigns.filter(c => c.roas >= minRoas);  // BUG 4: c.roas is a string (from toFixed), comparing string >= number is unreliable — must use parseFloat(c.roas)
  res.json({ success: true, data: filtered });
});

// GET /api/summary — return aggregate stats
app.get('/api/summary', async (req, res) => {
  const raw = await loadCampaignData('./data/campaigns.csv');
  const campaigns = calculateMetrics(raw);
  const totalSpend = campaigns.reduce((acc, c) => acc + c.spend, 0);  // BUG 5: c.spend is a string from CSV — must use parseFloat(c.spend) or it will concatenate strings
  const totalRevenue = campaigns.reduce((acc, c) => acc + parseFloat(c.revenue), 0);
  res.json({ totalSpend, totalRevenue, overallRoas: (totalRevenue / totalSpend).toFixed(2) });
});

app.listen(3000, () => console.log('Server running on port 3000'));
