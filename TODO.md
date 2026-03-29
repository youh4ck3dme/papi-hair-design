# TODO — Produkčné opravné prompty (priorita)

## 1. Homepage mobile/tablet cleanup (bez redesignu desktopu)
- Odstráň na mobile/tablete (`<=1024px`) mini-popisy pod 5 kartami: `SALÓN`, `HODINY`, `CENNÍK`, `REZERVÁCIA`, `KONTAKT`.
- Nechaj len ikonu + názov + klikateľnú premium kartu.
- Zachovaj existujúce klik flow (anchors/routing/booking logika) bez zmeny.
- Sekcia kariet musí mať `min-h-[100svh]` + fallback `min-h-screen`, bez horizontálneho scrollu.
- Mobil/tablet má pôsobiť edge-to-edge (minimal gutters), desktop obsah ostáva nezmenený.
- Over: iPhone portrait/landscape, iPad portrait/landscape, desktop unchanged.
- Spusť: `npm run typecheck` a `npm run build:dev`.

## 2. SalonLogin + Bootstrap hardening (`ERR_BLOCKED_BY_CLIENT`)
- V `SalonLoginPage.tsx` nepovažuj Firestore `Listen ... TYPE=terminate` + `ERR_BLOCKED_BY_CLIENT` za login failure.
- `signInWithEmailAndPassword` je source of truth; po úspechu pokračuj na `/admin/calendar`.
- Pridaj jemnú user hlášku (1x): prehliadač blokuje časť Firebase requestov (Shields/AdBlock).
- V `BootstrapPage.tsx` pridaj robustné mapovanie chýb callable (`unauthenticated`, `permission-denied`, `not-found`, `unavailable`, `failed-precondition`) na jasné texty.
- Disable tlačidlo počas loadingu, zabráň double-clicku.
- Otestuj bootstrap flow unit testami.

## 3. `/admin/calendar` — nekonečný loading/spinner loop
- Oprav data-flow v `CalendarPage.tsx`: odstráň slučku medzi `loadEvents` a `employees` dependency.
- Rozdeľ fetch effecty:
  - statické dáta (`services`, `employees`, `schedules`, `memberships`),
  - udalosti (`appointments`, `time_blocks`) podľa filtrov/role.
- Pridaj cancellation guard (`isMounted`/request token), aby sa po unmount nerobili `setState`.
- Loading nastavuj striktne `true` pri štarte fetchu a `false` vo `finally`.
- Nesmie zostať permanentný spinner pri `PDF/Tlač` ani pri refresh.
- Spusť: `npm run typecheck` + relevantný test pre `CalendarPage`.

## 4. `/admin/appointments` — index error + prázdny zoznam
- V `AppointmentsPage.tsx` odstráň krehkú závislosť na chýbajúcich indexoch:
  - používaj `orderBy("start_at", "asc") + limitToLast(100)`,
  - finálne zoradenie sprav v JS na `desc`.
- Zachovaj role-based scope (owner/admin všetko, employee svoje) a existujúce filtre.
- Pri `failed-precondition` / `requires an index` zobraz jasnú hlášku a nech stránka nespadne.
- Doplň do `firestore.indexes.json` potrebné composite indexy:
  - `business_id ASC + start_at DESC`
  - `business_id ASC + employee_id ASC + start_at DESC`
- Deploy indexov: `firebase deploy --only firestore:indexes`.

## 5. `/admin/settings` — avatar upload CORS
- Over Firebase Storage bucket konfiguráciu (`VITE_FIREBASE_STORAGE_BUCKET`, `config.ts`) a oprav prípadný mismatch bucketu.
- Pridaj `storage.cors.json` s originmi:
  - `http://localhost:5678`
  - `http://192.168.0.8:5678`
  - `https://booking.papihairdesign.sk`
  - prípadne fallback hosty podľa projektu.
- Aplikuj CORS na bucket (`gsutil cors set ...`).
- V `SettingsPage.tsx` mapuj storage chyby na jasné user hlášky (CORS, unauthorized, temporary storage issue).
- Zablokuj dvojitý submit počas uploadu; po úspechu refresh profil URL + zatvor cropper.
- V `AvatarCropper.tsx` validuj MIME (`jpg/png/webp`) a max size (napr. 5MB).

## 6. Globálny admin stability fix pre Firestore blocked requests
- Pridaj helper `isBlockedByClientError(error)` a centrálne odlíš ne-kritické blokovanie extension od reálnej chyby dát.
- `ERR_BLOCKED_BY_CLIENT` na cleanup terminate requestoch loguj ako `warn/info`, nie fatal `error`.
- Pri blocked-by-client ukáž iba 1x informačný toast/banner za session.
- Realtime listener flow nech fallbackne na bezpečný one-shot fetch tam, kde je to vhodné.
- Žiadny nekonečný spinner, žiadne retry spam slučky.
- Doplň unit testy pre helper + admin load flow.

## 7. Overenie pred merge/deploy
- `npm run typecheck`
- `npm run build:dev`
- Relevatné vitest súbory podľa upravených stránok
- Manuálne smoke testy:
  - `/` (mobile/tablet/desktop)
  - `/admin/calendar`
  - `/admin/appointments`
  - `/admin/settings`
  - `/bootstrap`

