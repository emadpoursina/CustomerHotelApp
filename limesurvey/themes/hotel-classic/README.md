# hotel-classic — LimeSurvey child theme

Status: **skeleton only** (Milestone 2). Not yet a loadable LimeSurvey theme.

Mounted into the LimeSurvey container at `upload/themes/survey/hotel-classic` by `docker-compose.yml`.

## Before it can be selected in LimeSurvey

1. Add `config.xml` that declares this theme as a child of the stock theme chosen in `docs/decisions.md` (verify the LimeSurvey version's theme-extension syntax against the running install).
2. Add `survey.twig` / `startpage.twig` overrides only where the stock theme cannot be styled through CSS.
3. Add `css/theme.css` that imports `css/tokens.css`.

## Rules

- Do not edit files inside the LimeSurvey core image. All changes live here.
- Colours, type and spacing come from `css/tokens.css`. Do not hard-code hex values elsewhere.
- Mobile-first. Touch targets at least 48px. No horizontal scrolling.
- Guest interface: `--width-survey`. Management interface uses LimeSurvey's admin UI.
