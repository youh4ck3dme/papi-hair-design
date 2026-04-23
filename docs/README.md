# Documentation Hub

Toto je kanonicka dokumentacna vrstva projektu. Ciel je mat dokumentaciu, ktora je:
- technicky presna
- produkcne realisticka
- citatelna pre developera, ownera aj buduceho product alebo client-facing partnera
- uprimna v tom, co uz je hotove a co este hotove nie je

## Audience map

### Ked si developer alebo novy technicky collaborator
Citaj v tomto poradi:
1. [Root README](../README.md)
2. [Project State and Handoff](PROJECT-STATE.md)
3. [Developer Handbook](DEVELOPER-HANDBOOK.md)
4. [Architecture](ARCHITECTURE.md)
5. [Operations](OPERATIONS.md)
6. [Testing & Quality](TESTING-QUALITY.md)

### Ked robis technical review, hiring review alebo due diligence
Citaj v tomto poradi:
1. [Root README](../README.md)
2. [Project State and Handoff](PROJECT-STATE.md)
3. [Technical Due Diligence Brief](TECHNICAL-DUE-DILIGENCE.md)
4. [Architecture](ARCHITECTURE.md)
5. [Testing & Quality](TESTING-QUALITY.md)
6. [Security & Compliance Baseline](SECURITY-COMPLIANCE.md)

### Ked pozeras produktovo alebo obchodne, ci sa to da predavat a rozvijat
Citaj v tomto poradi:
1. [Root README](../README.md)
2. [Project State and Handoff](PROJECT-STATE.md)
3. [Product & SaaS Direction](PRODUCT-SAAS.md)
4. [Technical Due Diligence Brief](TECHNICAL-DUE-DILIGENCE.md)
5. [Security & Compliance Baseline](SECURITY-COMPLIANCE.md)
6. [Owner Manual](../OWNERMANUAL.md)

## Core canonical docs

- [Root README](../README.md)
- [Project State and Handoff](PROJECT-STATE.md)
- [Developer Handbook](DEVELOPER-HANDBOOK.md)
- [Architecture](ARCHITECTURE.md)
- [Operations](OPERATIONS.md)
- [Testing & Quality](TESTING-QUALITY.md)
- [Security & Compliance Baseline](SECURITY-COMPLIANCE.md)
- [Product & SaaS Direction](PRODUCT-SAAS.md)
- [Technical Due Diligence Brief](TECHNICAL-DUE-DILIGENCE.md)
- [Owner Manual](../OWNERMANUAL.md)
- [Backlog / TODO](../TODO.md)

## Co je v ktorej dokumentacii

### Product a executive layer
- [Root README](../README.md)
  - co to je
  - komu to sluzi
  - co je dnes realita
  - preco to ma potencial ako vertical platform

- [Project State and Handoff](PROJECT-STATE.md)
  - kde je canonical repo a branch pravda
  - co je po poslednom stabilizacnom kole hotove
  - aka je release a deployment realita
  - co je dnes top backlog a na co nezabudnut

- [Product & SaaS Direction](PRODUCT-SAAS.md)
  - ako to poziciovat produktovo
  - co sa da predat uz dnes
  - co este chyba pred plnym SaaS claimom

- [Technical Due Diligence Brief](TECHNICAL-DUE-DILIGENCE.md)
  - rychly, poctivy technicko-produktovy verdict
  - co je silne
  - co este nie je hotove

### Technical layer
- [Developer Handbook](DEVELOPER-HANDBOOK.md)
  - onboarding mapa pre developera
  - repo layout, high-risk zony, safe change discipline

- [Architecture](ARCHITECTURE.md)
  - runtime architektura
  - route mapa
  - auth a roles
  - data model
  - backend functions
  - email, calendar, snapshot a compliance flows

### Delivery a operations layer
- [Operations](OPERATIONS.md)
  - lokalny setup
  - env model
  - deploy model
  - release checklist
  - rollback, monitoring, service worker opatrnost
  - aktualne prevadzkove caveaty

### Quality layer
- [Testing & Quality](TESTING-QUALITY.md)
  - unit, integration a e2e vrstva
  - CI enforcement
  - manual test matrix workflow
  - co je pokryte a co este nie

### Security and compliance layer
- [Security & Compliance Baseline](SECURITY-COMPLIANCE.md)
  - access model
  - runtime compliance baseline
  - retention, consent a audit realita
  - co je dobre a co este chyba

### Operational owner layer
- [Owner Manual](../OWNERMANUAL.md)
  - navod pre ownera, admina a zamestnanca
  - prvy den po nasadeni
  - prakticky prevadzkovy checklist

## Existing tactical docs that still matter

Tieto dokumenty ostavaju uzitocne, ale nie su hlavny canonical opis celeho systemu:
- [Development Setup](DEVELOPMENT-SETUP.md)
- [E2E Testing](E2E-TESTING.md)
- [Analytics](ANALYTICS.md)
- [Rollback Runbook](ROLLBACK-RUNBOOK.md)
- [Post-release Smoke Checklist](POST-RELEASE-SMOKE-CHECKLIST.md)
- [Monitoring 24h Checklist](MONITORING-24H-CHECKLIST.md)
- [Custom Domain](CUSTOM-DOMAIN.md)
- [reCAPTCHA](RECAPTCHA.md)

## Documentation style rules for future updates

Ked sa bude dokumentacia dalej menit, drzme tieto pravidla:
- nepredavat to ako hotovy generic SaaS, ak to este nie je pravda
- neskryvat technicke caveaty pod marketingovy jazyk
- kazdy vacsi flow popisat cez realne route, data a zodpovednost modulu
- deployment a testing docs drzat aktualne pri zmene workflowov
- ked pribudne nova production feature, aktualizovat aspon `README.md` a relevantny doc v `docs/`
