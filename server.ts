import express from "express";
import path from "path";
import cors from "cors";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(cors());

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Hilfsfunktion zur Ausführung von Gemini-Anfragen mit Exponential Backoff bei temporären Fehlern
async function callGeminiWithRetry<T>(fn: () => Promise<T>, retries = 5, delayMs = 1000): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      const status = error?.status || error?.code || (error?.statusText ? parseInt(error.statusText) : null);
      const msg = error?.message?.toLowerCase() || "";
      const isRetryable = 
        status === 503 || 
        status === 429 || 
        msg.includes("503") || 
        msg.includes("429") || 
        msg.includes("unavailable") || 
        msg.includes("high demand") || 
        msg.includes("rate limit") || 
        msg.includes("fetch failed") || 
        msg.includes("socket hang up") || 
        msg.includes("econnreset") || 
        msg.includes("etimedout") || 
        msg.includes("econnrefused") || 
        msg.includes("network error");

      if (isRetryable && i < retries - 1) {
        let nextDelay = delayMs * Math.pow(2, i);

        // Verzögerung bei Fehlermeldung 429 (Rate Limit) dynamisch bestimmen
        if (status === 429 || msg.includes("429")) {
          try {
            const startIndex = error.message.indexOf("{");
            if (startIndex !== -1) {
              const jsonStr = error.message.substring(startIndex);
              const parsedError = JSON.parse(jsonStr);

              // 1. Suche nach google.rpc.RetryInfo
              if (parsedError?.error?.details) {
                const retryInfo = parsedError.error.details.find((d: any) => d["@type"]?.includes("RetryInfo"));
                if (retryInfo && retryInfo.retryDelay) {
                  const sec = parseFloat(retryInfo.retryDelay);
                  if (!isNaN(sec)) {
                    nextDelay = Math.ceil(sec * 1000) + 1000; // Add 1s buffer
                  }
                }
              }

              // 2. Fallback: Wartezeit aus Fehlermeldung parsen
              if (parsedError?.error?.message && nextDelay < 5000) {
                const match = parsedError.error.message.match(/Please retry in ([\d.]+)s/i);
                if (match && match[1]) {
                  const sec = parseFloat(match[1]);
                  if (!isNaN(sec)) {
                    nextDelay = Math.ceil(sec * 1000) + 1000;
                  }
                }
              }
            }
          } catch (e) {
            // Parsing-Fehler ignorieren, Standard-Backoff nutzen
          }
        }

        console.warn(`Gemini API error (retryable status ${status}, attempt ${i + 1}/${retries}). Retrying in ${nextDelay}ms... Error: ${error.message}`);
        await new Promise(resolve => setTimeout(resolve, nextDelay));
      } else {
        throw error;
      }
    }
  }
  throw new Error("Gemini API call failed after retries");
}

// API-Endpunkt zur Analyse von Bewerbungs-E-Mails
app.post("/api/analyze-emails", async (req, res) => {
  try {
    const { emails } = req.body;
    if (!emails || !Array.isArray(emails)) {
      return res.status(400).json({ error: "Missing or invalid emails array" });
    }

    if (emails.length === 0) {
      return res.json({ results: [] });
    }

    const emailListPrompt = emails.map((email: any, index: number) => {
      return `--- EMAIL #${index + 1} ---
ID: ${email.id}
Subject: ${email.subject}
Snippet: ${email.snippet}
Body: ${email.body || ""}
Date: ${email.date || ""}
--------------------`;
    }).join("\n\n");

    const prompt = `Analyze the following emails (most are in German for the German job market) received by the user and determine if they are related to a job application.
For each email, extract the hiring company, the job title/role (keep it in German as original, e.g. "Softwareentwickler"), estimate the current application status, the office/job location (e.g., "Düsseldorf, Germany" or "Düsseldorf, Deutschland"), the employment type (anstellungsart, e.g. "Festanstellung", "Vollzeit", "Teilzeit", "Freie Mitarbeit"), summarize the message, and offer action points.
Only categorize an email as isJobRelated: true if it is an actual application confirmation (Applied), status update/recruiter follow-up, interview request (Interview), assessment, feedback, rejection (Rejected), or job offer (Offer). Standard newsletters, generic job alerts from social media, spam, or promotional material are NOT job related (isJobRelated: false).

For each job-relevant email, you MUST classify it as:
- 'Neue Bewerbung' if the email is a confirmation of a new application receipt (e.g., containing phrases like "wir haben deine bewerbung bekommen", "danke für deine bewerbung", "eingangsbestätigung", "vielen dank für deine bewerbung").
- 'Statuswechsel' if the email represents a change or progress in status, such as an invite to an interview ("interview", "gespräch", "telefonat"), a rejection ("absage", "nicht berücksichtigt", "anderweitig entschieden"), or an offer ("angebot", "arbeitsvertrag", "vertrag").

Emails to analyze:
${emailListPrompt}`;

    const response = await callGeminiWithRetry(() => ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an elite talent acquisition analyst specializing in the German job market (Deutschemarkt). Analyze German and English emails meticulously to extract job application statuses. Keep the job titles in their original German format (e.g. 'Softwareentwickler' or 'Webentwickler'). Produce location values as cities like 'Düsseldorf, Germany' or 'Cologne, Germany' if possible. Determine 'anstellungsart' as 'Festanstellung', 'Vollzeit', 'Teilzeit', 'Freie Mitarbeit' or 'N/A'. Respond strictly in the JSON format requested.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              emailId: { type: Type.STRING },
              isJobRelated: { type: Type.BOOLEAN, description: "True if the email contains actual updates regarding a specific job application, an interview request, a rejection, an offer, or next steps in the hiring process." },
              company: { type: Type.STRING, description: "The name of the company hiring (e.g., FINOVESTA GmbH, Google, Acme Corp, Unknown)." },
              role: { type: Type.STRING, description: "The job title / role position in German if written in German (e.g., Softwareentwickler, Webentwickler, Backend-Entwickler, Unknown)." },
              status: { 
                type: Type.STRING, 
                description: "The estimated hiring status. Must be one of: 'Applied', 'Interview', 'Rejected', 'Offer', 'Received' or 'Unknown'." 
              },
              classification: {
                type: Type.STRING,
                description: "Must be exactly 'Neue Bewerbung' (for emails confirming submission/receipt of a new application) or 'Statuswechsel' (for rejections, interview invitations, offers, assessments, feedback, or any other changes to an existing status)."
              },
              location: { type: Type.STRING, description: "The job location if mentioned, e.g., 'Düsseldorf, Germany', 'Cologne, Germany' or 'N/A'." },
              anstellungsart: { type: Type.STRING, description: "The employment type, usually in German like 'Festanstellung', 'Vollzeit', 'Teilzeit', 'Freie Mitarbeit' or 'N/A' if not specified." },
              confidence: { type: Type.NUMBER, description: "Confidence score between 0.0 and 1.0" },
              summary: { type: Type.STRING, description: "A highly concise 1-sentence summary of the email in German or English." },
              suggestedAction: { type: Type.STRING, description: "Recommended next step for the user in German or English." }
            },
            required: ["emailId", "isJobRelated", "company", "role", "status", "classification", "location", "anstellungsart", "confidence", "summary", "suggestedAction"]
          }
        }
      }
    }));

    const text = response.text;
    if (!text) {
      throw new Error("No text returned from Gemini");
    }

    const results = JSON.parse(text.trim());
    return res.json({ results });

  } catch (error: any) {
    console.error("Error analyzing emails:", error);
    return res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// Integration von Vite (Entwicklungs- und Produktionsmodus)
async function setupVite() {
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
}

setupVite().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
});
