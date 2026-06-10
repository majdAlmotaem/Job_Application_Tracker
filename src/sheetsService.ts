import { JobApplication, normalizeStatus } from "./types";

interface SheetValueResponse {
  values?: string[][];
}

// Default columns for German Market
export const GERMAN_MARKET_HEADERS = [
  "company",
  "jobtitle",
  "applicationdate",
  "status",
  "location",
  "anstellungsart"
];

interface HeaderIndexes {
  company: number;
  role: number;
  date: number;
  status: number;
  location: number;
  anstellungsart: number;
  subject: number;
  summary: number;
  suggestedAction: number;
  emailId: number;
  rawHeaders: string[];
}

export interface SheetProperties {
  title: string;
  sheetId: number;
}

/**
 * Dynamically fetches properties (title, sheetId) of the first sheet in the spreadsheet
 */
export async function getFirstSheetProperties(accessToken: string, spreadsheetId: string): Promise<SheetProperties> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,sheetId)`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || response.statusText || "Unknown error";
    console.error("Google Sheets API Error in getFirstSheetProperties:", errData);
    throw new Error(`Failed to fetch spreadsheet info: ${errMsg}`);
  }
  const data = await response.json();
  const sheets = data.sheets || [];
  if (sheets.length > 0 && sheets[0].properties) {
    return {
      title: sheets[0].properties.title || "Bewerbungen",
      sheetId: sheets[0].properties.sheetId || 0
    };
  }
  return { title: "Bewerbungen", sheetId: 0 }; // Fallback
}

/**
 * Dynamically fetches the name of the first sheet in the spreadsheet
 */
export async function getFirstSheetName(accessToken: string, spreadsheetId: string): Promise<string> {
  const props = await getFirstSheetProperties(accessToken, spreadsheetId);
  return props.title;
}

/**
 * Dynamically fetches the spreadsheet document title/name
 */
export async function getSpreadsheetTitle(accessToken: string, spreadsheetId: string): Promise<string> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    const errMsg = errData.error?.message || response.statusText || "Unknown error";
    console.error("Google Sheets API Error in getSpreadsheetTitle:", errData);
    throw new Error(`Failed to fetch spreadsheet metadata: ${errMsg}`);
  }
  const data = await response.json();
  return data.properties?.title || "Bewerbungs-Tracker";
}

/**
 * Dynamically resolves column indexes by reading Row 1
 */
export async function resolveHeaderIndexes(
  accessToken: string,
  spreadsheetId: string,
  sheetName: string
): Promise<HeaderIndexes> {
  const range = `${sheetName}!A1:Z1`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  let rawHeaders: string[] = [];
  if (response.ok) {
    const data = await response.json();
    rawHeaders = data.values?.[0] || [];
  }

  // If empty, default to German Market headers
  if (rawHeaders.length === 0) {
    rawHeaders = GERMAN_MARKET_HEADERS;
  }

  const findIdx = (keywords: string[], defaultIdx: number) => {
    const idx = rawHeaders.findIndex(h => 
      keywords.some(k => h.toLowerCase().trim() === k.toLowerCase())
    );
    return idx >= 0 ? idx : defaultIdx;
  };

  const findOptionalIdx = (keywords: string[]) => {
    return rawHeaders.findIndex(h => 
      keywords.some(k => h.toLowerCase().trim() === k.toLowerCase())
    );
  };

  return {
    company: findIdx(["company", "unternehmen", "firma"], 0),
    role: findIdx(["jobtitle", "job title", "role", "rolle", "stelle", "berufsbezeichnung", "job_title"], 1),
    date: findIdx(["applicationdate", "application date", "date", "datum", "bewerbungsdatum", "application_date"], 2),
    status: findIdx(["status", "status / stage", "hiring status"], 3),
    location: findIdx(["location", "standort", "ort", "stadt"], 4),
    anstellungsart: findIdx(["anstellungsart", "employment type", "job type", "art der anstellung", "employment_type"], 5),
    // Optional extras
    subject: findOptionalIdx(["subject", "betreff", "email subject"]),
    summary: findOptionalIdx(["summary", "zusammenfassung", "gemini insight"]),
    suggestedAction: findOptionalIdx(["suggestedaction", "suggested action", "empfohlene aktion", "action"]),
    emailId: findOptionalIdx(["emailid", "email id", "id"]),
    rawHeaders
  };
}

/**
 * Creates a new Spreadsheet using Google Sheets API styled for the German Market
 */
export async function createJobTrackerSpreadsheet(accessToken: string, title = "Job Application Tracker"): Promise<string> {
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: "Bewerbungen",
            gridProperties: {
              frozenRowCount: 1,
            },
          },
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to create spreadsheet");
  }

  const data = await response.json();
  const spreadsheetId = data.spreadsheetId;

  // Initialize the sheet with German Market headers
  const range = `Bewerbungen!A1:F1`;
  const putResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        values: [GERMAN_MARKET_HEADERS],
      }),
    }
  );

  if (!putResponse.ok) {
    const errorData = await putResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to initialize headers");
  }

  return spreadsheetId;
}

/**
 * Fetch all applications. Uses dynamic column indexes and matches actual spreadsheet row.
 */
export async function fetchJobApplications(accessToken: string, spreadsheetId: string): Promise<JobApplication[]> {
  const sheetName = await getFirstSheetName(accessToken, spreadsheetId);
  const indexes = await resolveHeaderIndexes(accessToken, spreadsheetId, sheetName);
  
  const range = `${sheetName}!A2:Z1000`; // Fetch first 1000 records
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;
  
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("Spreadsheet not found or unaccessible.");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to fetch spreadsheet rows");
  }

  const data: SheetValueResponse = await response.json();
  if (!data.values) {
    return [];
  }

  return data.values.map((row, index) => {
    const getVal = (idx: number, fallback = "") => {
      return idx >= 0 && idx < row.length ? row[idx] : fallback;
    };

    return {
      id: String(index + 2), // Actual row number in spreadsheet (matches A2, A3 etc.)
      company: getVal(indexes.company, "Unknown"),
      role: getVal(indexes.role, "Unknown"),
      status: normalizeStatus(getVal(indexes.status, "Applied")),
      date: getVal(indexes.date, ""),
      location: getVal(indexes.location, "N/A"),
      anstellungsart: getVal(indexes.anstellungsart, "N/A"),
      subject: getVal(indexes.subject, ""),
      summary: getVal(indexes.summary, ""),
      suggestedAction: getVal(indexes.suggestedAction, ""),
      emailId: getVal(indexes.emailId, ""),
    };
  });
}

/**
 * Add a new job application record to the Google Sheet using dynamic header positions
 */
export async function addJobApplication(
  accessToken: string,
  spreadsheetId: string,
  app: Omit<JobApplication, "id">
): Promise<void> {
  const sheetName = await getFirstSheetName(accessToken, spreadsheetId);
  const indexes = await resolveHeaderIndexes(accessToken, spreadsheetId, sheetName);

  const maxIdx = Math.max(
    indexes.company,
    indexes.role,
    indexes.date,
    indexes.status,
    indexes.location,
    indexes.anstellungsart,
    indexes.subject,
    indexes.summary,
    indexes.suggestedAction,
    indexes.emailId
  );

  const rowValues = new Array(maxIdx + 1).fill("");
  
  if (indexes.company >= 0) rowValues[indexes.company] = app.company;
  if (indexes.role >= 0) rowValues[indexes.role] = app.role;
  if (indexes.status >= 0) rowValues[indexes.status] = app.status;
  if (indexes.date >= 0) rowValues[indexes.date] = app.date;
  if (indexes.location >= 0) rowValues[indexes.location] = app.location || "N/A";
  if (indexes.anstellungsart >= 0) rowValues[indexes.anstellungsart] = app.anstellungsart || "N/A";
  if (indexes.subject >= 0) rowValues[indexes.subject] = app.subject || "";
  if (indexes.summary >= 0) rowValues[indexes.summary] = app.summary || "";
  if (indexes.suggestedAction >= 0) rowValues[indexes.suggestedAction] = app.suggestedAction || "";
  if (indexes.emailId >= 0) rowValues[indexes.emailId] = app.emailId || "";

  const range = `${sheetName}!A:Z`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [rowValues],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to append job application row");
  }
}

/**
 * Update dynamic cell positions inside a specific row number (rowId)
 */
export async function updateJobApplicationRow(
  accessToken: string,
  spreadsheetId: string,
  rowId: string,
  updatedData: Partial<Omit<JobApplication, "id">>
): Promise<void> {
  const sheetName = await getFirstSheetName(accessToken, spreadsheetId);
  const indexes = await resolveHeaderIndexes(accessToken, spreadsheetId, sheetName);

  const range = `${sheetName}!A${rowId}:Z${rowId}`;
  const getUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`;

  const getResponse = await fetch(getUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!getResponse.ok) {
    throw new Error("Failed to fetch existing row for update");
  }

  const getData: SheetValueResponse = await getResponse.json();
  const existingValues = getData.values?.[0] || [];

  const maxIdx = Math.max(
    indexes.company,
    indexes.role,
    indexes.date,
    indexes.status,
    indexes.location,
    indexes.anstellungsart,
    indexes.subject,
    indexes.summary,
    indexes.suggestedAction,
    indexes.emailId
  );

  while (existingValues.length <= maxIdx) {
    existingValues.push("");
  }

  if (updatedData.company !== undefined && indexes.company >= 0) existingValues[indexes.company] = updatedData.company;
  if (updatedData.role !== undefined && indexes.role >= 0) existingValues[indexes.role] = updatedData.role;
  if (updatedData.status !== undefined && indexes.status >= 0) existingValues[indexes.status] = updatedData.status;
  if (updatedData.date !== undefined && indexes.date >= 0) existingValues[indexes.date] = updatedData.date;
  if (updatedData.location !== undefined && indexes.location >= 0) existingValues[indexes.location] = updatedData.location;
  if (updatedData.anstellungsart !== undefined && indexes.anstellungsart >= 0) existingValues[indexes.anstellungsart] = updatedData.anstellungsart;
  if (updatedData.subject !== undefined && indexes.subject >= 0) existingValues[indexes.subject] = updatedData.subject;
  if (updatedData.summary !== undefined && indexes.summary >= 0) existingValues[indexes.summary] = updatedData.summary;
  if (updatedData.suggestedAction !== undefined && indexes.suggestedAction >= 0) existingValues[indexes.suggestedAction] = updatedData.suggestedAction;
  if (updatedData.emailId !== undefined && indexes.emailId >= 0) existingValues[indexes.emailId] = updatedData.emailId;

  const putUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=USER_ENTERED`;
  const putResponse = await fetch(putUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      values: [existingValues],
    }),
  });

  if (!putResponse.ok) {
    const errorData = await putResponse.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to update job application row");
  }
}

/**
 * Deletes multiple job application rows from the Google Sheet
 * @param rowIds list of row numbers (1-based, e.g., "2", "3", etc.)
 */
export async function deleteJobApplicationRows(
  accessToken: string,
  spreadsheetId: string,
  rowIds: string[]
): Promise<void> {
  if (rowIds.length === 0) return;

  const props = await getFirstSheetProperties(accessToken, spreadsheetId);
  
  // Convert row numbers to 0-based indices
  const indices = rowIds.map(id => parseInt(id, 10) - 1).filter(idx => !isNaN(idx) && idx >= 0);
  
  // Sort indices in descending order so that deleting earlier indices doesn't affect later ones
  indices.sort((a, b) => b - a);
  
  const requests = indices.map(idx => ({
    deleteDimension: {
      range: {
        sheetId: props.sheetId,
        dimension: "ROWS",
        startIndex: idx,
        endIndex: idx + 1
      }
    }
  }));

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      requests
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || "Failed to delete rows from Google Sheet");
  }
}
