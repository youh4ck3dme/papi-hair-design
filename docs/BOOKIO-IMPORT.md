# Bookio Customer Import

Use this script to import Bookio XLSX exports into Firestore `customers`.

Script:
- `scripts/import_bookio_customers.py`

Requirements:
- Python with `openpyxl` and `firebase_admin`
- `GOOGLE_APPLICATION_CREDENTIALS` set to a Firebase service account JSON with Firestore write access

Dry-run (no writes):

```powershell
python scripts/import_bookio_customers.py `
  --xlsx "docs/customerExport_1773179280786.xlsx" `
  --business-id "papi-hair-design-main" `
  --project-id "hairchainger-main-876665-176e8"
```

Apply import:

```powershell
python scripts/import_bookio_customers.py `
  --xlsx "docs/customerExport_1773179280786.xlsx" `
  --business-id "papi-hair-design-main" `
  --project-id "hairchainger-main-876665-176e8" `
  --apply
```

Output:
- JSON summary in terminal
- audit report in `docs/import-reports/bookio-import-YYYYMMDD-HHMMSS.json`

