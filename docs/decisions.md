# Decisions and open questions

Records how the scaffold was set up from `hotelSurveyPRD.md`. Section 1 lists resolved decisions. Section 2 lists items that still need a human, with the reason.

## 1. Resolved

| # | Area | Decision | Rationale | Source |
|---|---|---|---|---|
| 1 | Survey engine | LimeSurvey CE 6.17.18 from `martialblog/limesurvey:6-apache` (tag verified to exist) | Running locally; PRD requires LimeSurvey | PRD §6.1 |
| 2 | Database | MariaDB 11, with LimeSurvey tables and the custom `hotel_rooms` table in one database | Matches PRD; custom table is separate from LimeSurvey core | PRD §6.1, §6.4 |
| 3 | Stock theme | Child theme `hotel-classic` extends **`vanilla`** (LimeSurvey's default, built on bootstrap). Verified present in the running container | `vanilla` is the default LimeSurvey 6 theme and is the most maintained base. `fruity` and `bootswatch` are older | PRD §5, §6.1 |
| 4 | Language for custom code | **Python 3** for host-side tooling only: room registry commands, QR generation, and export helpers. Connects to MariaDB directly. No custom web backend | Keeps custom code outside the LimeSurvey runtime. PRD §6.2 says avoid unnecessary backend work, so the tooling is limited to what the PRD needs | PRD §6.2, §4.2 |
| 5 | QR-code library | **`qrcode`** with Pillow, for PNG output. Printable sheets (PDF) will use `reportlab`, added in Milestone 3 | Small, mature, widely used libraries. Each dependency is pinned in `requirements.txt` when Milestone 3 starts | PRD §4.2 FR-07 |
| 6 | Local routing and TLS | Shared Caddy at `hotelsurvey.localhost` → host port 8090. No TLS locally | Confirmed by you | Local override |
| 7 | Production TLS | **Caddy with automatic Let's Encrypt certificates** on the VPS. Same Caddy pattern as local, with `auto_https` enabled and a public domain | Reuses existing infrastructure. No manual certificate handling | PRD §6.1, §7.3 |
| 8 | Token storage | SHA-256 hash of each room token in `hotel_rooms.qr_token_hash`. Raw tokens exist only in printed QR codes | PRD §6.4 | PRD §6.4, §7.3 |
| 9 | Survey languages | **Persian (`fa`) and English (`en`) only.** German is dropped. The language is fixed for the whole survey session. Right-to-left layout for Persian | Operator decision during Milestone 2. `AGENTS.md`, PRD FR-03 and `docs/brand.md` were updated to match (plan risk R1, resolved) | Operator; AGENTS.md; PRD FR-03 |
| 10 | Milestone 2 (branded bilingual survey) | Complete. Child theme `hotel-classic` extends `vanilla`; nine questions per PRD FR-04; required validation for Q1–Q7; Q8–Q9 optional; thank-you screen. Committed in `79c28c7`. Evidence in `specs/001-branded-bilingual-survey/evidence.md` | Tasks 60/60 in `specs/001-branded-bilingual-survey/tasks.md` | PRD §8 Milestone 2 |
| 11 | Placeholder brand | The brand in `docs/brand.md` (Bagh-e Pardis / Paradise Garden Hotel) is a development placeholder. The theme shows a "placeholder brand" notice on guest pages until it is turned off in admin | Not cleared for production (see §2 item 3) | `docs/brand.md`; theme README |
| 12 | Demo scope | **`hotelSurveyDemoPRD.md` replaces the full PRD for the current iteration.** App-style shell (app bar, hamburger drawer, bottom tab bar, mock buttons), existing survey re-skinned, Nearby places with mock data, simple aggregates-only dashboard. QR codes, rooms, exports and production are deferred. §2 items are not resolved by this | Operator is short on time and needs a presentable demo in one iteration; the app experience matters more than QR codes | Operator, 2026-11-04 |

## 2. Still needs a human

These cannot be resolved from the repo. Milestone 2 does not depend on them. Milestones 3 and 5 do.

1. **Production domain.** Needed for `PUBLIC_URL` and Caddy's automatic certificates. Blocks the production deployment only.
2. **Hotel admin IP addresses.** Needed for admin access restriction in production (PRD §7.3). Locally, admin is open to anyone who can reach the Caddy host.
3. **Hotel branding (placeholder set).** A placeholder brand is in `docs/brand.md`: Bagh-e Pardis / Paradise Garden Hotel. Replace it with the real name, logo and contact details before launch, and run a trademark check on the name (several "Pardis" hotels exist in Iran).
4. **GDPR details.** Response retention period, deletion procedure, and privacy notice wording (PRD §7.4). Blocks launch (Milestone 5).
5. **Phone testing on the LAN.** A guest's phone can't open `hotelsurvey.localhost`. Testing on a real phone needs a LAN hostname added to the shared Caddy and `PUBLIC_URL` updated (Milestone 5).
