require("dotenv").config();

// Run this ONCE manually to save your LinkedIn session.
// After this, index.js will never need to log in again.
//
// Usage: node save-session.js
//
// What it does:
//   1. Opens a real Chrome browser window
//   2. Goes to linkedin.com/login
//   3. YOU log in manually (solves any CAPTCHA / 2FA yourself)
//   4. Once you see your feed, press ENTER in this terminal
//   5. Session is saved to session.json

const { chromium } = require("playwright");
const fs = require("fs");
const readline = require("readline");

async function saveSession() {
  console.log("\n=== LinkedIn Session Saver ===\n");

  const browser = await chromium.launch({
    headless: false, // Must be visible — you log in yourself
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: null, // null = use the window size (maximized)
  });

  const page = await context.newPage();

  await page.goto("https://www.linkedin.com/login", {
    waitUntil: "domcontentloaded",
  });

  console.log("Browser opened. Please:");
  console.log("  1. Log into LinkedIn manually in the browser window");
  console.log("  2. Complete any CAPTCHA or 2FA if prompted");
  console.log("  3. Wait until you can see your LinkedIn feed");
  console.log("  4. Come back here and press ENTER\n");

  // Wait for user to press Enter
  await waitForEnter();

  // Check we actually landed on the feed
  const url = page.url();
  if (
    url.includes("/login") ||
    url.includes("/authwall") ||
    url.includes("/checkpoint")
  ) {
    console.error("\nERROR: You don't appear to be logged in yet.");
    console.error("Current URL:", url);
    console.error("Please log in fully before pressing ENTER.\n");
    await browser.close();
    return;
  }

  // Save session
  const storageState = await context.storageState();
  fs.writeFileSync("./session.json", JSON.stringify(storageState, null, 2));

  console.log("\n✓ Session saved to session.json");
  console.log("✓ You can now run: node index.js");
  console.log("✓ It will stay logged in without touching the login page.\n");

  await browser.close();
}

function waitForEnter() {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      "Press ENTER after you are logged in and see your feed...",
      () => {
        rl.close();
        resolve();
      },
    );
  });
}

saveSession().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
