# Brand: Kowsar Malekshahr Complex

Source: the operator's brand board (2026-11-05). It replaces the earlier development placeholder (Bagh-e Pardis / Paradise Garden Hotel).

| Item | Value |
|---|---|
| Name (Persian) | مجتمع کوثر ملکشهر |
| Name (English) | Kowsar Malekshahr Complex (transliteration chosen for the app; confirm the official spelling) |
| Classification | مجتمع گردشگری · Tourism complex |
| Location | ملکشهر، اصفهان · Malekshahr, Isfahan |
| Approach | تشریفاتی با فضاهای باز · Formal, with open spaces |
| Tagline (survey) | Your experience matters · تجربهٔ شما برای ما ارزشمند است |
| Photo | `app/img/kowsar-hero.jpg`, cropped from the brand board (546×336). Replace with a high-resolution original when available |
| Mark | Inline SVG: a pointed Persian arch over two wave lines (the lake). Defined in `app/js/app.js` (`mark`) and `views/subviews/hotel/icons.twig` (`mark`) |
| Contact | None yet |

## Palette

| Role | Name on the board | Hex | Token |
|---|---|---|---|
| Background | کرم روشن · Light cream | `#F4EBDD` | `--brand-cream` → `--color-bg` |
| Accent, selected states | شنی طلایی · Sand gold | `#C6A15B` | `--brand-gold` → `--color-accent` |
| Primary (actions, app chrome) | نیلی / لاجوردی · Indigo, lapis | `#214F72` | `--brand-lapis` → `--color-primary` |
| Deep variant (gradients) | آبی دریایی · Sea blue | `#214F68` | `--brand-sea` → `--color-primary-deep` |

Derived roles (text `#1B2A3A`, muted text, borders, success/warning/error) are in `limesurvey/themes/hotel-classic/css/tokens.css`, the only file with hex values.

**Swatch note.** The board's written hex codes are used, as its usage line says "لاجوردی #214F72 با شنی طلایی". The two blue swatches on the board render differently from their labels: indigo shows as about `#35335E` and sea blue as about `#3F568A`. If the swatches are what the designer meant, change `--brand-lapis` and `--brand-sea` in `tokens.css`; nothing else needs to change.

## Usage rules

- Lapis is the primary colour: buttons, app bar title, drawer header, selected fills, charts.
- Gold is for accents and selected states only (the mark, active tab, selected chip ring, progress, star ratings). Never body text on light backgrounds: it fails contrast (2:1 on cream). Gold on lapis is for large text and icons only (3.6:1).
- Cream text on lapis: 7.3:1. Body text on cream: 12.3:1. Muted text on cream: 5.1:1.
- Both names appear together in the drawer, the Home hero and the thank-you screen, the guest's language first. Each name carries its own `lang` and `dir`.
- Latin headings: Cormorant Garamond (formal). Persian headings and all body text: Vazirmatn (the board sets Persian titles in a bold sans). All fonts are self-hosted.

## Before launch

- Confirm the official English spelling (Kowsar / Kousar / Kosar) and get a logo file if one exists.
- Replace the hero photo with an original at 1600 px wide or more.
- Add contact details (reception phone, address) for the error page and the drawer.
