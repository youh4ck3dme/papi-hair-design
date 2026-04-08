# Full Project Inventory (2026-04-09)

- Workspace: C:\Users\42195\Downloads\loveable-PHDbooking-finale-3-3-26
- Count (visible, non-ignored by .gitignore): 468 files
- Excluded: node_modules/, .git/, venv/, gitignored paths

## Tree (Depth <= 4)
```text
- .env.example
- .firebaserc
- .gitattributes
+ .github
  + ISSUE_TEMPLATE
    - bug_report.md
    - feature_request.md
  - PULL_REQUEST_TEMPLATE.md
  + workflows
    - ci.yml
    - codeql.yml
    - deploy-functions.yml
- .gitignore
+ .lovable
  - plan.md
- .npmrc
- .nvmrc
+ booking-papihairdesign-sk
  - .gitignore
  - eslint.config.mjs
  - next.config.ts
  - package.json
  - package-lock.json
  - postcss.config.mjs
  + public
    - file.svg
    - globe.svg
    - next.svg
    - vercel.svg
    - window.svg
  - README.md
  + src
    + app
      - favicon.ico
      - globals.css
      - layout.tsx
      - page.tsx
  - tsconfig.json
- bun.lockb
- capture_login.cjs
- capture_login.js
- components.json
+ docs
  - AI-CONTINUATION-GUIDE.md
  - ANALYTICS.md
  - ARCHITECTURE.md
  - AUTH-BOOKING-DOMAIN.md
  - BOOKING-PAPIHAIRDESIGN-SK.code-workspace
  - BOOKIO-IMPORT.md
  - BRANCHES.md
  - COLLABORATORS.md
  - CREDENTIALS-STORE.md
  - CURRENT_PROJECT_STATE.md
  - CUSTOM-DOMAIN.md
  - DEVELOPMENT-SETUP.md
  - E2E-TESTING.md
  - EMAIL-NOTIFICATIONS-DEPLOY.md
  - EMAIL-NOTIFICATIONS-IMPLEMENTATION.md
  - EMAIL-NOTIFICATIONS-MANUAL-DEPLOY.md
  - google2e037b48f21a0d2d.html
  - GRANDE-FINALE-STATUS-2026-03-11.md
  - loveable-PHDbooking-finale-3-3-26.code-workspace
  - MIGRATION-FIREBASE.md
  - MOBILE-CALENDAR-QA-CHECKLIST.md
  - MONITORING-24H-CHECKLIST.md
  - papipocitacmacos.zip
  - POST-RELEASE-SMOKE-CHECKLIST.md
  - PROJECT-DIAGNOSTIC-BLUEPRINT-2026-03-28.md
  - RECAPTCHA.md
  - ROLLBACK-RUNBOOK.md
  + screenshots
    - admin-calendar-desktop-after.png
    - admin-calendar-mobile-after.png
  - seed-auth.sql
  - seed-demo.sql
  - SETUP-CLI-PLAN.md
  - STATUS-FUNKCNOST.md
  - supabase-add-owner-admin.sql
  - TARGET-ARCHITECTURE-90D-PLAN.md
  - TARGET-ARCHITECTURE-GAP-ANALYSIS.md
  - zmenacennik.txt
+ e2e
  - admin-calendar.spec.ts
  + admin-calendar.spec.ts-snapshots
    - admin-calendar-filters-desktop-chromium-win32.png
    - admin-calendar-filters-mobile-chromium-win32.png
    - admin-calendar-time-gutter-desktop-chromium-win32.png
    - admin-calendar-time-gutter-mobile-chromium-win32.png
  - booking.spec.ts
  - playwright.config.preview.ts
  - playwright.config.ts
  - responsiveness.spec.ts
  - viewports.ts
+ emulator-data
  - firebase-export-metadata.json
  + firestore_export
    + all_namespaces
      + all_kinds
    - firestore_export.overall_export_metadata
- eslint.config.js
+ extensions
  - firestore-send-email.env
- fill_holidays.cjs
- firebase.json
- firestore.indexes.json
- firestore.rules
+ functions
  - .gitignore
  + migration_data
    - appointments.json
    - businesses.json
    - employee_services.json
    - employees.json
    - memberships.json
    - profiles.json
    - README.md
    - services.json
  - package.json
  - package-lock.json
  + src
    - adminCalendarQuickAction.ts
    - adminUpdateBookingStatus.ts
    - auditLog.ts
    - autoAssignEmployee.ts
    - bookingStatus.ts
    - bootstrapAdminAccess.ts
    - claimBooking.ts
    - cleanupExpiredHolds.ts
    - confirmBooking.ts
    - consentEvent.ts
    - createBookingHold.ts
    - createPublicBooking.ts
    - emailQueue.ts
    - enforceSalonRoles.ts
    - errors.ts
    - getPublicAvailabilityConflicts.ts
    - guards.ts
    - importMigrationData.ts
    - index.ts
    - listBookableProviders.ts
    - lookupBookingHistory.ts
    + middleware
      - rateLimit.ts
    - normalizeMemberships.ts
    - publicBookingAccess.ts
    - rebuildPublicSnapshot.ts
    - saveSmtpConfig.ts
    - secretManager.ts
    - sendSms.ts
    - syncEmployeePhotoFromProfile.ts
    - syncOfflineData.ts
    - types.d.ts
  + test
    - autoAssignEmployee.test.ts
    - bookingHoldConfirm.test.ts
    - bookingStatus.test.ts
    - bootstrapAdminAccess.test.ts
    - emailQueue.test.ts
    - setup.ts
  - tsconfig.json
  - vitest.config.ts
- get_url.cjs
- get-firebase-config.js
- CHANGELOG.md
- check_db.cjs
- index.html
- OWNERMANUAL.md
- pack0-baseline.patch
- pack0-baseline-utf8.patch
- package.json
- package-lock.json
- playwright.config.ts
- postcss.config.js
+ public
  - .htaccess
  - _redirects
  - 404.html
  - favicon.ico
  - favicon.png
  - google2e037b48f21a0d2d.html
  - index.html
  - mato.webp
  - miska.webp
  - papi.webp
  - placeholder.svg
  - pwa-icon-192.png
  - pwa-icon-512.png
  - robots.txt
  - sitemap.xml
- README.md
+ scripts
  - booking-mobile-audit-live.mjs
  - budget-check.mjs
  - calendar-mobile-audit-live.mjs
  - capture-admin-calendar-screenshots.mjs
  - deploy-vercel.ps1
  - enforce-salon-roles-live.mjs
  - check-env.mjs
  - import_bookio_customers.py
  - import-firestore.js
  - lockin-check.mjs
  - role-auth-smoke-live.mjs
  - set-vercel-token-env.ps1
  - sync-firebase-secrets.ps1
  - test-deployment-setup.ps1
  - vercel-hobby-after-transfer.ps1
  - vercel-hobby-new-personal-repo.ps1
- setup.ps1
+ src
  - App.css
  - App.tsx
  + assets
    - card-bg-accounts.jpg
    - card-bg-features.jpg
    - card-bg-hero.jpg
    - card-bg-how.jpg
    - card-bg-qr.jpg
    - employee-mato.jpg
    - employee-miska.jpeg
    - logo-icon.webp
    - luxury-accounts.png
    - luxury-features.png
    - luxury-hero.png
    - luxury-hours.png
    - luxury-qr.png
    - luxury-qr-3d.png
  + components
    + admin
      - AvatarCropper.tsx
      - BusinessHoursEditor.test.tsx
      - BusinessHoursEditor.tsx
    - AdminLayout.tsx
    + booking
      - AppointmentDetailSheet.test.tsx
      - AppointmentDetailSheet.tsx
      - BlockTimeSheet.tsx
      - BookingHeader.tsx
      - BookingSuccess.tsx
      - BookingUI.tsx
      - BusinessInfoPanel.tsx
      - ContactConfirmation.tsx
      - DateTimeSelection.tsx
      - EmployeeSelection.tsx
      - QuickBookingSheet.tsx
      - ServiceSelection.tsx
      - types.ts
    + booking-calendar
      + body
      - BookingCalendar.test.tsx
      - BookingCalendar.tsx
      - BookingCalendarEvent.tsx
      - BookingCalendarProvider.tsx
      - calendar-context.tsx
      - calendar-types.ts
      - event-color-classes.ts
      - event-search.ts
      + header
      - index.ts
    + calendar
      - AppointmentBlock.test.tsx
      - AppointmentBlock.tsx
      - CalendarComponents.test.tsx
      - CalendarEventCard.test.tsx
      - CalendarEventCard.tsx
      - CalendarViewSwitcher.tsx
      - DayTimeline.test.tsx
      - DayTimeline.tsx
      - GlassHeader.tsx
      + mobile
      - MobileCalendarShell.test.tsx
      - MobileCalendarShell.tsx
      - MonthGrid.test.tsx
      - MonthGrid.tsx
      - WeekTimeline.test.tsx
      - WeekTimeline.tsx
    - ConflictResolutionDialog.tsx
    - CookieConsent.tsx
    - LanguageToggle.tsx
    - LiquidGlassNav.tsx
    - LiquidWindow.tsx
    - LogoIcon.tsx
    - NavLink.test.tsx
    - NavLink.tsx
    - OfflineBanner.tsx
    - OnboardingWizard.tsx
    - ProtectedRoute.test.tsx
    - ProtectedRoute.tsx
    - ThemeToggle.tsx
    + ui
      - accordion.tsx
      - alert.tsx
      - alert-dialog.tsx
      - aspect-ratio.tsx
      - avatar.tsx
      - badge.tsx
      - breadcrumb.tsx
      - button.tsx
      - calendar.tsx
      - card.tsx
      - carousel.tsx
      - collapsible.tsx
      - command.tsx
      - context-menu.tsx
      - dialog.tsx
      - drawer.tsx
      - dropdown-menu.tsx
      - form.tsx
      - hover-card.tsx
      - chart.tsx
      - checkbox.tsx
      - input.tsx
      - input-otp.tsx
      - label.tsx
      - menubar.tsx
      - navigation-menu.tsx
      - pagination.tsx
      - popover.tsx
      - progress.tsx
      - radio-group.tsx
      - resizable.tsx
      - scroll-area.tsx
      - select.tsx
      - separator.tsx
      - sheet.tsx
      - sidebar.tsx
      - skeleton.tsx
      - slider.tsx
      - sonner.tsx
      - switch.tsx
      - table.tsx
      - tabs.tsx
      - textarea.tsx
      - toast.tsx
      - toaster.tsx
      - toggle.tsx
      - toggle-group.tsx
      - tooltip.tsx
      - use-toast.ts
  + contexts
    - AuthContext.tsx
  + hooks
    - useAvailability.ts
    - useBookingData.ts
    - useBookingForm.test.ts
    - useBookingForm.ts
    - useBusiness.test.ts
    - useBusiness.ts
    - useBusinessInfo.ts
    - useBusinessInfo.types.ts
    - use-mobile.tsx
    - useOnboarding.ts
    - use-toast.ts
    - useWebAuthn.ts
  + i18n
    - en.json
    - index.ts
    - sk.json
  - index.css
  + integrations
    + firebase
      - adminCalendarQuickAction.ts
      - adminUpdateBookingStatus.ts
      - callableError.test.ts
      - callableError.ts
      - config.ts
      - confirmBooking.ts
      - createBookingHold.ts
      - createPublicBooking.ts
      - getPublicAvailabilityConflicts.ts
      - lookupBookingHistory.ts
      - recaptcha.ts
      - sendSms.ts
      - useBookingDataFirebase.ts
      - useBusinessInfoFirebase.ts
  + lib
    - adminAllowlist.ts
    - adminBookingStatus.ts
    - adminCalendarExport.test.ts
    - adminCalendarExport.ts
    - availability.test.ts
    - availability.ts
    - businessIds.test.ts
    - businessIds.ts
    - calendarEventUtils.ts
    - calendarExport.test.ts
    - calendarExport.ts
    - calendar-utils.test.ts
    - calendar-utils.ts
    - diagnosticsHelpers.test.ts
    - diagnosticsHelpers.ts
    - firebaseClientErrors.test.ts
    - firebaseClientErrors.ts
    - indexed-db-available.test.ts
    - indexed-db-available.ts
    + offline
      - db.ts
      - reception.ts
      - sync.ts
    - priceListOrder.ts
    - profileImage.ts
    - providerSelection.ts
    - recaptcha.ts
    - tenantResolver.test.ts
    - tenantResolver.ts
    - timezone.test.ts
    - timezone.ts
    - useWindowManager.ts
    - utils.test.ts
    - utils.ts
    - validateEnv.test.ts
    - wcag.test.ts
    - wcag.ts
  - main.tsx
  + pages
    + __tests__
      - BookingHistoryPage.test.tsx
    + admin
      + __tests__
      - AppointmentsPage.tsx
      - CalendarPage.tsx
      - CustomersPage.tsx
      - DashboardPage.tsx
      - EmployeesPage.tsx
      - MySchedulePage.tsx
      - ServicesPage.tsx
      - SettingsPage.tsx
    - Auth.tsx
    - BookingHistoryPage.tsx
    - BookingPage.tsx
    - BootstrapPage.test.tsx
    - BootstrapPage.tsx
    - DemoPage.tsx
    - DiagnosticsPage.test.tsx
    - DiagnosticsPage.tsx
    - Index.tsx
    - InstallPage.test.tsx
    - InstallPage.tsx
    - LiquidPlayground.tsx
    - NotFound.test.tsx
    - NotFound.tsx
    - OfflinePage.test.tsx
    - OfflinePage.tsx
    - PrivacyPage.tsx
    - ReceptionPage.tsx
    - SalonLoginPage.tsx
    - StaticPages.test.tsx
    - TermsPage.tsx
  + styles
    - big-calendar-overrides.css
    - booking-calendar.css
    - expanding-cards.css
    - liquid-cookie.css
    - liquid-glass.css
    - liquid-glass-nav.css
  + test
    - calendar-coverage-99.test.ts
    - calendarEventUtils.test.ts
    - example.test.ts
    - setup.ts
  + types
    - calendar.ts
  - vite-env.d.ts
- storage.cors.json
- storage.rules
- tailwind.config.ts
+ test-results
  - .last-run.json
- TODO.md
- tsconfig.app.json
- tsconfig.json
- tsconfig.node.json
- update-firebase-env.cjs
- vercel.json
- vite.config.ts
- vitest.config.ts
```

## File List (All Visible Files)
```text
.env.example
.firebaserc
.gitattributes
.github/ISSUE_TEMPLATE/bug_report.md
.github/ISSUE_TEMPLATE/feature_request.md
.github/PULL_REQUEST_TEMPLATE.md
.github/workflows/ci.yml
.github/workflows/codeql.yml
.github/workflows/deploy-functions.yml
.gitignore
.lovable/plan.md
.npmrc
.nvmrc
booking-papihairdesign-sk/.gitignore
booking-papihairdesign-sk/eslint.config.mjs
booking-papihairdesign-sk/next.config.ts
booking-papihairdesign-sk/package.json
booking-papihairdesign-sk/package-lock.json
booking-papihairdesign-sk/postcss.config.mjs
booking-papihairdesign-sk/public/file.svg
booking-papihairdesign-sk/public/globe.svg
booking-papihairdesign-sk/public/next.svg
booking-papihairdesign-sk/public/vercel.svg
booking-papihairdesign-sk/public/window.svg
booking-papihairdesign-sk/README.md
booking-papihairdesign-sk/src/app/favicon.ico
booking-papihairdesign-sk/src/app/globals.css
booking-papihairdesign-sk/src/app/layout.tsx
booking-papihairdesign-sk/src/app/page.tsx
booking-papihairdesign-sk/tsconfig.json
bun.lockb
capture_login.cjs
capture_login.js
components.json
docs/AI-CONTINUATION-GUIDE.md
docs/ANALYTICS.md
docs/ARCHITECTURE.md
docs/AUTH-BOOKING-DOMAIN.md
docs/BOOKING-PAPIHAIRDESIGN-SK.code-workspace
docs/BOOKIO-IMPORT.md
docs/BRANCHES.md
docs/COLLABORATORS.md
docs/CREDENTIALS-STORE.md
docs/CURRENT_PROJECT_STATE.md
docs/CUSTOM-DOMAIN.md
docs/DEVELOPMENT-SETUP.md
docs/E2E-TESTING.md
docs/EMAIL-NOTIFICATIONS-DEPLOY.md
docs/EMAIL-NOTIFICATIONS-IMPLEMENTATION.md
docs/EMAIL-NOTIFICATIONS-MANUAL-DEPLOY.md
docs/google2e037b48f21a0d2d.html
docs/GRANDE-FINALE-STATUS-2026-03-11.md
docs/loveable-PHDbooking-finale-3-3-26.code-workspace
docs/MIGRATION-FIREBASE.md
docs/MOBILE-CALENDAR-QA-CHECKLIST.md
docs/MONITORING-24H-CHECKLIST.md
docs/papipocitacmacos.zip
docs/POST-RELEASE-SMOKE-CHECKLIST.md
docs/PROJECT-DIAGNOSTIC-BLUEPRINT-2026-03-28.md
docs/RECAPTCHA.md
docs/ROLLBACK-RUNBOOK.md
docs/screenshots/admin-calendar-desktop-after.png
docs/screenshots/admin-calendar-mobile-after.png
docs/seed-auth.sql
docs/seed-demo.sql
docs/SETUP-CLI-PLAN.md
docs/STATUS-FUNKCNOST.md
docs/supabase-add-owner-admin.sql
docs/TARGET-ARCHITECTURE-90D-PLAN.md
docs/TARGET-ARCHITECTURE-GAP-ANALYSIS.md
docs/zmenacennik.txt
e2e/admin-calendar.spec.ts
e2e/admin-calendar.spec.ts-snapshots/admin-calendar-filters-desktop-chromium-win32.png
e2e/admin-calendar.spec.ts-snapshots/admin-calendar-filters-mobile-chromium-win32.png
e2e/admin-calendar.spec.ts-snapshots/admin-calendar-time-gutter-desktop-chromium-win32.png
e2e/admin-calendar.spec.ts-snapshots/admin-calendar-time-gutter-mobile-chromium-win32.png
e2e/booking.spec.ts
e2e/playwright.config.preview.ts
e2e/playwright.config.ts
e2e/responsiveness.spec.ts
e2e/viewports.ts
emulator-data/firebase-export-metadata.json
emulator-data/firestore_export/all_namespaces/all_kinds/all_namespaces_all_kinds.export_metadata
emulator-data/firestore_export/all_namespaces/all_kinds/output-0
emulator-data/firestore_export/firestore_export.overall_export_metadata
eslint.config.js
extensions/firestore-send-email.env
fill_holidays.cjs
firebase.json
firestore.indexes.json
firestore.rules
functions/.gitignore
functions/migration_data/appointments.json
functions/migration_data/businesses.json
functions/migration_data/employee_services.json
functions/migration_data/employees.json
functions/migration_data/memberships.json
functions/migration_data/profiles.json
functions/migration_data/README.md
functions/migration_data/services.json
functions/package.json
functions/package-lock.json
functions/src/adminCalendarQuickAction.ts
functions/src/adminUpdateBookingStatus.ts
functions/src/auditLog.ts
functions/src/autoAssignEmployee.ts
functions/src/bookingStatus.ts
functions/src/bootstrapAdminAccess.ts
functions/src/claimBooking.ts
functions/src/cleanupExpiredHolds.ts
functions/src/confirmBooking.ts
functions/src/consentEvent.ts
functions/src/createBookingHold.ts
functions/src/createPublicBooking.ts
functions/src/emailQueue.ts
functions/src/enforceSalonRoles.ts
functions/src/errors.ts
functions/src/getPublicAvailabilityConflicts.ts
functions/src/guards.ts
functions/src/importMigrationData.ts
functions/src/index.ts
functions/src/listBookableProviders.ts
functions/src/lookupBookingHistory.ts
functions/src/middleware/rateLimit.ts
functions/src/normalizeMemberships.ts
functions/src/publicBookingAccess.ts
functions/src/rebuildPublicSnapshot.ts
functions/src/saveSmtpConfig.ts
functions/src/secretManager.ts
functions/src/sendSms.ts
functions/src/syncEmployeePhotoFromProfile.ts
functions/src/syncOfflineData.ts
functions/src/types.d.ts
functions/test/autoAssignEmployee.test.ts
functions/test/bookingHoldConfirm.test.ts
functions/test/bookingStatus.test.ts
functions/test/bootstrapAdminAccess.test.ts
functions/test/emailQueue.test.ts
functions/test/setup.ts
functions/tsconfig.json
functions/vitest.config.ts
get_url.cjs
get-firebase-config.js
CHANGELOG.md
check_db.cjs
index.html
OWNERMANUAL.md
pack0-baseline.patch
pack0-baseline-utf8.patch
package.json
package-lock.json
playwright.config.ts
postcss.config.js
public/.htaccess
public/_redirects
public/404.html
public/favicon.ico
public/favicon.png
public/google2e037b48f21a0d2d.html
public/index.html
public/mato.webp
public/miska.webp
public/papi.webp
public/placeholder.svg
public/pwa-icon-192.png
public/pwa-icon-512.png
public/robots.txt
public/sitemap.xml
README.md
scripts/booking-mobile-audit-live.mjs
scripts/budget-check.mjs
scripts/calendar-mobile-audit-live.mjs
scripts/capture-admin-calendar-screenshots.mjs
scripts/deploy-vercel.ps1
scripts/enforce-salon-roles-live.mjs
scripts/check-env.mjs
scripts/import_bookio_customers.py
scripts/import-firestore.js
scripts/lockin-check.mjs
scripts/role-auth-smoke-live.mjs
scripts/set-vercel-token-env.ps1
scripts/sync-firebase-secrets.ps1
scripts/test-deployment-setup.ps1
scripts/vercel-hobby-after-transfer.ps1
scripts/vercel-hobby-new-personal-repo.ps1
setup.ps1
src/App.css
src/App.tsx
src/assets/card-bg-accounts.jpg
src/assets/card-bg-features.jpg
src/assets/card-bg-hero.jpg
src/assets/card-bg-how.jpg
src/assets/card-bg-qr.jpg
src/assets/employee-mato.jpg
src/assets/employee-miska.jpeg
src/assets/logo-icon.webp
src/assets/luxury-accounts.png
src/assets/luxury-features.png
src/assets/luxury-hero.png
src/assets/luxury-hours.png
src/assets/luxury-qr.png
src/assets/luxury-qr-3d.png
src/components/admin/AvatarCropper.tsx
src/components/admin/BusinessHoursEditor.test.tsx
src/components/admin/BusinessHoursEditor.tsx
src/components/AdminLayout.tsx
src/components/booking/AppointmentDetailSheet.test.tsx
src/components/booking/AppointmentDetailSheet.tsx
src/components/booking/BlockTimeSheet.tsx
src/components/booking/BookingHeader.tsx
src/components/booking/BookingSuccess.tsx
src/components/booking/BookingUI.tsx
src/components/booking/BusinessInfoPanel.tsx
src/components/booking/ContactConfirmation.tsx
src/components/booking/DateTimeSelection.tsx
src/components/booking/EmployeeSelection.tsx
src/components/booking/QuickBookingSheet.tsx
src/components/booking/ServiceSelection.tsx
src/components/booking/types.ts
src/components/booking-calendar/body/CalendarBody.tsx
src/components/booking-calendar/body/CalendarBodyDay.tsx
src/components/booking-calendar/body/CalendarBodyDayContent.tsx
src/components/booking-calendar/body/CalendarBodyHeader.tsx
src/components/booking-calendar/body/CalendarBodyMargin.tsx
src/components/booking-calendar/body/CalendarBodyMonth.tsx
src/components/booking-calendar/body/CalendarBodyWeek.tsx
src/components/booking-calendar/BookingCalendar.test.tsx
src/components/booking-calendar/BookingCalendar.tsx
src/components/booking-calendar/BookingCalendarEvent.tsx
src/components/booking-calendar/BookingCalendarProvider.tsx
src/components/booking-calendar/calendar-context.tsx
src/components/booking-calendar/calendar-types.ts
src/components/booking-calendar/event-color-classes.ts
src/components/booking-calendar/event-search.ts
src/components/booking-calendar/header/CalendarHeader.tsx
src/components/booking-calendar/header/CalendarHeaderAdd.tsx
src/components/booking-calendar/header/CalendarHeaderDate.tsx
src/components/booking-calendar/header/CalendarHeaderMode.tsx
src/components/booking-calendar/header/CalendarHeaderSearch.tsx
src/components/booking-calendar/header/CalendarZoomControls.tsx
src/components/booking-calendar/index.ts
src/components/calendar/AppointmentBlock.test.tsx
src/components/calendar/AppointmentBlock.tsx
src/components/calendar/CalendarComponents.test.tsx
src/components/calendar/CalendarEventCard.test.tsx
src/components/calendar/CalendarEventCard.tsx
src/components/calendar/CalendarViewSwitcher.tsx
src/components/calendar/DayTimeline.test.tsx
src/components/calendar/DayTimeline.tsx
src/components/calendar/GlassHeader.tsx
src/components/calendar/mobile/blocking.test.ts
src/components/calendar/mobile/blocking.ts
src/components/calendar/mobile/CalendarEventCard.tsx
src/components/calendar/mobile/CalendarGrid.test.tsx
src/components/calendar/mobile/CalendarGrid.tsx
src/components/calendar/mobile/CalendarToolbar.test.tsx
src/components/calendar/mobile/CalendarToolbar.tsx
src/components/calendar/mobile/EmployeeColumn.test.tsx
src/components/calendar/mobile/EmployeeColumn.tsx
src/components/calendar/mobile/EmployeeFilter.test.tsx
src/components/calendar/mobile/EmployeeFilter.tsx
src/components/calendar/mobile/event-mappers.test.ts
src/components/calendar/mobile/event-mappers.ts
src/components/calendar/mobile/NonWorkingOverlay.test.tsx
src/components/calendar/mobile/NonWorkingOverlay.tsx
src/components/calendar/mobile/schedule.test.ts
src/components/calendar/mobile/schedule.ts
src/components/calendar/mobile/slotGuards.test.ts
src/components/calendar/mobile/slotGuards.ts
src/components/calendar/mobile/types.ts
src/components/calendar/MobileCalendarShell.test.tsx
src/components/calendar/MobileCalendarShell.tsx
src/components/calendar/MonthGrid.test.tsx
src/components/calendar/MonthGrid.tsx
src/components/calendar/WeekTimeline.test.tsx
src/components/calendar/WeekTimeline.tsx
src/components/ConflictResolutionDialog.tsx
src/components/CookieConsent.tsx
src/components/LanguageToggle.tsx
src/components/LiquidGlassNav.tsx
src/components/LiquidWindow.tsx
src/components/LogoIcon.tsx
src/components/NavLink.test.tsx
src/components/NavLink.tsx
src/components/OfflineBanner.tsx
src/components/OnboardingWizard.tsx
src/components/ProtectedRoute.test.tsx
src/components/ProtectedRoute.tsx
src/components/ThemeToggle.tsx
src/components/ui/accordion.tsx
src/components/ui/alert.tsx
src/components/ui/alert-dialog.tsx
src/components/ui/aspect-ratio.tsx
src/components/ui/avatar.tsx
src/components/ui/badge.tsx
src/components/ui/breadcrumb.tsx
src/components/ui/button.tsx
src/components/ui/calendar.tsx
src/components/ui/card.tsx
src/components/ui/carousel.tsx
src/components/ui/collapsible.tsx
src/components/ui/command.tsx
src/components/ui/context-menu.tsx
src/components/ui/dialog.tsx
src/components/ui/drawer.tsx
src/components/ui/dropdown-menu.tsx
src/components/ui/form.tsx
src/components/ui/hover-card.tsx
src/components/ui/chart.tsx
src/components/ui/checkbox.tsx
src/components/ui/input.tsx
src/components/ui/input-otp.tsx
src/components/ui/label.tsx
src/components/ui/menubar.tsx
src/components/ui/navigation-menu.tsx
src/components/ui/pagination.tsx
src/components/ui/popover.tsx
src/components/ui/progress.tsx
src/components/ui/radio-group.tsx
src/components/ui/resizable.tsx
src/components/ui/scroll-area.tsx
src/components/ui/select.tsx
src/components/ui/separator.tsx
src/components/ui/sheet.tsx
src/components/ui/sidebar.tsx
src/components/ui/skeleton.tsx
src/components/ui/slider.tsx
src/components/ui/sonner.tsx
src/components/ui/switch.tsx
src/components/ui/table.tsx
src/components/ui/tabs.tsx
src/components/ui/textarea.tsx
src/components/ui/toast.tsx
src/components/ui/toaster.tsx
src/components/ui/toggle.tsx
src/components/ui/toggle-group.tsx
src/components/ui/tooltip.tsx
src/components/ui/use-toast.ts
src/contexts/AuthContext.tsx
src/hooks/useAvailability.ts
src/hooks/useBookingData.ts
src/hooks/useBookingForm.test.ts
src/hooks/useBookingForm.ts
src/hooks/useBusiness.test.ts
src/hooks/useBusiness.ts
src/hooks/useBusinessInfo.ts
src/hooks/useBusinessInfo.types.ts
src/hooks/use-mobile.tsx
src/hooks/useOnboarding.ts
src/hooks/use-toast.ts
src/hooks/useWebAuthn.ts
src/i18n/en.json
src/i18n/index.ts
src/i18n/sk.json
src/index.css
src/integrations/firebase/adminCalendarQuickAction.ts
src/integrations/firebase/adminUpdateBookingStatus.ts
src/integrations/firebase/callableError.test.ts
src/integrations/firebase/callableError.ts
src/integrations/firebase/config.ts
src/integrations/firebase/confirmBooking.ts
src/integrations/firebase/createBookingHold.ts
src/integrations/firebase/createPublicBooking.ts
src/integrations/firebase/getPublicAvailabilityConflicts.ts
src/integrations/firebase/lookupBookingHistory.ts
src/integrations/firebase/recaptcha.ts
src/integrations/firebase/sendSms.ts
src/integrations/firebase/useBookingDataFirebase.ts
src/integrations/firebase/useBusinessInfoFirebase.ts
src/lib/adminAllowlist.ts
src/lib/adminBookingStatus.ts
src/lib/adminCalendarExport.test.ts
src/lib/adminCalendarExport.ts
src/lib/availability.test.ts
src/lib/availability.ts
src/lib/businessIds.test.ts
src/lib/businessIds.ts
src/lib/calendarEventUtils.ts
src/lib/calendarExport.test.ts
src/lib/calendarExport.ts
src/lib/calendar-utils.test.ts
src/lib/calendar-utils.ts
src/lib/diagnosticsHelpers.test.ts
src/lib/diagnosticsHelpers.ts
src/lib/firebaseClientErrors.test.ts
src/lib/firebaseClientErrors.ts
src/lib/indexed-db-available.test.ts
src/lib/indexed-db-available.ts
src/lib/offline/db.ts
src/lib/offline/reception.ts
src/lib/offline/sync.ts
src/lib/priceListOrder.ts
src/lib/profileImage.ts
src/lib/providerSelection.ts
src/lib/recaptcha.ts
src/lib/tenantResolver.test.ts
src/lib/tenantResolver.ts
src/lib/timezone.test.ts
src/lib/timezone.ts
src/lib/useWindowManager.ts
src/lib/utils.test.ts
src/lib/utils.ts
src/lib/validateEnv.test.ts
src/lib/wcag.test.ts
src/lib/wcag.ts
src/main.tsx
src/pages/__tests__/BookingHistoryPage.test.tsx
src/pages/admin/__tests__/AppointmentsPage.test.tsx
src/pages/admin/__tests__/CalendarPage.test.tsx
src/pages/admin/__tests__/CustomersPage.test.tsx
src/pages/admin/__tests__/DashboardPage.test.tsx
src/pages/admin/__tests__/EmployeesPage.test.tsx
src/pages/admin/__tests__/MySchedulePage.test.tsx
src/pages/admin/__tests__/ServicesPage.test.tsx
src/pages/admin/__tests__/SettingsPage.test.tsx
src/pages/admin/AppointmentsPage.tsx
src/pages/admin/CalendarPage.tsx
src/pages/admin/CustomersPage.tsx
src/pages/admin/DashboardPage.tsx
src/pages/admin/EmployeesPage.tsx
src/pages/admin/MySchedulePage.tsx
src/pages/admin/ServicesPage.tsx
src/pages/admin/SettingsPage.tsx
src/pages/Auth.tsx
src/pages/BookingHistoryPage.tsx
src/pages/BookingPage.tsx
src/pages/BootstrapPage.test.tsx
src/pages/BootstrapPage.tsx
src/pages/DemoPage.tsx
src/pages/DiagnosticsPage.test.tsx
src/pages/DiagnosticsPage.tsx
src/pages/Index.tsx
src/pages/InstallPage.test.tsx
src/pages/InstallPage.tsx
src/pages/LiquidPlayground.tsx
src/pages/NotFound.test.tsx
src/pages/NotFound.tsx
src/pages/OfflinePage.test.tsx
src/pages/OfflinePage.tsx
src/pages/PrivacyPage.tsx
src/pages/ReceptionPage.tsx
src/pages/SalonLoginPage.tsx
src/pages/StaticPages.test.tsx
src/pages/TermsPage.tsx
src/styles/big-calendar-overrides.css
src/styles/booking-calendar.css
src/styles/expanding-cards.css
src/styles/liquid-cookie.css
src/styles/liquid-glass.css
src/styles/liquid-glass-nav.css
src/test/calendar-coverage-99.test.ts
src/test/calendarEventUtils.test.ts
src/test/example.test.ts
src/test/setup.ts
src/types/calendar.ts
src/vite-env.d.ts
storage.cors.json
storage.rules
tailwind.config.ts
test-results/.last-run.json
TODO.md
tsconfig.app.json
tsconfig.json
tsconfig.node.json
update-firebase-env.cjs
vercel.json
vite.config.ts
vitest.config.ts
```
