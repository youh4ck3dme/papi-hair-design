import { format } from "date-fns";
import { APP_BRAND_NAME } from "@/lib/brandConfig";

export interface AdminCalendarExportRow {
  reference: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  serviceName: string | null;
  employeeName: string | null;
  start: Date;
  end: Date;
  status: string;
  note?: string | null;
}

function escapeCsv(value: string): string {
  if (/[",\n;]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildAdminCalendarCsv(rows: AdminCalendarExportRow[]): string {
  const header = [
    "Referencia",
    "Klient",
    "Email",
    "Telefon",
    "Sluzba",
    "Tim",
    "Zaciatok",
    "Koniec",
    "Status",
    "Poznamka",
  ];

  const body = rows.map((row) => [
    row.reference,
    row.customerName,
    row.customerEmail ?? "",
    row.customerPhone ?? "",
    row.serviceName ?? "",
    row.employeeName ?? "",
    format(row.start, "yyyy-MM-dd HH:mm"),
    format(row.end, "yyyy-MM-dd HH:mm"),
    row.status,
    row.note ?? "",
  ].map((value) => escapeCsv(value)).join(";"));

  return [header.join(";"), ...body].join("\n");
}

export function buildAdminCalendarPrintHtml(dateLabel: string, rows: AdminCalendarExportRow[]): string {
  const rowsHtml = rows.map((row) => `
    <tr>
      <td>${format(row.start, "HH:mm")} - ${format(row.end, "HH:mm")}</td>
      <td>${escapeHtml(row.customerName)}</td>
      <td>${escapeHtml(row.serviceName ?? "-")}</td>
      <td>${escapeHtml(row.employeeName ?? "-")}</td>
      <td>${escapeHtml(row.customerEmail ?? "-")}</td>
      <td>${escapeHtml(row.customerPhone ?? "-")}</td>
      <td>${escapeHtml(row.status)}</td>
      <td>${escapeHtml(row.note ?? "-")}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html lang="sk">
      <head>
        <meta charset="utf-8" />
        <title>Denny export - ${escapeHtml(dateLabel)}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #18181b; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 24px; color: #52525b; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #d4d4d8; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #111111; color: #fafafa; }
          .meta { margin-bottom: 16px; font-size: 12px; color: #71717a; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(APP_BRAND_NAME)} - Denný prehľad</h1>
        <p>${escapeHtml(dateLabel)}</p>
        <div class="meta">Pocet rezervacii: ${rows.length}</div>
        <table>
          <thead>
            <tr>
              <th>Cas</th>
              <th>Klient</th>
              <th>Sluzba</th>
              <th>Tim</th>
              <th>Email</th>
              <th>Telefon</th>
              <th>Status</th>
              <th>Poznamka</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </body>
    </html>
  `;
}
