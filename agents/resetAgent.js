import { Stagehand } from '@browserbasehq/stagehand';
import { z } from 'zod';

// Resets a blown TopstepX account and returns the new API key
export async function resetAccountAgent() {
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

    // ── Step 1: Log in ──────────────────────────────────────────────────────
    console.log('[resetAgent] Navigating to TopstepX login...');
    await page.goto('https://app.topstepx.com/login', { waitUntil: 'networkidle' });

    await stagehand.act({ action: 'Click the email or username input field' });
    await page.keyboard.type(process.env.TOPSTEPX_USERNAME);
    await stagehand.act({ action: 'Click the password input field' });
    await page.keyboard.type(process.env.TOPSTEPX_PASSWORD);
    await stagehand.act({ action: 'Click the Sign In or Login button' });
    await page.waitForTimeout(4000);

    // ── Step 2: Reset the account ───────────────────────────────────────────
    console.log('[resetAgent] Looking for reset option...');
    await stagehand.act({ action: 'Find and click the Reset Account option in the account menu, sidebar, or settings' });
    await page.waitForTimeout(2000);
    await stagehand.act({ action: 'Click the Confirm or Yes button to confirm the reset' });
    await page.waitForTimeout(6000); // wait for reset to complete server-side

    // ── Step 3: Generate a new API key ──────────────────────────────────────
    console.log('[resetAgent] Generating new API key...');
    await page.goto('https://app.topstepx.com/account/api-keys', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await stagehand.act({ action: 'Click the Generate API Key or Create New API Key button' });
    await page.waitForTimeout(3000);

    const { apiKey } = await stagehand.extract({
      instruction: 'Extract the API key that was just generated — it is a long alphanumeric string, possibly base64',
      schema: z.object({
        apiKey: z.string().min(10),
      }),
    });

    // ── Step 4: Get the new account ID ──────────────────────────────────────
    console.log('[resetAgent] Fetching new account ID...');
    const { accountId } = await stagehand.extract({
      instruction: 'Extract the account ID or account number shown on the page — it is a numeric string like 20689959',
      schema: z.object({
        accountId: z.string(),
      }),
    });

    console.log('[resetAgent] Done. New API key and account ID retrieved.');
    return { apiKey, accountId };

  } finally {
    await stagehand.close();
  }
}
