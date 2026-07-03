import https from "https";
import http from "http";
import prisma from "../config/prisma";

const SHEET_ID = process.env.SHEET_ID || "";
const APPS_SCRIPT_URL =
  process.env.GOOGLE_APPS_SCRIPT_URL || "";

function fetchUrl(
  url: string,
  method: string = "GET",
  body?: unknown,
  redirects: number = 5
): Promise<string> {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const mod = parsed.protocol === "https:" ? https : http;

    const options: https.RequestOptions = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      timeout: 15000,
    };

    const req = mod.request(options, (res) => {
      if (
        (res.statusCode === 301 ||
          res.statusCode === 302 ||
          res.statusCode === 307 ||
          res.statusCode === 308) &&
        res.headers.location &&
        redirects > 0
      ) {
        const redirectUrl = res.headers.location.startsWith("http")
          ? res.headers.location
          : `${parsed.protocol}//${parsed.host}${res.headers.location}`;
        resolve(fetchUrl(redirectUrl, method, body, redirects - 1));
        return;
      }

      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    });

    req.on("error", reject);
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timed out"));
    });

    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

export interface LeadSheetRow {
  id: string;
  companyName: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  source?: string;
  status: string;
  estimatedValue?: number | null;
  notes?: string | null;
  createdAt: Date;
}

export async function appendLeadToSheet(
  lead: LeadSheetRow
): Promise<boolean> {
  if (!APPS_SCRIPT_URL) {
    console.warn(
      "[GoogleSheets] No APPS_SCRIPT_URL set. Lead not synced."
    );
    return false;
  }

  try {
    await fetchUrl(APPS_SCRIPT_URL, "POST", {
      action: "append",
      id: lead.id,
      full_name: lead.companyName,
      contact_name: lead.contactName || "",
      email: lead.email || "",
      phone: lead.phone || "",
      platform: lead.source || "ERP",
      status: lead.status || "NEW",
      notes: lead.notes || "",
      created_time:
        lead.createdAt instanceof Date
          ? lead.createdAt.toISOString()
          : new Date().toISOString(),
    });

    console.log(
      `[GoogleSheets] Lead "${lead.companyName}" synced via Apps Script`
    );
    return true;
  } catch (error) {
    console.error("[GoogleSheets] Append failed:", error);
    return false;
  }
}

export async function updateLeadInSheet(
  leadId: string,
  status: string,
  notes?: string | null
): Promise<boolean> {
  if (!APPS_SCRIPT_URL) return false;

  try {
    await fetchUrl(APPS_SCRIPT_URL, "POST", {
      action: "update",
      id: leadId,
      status,
      notes: notes || "",
    });

    console.log(`[GoogleSheets] Lead "${leadId}" updated in sheet`);
    return true;
  } catch (error) {
    console.error("[GoogleSheets] Update failed:", error);
    return false;
  }
}

export async function importLeadsFromSheet(): Promise<{
  imported: number;
  errors: number;
}> {
  let imported = 0;
  let errors = 0;

  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    const csvText = await fetchUrl(csvUrl);
    const lines = csvText.trim().split("\n");

    if (lines.length <= 1) return { imported: 0, errors: 0 };

    const headers = lines[0].split(",").map((h) => h.replace(/"/g, "").trim());

    const colIndex = (name: string) => {
      const idx = headers.findIndex(
        (h) => h.toLowerCase() === name.toLowerCase()
      );
      return idx;
    };

    const getCol = (row: string[], name: string) => {
      const idx = colIndex(name);
      return idx !== -1 ? row[idx]?.replace(/^"|"$/g, "").trim() || "" : "";
    };

    const fieldMap: Record<string, number> = {};
    headers.forEach((h, i) => { fieldMap[h.toLowerCase()] = i; });
    const gc = (row: string[], name: string) => {
      const idx = fieldMap[name.toLowerCase()];
      return idx !== undefined ? row[idx]?.replace(/^"|"$/g, "").trim() || "" : "";
    };

    for (let i = 1; i < lines.length; i++) {
      try {
        const raw = lines[i];
        const row: string[] = [];
        let current = "";
        let inQuotes = false;
        for (const ch of raw) {
          if (ch === '"') inQuotes = !inQuotes;
          else if (ch === "," && !inQuotes) { row.push(current); current = ""; }
          else current += ch;
        }
        row.push(current);

        const fullName = gc(row, "full_name");
        const phone = gc(row, "phone_number");
        const email = gc(row, "email");
        const platform = gc(row, "platform").toUpperCase();
        const leadStatus = gc(row, "lead_status").toUpperCase();
        const sheetId = gc(row, "id");

        if (!fullName && !phone && !email) continue;

        if (sheetId) {
          const existing = await prisma.lead.findFirst({
            where: { notes: { contains: `"sheetId":"${sheetId}"` } },
          });
          if (existing) continue;
        }

        if (email) {
          const existingEmail = await prisma.lead.findFirst({
            where: { email },
          });
          if (existingEmail) continue;
        }

        const leadSourceMap: Record<string, string> = {
          IG: "SOCIAL_MEDIA",
          FB: "SOCIAL_MEDIA",
          FACEBOOK: "SOCIAL_MEDIA",
          INSTAGRAM: "SOCIAL_MEDIA",
          META: "SOCIAL_MEDIA",
          GOOGLE: "GOOGLE_ADS",
          WEBSITE: "WEBSITE",
        };

        const source = leadSourceMap[platform] || "SOCIAL_MEDIA";

        const sheetMeta: Record<string, string> = {};
        headers.forEach((h) => {
          const val = gc(row, h);
          if (val) sheetMeta[h] = val;
        });

        await prisma.lead.create({
          data: {
            companyName: fullName || `Lead - ${email || phone}`,
            contactName: fullName || null,
            email: email || null,
            phone: phone || null,
            source: source as any,
            status:
              leadStatus === "CREATED" ? "NEW" : leadStatus === "CONTACTED" ? "CONTACTED" : "NEW",
            notes: JSON.stringify({ ...sheetMeta, _note: `Imported from Google Sheets (${platform || "unknown"})` }),
          },
        });

        imported++;
      } catch {
        errors++;
      }
    }

    console.log(
      `[GoogleSheets] Imported ${imported} leads from CSV (${errors} errors)`
    );
    return { imported, errors };
  } catch (error) {
    console.error("[GoogleSheets] Import failed:", error);
    return { imported: 0, errors: 0 };
  }
}

export async function getSheetStatus(): Promise<{
  connected: boolean;
  sheetId: string;
  leadCount: number;
  appsScript: boolean;
}> {
  try {
    const csvUrl = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;
    const csvText = await fetchUrl(csvUrl);
    const lines = csvText.trim().split("\n");

    return {
      connected: true,
      sheetId: SHEET_ID,
      leadCount: Math.max(0, lines.length - 1),
      appsScript: Boolean(APPS_SCRIPT_URL),
    };
  } catch {
    return {
      connected: false,
      sheetId: SHEET_ID,
      leadCount: 0,
      appsScript: Boolean(APPS_SCRIPT_URL),
    };
  }
}
