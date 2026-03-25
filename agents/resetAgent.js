import { Stagehand } from '@browserbasehq/stagehand';

// Resets a blown TopstepX account via browser
// API key stays the same — only account ID changes after reset
// n8n fetches the new account ID via API after this returns
export async function resetAccountAgent() {
  const stagehand = new Stagehand({
    env: 'BROWSERBASE',
    apiKey: process.env.BROWSERBASE_API_KEY,
    projectId: process.env.BROWSERBASE_PROJECT_ID,
    modelName: 'gpt-4o',
    modelApiKey: process.env.OPENAI_API_KEY,
    verbose: 1,
    browserbaseSessionCreateParams: {
      proxies: [{ type: 'browserbase' }], // residential proxy — bypasses TopstepX datacenter IP block
    },
  });

  try {
    await stagehand.init();
    const page = stagehand.page;

    // ── Step 1: Log in ──────────────────────────────────────────────────────
    console.log('[resetAgent] Navigating to TopstepX login...');
    await page.goto('https://app.topstepx.com/login', { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(2000);

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

    console.log('[resetAgent] Reset complete.');
    return { reset: true };

  } finally {
    await stagehand.close();
  }
}
