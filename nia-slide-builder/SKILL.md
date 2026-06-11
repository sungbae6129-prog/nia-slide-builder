---
name: nia-slide-builder
description: Create polished NIA-branded HTML presentation decks with a mandatory NIA CI and Nyanya cover, mandatory thank-you closing slide, Korean business typography rules, browser QA, PDF export, and PPTX export with editable native text.
---

# NIA Slide Builder

## Core Contract

Create professional NIA internal-report decks as fixed `1280px x 720px` HTML slides. Deliver both PDF and PPTX by default. PPTX output must preserve visible text as editable native PowerPoint text boxes.

Use a restrained NIA-blue visual system, infographic-first layouts, minimal tables, and clear executive-report hierarchy.

## Mandatory Deck Structure

Every deck must contain:

1. `slide-00.html`: conventional title cover.
2. The requested content slides.
3. The final numbered slide: closing slide with the exact main message `감사합니다.`

Cover and closing slides are additional. A request for 3 slides means 3 content slides and 5 total slides.

### Cover Rules

- Start from `assets/templates/nia-cover-slide.html`.
- Include exactly one official NIA CI marked `data-nia-ci`.
- Include exactly one Nyanya image marked `data-nyanya`.
- Keep title, subtitle, date, department, and presenter as editable DOM text.
- Default to `assets/nia-brand/nyanya-default.png`.
- Select a variation autonomously when the topic clearly matches its pose or emotion.

### Closing Rules

- Start from `assets/templates/nia-thank-you-slide.html`.
- Use the exact main message `감사합니다.`
- Include exactly one official NIA CI marked `data-nia-ci`.
- Place the CI horizontally centered near the bottom and mark it `data-ci-position="bottom-center"`.
- Default to `nyanya-variation-7.png` for the closing character.

## Brand Assets

Read `references/nia-brand-assets.md` before choosing a character. Use only the official bundled files under `assets/nia-brand/`; never ask the user to upload these assets again.

Preserve aspect ratio. Do not redraw, recolor, stretch, or obstruct the CI or Nyanya. All bundled Nyanya PNG files have transparent backgrounds and may be placed naturally on colored surfaces.

## Korean Typography

- Use Pretendard with Malgun Gothic fallback.
- Apply `word-break: keep-all` and sensible `overflow-wrap`.
- Preserve short semantic noun phrases and their attached particles on one line.
- Wrap the whole phrase plus particle: `<span class="keep-phrase">전체 순위를</span>`.
- Do not wrap only the noun and leave its particle behind.
- Define `.keep-phrase { white-space: nowrap; }`.
- Keep titles concise and body copy in short bullet-style phrases.

## Numeric Notation

- Display semantic negative values or decreases with `△`, never a minus sign.
- Example: `△1.068점`, `전년 대비 △3.2%`.
- Keep hyphens for ranges, dates, identifiers, code, and ordinary compound notation.

## Storyboard

Create `storyboard.md` before HTML unless explicitly skipped. Include:

- Audience and purpose
- Requested content slide count and total slide count
- Cover and closing Nyanya choices
- One message, chart/visual, and takeaway per content slide
- Data sources and assumptions

## Content Slide Rules

- Prefer charts, comparison bars, scorecards, process diagrams, and infographics.
- Emphasize NIA using a distinct NIA-blue accent.
- Show averages, medians, targets, or benchmarks as reference lines where relevant.
- Minimize tables and avoid dense paragraphs.
- Add a one-sentence `시사점` at the bottom of analytical slides when requested.
- Every visible text element must be real DOM text, not baked into a screenshot.

## Implementation

- Create one standalone HTML file per slide: `slide-00.html`, `slide-01.html`, and so on.
- Use a single `.slide` root sized `1280px x 720px`.
- Mark the first root `data-slide-role="cover"` and the final root `data-slide-role="closing"`.
- Embed final image assets as data URIs or copy them with the deliverable so links do not break.
- Keep decorative backgrounds behind editable text.

## Export

Run:

```powershell
node scripts/qa_html_slides.mjs <deck-folder> --screenshot-dir <qa-folder>
node scripts/export_html_slides.mjs <deck-folder> --out-dir <output-folder> --base-name <output-name>
```

The PPTX exporter uses a hybrid editable method: slide visuals become a background image and visible DOM text is recreated as native text boxes. Verify both visual fidelity and editability.

## QA Checklist

- First slide is a cover with exactly one NIA CI and one Nyanya.
- Last slide says `감사합니다.` and has exactly one bottom-centered NIA CI.
- No clipped, overflowing, or off-canvas elements.
- No broken assets or nearly blank slides.
- Korean phrases and particles wrap together.
- Semantic negative values use `△`.
- Requested facts, chart values, and ranks are correct.
- PDF and PPTX both open successfully.
- PPTX visible text remains editable.
