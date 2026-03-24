import express from 'express';
import { resetAccountAgent } from './agents/resetAgent.js';
import { setupTradingViewAgent } from './agents/tradingviewAgent.js';
import { buyAccountAgent } from './agents/buyerAgent.js';

const app = express();
app.use(express.json());

// Simple auth — n8n sends this header on every request
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const token = req.headers['x-agent-token'];
  if (!token || token !== process.env.AGENT_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  next();
});

// Health check — Railway uses this to confirm the service is up
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Reset a blown TopstepX account, generate new API key
// Called by Orchestrator when blown account detected + RESET button clicked
app.post('/reset-account', async (req, res) => {
  console.log('[reset-account] Starting reset flow...');
  try {
    const result = await resetAccountAgent();
    console.log('[reset-account] Success:', result);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[reset-account] Failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Set up TradingView alert for a given account + strategy
// Called after reset completes or new account is set up
app.post('/setup-tradingview', async (req, res) => {
  const { webhookUrl, strategy } = req.body;
  console.log('[setup-tradingview] Setting up alert for strategy:', strategy);
  try {
    const result = await setupTradingViewAgent({ webhookUrl, strategy });
    console.log('[setup-tradingview] Success:', result);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[setup-tradingview] Failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Purchase a new 50K TopstepX combine
// Called by Orchestrator when PURCHASE button clicked in email
app.post('/buy-account', async (req, res) => {
  console.log('[buy-account] Starting purchase flow...');
  try {
    const result = await buyAccountAgent();
    console.log('[buy-account] Success:', result);
    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[buy-account] Failed:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Autoverse Browser Agent running on port ${PORT}`);
});
