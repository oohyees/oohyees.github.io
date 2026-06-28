import type { APIRoute } from "astro";

type BaoyanEvent = {
  name?: string;
  institute?: string;
  description?: string;
  deadline?: string;
  website?: string;
  tags?: string[];
  province?: string;
};

type BaoyanData = Record<string, BaoyanEvent[]>;

const DATA_URL =
  "https://raw.githubusercontent.com/CS-BAOYAN/BoardCaster/main/data.json";
const CALENDAR_NAME = "CS 保研 DDL";
const CALENDAR_DESCRIPTION = "CS-BAOYAN 夏令营/预推免报名截止日";

const stageNames: Record<string, string> = {
  camp: "夏令营",
  yutuimian: "预推免",
};

const escapeIcsText = (value: string) =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/\r?\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");

const foldLine = (line: string) => {
  const maxLength = 75;
  const chars = [...line];

  if (chars.length <= maxLength) return line;

  const lines: string[] = [];
  let current = "";

  for (const char of chars) {
    if ([...current, char].length > maxLength) {
      lines.push(current);
      current = ` ${char}`;
    } else {
      current += char;
    }
  }

  lines.push(current);
  return lines.join("\r\n");
};

const serializeLine = (name: string, value: string) =>
  foldLine(`${name}:${value}`);

const toUtcIcsDateTime = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

const toIcsDate = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));

  return `${values.year}${values.month}${values.day}`;
};

const getShanghaiParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  return Object.fromEntries(parts.map(part => [part.type, part.value]));
};

const addDaysToIcsDate = (icsDate: string, days: number) => {
  const year = Number(icsDate.slice(0, 4));
  const month = Number(icsDate.slice(4, 6));
  const day = Number(icsDate.slice(6, 8));
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(
    date.getUTCDate()
  ).padStart(2, "0")}`;
};

const getStageName = (key: string) => {
  const [, stage = key, year = ""] = key.match(/^([a-z]+)(\d{4})$/) ?? [];
  return `${year}${stageNames[stage] ?? stage}`;
};

const getTitle = (event: BaoyanEvent, stage: string) => {
  const institute = event.institute ? ` ${event.institute}` : "";
  return `【${stage}截止】${event.name ?? "未知学校"}${institute}`;
};

const getDescription = (event: BaoyanEvent, stage: string) => {
  const fields = [
    ["阶段", stage],
    ["学校", event.name],
    ["学院/项目", event.institute],
    ["地区", event.province],
    ["标签", event.tags?.join("、")],
    [
      "说明",
      event.description && event.description !== "_No response_"
        ? event.description
        : undefined,
    ],
    ["链接", event.website],
  ];

  return fields
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
};

const getValidUrl = (value?: string) => {
  if (!value || /\s/.test(value)) return undefined;

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
};

const getUid = (event: BaoyanEvent, stageKey: string, index: number) => {
  const source = [
    stageKey,
    event.name,
    event.institute,
    event.deadline,
    event.website,
    index,
  ].join("|");
  let hash = 0;

  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }

  return `${stageKey}-${hash.toString(36)}@oohyees.github.io`;
};

const hasOnlyDatePrecision = (deadline: string, date: Date) => {
  if (/T00:00(?::00)?(?:[+-]\d{2}:?\d{2}|Z)?$/.test(deadline)) return true;
  if (!deadline.includes("T")) return true;

  const parts = getShanghaiParts(date);
  return parts.hour === "24" && parts.minute === "00" && parts.second === "00";
};

const serializeEvent = (
  event: BaoyanEvent,
  stageKey: string,
  index: number,
  now: Date
) => {
  if (!event.deadline) return [];

  const deadline = new Date(event.deadline);
  if (Number.isNaN(deadline.getTime())) return [];

  const stage = getStageName(stageKey);
  const summary = getTitle(event, stage);
  const description = getDescription(event, stage);
  const lines = [
    "BEGIN:VEVENT",
    serializeLine("UID", escapeIcsText(getUid(event, stageKey, index))),
    serializeLine("DTSTAMP", toUtcIcsDateTime(now)),
    serializeLine("SUMMARY", escapeIcsText(summary)),
    serializeLine("DESCRIPTION", escapeIcsText(description)),
  ];

  const url = getValidUrl(event.website);

  if (url) {
    lines.push(serializeLine("URL", escapeIcsText(url)));
  }

  if (hasOnlyDatePrecision(event.deadline, deadline)) {
    const date = toIcsDate(deadline);
    lines.push(`DTSTART;VALUE=DATE:${date}`);
    lines.push(`DTEND;VALUE=DATE:${addDaysToIcsDate(date, 1)}`);
  } else {
    lines.push(serializeLine("DTSTART", toUtcIcsDateTime(deadline)));
    lines.push(
      serializeLine(
        "DTEND",
        toUtcIcsDateTime(new Date(deadline.getTime() + 30 * 60 * 1000))
      )
    );
  }

  lines.push("END:VEVENT");
  return lines;
};

const serializeCalendar = (data: BaoyanData) => {
  const now = new Date();
  const firstDayOfCurrentYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
  const eventLines = Object.entries(data)
    .flatMap(([stageKey, events]) =>
      Array.isArray(events)
        ? events.map((event, index) => ({ event, stageKey, index }))
        : []
    )
    .filter(({ event }) => {
      if (!event.deadline) return false;

      const deadline = new Date(event.deadline);
      return (
        !Number.isNaN(deadline.getTime()) && deadline >= firstDayOfCurrentYear
      );
    })
    .sort((a, b) => {
      const dateDiff =
        new Date(a.event.deadline ?? "").getTime() -
        new Date(b.event.deadline ?? "").getTime();

      if (dateDiff !== 0) return dateDiff;

      return getTitle(a.event, getStageName(a.stageKey)).localeCompare(
        getTitle(b.event, getStageName(b.stageKey)),
        "zh-CN"
      );
    })
    .flatMap(({ event, stageKey, index }) =>
      serializeEvent(event, stageKey, index, now)
    );

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//oohyees//CS Baoyan DDL//ZH-CN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    serializeLine("X-WR-CALNAME", escapeIcsText(CALENDAR_NAME)),
    serializeLine("X-WR-CALDESC", escapeIcsText(CALENDAR_DESCRIPTION)),
    "X-WR-TIMEZONE:Asia/Shanghai",
    ...eventLines,
    "END:VCALENDAR",
    "",
  ].join("\r\n");
};

export const GET: APIRoute = async () => {
  const response = await fetch(DATA_URL, {
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    return new Response("Unable to fetch CS-BAOYAN BoardCaster data.", {
      status: 502,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  const data = (await response.json()) as BaoyanData;

  return new Response(serializeCalendar(data), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="baoyan.ics"',
      "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
    },
  });
};
