import { ScheduledProject } from './scheduler';

/**
 * Export du planning au format iCalendar (.ics) — Phase 3.
 *
 * Génère un événement « journée entière » par projet actif, posé sur sa
 * deadline, préfixé par le niveau de risque. Compatible Google Calendar,
 * Apple Calendar et Outlook (import de fichier .ics), sans OAuth ni credentials.
 *
 * NB : la synchronisation Google 2-way (OAuth) est un chantier séparé qui
 * nécessite un client OAuth Google côté projet.
 */

const RISK_PREFIX: Record<string, string> = {
  late: '🔴 EN RETARD',
  tight: '🟠 SERRÉ',
  ok: '🟢',
};

function pad(n: number): string {
  return `${n}`.padStart(2, '0');
}

/** YYYYMMDD (date locale) */
function dateOnly(d: Date): string {
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** Timestamp UTC YYYYMMDDTHHMMSSZ */
function stamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string): string {
  return (s || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function buildPlanningIcs(scheduled: ScheduledProject[], now = new Date()): string {
  const dtstamp = stamp(now);
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PEG//Planificateur de charge//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:PEG — Deadlines projets',
  ];

  for (const sp of scheduled) {
    const end = new Date(sp.project.endDate);
    if (isNaN(end.getTime())) continue;
    const next = new Date(end);
    next.setDate(next.getDate() + 1); // DTEND exclusif pour un all-day

    const prefix = RISK_PREFIX[sp.risk] ?? '';
    const summary = escapeText(`${prefix} ${sp.project.name} (deadline)`.trim());
    const producer = sp.project.producer?.name ?? 'Non assigné';
    const desc = escapeText(
      `Charge estimée : ~${sp.workload.days} j (${sp.workload.label})\n` +
        `Producteur : ${producer}\n` +
        `Marge : ${sp.margin} j ouvrés`
    );

    lines.push(
      'BEGIN:VEVENT',
      `UID:peg-planning-${sp.project.documentId}@mypeg.fr`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateOnly(end)}`,
      `DTEND;VALUE=DATE:${dateOnly(next)}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${desc}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  // CRLF requis par la RFC 5545
  return lines.join('\r\n');
}

/** Déclenche le téléchargement du .ics dans le navigateur. */
export function downloadPlanningIcs(scheduled: ScheduledProject[]): void {
  const ics = buildPlanningIcs(scheduled);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'peg-planning.ics';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
