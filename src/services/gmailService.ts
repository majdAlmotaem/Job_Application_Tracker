import { logger } from "../utils/logger";

export interface GmailMessageSummary {
  id: string;
  subject: string;
  snippet: string;
  date: string;
  body: string;
  from: string;
}

/**
 * Decodes a base64url encoded string (Gmail payload body encoding) securely support UTF-8 characters
 */
function decodeBase64Url(str: string): string {
  let b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (b64.length % 4) {
    b64 += "=";
  }
  try {
    return decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
  } catch (e) {
    try {
      return atob(b64);
    } catch {
      return "";
    }
  }
}

/**
 * Cleans HTML content, converting breaks/blocks to newlines and stripping tags.
 */
function cleanHtml(html: string): string {
  let text = html.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/(p|div|tr|h1|h2|h3|h4|h5|h6|li)>/gi, "\n");
  text = text.replace(/<[^>]*>/g, "");
  
  const entities: { [key: string]: string } = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&auml;": "ä",
    "&ouml;": "ö",
    "&uuml;": "ü",
    "&Auml;": "Ä",
    "&Ouml;": "Ö",
    "&Uuml;": "Ü",
    "&szlig;": "ß"
  };
  text = text.replace(/&[a-z0-9#]+;/gi, (match) => entities[match] || match);

  const lines = text.split("\n").map(line => line.trim());
  const cleanedLines: string[] = [];
  for (const line of lines) {
    if (line) {
      cleanedLines.push(line);
    } else if (cleanedLines.length > 0 && cleanedLines[cleanedLines.length - 1] !== "") {
      cleanedLines.push("");
    }
  }
  return cleanedLines.join("\n").trim();
}

/**
 * Extracts raw body text from Gmail payload structure
 */
function extractBody(payload: any): string {
  if (!payload) return "";
  
  if (payload.body?.data) {
    const rawData = decodeBase64Url(payload.body.data);
    if (payload.mimeType === "text/html") {
      return cleanHtml(rawData);
    }
    return rawData;
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    for (const part of payload.parts) {
      // Prioritize plain text bodies
      if (part.mimeType === "text/plain" && part.body?.data) {
        return decodeBase64Url(part.body.data);
      }
    }
    // Fallback to testing HTML if no plain text part is found
    for (const part of payload.parts) {
      if (part.mimeType === "text/html" && part.body?.data) {
        const html = decodeBase64Url(part.body.data);
        return cleanHtml(html);
      }
    }
    // Deep search in nested structures
    for (const part of payload.parts) {
      if (part.parts) {
        const body = extractBody(part);
        if (body) return body;
      }
    }
  }

  return "";
}

/**
 * Searches the user's Gmail inbox for messages matching a query
 */
export async function searchGmailMessages(
  accessToken: string,
  query: string,
  maxResults = 20
): Promise<GmailMessageSummary[]> {
  const url = `https://www.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error?.message || "Failed to search Gmail messages");
  }

  const data = await response.json();
  if (!data.messages || !Array.isArray(data.messages)) {
    return [];
  }

  const results: GmailMessageSummary[] = [];

  // Limit sequence fetching to be fast and parallelized safely
  const fetchPromises = data.messages.map(async (msg: { id: string }) => {
    try {
      const msgUrl = `https://www.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`;
      const msgRes = await fetch(msgUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!msgRes.ok) return null;

      const msgData = await msgRes.json();
      const headers = msgData.payload?.headers || [];

      const subject = headers.find((h: any) => h.name === "Subject")?.value || "(No Subject)";
      const from = headers.find((h: any) => h.name === "From")?.value || "Unknown";
      
      let dateRaw = headers.find((h: any) => h.name === "Date")?.value || "";
      let dateFormatted = dateRaw;
      try {
        if (dateRaw) {
          const parsedDate = new Date(dateRaw);
          if (!isNaN(parsedDate.getTime())) {
            const day = String(parsedDate.getDate()).padStart(2, "0");
            const month = String(parsedDate.getMonth() + 1).padStart(2, "0");
            const year = parsedDate.getFullYear();
            dateFormatted = `${day}.${month}.${year}`;
          }
        }
      } catch {
        // use raw if formatting fails
      }

      const bodyText = extractBody(msgData.payload);
      
      return {
        id: msg.id,
        subject,
        snippet: msgData.snippet || "",
        date: dateFormatted,
        body: bodyText.substring(0, 5000), // Cap body to 5000 chars to avoid memory issues
        from,
      };
    } catch (e) {
      logger.error(`Error fetching individual message details for id ${msg.id}:`, e);
      return null;
    }
  });

  const resolvedMessages = await Promise.all(fetchPromises);
  for (const item of resolvedMessages) {
    if (item) {
      results.push(item);
    }
  }

  return results;
}
