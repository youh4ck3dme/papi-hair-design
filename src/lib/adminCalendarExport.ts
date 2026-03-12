import { format } from "date-fns";

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
      <td>${row.customerName}</td>
      <td>${row.serviceName ?? "-"}</td>
      <td>${row.employeeName ?? "-"}</td>
      <td>${row.customerEmail ?? "-"}</td>
      <td>${row.customerPhone ?? "-"}</td>
      <td>${row.status}</td>
      <td>${row.note ?? "-"}</td>
    </tr>
  `).join("");

  return `
    <!doctype html>
    <html lang="sk">
      <head>
        <meta charset="utf-8" />
        <title>Denny export - ${dateLabel}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
          h1 { margin: 0 0 8px; font-size: 24px; }
          p { margin: 0 0 24px; color: #475569; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; vertical-align: top; }
          th { background: #e0f2fe; }
          .meta { margin-bottom: 16px; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <h1>FYZIO&FIT - Denny prehlad</h1>
        <p>${dateLabel}</p>
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
