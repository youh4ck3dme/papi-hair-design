# Migration data for importMigrationData Cloud Function

Place legacy export JSON files here:

- `profiles.json`
- `memberships.json`
- `businesses.json`
- `services.json`
- `service_subcategories.json`
- `employees.json`
- `employee_services.json`
- `appointments.json`

Each file must be a JSON array of objects with an `id` field. The function reads from this directory at runtime (bundled with the deployment).

## How to run the import

1. **Set secret (recommended):** In Firebase Console → Project settings → Functions → Environment config, set `IMPORT_MIGRATION_SECRET` to a random string. When calling the function, pass the same value as `data.adminSecret`. If the env var is not set, the function runs without a secret (use only in dev/emulator).

2. **Deploy:** `firebase deploy --only functions` (this bundles `migration_data/` into the deployment).

3. **Invoke:** From your app or a one-off script, call the callable function `importMigrationData` with `{ adminSecret: "<your-secret>" }` (if configured). The function returns an object with per-collection counts, e.g. `{ businesses: 1, services: 4, employees: 2, ... }`.

4. **Verify:** Check Firestore in the Firebase Console for document counts in `businesses`, `services`, `service_subcategories`, `employees`, `employee_services`, etc.
