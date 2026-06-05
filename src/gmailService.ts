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
 * Extracts raw body text from Gmail payload structure
 */
function extractBody(payload: any): string {
  if (!payload) return "";
  
  if (payload.body?.data) {
    return decodeBase64Url(payload.body.data);
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
        // Strip basic HTML elements conceptually for processing size efficiency
        const html = decodeBase64Url(part.body.data);
        return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
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
            dateFormatted = parsedDate.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });
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
      console.error(`Error fetching individual message details for id ${msg.id}:`, e);
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
