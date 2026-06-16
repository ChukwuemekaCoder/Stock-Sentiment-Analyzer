import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Healthy check route
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

// Stock Sentiment Analyze API Route
app.post("/api/analyze", async (req, res) => {
  const { ticker } = req.body;

  if (!ticker || typeof ticker !== "string" || ticker.trim().length === 0) {
    return res.status(400).json({ error: "Stock ticker is required." });
  }

  const cleanedTicker = ticker.trim().toUpperCase();

  try {
    const ai = getGeminiClient();

    // Dynamically calculate current local time in human-readable format
    const today = new Date();
    const formattedDate = today.toLocaleDateString("en-US", {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const prompt = `You are a quantitative financial analyst specializing in retail-accessible sentiment analysis. You have no bias toward bullish or bearish outcomes — your only goal is accuracy.

The current date is June 15, 2026 (or today: ${formattedDate}).
Search for and analyze the most recent 7 days (from 7 days ago to today) of data for the stock ticker: ${cleanedTicker}.
You MUST find:
1. Earnings calls, guidance updates, or pre-announcements.
2. Major news headlines and market sentiment.
3. Analyst rating changes and price target adjustments.
4. Macro economic events or industry-wide trends that affect this sector.

Return ONLY this structured format:

**[${cleanedTicker}] SENTIMENT REPORT — ${formattedDate}**

**OVERALL SIGNAL: [BULLISH / BEARISH / NEUTRAL]**
**CONFIDENCE: [Low / Medium / High]**

---
**BULL CASE** (2–3 specific points with source)
- 
- 

**BEAR CASE** (2–3 specific points with source)
- 
- 

**KEY RISK TO WATCH**
One sentence on the single biggest near-term uncertainty.

**INVESTOR NOTE**
One sentence reminder that this is not financial advice and sentiment can reverse quickly.

Do not speculate beyond available evidence. Flag if data is sparse (e.g., small-cap with little coverage). Base your entire analysis on the live search results, not on training data. Ensure all claims contain specific citations of their source (e.g., 'Reuters June 12', 'Morgan Stanley June 10 rating change', etc.).`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const text = response.text || "";
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

    // Map grounding chunks to clean titles and URIs
    const sources = groundingChunks.map((chunk: any) => {
      return {
        title: chunk.web?.title || chunk.title || "Reference Source",
        uri: chunk.web?.uri || chunk.uri || ""
      };
    }).filter((src: any) => src.uri);

    res.json({
      ticker: cleanedTicker,
      date: formattedDate,
      rawText: text,
      sources: sources
    });

  } catch (error: any) {
    console.error("Error analyzing stock sentiment:", error);
    res.status(500).json({
      error: error.message || "An internal error occurred while conducting the sentiment analysis."
    });
  }
});

// Vite middleware and static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
