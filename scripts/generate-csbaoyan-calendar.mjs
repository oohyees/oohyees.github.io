#!/usr/bin/env node

/**
 * Generate CS Baoyan DDL Calendar ICS file.
 *
 * Fetches data from https://ddl.csbaoyan.top/config/schools.json,
 * filters for future deadlines, and produces a standards-compliant
 * ICS file at public/calendar/csbaoyan-ddl.ics.
 *
 * Usage: node scripts/generate-csbaoyan-calendar.mjs
 */

import { createHash } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DATA_URL = "https://raw.githubusercontent.com/CS-BAOYAN/BoardCaster/main/data.json";
const OUTPUT_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "public",
  "calendar"
);
const OUTPUT_FILE = resolve(OUTPUT_DIR, "csbaoyan-ddl.ics");
const TIMEZONE = "Asia/Shanghai";
const EVENT_DURATION_MINUTES = 30; // how long each calendar event lasts

// Alarm offsets (in minutes before the deadline)
const ALARM_OFFSETS = [
  { minutes: 7 * 24 * 60, description: "截止前 7 天" },   // 7 days
  { minutes: 3 * 24 * 60, description: "截止前 3 天" },   // 3 days
  { minutes: 1 * 24 * 60, description: "截止前 1 天" },   // 1 day
  { minutes: 6 * 60,      description: "截止前 6 小时" }, // 6 hours
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Escape ICS text value.
 * Backslash-escapes: \ ; , and newlines.
 * Newlines in DESCRIPTION are converted to literal \n.
 */
function escapeText(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n/g, "\\n")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\n");
}

/**
 * Fold a long line to the ICS 75-octet limit.
 * Continuation lines start with a single space.
 */
function foldLine(line) {
  const MAX_LEN = 75;
  if (Buffer.byteLength(line, "utf-8") <= MAX_LEN) return line;

  const parts = [];
  let remaining = line;
  while (remaining.length > 0) {
    if (parts.length === 0) {
      // first chunk: up to MAX_LEN octets
      const chunk = truncateToOctetLen(remaining, MAX_LEN);
      parts.push(chunk);
      remaining = remaining.slice(chunk.length);
    } else {
      // continuation chunk: up to MAX_LEN - 1 octets (leading space)
      const chunk = truncateToOctetLen(remaining, MAX_LEN - 1);
      parts.push(" " + chunk);
      remaining = remaining.slice(chunk.length);
    }
  }
  return parts.join("\r\n");
}

/** Truncate a string to at most `maxOctets` UTF-8 bytes without splitting a multi-byte char. */
function truncateToOctetLen(str, maxOctets) {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const charLen = Buffer.byteLength(str[i], "utf-8");
    if (len + charLen > maxOctets) return str.slice(0, i);
    len += charLen;
  }
  return str;
}

/**
 * Format a JS Date as an ICS local-time datetime string with timezone suffix.
 * Example output: 20250110T000000
 */
function toICSDateTime(date) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    "T" +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

/**
 * Parse an ISO 8601 deadline string (e.g. "2025-01-10T00:00:00+08:00") into a Date.
 * Returns null if parsing fails or the value is clearly not a date (e.g. "暂无").
 */
function parseDeadline(raw) {
  if (!raw || typeof raw !== "string") return null;

  // Skip non-date placeholder values
  if (/^[一-鿿]/.test(raw.trim())) return null;

  let normalized = raw.trim();

  // Normalise single-digit timezone offset: +8:00 → +08:00
  normalized = normalized.replace(/([+-])(\d):(\d{2})$/, (_, sign, h, m) => {
    return sign + h.padStart(2, "0") + ":" + m;
  });

  // If no timezone offset and no trailing Z, assume Asia/Shanghai (+08:00)
  if (!/[+-]\d{2}:\d{2}$/.test(normalized) && !normalized.endsWith("Z")) {
    normalized += "+08:00";
  }

  const d = new Date(normalized);
  if (isNaN(d.getTime())) return null;
  return d;
}

/**
 * Generate a stable UID for a calendar event.
 */
function makeUID(name, institute, deadlineRaw, website, sourceKey) {
  const hash = createHash("sha256")
    .update(`${name}|${institute}|${deadlineRaw}|${website}|${sourceKey}`)
    .digest("hex")
    .slice(0, 16);
  return `${hash}@oohyees.github.io`;
}

// ---------------------------------------------------------------------------
// ICS content builders
// ---------------------------------------------------------------------------

function buildVCALENDAR() {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//oohyees//CS Baoyan DDL Calendar//ZH-CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:CS 保研 DDL",
    `X-WR-TIMEZONE:${TIMEZONE}`,
  ];
  return { lines, push: (l) => lines.push(l) };
}

function buildVEVENT(item, sourceKey) {
  const deadline = parseDeadline(item.deadline);
  if (!deadline) return null;

  const name = item.name || "";
  const institute = item.institute || "";
  const description = item.description || "";
  const website = item.website || "";
  const tags = Array.isArray(item.tags) ? item.tags.join(", ") : "";

  // DTSTART = deadline - 30 min; DTEND = deadline
  const dtStart = new Date(deadline.getTime() - EVENT_DURATION_MINUTES * 60 * 1000);
  const dtEnd = deadline;

  const uid = makeUID(name, institute, item.deadline, website, sourceKey);

  // Build DESCRIPTION with all available info
  const descParts = [];
  if (name) descParts.push(`学校: ${name}`);
  if (institute) descParts.push(`院系/项目: ${institute}`);
  if (description) descParts.push(`描述: ${description}`);
  descParts.push(`截止时间: ${toICSDateTime(deadline)} (Asia/Shanghai)`);
  if (website) descParts.push(`官网链接: ${website}`);
  if (tags) descParts.push(`标签: ${tags}`);
  descParts.push(`数据源: ${sourceKey}`);
  descParts.push(`数据来源: https://ddl.csbaoyan.top`);

  const descriptionText = descParts.join("\\n");

  // SUMMARY
  let summary = "DDL";
  if (name) summary += `｜${name}`;
  if (institute) summary += `｜${institute}`;

  const lines = [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTART:${toICSDateTime(dtStart)}`,
    `DTEND:${toICSDateTime(dtEnd)}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(descriptionText)}`,
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
  ];

  if (website) {
    lines.push(`URL:${escapeText(website)}`);
  }

  // VALARMs
  for (const alarm of ALARM_OFFSETS) {
    const triggerTime = new Date(deadline.getTime() - alarm.minutes * 60 * 1000);
    lines.push("BEGIN:VALARM");
    lines.push("ACTION:DISPLAY");
    lines.push(`DESCRIPTION:${escapeText(`提醒: ${summary} 截止于 ${toICSDateTime(deadline)} (${alarm.description})`)}`);
    lines.push(`TRIGGER;VALUE=DATE-TIME:${toICSDateTime(triggerTime)}`);
    lines.push("END:VALARM");
  }

  lines.push("END:VEVENT");
  return lines;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("Fetching CS Baoyan DDL data...");
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
  }

  /** @type {Record<string, Array>} */
  const data = await response.json();
  console.log(`Fetched data with keys: ${Object.keys(data).join(", ")}`);

  const now = new Date();
  const cal = buildVCALENDAR();
  let totalEvents = 0;

  for (const [sourceKey, items] of Object.entries(data)) {
    if (!Array.isArray(items)) {
      console.warn(`Skipping non-array key: ${sourceKey}`);
      continue;
    }

    let sourceCount = 0;
    for (const item of items) {
      // Skip items without a name or deadline
      if (!item.name || !item.deadline) {
        continue;
      }

      const deadline = parseDeadline(item.deadline);
      if (!deadline) {
        console.warn(`Skipping item with unparseable deadline: ${item.name} / ${item.institute || "-"}`);
        continue;
      }

      // Skip past deadlines
      if (deadline <= now) {
        continue;
      }

      const eventLines = buildVEVENT(item, sourceKey);
      if (eventLines) {
        for (const line of eventLines) {
          cal.push(line);
        }
        sourceCount++;
      }
    }

    if (sourceCount > 0) {
      console.log(`  ${sourceKey}: ${sourceCount} upcoming events`);
    }
    totalEvents += sourceCount;
  }

  cal.push("END:VCALENDAR");

  // Apply line folding and join with CRLF
  const folded = cal.lines.map(foldLine).join("\r\n") + "\r\n";

  // Ensure output directory exists
  mkdirSync(OUTPUT_DIR, { recursive: true });

  // Write UTF-8 file (Node's writeFileSync writes UTF-8 by default)
  writeFileSync(OUTPUT_FILE, folded, "utf-8");

  console.log(`\n✅ Generated ${totalEvents} events → ${OUTPUT_FILE}`);
}

main().catch((err) => {
  console.error("❌ Failed to generate calendar:", err);
  process.exit(1);
});
