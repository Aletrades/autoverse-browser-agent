import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Sets up a TradingView webhook alert for the given strategy
// strategy: "eval" | "funded"
// webhookUrl: the n8n webhook URL to fire on each signal
export async function setupTradingViewAgent({ webhookUrl, strategy = 'eval' }) {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    modelName: 'gpt-4o',
    modelApiKey: process.env.OPENAI_API_KEY,
    verbose: 1,
    browserbaseSessionCreateParams: {
      proxies: true, // residential proxy — bypasses IP block
    },
  });

  const strategyName = strategy === 'funded' ? 'NQ RSI Funded' : 'NQ RSI Eval Passer';
  const alertMessage = strategy === 'funded'
    ? '{"symbol":"{{ticker}}","side":"{{strategy.order.action}}","price":{{close}},"strategy":"funded"}'
    : '{"symbol":"{{ticker}}","side":"{{strategy.order.action}}","price":{{close}},"strategy":"eval"}';

  try {
    await stagehand.init();
    const page = stagehand.page;

    // ── Step 1: Log in to TradingView ───────────────────────────────────────
    console.log('[tradingviewAgent] Logging into TradingView...');
    await page.goto('https://www.tradingview.com/accounts/signin/', { waitUntil: 'networkidle' });
    await stagehand.act({ action: 'Click the Email option to sign in with email' });
    await page.waitForTimeout(1000);
    await stagehand.act({ action: 'Click the email input field and type the email address' });
    await page.keyboard.type(process.env.TRADINGVIEW_EMAIL);
    await stagehand.act({ action: 'Click the password field and type the password' });
    await page.keyboard.type(process.env.TRADINGVIEW_PASSWORD);
    await stagehand.act({ action: 'Click the Sign In button' });
    await page.waitForTimeout(5000);

    // ── Step 2: Open NQ chart ────────────────────────────────────────────────
    console.log('[tradingviewAgent] Opening NQ chart...');
    await page.goto('https://www.tradingview.com/chart/?symbol=CME_MINI%3ANQ1%21', { waitUntil: 'networkidle' });
    await page.waitForTimeout(4000);

    // ── Step 3: Find the strategy and open alert dialog ─────────────────────
    console.log(`[tradingviewAgent] Setting up alert for strategy: ${strategyName}`);
    await stagehand.act({ action: `Find the strategy "${strategyName}" in the chart indicators or strategies panel` });
    await page.waitForTimeout(2000);

    // Open the alert creation dialog via the alerts button or right-click
    await stagehand.act({ action: 'Click the Alerts button or clock icon in the toolbar to open the alerts panel' });
    await page.waitForTimeout(2000);
    await stagehand.act({ action: 'Click the Create Alert or Add Alert button' });
    await page.waitForTimeout(2000);

    // ── Step 4: Configure the alert ─────────────────────────────────────────
    console.log('[tradingviewAgent] Configuring alert...');

    // Set condition to the strategy
    await stagehand.act({ action: `In the Condition dropdown, select the strategy "${strategyName}"` });
    await page.waitForTimeout(1000);
    await stagehand.act({ action: 'In the second condition dropdown, select "Order Fills" or "strategy.order.action"' });
    await page.waitForTimeout(1000);

    // Set frequency
    await stagehand.act({ action: 'Set the alert frequency to "Once Per Bar Close" or "On Bar Close"' });
    await page.waitForTimeout(500);

    // Enable webhook
    await stagehand.act({ action: 'Check or enable the Webhook URL checkbox or toggle' });
    await page.waitForTimeout(500);
    await stagehand.act({ action: 'Click the webhook URL input field and type the URL' });
    await page.keyboard.type(webhookUrl);

    // Set the message
    await stagehand.act({ action: 'Click the Message input field and clear any existing content' });
    await page.keyboard.selectAll();
    await page.keyboard.type(alertMessage);

    // Set alert name
    await stagehand.act({ action: 'Click the Alert Name field and clear it' });
    await page.keyboard.selectAll();
    await page.keyboard.type(`Autoverse — ${strategyName}`);

    // Submit
    await stagehand.act({ action: 'Click the Create or Save button to create the alert' });
    await page.waitForTimeout(3000);

    // Confirm it was created
    const { alertCreated } = await stagehand.extract({
      instruction: 'Was the alert created successfully? Look for a success message or the alert appearing in the alerts list',
      schema: z.object({
        alertCreated: z.boolean(),
      }),
    });

    if (!alertCreated) {
      throw new Error('Alert creation could not be confirmed — check TradingView manually');
    }

    console.log('[tradingviewAgent] Alert created successfully.');
    return { alertCreated: true, strategyName, webhookUrl };

  } finally {
    await stagehand.close();
  }
}
