require("dotenv").config();

const { chromium } = require("playwright");
const nodemailer = require("nodemailer");
const extractEmail = require("./utils/extractEmail");
const fs = require("fs");

async function runBot() {
  if (!fs.existsSync("./session.json")) {
    console.error(
      "ERROR: session.json not found.\nRun: node save-session.js\n",
    );
    process.exit(1);
  }

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--start-maximized",
    ],
  });

  const context = await browser.newContext({
    storageState: "./session.json",
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });

  const page = await context.newPage();

  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    window.chrome = { runtime: {} };
    Object.defineProperty(navigator, "plugins", { get: () => [1, 2, 3] });
    Object.defineProperty(navigator, "languages", {
      get: () => ["en-US", "en"],
    });
  });

  page.setDefaultTimeout(90000);

  // =========================
  // VERIFY SESSION
  // =========================
  console.log("Verifying LinkedIn session...");
  try {
    await page.goto("https://www.linkedin.com/feed", {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch (err) {
    console.log("Feed nav warning:", err.message);
  }

  await page.waitForTimeout(4000);
  const currentUrl = page.url();
  if (currentUrl.includes("/login") || currentUrl.includes("/authwall")) {
    console.error("Session expired. Run: node save-session.js");
    await browser.close();
    process.exit(1);
  }
  console.log("Session valid. URL:", currentUrl);

  // =========================
  // NAVIGATE TO SEARCH
  // =========================
  const searchUrl =
    "https://www.linkedin.com/search/results/content/?" +
    "keywords=hiring%20java%20developer%20contract%20gmail.com&sortBy=date";

  console.log("\nNavigating to search results...");
  try {
    await page.goto(searchUrl, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
  } catch (err) {
    console.log("Search nav warning:", err.message);
  }
  await page.waitForTimeout(6000);

  // =========================
  // SCROLL TO LOAD POSTS
  // =========================
  console.log("Scrolling to load posts...");
  for (let i = 0; i < 5; i++) {
    await page.mouse.wheel(0, 2500);
    await page.waitForTimeout(2500);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2000);

  // =========================
  // GET ALL POST TEXTS + CLICK "MORE" — ALL IN ONE page.evaluate()
  //
  // We do everything inside a single evaluate() call to avoid
  // the "too many arguments" Playwright limitation.
  //
  // This runs inside the real Chrome browser and:
  //   1. Finds all post containers (by looking for elements with <p> tags)
  //   2. Clicks the "more" button inside each one
  //   3. Returns the expanded text of every post
  // =========================

  console.log("Extracting post texts (clicking 'more' on each)...");

  const allPostTexts = await page.evaluate(() => {
    // ── Step 1: Find post containers ──
    // LinkedIn posts are list items or divs that contain a <p> with text.
    // We find the deepest common ancestor of each post by looking for
    // elements that have a <p> child and are at least 200px tall.
    const all = Array.from(document.querySelectorAll("div, li, article"));

    const candidates = all.filter((el) => {
      const p = el.querySelector("p");
      if (!p) return false;
      if (el.textContent.trim().length < 80) return false;
      const rect = el.getBoundingClientRect();
      if (rect.height < 60) return false;
      // Exclude sidebar/ad elements
      const cls = el.className || "";
      if (
        cls.includes("sidebar") ||
        cls.includes("aside") ||
        cls.includes("ad-")
      )
        return false;
      return true;
    });

    // Keep only top-level (not nested inside another candidate)
    const topLevel = candidates.filter(
      (el) => !candidates.some((other) => other !== el && other.contains(el)),
    );

    // ── Step 2: For each post, click "more" then grab text ──
    const results = [];

    for (const postEl of topLevel) {
      // Find and click the "more" button inside this post
      const buttons = Array.from(postEl.querySelectorAll("button"));
      for (const btn of buttons) {
        const txt = (btn.innerText || btn.textContent || "")
          .trim()
          .toLowerCase();
        if (
          txt === "more" ||
          txt === "see more" ||
          txt === "…more" ||
          txt.endsWith("more")
        ) {
          try {
            btn.click();
          } catch (e) {
            /* non-fatal */
          }
          break;
        }
      }

      // Also try spans that act as buttons
      const spans = Array.from(
        postEl.querySelectorAll("span[role='button'], span[tabindex='0']"),
      );
      for (const span of spans) {
        const txt = (span.innerText || span.textContent || "")
          .trim()
          .toLowerCase();
        if (
          txt === "more" ||
          txt === "see more" ||
          txt === "…more" ||
          txt.endsWith("more")
        ) {
          try {
            span.click();
          } catch (e) {
            /* non-fatal */
          }
          break;
        }
      }

      results.push(postEl.innerText || "");
    }

    return results;
  });

  // Wait for all "more" expansions to render
  await page.waitForTimeout(3000);

  // Now re-read the texts AFTER expansion (the first read was before rendering)
  const expandedPostTexts = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll("div, li, article"));
    const candidates = all.filter((el) => {
      const p = el.querySelector("p");
      if (!p) return false;
      if (el.textContent.trim().length < 80) return false;
      const rect = el.getBoundingClientRect();
      if (rect.height < 60) return false;
      const cls = el.className || "";
      if (
        cls.includes("sidebar") ||
        cls.includes("aside") ||
        cls.includes("ad-")
      )
        return false;
      return true;
    });
    const topLevel = candidates.filter(
      (el) => !candidates.some((other) => other !== el && other.contains(el)),
    );
    return topLevel.map((el) => el.innerText || "");
  });

  console.log(`\nFound ${expandedPostTexts.length} posts after expansion.\n`);

  // =========================
  // PROCESS EACH POST TEXT
  // =========================
  let recruiterEmails = [];

  for (let i = 0; i < expandedPostTexts.length; i++) {
    const text = expandedPostTexts[i];
    if (!text || text.trim().length < 30) continue;

    console.log(`\n--- Post ${i + 1} / ${expandedPostTexts.length} ---`);
    console.log("Preview:", text.substring(0, 200).replace(/\n/g, " "));

    // RECENCY CHECK
    const isRecent =
      /\b([1-9]|1[0-9]|2[0-3])\s*h(our)?s?\b/i.test(text) ||
      /\b[0-5]?[0-9]\s*m(in(ute)?s?)?\b/i.test(text) ||
      /just now/i.test(text);

    if (!isRecent) {
      console.log("Skipping — older than 24h");
      continue;
    }

    // RELEVANCE CHECK
    const lw = text.toLowerCase();
    const isRelevant =
      (lw.includes("java") || lw.includes("developer")) &&
      (lw.includes("contract") ||
        lw.includes("hiring") ||
        lw.includes("c2c") ||
        lw.includes("w2"));

    if (!isRelevant) {
      console.log("Skipping — not relevant");
      continue;
    }

    // EXTRACT EMAIL
    const emails = extractEmail(text);
    if (emails && emails.length > 0) {
      console.log("✅ Emails found:", emails);
      recruiterEmails.push(...emails);
    } else {
      console.log("No email in this post.");
    }
  }

  recruiterEmails = [...new Set(recruiterEmails)];

  console.log("\n=== Recruiter Emails Found ===");
  console.log(recruiterEmails.length > 0 ? recruiterEmails : "None");
  console.log("==============================\n");

  if (recruiterEmails.length === 0) {
    console.log("No emails found. Closing.");
    await browser.close();
    return;
  }

  // =========================
  // GMAIL SMTP
  // =========================
  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS },
  });

  try {
    await transporter.verify();
    console.log("✅ Gmail SMTP verified.\n");
  } catch (err) {
    console.error("❌ Gmail auth failed:", err.message);
    console.error(
      "Generate App Password: https://myaccount.google.com/apppasswords",
    );
    await browser.close();
    return;
  }

  if (!fs.existsSync("./resume.pdf")) {
    console.error("❌ resume.pdf not found in project root.");
    await browser.close();
    return;
  }

  // =========================
  // SEND EMAILS
  // =========================
  for (const email of recruiterEmails) {
    const message = `Dear Recruiter,

I hope this message finds you well.

I came across your LinkedIn post regarding a Java Developer contract opportunity and I am very interested in applying.

I have strong experience in Java development and would be a great fit for a contract engagement. Please find my resume attached for your review.

I would welcome the opportunity to discuss how my background aligns with your requirements.

Thank you for your time and consideration.

Best regards,
Your Name
Phone: Phone Number
Email: ${process.env.GMAIL_USER}`;

    console.log(`Sending to ${email}...`);
    try {
      await transporter.sendMail({
        from: `"Your Name" <${process.env.GMAIL_USER}>`,
        to: email,
        subject: "Application for Java Developer Contract Role",
        text: message,
        attachments: [{ filename: "resume.pdf", path: "./resume.pdf" }],
      });
      console.log(`✅ Email sent to ${email}`);
    } catch (err) {
      console.error(`❌ Failed: ${email} —`, err.message);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }

  await browser.close();
  console.log("\n✅ Bot finished successfully.");
}

runBot().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
