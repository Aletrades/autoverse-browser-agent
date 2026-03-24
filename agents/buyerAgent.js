import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Purchases a new TopstepX 50K combine using saved card on file
// Requires TOPSTEP_CARD_LAST4 env var to confirm which card to use
export async function buyAccountAgent() {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    modelName: 'gpt-4o',
    modelApiKey: process.env.OPENAI_API_KEY,
    verbose: 1,
  });

  try {
    await stagehand.init();
    const page = stagehand.page;

    // ── Step 1: Log in to Topstep.com ───────────────────────────────────────
    console.log('[buyerAgent] Logging into Topstep.com...');
    await page.goto('https://www.topstep.com/login', { waitUntil: 'networkidle' });
    await stagehand.act({ action: 'Click the email input field' });
    await page.keyboard.type(process.env.TOPSTEPX_USERNAME);
    await stagehand.act({ action: 'Click the password field' });
    await page.keyboard.type(process.env.TOPSTEPX_PASSWORD);
    await stagehand.act({ action: 'Click the Sign In or Login button' });
    await page.waitForTimeout(4000);

    // ── Step 2: Navigate to purchase a new combine ──────────────────────────
    console.log('[buyerAgent] Navigating to purchase page...');
    await page.goto('https://www.topstep.com/trading-combine/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Select 50K account size
    await stagehand.act({ action: 'Click the $50,000 or 50K account size option' });
    await page.waitForTimeout(1000);
    await stagehand.act({ action: 'Click the Get Started, Buy Now, or Purchase button for the 50K combine' });
    await page.waitForTimeout(3000);

    // ── Step 3: Use saved payment method ────────────────────────────────────
    console.log('[buyerAgent] Selecting payment method...');
    await stagehand.act({ action: 'Select the saved card on file or the existing payment method' });
    await page.waitForTimeout(1000);
    await stagehand.act({ action: 'Click the Complete Purchase, Pay Now, or Confirm Order button' });
    await page.waitForTimeout(6000);

    // ── Step 4: Confirm purchase ─────────────────────────────────────────────
    const { success, orderConfirmation } = await stagehand.extract({
      instruction: 'Was the purchase successful? Extract any order confirmation number or success message shown',
      schema: z.object({
        success: z.boolean(),
        orderConfirmation: z.string().optional(),
      }),
    });

    if (!success) {
      throw new Error('Purchase could not be confirmed — check Topstep.com manually');
    }

    console.log('[buyerAgent] Purchase successful. Order:', orderConfirmation);
    return { purchased: true, orderConfirmation };

  } finally {
    await stagehand.close();
  }
}
