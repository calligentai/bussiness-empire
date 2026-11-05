# BUSINESS EMPIRE — Master Execution Plan
**Versie:** 1.1 (TDD & production-ready ontwerp)  
**Datum:** 20 oktober 2026  
**Status:** Ontwerp, geen implementatie geautoriseerd  
**Eerste venture:** LAVABEAN-PLATFORM  
**Eigenaar van plan:** Business Empire HQ

## 1. Managementsamenvatting

BUSINESS EMPIRE gebruikt Paperclip als control plane voor AI-agents, issues, approvals, kosten en uitvoeringsharnassen. LAVABEAN-PLATFORM is de eerste afzonderlijke bedrijfsapplicatie. MedusaJS vormt het commerciële platform; Nuxt verzorgt webfrontends; een geïsoleerde CRM-module beheert leads en klanten; Odoo is de financiële boekhoudbron. Leveranciers (inclusief Hifany en optioneel AliExpress) worden als externe partijen gekoppeld. OpenSEO, Content Studio, Voice en Advertising Intelligence zijn gedeelde diensten die met expliciete tenant- en rolgrenzen beschikbaar worden gemaakt.

**Eerste productdoel:** Een professioneel vormgegeven Lava Bean-webshop met één compleet testordertraject, aantoonbare dealerisolatie, een werkende boekingskoppeling en zichtbaar automatisch getest werk via Paperclip.

**Bestuursregel:** Geen agent publiceert zelfstandig op productie, besteedt onvoorziene credits, muteert het grootboek of wijzigt centrale brandregels. Operationele checkout en finance blijven functioneren wanneer AI of Paperclip niet bereikbaar is.

## 2. Scope en systeemverantwoordelijkheden

| Systeem | Primaire verantwoordelijkheid | Geen verantwoordelijkheid voor |
|---|---|---|
| Paperclip HQ | Portfolio, agentorganisatie, Kanban, taaktoewijzing, approvals, harness-workspaces | Orderverwerking, betalingsautoriteit of financieel grootboek |
| Nuxt + Design System | Publieke Lava Bean- en dealerwebsites, SEO-pagina's, brandcompliance | Autoritatieve orders of boekingen |
| MedusaJS | Catalogus, checkout, orders, klanten-commerce-ID's en fulfilment | Dubbel boekhouden |
| CRM-extensie | Leads, contacten, pipeline, interacties en dealer-specifieke klantcontext | Ongecontroleerde directe write-access tot Medusa-internals |
| Odoo | Grootboek, btw, financiële facturen, reconciliatie en accounting | Beheer van frontends en AI |
| Supplier Engine | Productimport, mapping, bestelling naar leverancier, tracking, retry/idempotency | Verkopen zonder geautoriseerde inkoop-API |
| OpenSEO | Gratis basis-SEO, Search Console-integratie waar geautoriseerd, optionele betaalde data | Ongevraagde betaalde API-calls |
| Content Studio | Assetgeneratie, rechten, AI-kwaliteit, brandreview, mediabibliotheek | Ongeautoriseerde productiepublicatie |
| Voice / Social / Advertising | Communicatie en marketingintegraties per venture/dealer | Ongelicentieerd gebruik van platformaccounts |
| AI gateway | Provideradapters, Headroom/TKR waar compatibel, JEV, logging, quota en kosten | Verplichte tussenlaag voor normale bedrijfsverzoeken |

**AI-voorkeur:** Eerst beschikbare gratis officiële API's; dan bestaande abonnementsroutes uitsluitend via officieel toegestane interfaces; vervolgens bestaande OpenAI Platform API-credits binnen harde budgetlimieten. Ollama Cloud, Meta en DeepSeek worden op daadwerkelijke endpointtoegang getest. Geen verplichte lokale inference, geen Google-betaalaccount, geen OpenRouter/Kilo als provider. OpenCode Go mag alleen in de officieel ondersteunde harnessmodus, niet als aangenomen generieke API.

## 3. Architectuurbesluiten die nog gevalideerd moeten worden

- **ADR-001:** Paperclip als AI-control-plane; verificatie van adapters, worktrees, approvals en budgetfuncties in de gekozen versie.
- **ADR-002:** Medusa als commercebron; tenantisolatie technisch bewijzen vóór de eerste echte dealer.
- **ADR-003:** Odoo als boekhoudbron; test Nederlandse btw, facturen, refunds en settlementreconciliatie met Community-versie en benodigde modules.
- **ADR-004:** CRM als platformmodule met eigen data- en API-contract, niet in Medusa-tabellen verweven.
- **ADR-005:** Eén centrale OpenSEO-service met dealer-scoping, standaard gratis functies, per-dealer optionele betaalde data en hard budget.
- **ADR-006:** Brand DNA als versioned design tokens, componenten en contentregels; AI-creativiteit als voorstel, niet als autoriteit.
- **ADR-007:** Headroom + TKR alleen op ondersteunde stromen; JSON, bedragen en tool calls lossless; reductie, kwaliteit en latency meten.
- **ADR-008:** Shared Services fysiek/logisch afgescheiden per venture, tenant, service identity, secrets, opslag en budget.

## 3A. Verplicht TDD-protocol (alle code-issues)

**TDD is een blocking kwaliteitsregel, geen optionele skill.** Iedere codewijziging (feature, bugfix, migratie of integratie) moet eerst aantonen dat een geautomatiseerde test de gewenste verandering nog niet ondersteunt.

1. **RED:** voeg eerst een betekenisvolle falende test toe; leg commit of CI-artifact vast met een mislukking om de juiste reden.
2. **GREEN:** schrijf de kleinst mogelijke productie-implementatie; laat dezelfde test slagen.
3. **REFACTOR:** verbeter structuur zonder gedrag te veranderen; draai de volledige relevante testsuite.
4. **REGRESSION:** voeg waar nodig contract-, tenantisolatie-, security- en browsertests toe.
5. **EVIDENCE:** de PR bevat testcases, red/green-bewijs, CI-link en een visuele preview indien UI geraakt wordt.

Bij documentatie- en onderzoeksissues zijn TDD-codecycli niet toepasselijk; daarvoor gelden broncontrole en review. Test-only spikes en legacy code krijgen expliciet gemotiveerde uitzonderingen, met eigen risicobeoordeling. Een harness mag tests niet aanpassen of uitschakelen uitsluitend om de pipeline groen te krijgen.

**Per domein minimaal:**
- Commerce: ongeldige betalingen, dubbele webhooks, orderstatus en herstel na providerstoring.
- Suppliers: geen dubbel ingediende inkooporders, prijs-/voorraadverschillen, retries en tracking.
- Odoo: gebalanceerde boekingen, idempotente synchronisatie, verschillenrapport en herstel.
- Dealers/CRM/OpenSEO: negatieve cross-tenant tests op API-, database- en bestandsniveau.
- Brand: tokens, responsive visuele regressie, toegankelijkheid en publicatieblokkade.
- Agents: rechten, hard budgets, stopcondities, approval-gates en fallback bij provideruitval.

## 3B. Productiegeschiktheid en release-gates

**Production-ready betekent aantoonbaar veilig, observeerbaar en herstelbaar; niet slechts een werkende demo.** Eerst staging met realistische testdata, pas na formeel akkoord een productie-uitrol.

- Security: least privilege, tenant-scoped auth, secret management, dependency/SBOM- en licentiecontroles, security scanning, webhook-validatie.
- Privacy: AVG-grondslagen, dataminimalisatie, bewaartermijnen, toegangslog, verwijder-/exportverzoeken, verwerkersafspraken waar nodig.
- Operations: health/readiness, structured logging zonder geheimen, metrics/tracing, foutalerts, rate limits, retry/backoff en dead-letter queue.
- Data: versiebeheer van migraties, backupbeleid en daadwerkelijk geteste restore; integriteitscontroles en auditlog.
- Performance: doelwaarden voor response times en gelijktijdige gebruikers vóór livegang vastleggen en met loadtests bewijzen.
- Resilience: checkouts en boekingen functioneren wanneer Paperclip, modelproviders of SEO-tools uitvallen.
- Deployment: reproduceerbare Docker builds, pinned dependencies, omgevingsconfiguraties, gescheiden staging/prod, canary of gefaseerde uitrol.
- Rollback: bewezen terugrol van applicatie zonder verlies of corruptie van orders; databasemigraties moeten rollback/forward-fix-strategie hebben.
- Finance: btw en boekhoudkundige juistheid laten valideren door bevoegde financieel deskundige vóór productie.
- Billing: expliciete toestemming voor betaalde AI-/SEO-aanvragen; hard limits per venture/dealer en auditbare kosten.
- Supply chain: leverancier-API en productrechten valideren; geen productieorder naar een niet-geautoriseerd endpoint.

**Niet vrijgeven bij:** falende kritieke tests, high/critical security findings zonder geaccepteerde mitigatie, onbekende tenantlekken, mislukte restore/rollback, of ontbrekende operationele eigenaar.

## 4. Delivery best practices

### 4.1 Kanban statusflow
`Backlog → Ready → In Progress → Review/Testing → Ready to Merge → Done`. `Blocked` is een zichtbaar uitzonderingslabel, geen verborgen status. **WIP = maximaal 4 actieve issue-worktrees** in de eerste proef. Urgente herstelissues gebruiken dezelfde kwaliteitsgates.

### 4.2 Definition of Ready (DoR)
Een issue mag pas worden toegewezen als het doel, eigenaar, afhankelijkheden, toegestane bestanden, API-contracten, testgevallen, bewijs van afronding, kostenplafond en benodigde rechten vastliggen. Taken groter dan één bewijsbaar resultaat worden gesplitst. Richtmaat: één kleine verticale verbetering per run; 30–90 minuten is een schattingsdoel, geen prestatietoezegging.

### 4.3 Definition of Done (DoD)
1. Code/documentatie gecommit in toegewezen branch, geen geheime sleutels.
2. Lint/typechecks en relevante unit- en contracttests geslaagd.
3. Integratie- en tenantisolatietests geslaagd waar van toepassing.
4. Screenshot- of Storybook-preview beschikbaar bij UI-wijziging, inclusief desktop en mobiel.
5. Geen schending van brandregels of toegankelijkheidsvereisten.
6. PR gekoppeld aan Paperclip-issue; beoordelaar en risicoclassificatie geregistreerd.
7. Merge naar `integration` geslaagd; status **Done** pas na verificatie op geïntegreerde baseline.

### 4.4 Git-worktree policy
Elke codingtaak krijgt een unieke worktree en branch `agent/<issue-id>-<slug>` op basis van de actuele integratiebaseline. Geen harnas schrijft rechtstreeks naar `main` of naar de worktree van een ander. Agents krijgen directory ownership; gedeelde contracten worden eerst via een eigen contract-PR vastgesteld. CI moet tegen de nieuwste `integration` draaien; auto-merge alleen bij groen resultaat, geen conflictsituatie en laag risico. `main` vereist releasegoedkeuring. Worktrees worden na merge opgeruimd, behalve wanneer een incident een reproduceerbare omgeving vereist.

### 4.5 Progress berekenen
Een worktree-progressbar is **gate-based, nooit tijd-based**: implementatie 30%, unit/contracttests 20%, integratietests 20%, visueel/brand 15%, PR-review en mergegereedheid 15%. Niet-relevante gates worden vooraf expliciet vervangen of herwogen, niet automatisch groen gemarkeerd. Bij terugval van tests kan het percentage dalen. Afzonderlijk statusveld voor `merged`, `deployed to staging` en `production approved`.

### 4.6 Observability
Per issue: laatste commit, toegewezen harness, WIP-leeftijd, bestanden in scope, testuitslagen, previewlink, actuele blokkade, tokens, kosten, herpogingen, gebruikte providers en reviewresultaat. Per portfolio: lead/cycle time, throughput van geïntegreerde issues, change-failure rate, gemiddelde herstelduur en kosten per geaccepteerde feature. Geen logging van klantinhoud, geheime sleutels of gevoelige prompts.

## 5. Uitvoeringsvolgorde — negen mijlpalen

### M0 — Bronnen, REA en haalbaarheid
**Doel:** Geen onbewijsbare technologiebesluiten.
- R0.1 Bronnenregister met versies, licenties, permissies en betaald/gratis onderscheid voor Paperclip, Medusa, Odoo, OpenSEO, JEV, Headroom/TKR en contentapps.
- R0.2 REA-matrix GoHighLevel (social, CRM, telefoon) en Lovable (visual generation, preview) op basis van toegestane publieke bronnen, met bewezen/aanname/onbekend.
- R0.3 Architectuurdiagram, ADR's, risico- en afhankelijkheidsregister.
**Acceptatie:** Alle P0-integraties hebben een aangewezen eigenaar en minstens één haalbaarheidstest; ontbrekende toegang wordt gemeld, niet verzonnen.

### M1 — Paperclip, Git en CI-proef
**Doel:** Twee harnassen kunnen veilig naast elkaar werken.
- R1.1 Paperclip organisatie `Business Empire HQ`, eerste project `LAVABEAN-PLATFORM` en minimale rollen in proefomgeving.
- R1.2 Harness Codex en alternatieve harness aan afzonderlijke issues koppelen; twee worktrees, zonder gedeelde writes.
- R1.3 PR-gates, branch protection, CI, kostenlimieten en foutafhandeling.
- R1.4 Kanban-board met werkelijke gate-progress, previews en issues.
**Acceptatie:** Twee parallelle, eenvoudige codewijzigingen mergen conflictvrij; falende tests blokkeren merge; agent kan `main` niet rechtstreeks wijzigen.

### M2 — Brand DNA en design-systeem
**Doel:** Elke gegenereerde pagina ziet er consistent uit.
- R2.1 Lava Bean Brand DNA (tone, typografie, kleuren, logo, spacing scale, grid, breakpoints, imagery).
- R2.2 Machineleesbare tokens, componenten, Storybook-voorbeelden en accessibility checks.
- R2.3 Nuxt home/product-template in desktop en mobiele preview.
- R2.4 Playwright visuele snapshots en centrale-brandregelcontrole.
**Acceptatie:** Een opzettelijk verkeerde spacing-/kleurregel faalt de controles; goedgekeurde afwijkingen worden versiebeheerbaar gemaakt.

### M3 — Commerce MVP
**Doel:** Eén reproduceerbare Lava Bean-aankoop.
- R3.1 Medusa product-, catalogus- en prijscontracten.
- R3.2 Productdetail, mandje en checkout in Nuxt.
- R3.3 Betalingssandbox en orderstatus.
- R3.4 Refund-, fout- en dubbele-webhook-tests.
**Acceptatie:** Testbetaling maakt precies één order aan; mislukte betaling creëert geen foutieve voltooide order; AI-uitval verhindert checkout niet.

### M4 — Leveranciers en Odoo
**Doel:** Order tot leverancier en boekhouding traceerbaar.
- R4.1 Supplier Engine met unieke supplier SKU-mapping, import als concept, toestemmingschecks.
- R4.2 Geautoriseerde supplier API-adapter + idempotente orderoverdracht en trackingstatus.
- R4.3 Odoo-journaal-/factuurmapping en boekingsstatus; btw en refunds testen.
- R4.4 Reconciliatie plus herstelscenario bij offline supplier/Odoo.
**Acceptatie:** Geen dubbele leveranciersorders of dubbele boekingen; cijfers controleerbaar; ontbrekende leveranciers-API leidt tot menselijke workflow, niet tot fictieve automatische inkoop.

### M5 — Dealerisolatie en eigen OpenSEO
**Doel:** Twee dealers op één gedeeld platform zonder datalekken.
- R5.1 Dealeridentiteit, domein, rol en scoped customer/order-data.
- R5.2 Dealerbrand-overrides met centraal templateversioning.
- R5.3 OpenSEO basisdashboard voor iedere dealer (gratis audits, metadata, sitemap, Search Console waar geautoriseerd).
- R5.4 Optioneel DataForSEO-budget per dealer met afzonderlijke goedkeuring, hard spending cap en factuurkoppeling.
**Acceptatie:** Dealer A kan geen gegevens/SEO-credentials van B lezen; €0-SEO-budget werkt voor gratis functies; centrale updates wissen geen dealerdata.

### M6 — CRM en Growth Operations
**Doel:** Eén centrale klantgeschiedenis per dealer.
- R6.1 CRM contacten/leads/pipeline en Medusa customer-linking.
- R6.2 Social setup wizard en geautoriseerde OAuth-connectors; concepten en postscheduler.
- R6.3 Phone setup wizard, call-routing/proefgesprek, CRM-log en fallback naar medewerker.
- R6.4 Ad Intelligence op publieke advertentiebibliotheken, concurrentie- en campagnelinks.
**Acceptatie:** Eigen accounts per dealer, geen credentials in de browser, geen social posts of telefoonkosten zonder geautoriseerde actie.

### M7 — Content Studio, JEV en persona tests
**Doel:** Verkoopklare productcontent met aantoonbare kwaliteitscontrole.
- R7.1 Consolidatie van Pixshop, Product Mockup, Co-Creator, Omni/Veo-prototypes in één provideronafhankelijke media-interface.
- R7.2 OpenAI-beeldprovider binnen credits en gratis opties; video alleen bij aantoonbare toegankelijke endpoint en vooraf goedgekeurd budget.
- R7.3 Video Analyzer + visual/SEO facts extraction; JEV structured scoring na multimodale analyse.
- R7.4 Buyer-persona-proef: vergelijk AI-oordeel met echte watch-time, scroll-stop, CTR en conversies wanneer meetdata beschikbaar is.
**Acceptatie:** Geen hallucinerende productclaims; herkomst en toestemming van assets vastgelegd; gesimuleerde personaresultaten worden nooit als bewezen kijkersgedrag gepresenteerd.

### M8 — Self-repair en eerste gecontroleerde uitrol
**Doel:** Paperclip kan incidenten onderzoeken en reparatievoorstellen leveren.
- R8.1 Incident-to-issue, triage en bounded harness-escalation.
- R8.2 Codex-fix in worktree met regressiontest en onafhankelijke review.
- R8.3 Gecontroleerde stagingrelease, rollback en incidentlog.
- R8.4 Demo: één webshop, twee dealer-sites, SEO-dashboard, order naar supplier, Odoo-boeking en optionele contentcreatie.
**Acceptatie:** Fout wordt automatisch opgemerkt en getest; een risicovolle wijziging wordt niet zonder menselijke goedkeuring gepubliceerd; rollback werkt.

## 6. Afhankelijkheden en parallelisme

**Kritiek pad:** M0 → M1 → M2 + commercecontracten → M3 → M4/M5 → M8. CRM, Social, Content en Ad Intelligence kunnen na gedeelde auth/tenant-contracten deels parallel lopen. Financiële integratie mag niet volledig starten voordat order-events en boekingsmapping zijn overeengekomen.

**Proef-WIP**: maximaal vier worktrees. Eerst één parallel proefbatch (branding, commerce API, supplier-interface, testinfra); na integratiebewijs opschalen. Niet automatisch meer agents toevoegen bij vertraging: verifieer eerst blockers, tokenkosten en CI-capaciteit.

## 7. Per-issue format — Paperclip sjabloon

```yaml
issue_id: BE-LB-001
venture: lavabean
objective: "One observable outcome"
priority: P0
owner_role: engineering
harness: codex
allowed_paths: ["apps/storefront/**"]
forbidden_paths: ["infra/prod/**", "packages/contracts/**"]
base_branch: integration
worktree_branch: agent/BE-LB-001-short-title
dependencies: []
acceptance_tests:
  - "Given/When/Then observable outcome"
  - "Automated regression test"
evidence:
  - "CI permalink"
  - "Staging preview or screenshot when UI"
budget:
  free_endpoints_first: true
  max_paid_spend_eur: 0
human_approval_required: ["production_release", "secrets", "payments"]
rollback: "Revert PR or restore tagged release"
```

## 8. Risico's en controles

| Risico | Kans / impact | Beheersing |
|---|---|---|
| Paperclip/harness ondersteunt functionaliteit niet native | Onbekend / hoog | Eerst POC, anders eigen adapter in gedeelde laag |
| Data tussen dealers lekt | Hoog impact | Tenantbewuste queries, autorisatiematrix, negatieve integratietests |
| OpenSEO-API kost onverwacht geld | Middel / hoog | Gratis functies standaard, harde per-dealer limiet, opt-in |
| Medusa en Odoo zijn het oneens | Middel / hoog | Duidelijke system of record, event-idempotency, reconciliatie |
| Gebrekkige merkconsistentie | Hoog kans | Brandtokens, componenten, visuele tests, goedkeuring |
| AI genereert incorrecte claims of scores | Hoog kans | Bronverwijzing, menselijke review, JEV na fact extraction, A/B kalibratie |
| Provider/freemium endpoint verdwijnt | Middel | Feature flags, geautoriseerde fallback, kernproces onafhankelijk van AI |
| Parallelle harnassen veroorzaken mergeconflicten | Middel | Strikte worktree ownership en contract-first aanpak |
| Licentiefouten bij gerecyclede repositories | Middel | Licentie/SBOM check per component en asset vóór opname |

## 8A. CI/CD quality gates en releasebewijs

Elke agent-worktree maakt een PR aan tegen `integration`. Verplichte checks voor relevante modules:
- Format/lint/typecheck + unit tests + contract tests.
- Integratie- en beveiligingstests; controleer vooral tenantisolatie, betalingen en Odoo.
- Visual-regression en toegankelijkheidstests voor gewijzigde interfaces.
- Secret scan, dependency scan, licentiecheck, build en deploy naar ephemeral preview.
- TDD-red/green-bewijs op issue/PR-niveau. Geen auto-merge bij ontbrekend bewijs.

De integratiebranch krijgt nachtelijke E2E, load-/resilience- en migratietests. `main` is beschermd en vereist geslaagde productie-releasechecklist, geregistreerde approval en deploy/rollbackplan.

**Kanban-voortgang:** alleen automatische groen/rood-evidence telt mee. `100%` betekent alle kwaliteitsgates voltooid en PR merge-ready; `Released` is een afzonderlijke status na succesvolle productievalidatie. Geen zelfgerapporteerde voortgang als objectieve CI-status presenteren.

**Run-output, altijd:** doel, betrokken bestanden, tests RED/GREEN/REFACTOR, CI-artifacts, screenshot/preview, security-resultaten, risico's, rollback en beslissing.

## 9. Bestuur en beslismomenten

**D0 — Onderzoeksbesluit:** ADR's, licenties en P0-contracten zijn bekend.  
**D1 — Automatiseringsbesluit:** Paperclip beheert veilig minimaal twee onafhankelijke harness-worktrees.  
**D2 — Merkbesluit:** Brand DNA en componentbibliotheek visueel goedgekeurd.  
**D3 — Commercebesluit:** Checkoutsandbox + veilige orderstatus.  
**D4 — Financieel besluit:** Supplier- en Odoo-reconciliatie onder test.  
**D5 — Dealerbesluit:** Dataseparatie bewezen en OpenSEO met €0-budget werkend.  
**D6 — Releasebesluit:** End-to-enddemo, TDD-evidence, security- en privacyreview, prestatie- en hersteltests, geteste backup/rollback, operationele monitoring, menselijk akkoord.

**Huidige toestand:** Alleen documentatie en planvorming; geen geverifieerde actieve branches, CI-runs, previews of implementatiestatus. Alle mijlpalen staan op *Not started* totdat bewijs beschikbaar is.

## 10. Bijlagen bij uiteindelijke repository

- `docs/architecture/` — diagrammen, system boundaries, ADR's, datacontracten.
- `docs/rea/` — 00-method, 01-functions, 02-comparison, 03-architecture, 04-MVP.
- `docs/brand/` — Brand DNA en regels.
- `docs/quality/` — teststrategie, quality gates, risico's.
- `docs/runbooks/` — incidenten, releases, rollback en billing guardrails.
- `.github/` — CI, PR-sjablonen, code owners en policies.
- `paperclip/` — issue-templates, rolprofielen en harnessregels (na validatie van feitelijke Paperclip-configuratie).

---
**Volgende stap, uitsluitend na expliciete starttoestemming:** M0 uitvoeren, bronnen en bestaande repos inspecteren, risico's bewijzen en daarna D0 beoordelen. Dit document is geen opdracht om reeds werkzaamheden, Git-mutaties of externe betaalde API-calls uit te voeren.
