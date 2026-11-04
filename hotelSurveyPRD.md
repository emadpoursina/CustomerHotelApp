# Product Requirements Document (PRD)
# Hotel Guest Survey App

**Version:** 1.0  
**Status:** Ready for Development  
**Product Type:** Single-Hotel Guest Feedback Application  
**Primary Platform:** Web Application (Mobile-First)  
**Survey Engine:** LimeSurvey Community Edition

---

# 1. Product Overview

## 1.1 Product Vision

Build a simple, elegant, and mobile-friendly hotel guest feedback application that allows guests to share their experience by scanning a QR code located in their hotel room.

The application enables hotel management to collect, review, and analyze guest satisfaction data through a simple management dashboard.

The product should feel like a natural extension of the hotel's hospitality rather than a generic survey application.

## 1.2 Problem Statement

Hotels need a convenient way to collect feedback from guests during or after their stay.

Traditional feedback collection methods often suffer from:

- Low participation rates.
- Paper-based questionnaires.
- Fragmented feedback collection.
- Difficulty identifying recurring problems.
- Limited visibility into guest satisfaction.
- Time-consuming manual reporting.

The proposed application addresses these problems through QR-code-based surveys and centralized feedback reporting.

## 1.3 Product Goals

1. Make it easy for guests to submit feedback.
2. Increase survey participation through convenient QR-code access.
3. Collect structured feedback across hotel service categories.
4. Provide management with a clear overview of guest satisfaction.
5. Identify areas that require operational improvement.
6. Minimize development and maintenance complexity by leveraging LimeSurvey.

## 1.4 Non-Goals

The first version will NOT include:

- Multi-hotel or multi-tenant support.
- Guest registration or accounts.
- Hotel booking functionality.
- Payment processing.
- Hotel property management system (PMS) integration.
- Automated email or SMS survey campaigns.
- AI-powered feedback analysis.
- Advanced staff management.
- Native Android or iOS applications.

These features may be considered in future versions.

---

# 2. Target Users

## 2.1 Primary User: Hotel Guest

Guests access the application by scanning a QR code in their room.

Characteristics:
- Primarily use smartphones.
- Should not need to create an account.
- May speak different languages.
- Should be able to complete the survey in approximately two minutes.
- May want to provide feedback anonymously.

Primary needs:
- Simple navigation.
- Clear questions.
- Easy rating controls.
- Fast submission.
- Privacy and transparency.

## 2.2 Secondary User: Hotel Management

Hotel management accesses the administration interface to review collected feedback.

Primary needs:
- View overall satisfaction.
- Identify service problems.
- Review individual comments.
- Compare satisfaction categories.
- Filter responses.
- Export survey results.

---

# 3. Product Scope — MVP

The MVP consists of four main modules.

1. Guest Survey Interface.
2. Room QR-Code Management.
3. Survey Engine and Data Collection.
4. Management Dashboard.

LimeSurvey will provide the survey engine and initial administration interface.

Custom development should be limited to hotel branding, theme customization, room identification, QR-code management, and any reporting functionality that LimeSurvey cannot adequately provide.

---

# 4. Functional Requirements

## 4.1 Guest Survey Interface

### FR-01: QR-Code Access

Guests must be able to access the survey by scanning a QR code located in their hotel room.

Requirements:
- Each room has its own unique QR code.
- QR codes open the guest survey directly.
- No guest login is required.
- The survey must work on modern mobile browsers.
- QR codes must remain usable unless explicitly deactivated or regenerated.

### FR-02: Welcome Screen

The welcome screen must contain:

- Hotel logo or generic hotel branding.
- Welcome message.
- Short survey introduction.
- Estimated completion time.
- Language selector.
- Start survey button.

Suggested welcome message:

"Your experience matters. We would be delighted if you could take two minutes to share your experience with us."

### FR-03: Language Support

The initial release must support:

- German.
- English.

Requirements:
- Guests can select their preferred language.
- All questions and interface elements must be translated.
- The selected language must remain consistent throughout the survey.

### FR-04: Survey Questions

The survey should contain the following questions:

| # | Question | Response Type | Required |
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

Requirements:
- Use one question per screen where practical.
- Display clear progress.
- Provide back and continue navigation.
- Validate required questions.
- Allow guests to submit optional questions without providing answers.
- Display a confirmation screen after successful submission.

### FR-05: Survey Completion

After successful submission:

- Save the survey response.
- Associate the response with the correct room identifier.
- Record the submission timestamp.
- Display a thank-you screen.
- Prevent accidental duplicate submissions where practical without creating unnecessary barriers.

Suggested message:

"Thank you for taking the time to share your experience. Your feedback helps us make every stay more special."

---

## 4.2 Room and QR-Code Management

### FR-06: Room Registry

The system must maintain a list of hotel rooms.

Each room must contain:

- Internal room ID.
- Room number.
- Unique QR token.
- Active/inactive status.
- Creation timestamp.

### FR-07: QR-Code Generation

Requirements:
- Generate a unique, random token for each room.
- Generate a survey URL using the token.
- Generate a downloadable QR code.
- Allow administrators to regenerate QR codes.
- Allow administrators to deactivate room tokens.
- Support printable QR-code output.

Example:

Room 101:
`https://hotel.example/survey?r=8f2a91`

Room 102:
`https://hotel.example/survey?r=9b7c42`

The actual tokens must be sufficiently random and non-guessable.

Room tokens are identifiers, not proof of occupancy or authentication credentials.

### FR-08: Room Identification

When a guest opens the survey:

1. The application receives the room token.
2. The token is validated against the room registry.
3. The corresponding room identifier is captured in a hidden survey field.
4. The guest completes the questionnaire.
5. The room identifier is stored with the response.

Invalid or deactivated tokens must not be associated with a valid room.

The room identifier should not be editable by the guest through the survey interface.

---

## 4.3 Management Dashboard

### FR-09: Dashboard Overview

The management interface must display:

- Total completed responses.
- Average overall satisfaction.
- Net Promoter Score (NPS).
- Satisfaction by category.
- Recent guest feedback.

### FR-10: Satisfaction Analytics

The dashboard must display satisfaction scores for:

- Overall stay.
- Room cleanliness.
- Room comfort.
- Staff friendliness.
- Breakfast.
- Hotel facilities.

Requirements:
- Use clear visualizations.
- Show category averages.
- Display response counts.
- Allow date filtering.
- Avoid misleading statistics when sample sizes are small.

### FR-11: Survey Responses

Administrators must be able to:

- View individual submissions.
- See submission dates.
- See associated room identifiers.
- Read written feedback.
- Filter by date.
- Filter by room.
- Export results.

### FR-12: Data Export

Administrators must be able to export survey responses in CSV or Excel-compatible format.

Exported data should include:
- Response ID.
- Submission timestamp.
- Room identifier.
- Survey answers.
- Optional written feedback.
- Survey language.

---

# 5. UI/UX Design Requirements

## 5.1 Design Direction

**Style:** Classic Hotel  
**Branding:** Generic hotel identity.

The interface should communicate:
- Traditional hospitality.
- Elegance.
- Warmth.
- Trust.
- Simplicity.

Avoid:
- Bright SaaS-style colors.
- Excessive gradients.
- Overly rounded interface elements.
- Excessive animations.
- Visually complicated survey screens.

## 5.2 Color System

| Token | Hex | Purpose |
|---|---|---|
| Warm Ivory | #F8F5EF | Main background |
| White | #FFFFFF | Cards and surfaces |
| Deep Espresso | #352B25 | Primary text |
| Champagne Gold | #B89A65 | Brand accent |
| Soft Taupe | #DCD2C3 | Borders and dividers |
| Muted Brown | #796C60 | Secondary text |
| Success | #47765C | Success states |
| Warning | #B68A43 | Warning states |
| Error | #A34E45 | Error states |

Gold should be used sparingly for accents, selected states, and decorative details.

Maintain sufficient text contrast.

## 5.3 Typography

Headings:
- Cormorant Garamond.

Body and interface:
- Inter.

Recommended sizes:

| Element | Size |
|---|---|
| Main page heading | 32px |
| Section heading | 24px |
| Card heading | 18px |
| Body text | 15–16px |
| Supporting text | 13px |
| Small labels | 11–12px |

Fonts should be locally hosted or loaded from a reliable source with appropriate fallback fonts.

## 5.4 Layout and Spacing

- Spacing scale: 4px increments.
- Main card radius: 12px.
- Input radius: 8px.
- Button radius: 8px.
- Minimum button height: 48px.
- Guest survey maximum width: 680px.
- Dashboard maximum width: 1440px.

## 5.5 Guest Interface Screens

### Screen 1: Welcome

Components:
- Hotel logo.
- Welcome heading.
- Short description.
- Estimated completion time.
- Language selector.
- Primary start button.

### Screen 2: Survey

Components:
- Progress indicator.
- Question heading.
- Question description.
- Rating or input control.
- Back button.
- Continue button.

### Screen 3: Written Feedback

Components:
- Optional feedback textarea.
- Clear indication that the question is optional.
- Continue button.

### Screen 4: Thank You

Components:
- Confirmation icon.
- Thank-you heading.
- Appreciation message.
- Hotel branding.

## 5.6 Management Interface

The management interface should be desktop-friendly and information-oriented.

Navigation:

1. Overview.
2. Survey Responses.
3. Analytics.
4. Rooms & QR Codes.
5. Settings.

The initial release may use LimeSurvey's native administration interface.

A custom management frontend is not required for the MVP.

## 5.7 Responsive Design

Mobile-first implementation is mandatory.

Guest interface:
- Full-width mobile layout.
- Large touch targets.
- Readable text.
- Minimal navigation.
- No horizontal scrolling.

Management interface:
- Desktop sidebar.
- Responsive cards.
- Responsive charts.
- Scrollable tables or card-based layouts on smaller screens.

---

# 6. Technical Architecture

## 6.1 Recommended Technology Stack

| Component | Technology |
|---|---|
| Survey engine | LimeSurvey CE |
| Survey customization | LimeSurvey child theme |
| Database | MariaDB |
| Web server | Nginx |
| Deployment | Docker Compose |
| Infrastructure | VPS |
| QR generation | QR-code generation library |
| API integration | LimeSurvey RemoteControl 2 |
| Security | HTTPS and restricted administration access |

## 6.2 Architecture Principles

- Use LimeSurvey as the survey engine.
- Avoid rebuilding existing survey functionality.
- Keep customization separate from LimeSurvey core.
- Avoid microservices.
- Avoid unnecessary backend development.
- Use the built-in administration interface initially.
- Introduce custom components only when justified by actual requirements.

## 6.3 Application Architecture

Guest:

QR Code → Guest Survey → LimeSurvey → MariaDB

Management:

Administrator → LimeSurvey Administration → Survey Reports

Future extension:

Custom Dashboard → LimeSurvey RemoteControl 2 API → Survey Data

## 6.4 Database Considerations

LimeSurvey manages its own survey and response data.

The room registry can be maintained through a lightweight custom module or a separate room mapping table.

Suggested room entity:

| Field | Type |
|---|---|
| id | Integer |
| room_number | String |
| qr_token_hash | String |
| is_active | Boolean |
| created_at | Timestamp |

Use secure token generation and store token hashes where practical.

Do not directly modify LimeSurvey core database tables.

---

# 7. Non-Functional Requirements

## 7.1 Performance

- Survey pages should load quickly on ordinary mobile connections.
- Keep images optimized.
- Avoid unnecessary JavaScript.
- Minimize third-party dependencies.
- Optimize database queries and reports.

## 7.2 Reliability

- Configure automatic database backups.
- Monitor application availability.
- Provide a documented recovery procedure.
- Test backup restoration.
- Maintain secure update procedures.

## 7.3 Security

- HTTPS must be enabled.
- Administration access must require authentication.
- Use strong administrator passwords.
- Protect against automated spam submissions.
- Validate room tokens server-side.
- Restrict access to survey results.
- Keep application dependencies updated.

## 7.4 Privacy and GDPR

- Collect only necessary information.
- Keep surveys anonymous by default.
- Do not collect names or email addresses without a clear reason.
- Establish data retention and deletion policies.
- Provide appropriate privacy information.
- Restrict access to guest comments.
- Review GDPR requirements before production deployment.

---

# 8. Development Roadmap

## Milestone 1: Infrastructure

Tasks:
- Set up VPS.
- Install Docker and Docker Compose.
- Deploy LimeSurvey CE.
- Deploy MariaDB.
- Configure Nginx.
- Configure domain and HTTPS.
- Secure administrator access.

Deliverable: Operational LimeSurvey installation.

## Milestone 2: Design and Survey

Tasks:
- Create hotel-classic child theme.
- Configure color palette.
- Configure typography.
- Customize survey screens.
- Create guest questionnaire.
- Configure German and English translations.
- Test mobile responsiveness.

Deliverable: Branded guest survey.

## Milestone 3: QR-Code Management

Tasks:
- Create room registry.
- Implement unique room tokens.
- Generate QR codes.
- Configure token validation.
- Capture room identifiers.
- Test room-specific survey submissions.

Deliverable: Functional room-specific QR-code system.

## Milestone 4: Management and Reporting

Tasks:
- Configure survey reporting.
- Configure satisfaction metrics.
- Configure date filtering.
- Configure room filtering.
- Configure response exports.
- Test analytics calculations.

Deliverable: Functional management reporting.

## Milestone 5: Quality Assurance and Launch

Tasks:
- Test guest workflows.
- Test German and English.
- Test QR-code behavior.
- Test anonymous submissions.
- Test data integrity.
- Test mobile devices.
- Configure backups.
- Review privacy and security.

Deliverable: Production-ready MVP.

---

# 9. Acceptance Criteria

The MVP is considered complete when:

### Guest experience
- [ ] Guests can scan a room QR code.
- [ ] The correct room is identified.
- [ ] Guests can complete the survey without registration.
- [ ] German and English are supported.
- [ ] The survey works on mobile browsers.
- [ ] Required questions are validated.
- [ ] Optional questions can be skipped.
- [ ] Guests receive a confirmation after submission.

### QR-code management
- [ ] Every room has a unique QR token.
- [ ] QR codes can be generated and downloaded.
- [ ] Administrators can deactivate room tokens.
- [ ] Invalid tokens cannot be associated with a valid room.
- [ ] Room identifiers are correctly stored with responses.

### Management
- [ ] Administrators can log in securely.
- [ ] Total response counts are available.
- [ ] Average satisfaction is calculated correctly.
- [ ] NPS is calculated correctly.
- [ ] Category-level satisfaction is available.
- [ ] Written feedback can be reviewed.
- [ ] Date and room filtering work.
- [ ] Responses can be exported.

### Technical
- [ ] Application runs through Docker Compose.
- [ ] HTTPS is configured.
- [ ] Database backups are configured.
- [ ] Backup restoration has been tested.
- [ ] Customizations do not require modifying LimeSurvey core files.

---

# 10. Future Enhancements

These are explicitly outside MVP scope.

Potential future features:

1. AI-powered sentiment analysis.
2. Automatic complaint categorization.
3. Management notifications for negative feedback.
4. PMS integration.
5. Guest-specific post-checkout surveys.
6. Additional languages.
7. Custom analytics dashboard.
8. Department-level performance reporting.
9. Guest response rate tracking using occupancy data.
10. Automated monthly management reports.

Future development should be driven by actual hotel operational needs.

---

# 11. Final Product Strategy

The recommended development strategy is to leverage LimeSurvey rather than building an entirely new survey engine.

The first release should prioritize three things:

1. An elegant and effortless guest survey experience.
2. Reliable room-specific QR-code identification.
3. Simple and useful management reporting.

Avoid unnecessary complexity.

The objective is to deliver a maintainable, functional application that a single hotel can deploy and use in its daily operations.

**Final MVP definition:**

A hotel guest scans a QR code in their room, completes a short survey in German or English, and submits anonymous feedback. The hotel management can review the results, analyze guest satisfaction, identify problems, and export responses through a secure administration interface.
