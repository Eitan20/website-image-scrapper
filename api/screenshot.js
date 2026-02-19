const chromium = require("@sparticuz/chromium-min");
const puppeteer = require("puppeteer-core");
const sharp = require("sharp");

const DEFAULT_WIDTH = 390;
const DEFAULT_HEIGHT = 844;
const MAX_DIMENSION = 2000;
const DEFAULT_WEBP_QUALITY = 80;

function parseBoolean(value, defaultValue = false) {
  if (value === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(String(value).toLowerCase());
}

function parseIntInRange(value, fallback, min, max) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(parsed, min), max);
}

function getOutputConfig(quality) {
  const normalizedQuality = parseIntInRange(quality, DEFAULT_WEBP_QUALITY, 1, 100);
  return {
    mimeType: "image/webp",
    webpOptions: { quality: normalizedQuality },
    screenshotOptions: { type: "png" },
  };
}

function parseTargetUrl(rawUrl) {
  if (!rawUrl) {
    throw new Error("Missing required query param: url");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new Error("Invalid url query param");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Only http/https URLs are allowed");
  }

  return parsed.toString();
}

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed. Use GET." });
  }

  const packUrl = process.env.CHROMIUM_PACK_URL;
  if (!packUrl) {
    return res.status(500).json({
      error: "Missing CHROMIUM_PACK_URL env var. Point this to your chromium-v#-pack.tar.",
    });
  }

  let browser;

  try {
    const targetUrl = parseTargetUrl(req.query.url);
    const width = parseIntInRange(req.query.width, DEFAULT_WIDTH, 200, MAX_DIMENSION);
    const height = parseIntInRange(req.query.height, DEFAULT_HEIGHT, 200, MAX_DIMENSION);
    const fullPage = parseBoolean(req.query.fullPage, false);
    const { mimeType, webpOptions, screenshotOptions } = getOutputConfig(req.query.quality);

    browser = await puppeteer.launch({
      args: puppeteer.defaultArgs({ args: chromium.args, headless: "shell" }),
      defaultViewport: {
        width,
        height,
        isMobile: true,
        hasTouch: true,
        deviceScaleFactor: 2,
      },
      executablePath: await chromium.executablePath(packUrl),
      headless: "shell",
    });

    const page = await browser.newPage();
    await page.setUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );

    await page.goto(targetUrl, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    const rawImage = await page.screenshot({
      ...screenshotOptions,
      fullPage,
      optimizeForSpeed: true,
    });
    const image = await sharp(rawImage).webp(webpOptions).toBuffer();

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Cache-Control", "public, max-age=60");
    return res.status(200).send(image);
  } catch (error) {
    return res.status(400).json({
      error: error instanceof Error ? error.message : "Screenshot failed",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};
