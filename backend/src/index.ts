import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { orchestrateTripRequest } from './orchestrator/engine.js';
import { dbService } from './database/db.js';
import { isSafeError } from './utils/errors.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Main multi-agent endpoint
app.post('/api/plan-trip', async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'A valid text prompt is required.' });
  }

  const result = await orchestrateTripRequest(prompt);
  return res.json(result);
});

// Audit trail retrieval endpoint
app.get('/api/audit-logs', (req, res) => {
  try {
    const entries = dbService.getLogs();
    const formatted = entries.map(entry => ({
      id: entry.id,
      userPrompt: entry.user_prompt,
      agentsTriggered: entry.agents_triggered,
      finalResponse: entry.final_response,
      traces: JSON.parse(entry.trace_json)
    }));
    return res.json(formatted);
  } catch (err) {  
    const exception = err && typeof err === 'object' ? err : {};
    const msg = isSafeError(exception) ? exception.message : 'Database failure';
    console.error('Database connection exception event:', msg);
    return res.status(500).json({ error: 'Failed to access audit trails.' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Multi-Agent backend live on http://localhost:${PORT}`);
});