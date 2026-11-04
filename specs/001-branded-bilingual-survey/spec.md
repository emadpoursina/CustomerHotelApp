# Feature Specification: Branded Bilingual Guest Survey (Milestone 2: Design and Survey)

**Feature Branch**: `milestone-2-design-survey`

**Created**: 2026-11-04

**Status**: Draft

**Input**: User description: "Start Milestone 2 (Design and Survey) for the Hotel Guest Survey project. Read these first, in order: 1. docs/handoff-milestone-2.md 2. AGENTS.md 3. docs/decisions.md 4. docs/brand.md 5. hotelSurveyPRD.md sections 4.1, 5, and 8 (Milestone 2). Build the branded, bilingual guest survey in limesurvey/themes/hotel-classic/, extending the stock vanilla theme. Do not edit LimeSurvey core files or its database tables. Do not add room tokens (Milestone 3). Do not commit or push."

**Sources**: `hotelSurveyPRD.md` §4.1 (FR-02 to FR-05), §5.1–5.5, §5.7, §7.4, §8 Milestone 2; `docs/handoff-milestone-2.md`; `docs/decisions.md` §1 (binding) and §2 (open, not resolved here); `docs/brand.md`; `AGENTS.md`. The survey languages in this spec (Persian and English) come from the operator's clarification of 2026-11-04 and differ from those source documents. See Clarifications.

## Scope

**In scope (Milestone 2)**: the guest-facing survey experience. That covers the welcome screen, the nine questions, the written-feedback screens and the thank-you screen. It also covers the classic-hotel visual design (colours, typography, spacing), Persian and English translations of every guest-visible string, a right-to-left layout and Persian-capable typefaces for the Persian screens, a switchable placeholder-brand notice, validation of required questions, anonymous-by-default response collection, and checks on phone-sized screens.

**Out of scope**:

- Room tokens, room registry, QR codes, hidden room field, token validation and room association of responses (Milestone 3, PRD FR-01, FR-06 to FR-08). The PRD FR-05 item "associate the response with the correct room identifier" is deferred to Milestone 3.
- Management dashboard, reporting, NPS calculation, filters and exports (Milestone 4). LimeSurvey's own admin interface is used as-is.
- Spam and bot protection (PRD §7.3). Deferred to a later milestone.
- Testing on real phones over the LAN (`docs/decisions.md` §2 item 5, Milestone 5). Milestone 2 uses phone-sized browser viewports.
- Open items in `docs/decisions.md` §2: production domain, admin IP restriction, the real hotel brand and trademark check, GDPR details (retention, deletion, privacy notice wording), and LAN phone testing. This spec does not decide any of them.
- Editing `hotelSurveyPRD.md`, `AGENTS.md` or `docs/brand.md` to match the new language scope. That is an operator action (see Clarifications).

## Clarifications

### Session 2026-11-04

- Q: Which language should the welcome screen open in before the guest chooses one, and which languages does the survey offer? (A-01, FR-004) → A: The survey is Persian and English; German is dropped. The welcome screen opens in English by default. If the browser prefers Persian, it opens in Persian. Any other browser language opens in English. The language selector is on the welcome screen only, and the language is fixed once the survey starts (FR-006 and A-02 still apply). Persian screens use a right-to-left layout, and a Persian-capable typeface and the right-to-left layout are in scope. Persian copy is a proposal that needs review by a fluent Persian speaker before launch.
- Q: Should the breakfast question (Q5) stay required with only the 1–5 scale, or offer a "not applicable" choice? (A-03) → A: Keep it required, 1–5 only, with no "not applicable" choice.
- Q: Should live guest pages show a visible placeholder-brand notice while the brand is a placeholder? (A-10) → A: Yes. Show a small, translated "Development preview – placeholder brand" notice on every guest page, controlled by one setting so it can be turned off at launch.
- Q: How should progress be shown on question screens: a bar, step text, or both? (FR-016) → A: Both. A thin progress bar and step text ("Question 3 of 9" in the guest's language).
- Q: What should question 1 show in place of a Back control? (Edge case, first question) → A: No Back control on question 1. Back appears from question 2 onward.
- **Resolved (operator, Milestone 2)**: The Persian and English language scope was in conflict with `AGENTS.md`, `hotelSurveyPRD.md` FR-03 and `docs/brand.md`, which said German and English. The operator approved updating those three files to Persian and English, and they now match this spec.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Guest completes the survey in their language (Priority: P1)

A hotel guest opens the survey link on their phone. A welcome screen greets them with the hotel's branding, a short welcome message, an estimate of how long the survey takes, and a choice of Persian or English. The guest picks a language and starts. They answer six 1–5 ratings and a 0–10 recommendation question, one per screen, and can see their progress. They can skip or fill in the two written-feedback questions. When they submit, a thank-you screen confirms that their feedback was received. Every screen stays in the language the guest chose, and Persian screens read right to left.

**Why this priority**: This is the core value of the product. Without a complete, working survey in both languages, the hotel collects no feedback. It is the Milestone 2 deliverable.

**Independent Test**: Open the survey on a phone-sized viewport, choose Persian, answer every question and submit. Then repeat in English. Confirm that a thank-you screen appears both times, that every guest-visible string is in the chosen language, that the Persian screens use a right-to-left layout, and that both responses are stored as completed, with their language and submission time recorded.

**Acceptance Scenarios**:

1. **Given** a guest opens the survey link, **When** the welcome screen loads, **Then** it shows the hotel wordmark, a welcome heading, the welcome message, a short introduction, the estimated completion time (about two minutes), a Persian/English language selector and a start button.
2. **Given** the guest's browser prefers Persian, **When** the welcome screen loads, **Then** it is shown in Persian with a right-to-left layout. **Given** the browser prefers any other language, **When** the welcome screen loads, **Then** it is shown in English.
3. **Given** the guest selects English on the welcome screen, **When** they start the survey, **Then** every question, answer label, help text, button, progress label, validation message and the thank-you screen are shown in English, with a left-to-right layout.
4. **Given** the guest selects Persian on the welcome screen, **When** they start the survey, **Then** every one of those strings is shown in Persian, with a right-to-left layout on every screen.
5. **Given** the guest is on any question screen, **When** they look at the screen, **Then** a thin progress bar and step text (for example "Question 3 of 9", in the guest's language) show how far through the survey they are.
6. **Given** the guest is on question 1, **When** they look at the screen, **Then** there is no Back control. **Given** the guest is on question 2 or later, **When** they choose Back, **Then** the previous question is shown with their earlier answer kept.
7. **Given** the guest has answered questions 1–7 and left questions 8 and 9 empty, **When** they submit, **Then** the response is saved as completed and the thank-you screen appears.
8. **Given** the guest has submitted, **When** the thank-you screen appears, **Then** it shows a confirmation icon, a thank-you heading, the appreciation message, and the hotel branding with both the English and Persian hotel names in the header.

---

### User Story 2 - Required answers are enforced, optional ones are not (Priority: P1)

A guest who tries to continue without answering a required question is stopped with a clear, translated message that names the problem, and stays on that question. A guest who leaves either written-feedback question empty can still continue and submit.

**Why this priority**: The PRD makes questions 1–7 required. Incomplete ratings would make satisfaction and NPS figures unreliable in Milestone 4. Forcing answers on optional comments would reduce completion rates.

**Independent Test**: For each of questions 1–7, try to continue without an answer and confirm that the guest stays on the question and sees a validation message in the chosen language. For questions 8 and 9, continue with an empty field and confirm that the guest moves on.

**Acceptance Scenarios**:

1. **Given** the guest is on any of questions 1–7 with no answer selected, **When** they choose Continue, **Then** they stay on the same question and see a validation message in their chosen language next to the question.
2. **Given** a validation message is shown, **When** the guest selects an answer and chooses Continue, **Then** the message clears and the next screen is shown.
3. **Given** the guest is on question 8 or 9 with the text field empty, **When** they choose Continue or Submit, **Then** they move on with no validation message.
4. **Given** the guest is on question 8 or 9, **When** they look at the screen, **Then** the question is clearly marked as optional in their chosen language.

---

### User Story 3 - Survey looks and feels like the hotel on a phone (Priority: P2)

The guest sees a calm, elegant design that matches the hotel's classic style: warm ivory background, white cards, deep espresso text, champagne-gold accents on selected answers and decorative details, a serif typeface for headings and a clean sans-serif typeface for body text, with Persian-capable equivalents on Persian screens. Every control is large enough to tap with a thumb, and nothing needs sideways scrolling on a phone, in either reading direction.

**Why this priority**: The PRD asks that the survey feel like part of the hotel's hospitality, not a generic form. This affects participation and trust. The survey still works without it, so it ranks below the functional stories.

**Independent Test**: Go through the full survey in both languages at phone viewport widths of 360px and 390px, and at a desktop width. Check colours, fonts, spacing, touch-target sizes, the content width limit, the reading direction and the absence of horizontal scrolling against the design requirements below.

**Acceptance Scenarios**:

1. **Given** a phone-sized viewport 360px wide, **When** the guest views any survey screen in either language, **Then** no horizontal scrolling is possible and all content fits the screen width.
2. **Given** any screen, **When** the guest taps a rating option, button or language choice, **Then** the tappable area is at least 48px high, and rating options are spaced so that a tap does not select a neighbouring value.
3. **Given** the guest selects a rating, **When** the selection is shown, **Then** the selected state uses the gold accent and also has a non-colour cue (for example a border, fill or check mark), so it can be told apart without colour.
4. **Given** a desktop browser window, **When** the guest views the survey, **Then** the survey content is centred and no wider than 680px.
5. **Given** any screen, **When** the guest reads headings and body text, **Then** headings use the heading typeface and body and interface text use the body typeface, at the sizes listed in the design requirements. On Persian screens these are the Persian-capable heading and body typefaces.
6. **Given** a Persian screen, **When** the guest views it, **Then** text is right-aligned and reads right to left, the layout is mirrored (navigation order, progress-bar fill direction, the placement of icons and markers), and embedded English text such as the hotel name reads correctly left to right.
7. **Given** the placeholder-brand notice setting is on, **When** the guest views any guest page (welcome, question or thank-you), **Then** a small notice reading "Development preview – placeholder brand" (or its Persian translation) is shown. **Given** the setting is off, **Then** no page shows the notice.

---

### User Story 4 - Guest feedback is anonymous by default (Priority: P2)

The guest is never asked for a name, email address or any other personal detail, and the stored response contains no data that identifies them beyond what they choose to write in the optional comment fields.

**Why this priority**: The PRD and AGENTS.md require anonymity by default and data minimisation (GDPR). Getting this wrong is a compliance risk. It does not change the guest's visible flow.

**Independent Test**: Complete the survey, then inspect the stored response in the admin interface. Confirm that there is no IP address, name, email, contact field or other identifying data, and that the submission time and language are recorded.

**Acceptance Scenarios**:

1. **Given** any survey screen, **When** the guest views it, **Then** there are no fields for a name, email address, phone number or other personal details.
2. **Given** a completed response, **When** an administrator views it, **Then** it contains the answers, the submission timestamp and the survey language, and does not contain the guest's IP address, referring page, or any identifier that links it to a person.

---

### User Story 5 - Accidental duplicate submission is avoided (Priority: P3)

A guest who taps Submit twice, refreshes the thank-you screen, or presses the browser's back button after submitting does not create a second copy of the same response. A guest who opens the survey link again later can still fill in a new survey.

**Why this priority**: PRD FR-05 asks to prevent accidental duplicates "where practical without creating unnecessary barriers". Duplicates would distort small samples, but this is a protection against mistakes, not a core flow.

**Independent Test**: Submit a survey, double-tapping the submit control. Then refresh the thank-you screen and use the browser back button. Confirm that exactly one completed response exists. Then open the survey link in a new session and confirm that a fresh survey can be started.

**Acceptance Scenarios**:

1. **Given** the guest taps Submit twice quickly, **When** the submission is processed, **Then** exactly one completed response is stored.
2. **Given** the guest is on the thank-you screen, **When** they refresh the page or go back, **Then** no additional response is stored, and the guest is not shown their previous answers in an editable state.
3. **Given** a guest completed the survey earlier, **When** someone opens the survey link again in a new session, **Then** a new, empty survey starts. The survey is not blocked because of the earlier submission.

---

### Edge Cases

- **Language after start**: Once the guest starts the survey, no language control is shown on question screens or the thank-you screen. A guest who wants another language has to start a new session.
- **Browser language not Persian or English**: The welcome screen opens in English, and the guest can switch to Persian before starting.
- **Switching language on the welcome screen**: Switching between Persian and English on the welcome screen changes both the text and the reading direction of the welcome screen, without losing the guest's place or starting a response.
- **First question**: Question 1 has no Back control. Back appears from question 2 onward. Continue is the only navigation control on question 1, and the chosen language is unaffected.
- **Guest abandons midway**: A partly completed survey is not counted as a completed response. The guest is not asked to save or resume. Whether partial answers are kept, and for how long, is part of the open GDPR retention decision (`docs/decisions.md` §2 item 4).
- **Breakfast not taken**: Question 5 stays required with the 1–5 scale only. No "not applicable" option is offered (confirmed in Clarifications).
- **Very long comment**: Questions 8 and 9 accept free text of at least 1,000 characters. If there is a limit, the guest is told in their language rather than having text silently cut off.
- **Whitespace-only comment**: A comment made only of spaces or line breaks is treated like an empty optional answer.
- **Personal data typed into a comment**: Guests may write names or room numbers into comments. The survey does not block this, but comments are treated as sensitive: they are not written to logs and appear only in the access-restricted admin interface.
- **Mixed-direction comments**: A Persian-screen guest may type English, digits or mixed Persian and English into a comment, and an English-screen guest may type Persian. The text field shows the text in its natural direction while typing, and the stored text is unchanged.
- **Large system text size or zoom**: At 200% browser zoom or a large system font size on a 360px-wide screen, the content reflows without horizontal scrolling or overlapping controls, in both reading directions.
- **Fonts fail to load**: If the brand typefaces cannot load, text is shown in the fallback typefaces, stays readable and keeps the layout intact. Persian text falls back to a typeface that can show Persian script, never to empty boxes.
- **Hotel names in both directions**: The Persian hotel name (باغ پردیس) displays correctly (connected letters, right-to-left word order) on English screens, and the English name and wordmark display correctly (left-to-right) on Persian screens.
- **Placeholder notice turned off**: With the notice setting off, no guest page shows the notice and no empty space or broken layout is left where it was.
- **Slow connection**: On a slow mobile connection, each screen is usable without waiting for decorative assets.

## Requirements *(mandatory)*

### Functional Requirements

**Welcome screen (PRD FR-02, §5.5 Screen 1)**

- **FR-001**: The welcome screen MUST show the hotel wordmark (placeholder brand, see FR-030), a welcome heading, the welcome message, a short survey introduction, the estimated completion time, a Persian/English language selector and a primary start button.
- **FR-002**: The welcome message MUST be, in English: "Your experience matters. We would be delighted if you could take two minutes to share your experience with us." The Persian text MUST say the same thing (see the string table under Key Entities).
- **FR-003**: The estimated completion time MUST be stated as about two minutes, in the guest's language.

**Language (PRD FR-03, as changed by the operator; see Clarifications)**

- **FR-004**: The survey MUST be available in Persian and English, and in no other language. English is the base language.
- **FR-005**: The guest MUST be able to choose Persian or English on the welcome screen, before starting the survey. Before the guest chooses, the welcome screen MUST open in Persian if the browser prefers Persian, and in English for any other browser language.
- **FR-006**: After the guest starts the survey, the chosen language MUST stay fixed for the rest of the session. No language control is offered on question screens or the thank-you screen.
- **FR-007**: Every guest-visible string MUST be translated into both languages. This covers the welcome texts, question texts, answer and scale labels, help texts, optional markers, buttons, progress labels and step text, validation and error messages, the placeholder-brand notice, the thank-you texts, and page titles. No string may fall back to the other language or show an untranslated system text.
- **FR-008**: The language in which each response was completed MUST be stored with the response.

**Questions (PRD FR-04)**

- **FR-009**: The survey MUST contain exactly these nine questions, in this order:

  | # | Question (English) | Response type | Required |
  |---|---|---|---|
  | 1 | How would you rate your overall stay? | 1–5 rating | Yes |
  | 2 | How clean was your room? | 1–5 rating | Yes |
  | 3 | How comfortable was your room? | 1–5 rating | Yes |
  | 4 | How friendly was our staff? | 1–5 rating | Yes |
  | 5 | How would you rate breakfast? | 1–5 rating | Yes |
  | 6 | How satisfied were you with our facilities? | 1–5 rating | Yes |
  | 7 | Would you recommend our hotel? | 0–10 rating | Yes |
  | 8 | What did you particularly like? | Optional text | No |
  | 9 | What could we improve? | Optional text | No |

- **FR-010**: Each question MUST appear on its own screen, with a question heading, a short description or scale explanation, the answer control, and navigation controls (PRD §5.5 Screen 2). Question 1 MUST show Continue and no Back control. Questions 2–9 MUST show Back and Continue (or Submit on the last question).
- **FR-011**: Ratings 1–5 MUST show all five values as separate tappable choices, with the meaning of the ends labelled (1 = lowest, 5 = highest) in the guest's language. Question 5 (breakfast) MUST offer only these five values, with no "not applicable" choice.
- **FR-012**: The 0–10 recommendation question MUST show all eleven values as separate tappable choices, with the ends labelled (0 = not at all likely, 10 = extremely likely) in the guest's language. All eleven values MUST be reachable on a 360px-wide screen without horizontal scrolling, in both languages.
- **FR-013**: Questions 8 and 9 MUST each offer a multi-line text field and MUST be clearly marked as optional in the guest's language (PRD §5.5 Screen 3).
- **FR-014**: The guest MUST NOT be able to move past questions 1–7 without answering. Trying to do so MUST show a translated validation message next to the question, in the error colour, together with a non-colour cue such as an icon or text.
- **FR-015**: The guest MUST be able to move past questions 8 and 9, and submit, without entering text.
- **FR-016**: Every question screen MUST show both a thin progress bar and step text in the guest's language: "Question N of 9" in English, and the Persian equivalent (see the string table). The step count is based on the nine questions. The welcome and thank-you screens are not counted as steps. On Persian screens the bar MUST fill from right to left.
- **FR-017**: Back navigation (from question 2 onward) MUST return to the previous question with the earlier answer kept. Continue MUST keep the current answer.

**Completion (PRD FR-05, §5.5 Screen 4)**

- **FR-018**: On successful submission, the response MUST be saved as a completed response, with the submission timestamp and survey language.
- **FR-019**: After submission, the guest MUST see a thank-you screen with a confirmation icon, a thank-you heading, the appreciation message and the hotel branding.
- **FR-020**: The appreciation message MUST be, in English: "Thank you for taking the time to share your experience. Your feedback helps us make every stay more special." The Persian text MUST say the same thing.
- **FR-021**: The thank-you screen header MUST show both the English name (Paradise Garden Hotel) and the Persian name (باغ پردیس) in both languages, with the Persian name set in a typeface that supports Persian script (`docs/brand.md`).
- **FR-022**: A double tap on Submit, a refresh of the thank-you screen, or browser Back after submission MUST NOT create a second completed response. Opening the survey again in a new session MUST still allow a new survey.

**Anonymity and privacy (PRD §7.4, AGENTS.md)**

- **FR-023**: The survey MUST NOT ask for or store names, email addresses, phone numbers or other contact details, and MUST NOT require an account or login.
- **FR-024**: Responses MUST be anonymous by default. The guest's IP address, referring URL and any participant identifier MUST NOT be stored with the response.
- **FR-025**: Comment text from questions 8 and 9 MUST NOT be written to application or server logs by any custom component added in this milestone.

**Visual design (PRD §5.1–5.4, §5.7)**

- **FR-026**: All colours, typefaces, font sizes, spacing and radii used by the survey's custom styling MUST come from the single design-token source (`limesurvey/themes/hotel-classic/css/tokens.css`), including the Persian-capable typefaces. No colour values are hard-coded anywhere else.
- **FR-027**: The survey MUST use the PRD colour system: Warm Ivory background, white cards and surfaces, Deep Espresso primary text, Muted Brown secondary text, Soft Taupe borders and dividers, Champagne Gold only for accents, selected states and decorative details, and the Success, Warning and Error colours for those states only.
- **FR-028**: On English screens, headings MUST use Cormorant Garamond and body and interface text MUST use Inter, each with fallback typefaces. On Persian screens, headings and body and interface text MUST use typefaces that support Persian script, with Persian-capable fallbacks, chosen to match the classic heading and clean body styles. The wordmark keeps the heading typeface in both languages. Sizes MUST follow PRD §5.3 in both languages: main heading 32px, section heading 24px, card heading 18px, body 15–16px, supporting text 13px, small labels 11–12px.
- **FR-029**: The layout MUST follow PRD §5.4: a 4px spacing scale, 12px card radius, 8px input and button radius, buttons and other touch targets at least 48px high, and survey content at most 680px wide. It MUST avoid the PRD §5.1 anti-patterns: bright SaaS colours, heavy gradients, overly rounded elements, excessive animation and cluttered screens.
- **FR-030**: The brand MUST be the placeholder from `docs/brand.md`: English name "Paradise Garden Hotel" as a wordmark in the heading typeface, in Champagne Gold on Warm Ivory, with the tagline "Your experience matters" (translated in Persian). The brand MUST be clearly labelled as a development placeholder in any shared preview (screenshots, demos, review links), in the theme documentation, and on guest pages through the notice in FR-037. It is not cleared for production. Brand name, wordmark and tagline MUST be defined in one place, so the real brand can replace them without layout changes.
- **FR-031**: The layout MUST be mobile-first: full-width on phones, no horizontal scrolling at viewport widths from 320px upward, and readable without zooming. English screens MUST be laid out left to right. Persian screens MUST be laid out right to left: right-aligned text, mirrored placement of navigation controls, progress bar, icons, optional markers and validation messages, with embedded left-to-right text (such as the English hotel name) displayed correctly.
- **FR-032**: All text other than the decorative wordmark MUST meet WCAG 2.1 AA contrast against its background, in both languages. Champagne Gold MUST NOT be used for body-size text. Each page MUST declare its language (Persian or English) and reading direction so that screen readers and browsers pronounce and display it correctly, and embedded text in the other language (such as the hotel names) MUST be marked with its own language and direction.
- **FR-033**: Brand typefaces, including the Persian-capable typefaces, MUST be served with the survey itself, not loaded from a third-party font service, so that opening the survey does not send guest data to third parties. This follows the existing TODO in `tokens.css` and PRD §5.3, which allows local hosting.
- **FR-034**: The survey MUST keep JavaScript to a minimum. Any custom script beyond what the survey engine already provides MUST be justified by a requirement in this spec.

**Placeholder-brand notice (Clarifications, A-10)**

- **FR-037**: While the brand is a placeholder, every guest page (welcome, every question screen and the thank-you screen) MUST show a small notice reading "Development preview – placeholder brand", translated into the guest's language. The notice MUST be controlled by one setting that turns it on or off on all guest pages at once, so it can be turned off at launch without other changes. The notice MUST meet the contrast rule in FR-032, MUST NOT cover or push controls below the 48px touch-target rule, and MUST NOT cause horizontal scrolling.

**Platform constraints (AGENTS.md, handoff; binding for planning)**

- **FR-035**: The design MUST be delivered as a child theme in `limesurvey/themes/hotel-classic/` that extends the stock `vanilla` theme (`docs/decisions.md` §1 item 3). LimeSurvey core files and LimeSurvey's own database tables MUST NOT be modified. Survey content is created through the LimeSurvey admin interface or its supported import/export mechanism.
- **FR-036**: The survey MUST NOT include a room token, room field or any room-related question or hidden field in this milestone.

### Key Entities *(include if feature involves data)*

- **Survey**: The single guest questionnaire. Attributes: nine questions in fixed order, two languages (Persian and English, English as base), welcome texts, thank-you texts, anonymous-by-default setting, and the estimated completion time.
- **Question**: Number (1–9), text in each language, short description or scale explanation in each language, response type (1–5 rating, 0–10 rating, free text), required flag.
- **Response**: One guest's completed submission. Attributes: answers to questions 1–7, optional answers to questions 8–9, submission timestamp, language used, completion status. No personal identifiers and, in this milestone, no room identifier.
- **Brand placeholder**: English name, Persian name, transliteration, tagline and wordmark style from `docs/brand.md`. Marked as a development placeholder and replaceable in one place. Includes the single on/off setting for the guest-page placeholder notice (FR-037).
- **Design tokens**: The single source of colours, typefaces (including the Persian-capable typefaces), font sizes, spacing, radii, minimum touch size and content widths.

**Guest-visible strings (English source and proposed Persian).** The Persian text is a proposal in the polite form addressing the guest as «شما». It must be reviewed by a fluent Persian speaker before launch. Digit style in Persian strings (Persian «۳» or Western "3") is part of that review (see A-19).

| Key | English | Persian (proposed) |
|---|---|---|
| Tagline / welcome heading | Your experience matters | تجربهٔ شما برای ما ارزشمند است |
| Welcome message | Your experience matters. We would be delighted if you could take two minutes to share your experience with us. | تجربهٔ شما برای ما ارزشمند است. خوشحال می‌شویم اگر دو دقیقه وقت بگذارید و تجربهٔ خود را با ما در میان بگذارید. |
| Estimated time | About 2 minutes | حدود ۲ دقیقه |
| Start button | Start survey | شروع نظرسنجی |
| Language selector labels | English / فارسی | English / فارسی |
| Q1 | How would you rate your overall stay? | اقامت خود را در مجموع چگونه ارزیابی می‌کنید؟ |
| Q2 | How clean was your room? | اتاق شما چقدر تمیز بود؟ |
| Q3 | How comfortable was your room? | اتاق شما چقدر راحت بود؟ |
| Q4 | How friendly was our staff? | کارکنان ما چقدر خوش‌برخورد بودند؟ |
| Q5 | How would you rate breakfast? | صبحانه را چگونه ارزیابی می‌کنید؟ |
| Q6 | How satisfied were you with our facilities? | از امکانات ما چقدر راضی بودید؟ |
| Q7 | Would you recommend our hotel? | آیا هتل ما را به دیگران توصیه می‌کنید؟ |
| Q8 | What did you particularly like? | چه چیزی را به‌ویژه پسندیدید؟ |
| Q9 | What could we improve? | چه چیزی را می‌توانیم بهتر کنیم؟ |
| 1–5 scale ends | 1 = Very poor, 5 = Excellent | ۱ = بسیار ضعیف، ۵ = عالی |
| 0–10 scale ends | 0 = Not at all likely, 10 = Extremely likely | ۰ = اصلاً احتمال ندارد، ۱۰ = به احتمال بسیار زیاد |
| Step text | Question 3 of 9 | پرسش ۳ از ۹ |
| Optional marker | Optional | اختیاری |
| Back / Continue / Submit | Back / Continue / Submit | قبلی / ادامه / ارسال |
| Required-answer message | Please choose an answer to continue. | لطفاً برای ادامه یک گزینه را انتخاب کنید. |
| Thank-you heading | Thank you | سپاسگزاریم |
| Appreciation message | Thank you for taking the time to share your experience. Your feedback helps us make every stay more special. | از اینکه وقت گذاشتید و تجربهٔ خود را با ما در میان گذاشتید سپاسگزاریم. نظر شما به ما کمک می‌کند هر اقامت را ویژه‌تر کنیم. |
| Placeholder notice | Development preview – placeholder brand | پیش‌نمایش توسعه – نام تجاری موقت |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A first-time tester completes the full survey (welcome to thank-you) in each language in 2 minutes or less at a phone-sized viewport, answering all required questions and leaving the optional ones empty.
- **SC-002**: In a full walkthrough in each language, 100% of guest-visible strings appear in the chosen language. That is zero strings in the wrong language or untranslated, from the welcome screen through the thank-you screen.
- **SC-003**: For each of the 7 required questions, an attempt to continue without an answer is blocked with a translated message (7 of 7 in each language). Both optional questions can be skipped (2 of 2 in each language).
- **SC-004**: At viewport widths of 320px, 360px and 390px, in both languages, no survey screen scrolls horizontally, and every tappable control measures at least 48px in height.
- **SC-005**: Every completed test response appears exactly once in the admin interface, marked as completed, with its submission time and language, and without IP address or personal data. That includes responses made with a double tap on Submit, a refresh or browser Back.
- **SC-006**: A design review of each screen type (welcome, rating, recommendation, written feedback, thank-you) in both languages finds no colour, typeface, size, radius or spacing that does not trace back to the design tokens, and no hard-coded colour values outside the token source.
- **SC-007**: All text except the decorative wordmark passes a WCAG 2.1 AA contrast check, in both languages.
- **SC-008**: Each survey screen becomes usable within 3 seconds on a simulated typical mobile (4G) connection, and loads no fonts or other assets from third-party services.
- **SC-009**: A reviewer who did not build the feature can confirm, from the survey alone, that it has nine questions in the PRD order, the welcome message and thank-you message from the PRD, a progress bar with step text, and Back/Continue navigation (no Back on question 1).
- **SC-010**: In a Persian walkthrough, 100% of screens (welcome, nine questions, thank-you) are laid out right to left and declare Persian as their language, with no left-aligned Persian text and no garbled Persian or English hotel names. In an English walkthrough, 100% of screens are laid out left to right.
- **SC-011**: With the notice setting on, the placeholder notice appears on 11 of 11 guest page types (welcome, nine questions, thank-you) in each language. With the setting off, it appears on 0 of 11, after changing only that one setting.
- **SC-012**: Opening the welcome screen with a browser that prefers Persian shows Persian. Opening it with browsers that prefer English, German or another language shows English (3 of 3 checks).

## Assumptions

- **A-01 Default language**: English is the survey's base language. The welcome screen opens in Persian if the browser prefers Persian, and in English otherwise (confirmed in Clarifications). "Prefers Persian" is taken to mean that Persian (any `fa` regional variant) ranks above English in the browser's language preferences. The guest can switch on the welcome screen.
- **A-02 Language selector placement**: PRD FR-02 (language selector on the welcome screen) and FR-03 (language stays consistent) are reconciled by offering the selector on the welcome screen only. It disappears once the survey starts (confirmed in Clarifications).
- **A-03 Breakfast question**: Question 5 stays required with the 1–5 scale only and no "not applicable" option, as the PRD table says, even though some guests may not have had breakfast (confirmed in Clarifications).
- **A-04 Scale labels**: 1–5 scales are labelled at the ends only ("Very poor" to "Excellent"). The 0–10 scale uses standard NPS end labels ("Not at all likely" to "Extremely likely"). Labels for each point are not required.
- **A-05 Persian copy**: The Persian texts in the string table use the polite form. They are proposals that need review by a fluent Persian speaker before launch. Their wording is not a decision about the real brand.
- **A-06 Welcome heading**: The tagline "Your experience matters" / «تجربهٔ شما برای ما ارزشمند است» is used as the welcome heading, below the wordmark.
- **A-07 Duplicate prevention**: "Where practical without unnecessary barriers" means stopping repeat submission within the same session (double tap, refresh, Back after submit). It does not mean blocking a device or browser from starting a new survey later, because several guests may share a phone and a room.
- **A-08 Incomplete responses**: Abandoned surveys are not treated as completed responses. No save-and-resume feature is offered. How long partial data is kept falls under the open GDPR item (`docs/decisions.md` §2 item 4) and is not decided here.
- **A-09 Privacy wording**: The welcome screen may state as a fact that the survey is anonymous. The formal privacy notice and its wording stay open (`docs/decisions.md` §2 item 4) and are not added in this milestone.
- **A-10 Placeholder brand**: The Bagh-e Pardis / Paradise Garden Hotel brand from `docs/brand.md` is used for development only. Live guest pages show a small, translated placeholder notice controlled by one setting (FR-037, confirmed in Clarifications). The setting is on during development and is turned off at launch. The real brand and the trademark check stay open (`docs/decisions.md` §2 item 3).
- **A-11 No logo image**: There is no logo file. The wordmark is the English name set in the heading typeface, as `docs/brand.md` describes, in both languages. The thank-you confirmation icon is a simple, neutral check mark.
- **A-12 Self-hosted fonts**: Fonts are served with the survey rather than from a third-party font service. This is allowed by PRD §5.3, planned in the `tokens.css` TODO, and avoids sending guest IP addresses to third parties, which matters under GDPR in Germany. The Persian-capable typefaces must have a licence that allows self-hosting.
- **A-13 Persian typefaces and layout**: Persian screens use a full right-to-left layout and Persian-capable heading and body typefaces (in scope, confirmed in Clarifications). This replaces the `docs/brand.md` rule that the page stays left-to-right and that a Persian typeface is used only for the brand name. Which typefaces are used is a planning choice within FR-028 and FR-033.
- **A-14 Survey access in Milestone 2**: The survey is reached through a plain survey link with no room token. Room-specific links come in Milestone 3.
- **A-15 Testing environment**: Milestone 2 checks use phone-sized viewports in desktop browsers (device emulation) against the local stack at `http://hotelsurvey.localhost`. Real-phone testing over the LAN is deferred (`docs/decisions.md` §2 item 5).
- **A-16 Comment length**: Optional comments accept at least 1,000 characters. The exact upper limit is a planning detail.
- **A-17 Survey content location**: Survey structure and translations are created in the LimeSurvey admin. Planning may add an exported survey definition file to the repository so the survey can be recreated. That is a planning choice, not a requirement here.
- **A-18 Spam protection**: Bot and spam protection (PRD §7.3) is not part of Milestone 2.
- **A-19 Rating direction and digits on Persian screens**: Rating choices follow the reading direction, so on Persian screens the lowest value sits on the right, consistent with the mirrored layout in FR-031. Stored answer values are the same numbers in both languages. Whether Persian screens show Persian digits (۰–۱۰) or Western digits (0–10) is left to the Persian-copy review. Neither point was decided in Clarifications.

## Dependencies

- Running local stack (LimeSurvey CE 6.17.18 and MariaDB) from Milestone 1, reachable at `http://hotelsurvey.localhost` and the admin at `/index.php/admin`.
- The stock `vanilla` theme present in the running LimeSurvey install (`docs/decisions.md` §1 item 3).
- The child-theme directory mounted into the container at `upload/themes/survey/hotel-classic`.
- Existing design tokens in `limesurvey/themes/hotel-classic/css/tokens.css`.
- `./scripts/validate.sh` must still pass when the milestone is done.
- Persian-capable heading and body typefaces whose licences allow self-hosting.
- A fluent Persian speaker to review the Persian copy before launch.
- Operator updates to `hotelSurveyPRD.md` FR-03, `AGENTS.md` and `docs/brand.md` for the Persian and English language scope (see Clarifications).
