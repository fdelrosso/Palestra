# App Poster Guide

A recipe for a printable poster that gets people to try a web or mobile app. It is built for a one-page A4 or Letter poster that people read from a few metres away and act on with their phone.

---

## 1. The layout

Split the page into two bands:

```
┌──────────────────────────────┐
│  DARK HERO (≈ 2/3 of page)   │
│  • logo + app name           │
│  • headline (2–3 lines)      │
│  • one-paragraph pitch       │
│  • visual motif              │
├──────────────────────────────┤
│  LIGHT CALL-TO-ACTION BAND   │
│  • "scan to …" line + URL    │
│  • QR code                   │
│  • small print / disclaimer  │
└──────────────────────────────┘
```

- **Hero:** use the app's own dark background (or its strongest brand colour). It catches attention and matches what people see when they open the app.
- **CTA band:** keep it light. It saves ink and gives the QR code the high contrast it needs.
- **Sizes:** A4 is 794 × 1123 px and Letter is 816 × 1056 px (at 96 px/in). Design at these exact sizes.
- **Margins:** keep at least 40 px clear inside every edge, about 56 px for body text. Backgrounds can run to the edge.

## 2. The headline

The headline does most of the work. Rules:

- **Six words or fewer**, split over two or three lines, about 90–120 px in a condensed display font (Anton, Bebas Neue, Oswald, Archivo Black).
- **Say what the app changes, not what it is.** "Più statistica, meno azzardo" ("more statistics, less gambling") beats "Advanced football analytics".
- **Contrast pairs work well:** *More X, less Y.* · *Stop X. Start Y.* · *X with your heart, Y with your head.*
- **Highlight the payoff half** in the accent colour.
- Write it in the language of the people who will walk past the poster.
- Draft five to ten options and read each one aloud. Keep the one you'd remember an hour later.

## 3. The words

- **Take copy from the app itself:** its tagline, meta description, onboarding screens or translation files. It's already approved and accurate.
- **Pitch paragraph:** two to three lines, around 20 px. It answers *what do I get?*
- **Never invent numbers.** Use a real figure from the app ("10+ leagues", "data since 2014") or leave it out.
- **Small print:** age limits, "for information only", legal notes. At least 12 px (9 pt) and readable grey (no lighter than `#767676` on white).

## 4. A visual motif

Big empty dark space looks unfinished. Fill it with one simple graphic that shows **what the app does**, drawn as flat vector shapes in the brand colours:

| App type | Motif idea |
| --- | --- |
| Data / analytics | a stylised bar chart or distribution, split by a dashed "threshold" line |
| Fitness / health | a progress ring, step graph or streak calendar |
| Finance | a rising line chart or stacked coins drawn as bars |
| Social / chat | overlapping message bubbles or avatars |
| Maps / travel | a route line linking pins |
| Productivity | a checklist with ticked rows |

Keep it decorative: no axis numbers or fake data. Label it in a small monospace font if that helps it read ("UNDER / OVER", "START / GOAL").

## 5. Colour and type

- **Palette:** the app's background, one accent, and one neutral for the light band. That's it.
- **Fonts:** one display face for the headline and one sans-serif for body text, plus an optional monospace for small labels. Load them from Google Fonts.
- **Brand gradients on a light background:** go one or two shades **darker** than the app uses (for example Tailwind 600 instead of 400). Bright greens and cyans look washed out on white paper.
- **Gradient text:** `background: linear-gradient(...)`, `background-clip: text`, `-webkit-text-fill-color: transparent`, plus a solid `color` fallback.
- **Grayscale check:** the poster should still read when printed in black and white.

## 6. The QR code

This is where posters fail most often.

- **Use a static QR code that contains the real URL** (`https://yourapp.com`). Avoid "dynamic" codes from QR-generator websites. They encode the generator's short link and stop working when the plan or trial ends.
- **Check what it encodes:** scan it and confirm the URL shown is *yours* before printing.
- **Logo in the middle:** use error-correction level **Q or H**, and keep the logo under about 15% of the code's area. Remove the dots under the logo instead of drawing over them.
- **Size:** at least 2.5–3 cm printed (about 180–200 px on an A4 design), with a white quiet zone around it.
- **Contrast:** dark dots on white. Colour and gradient dots are fine if they're clearly darker than the background.
- **Style the dots to match the brand:** round dots, rounded corner squares and brand colours. Keep the three corner squares solid and easy to see.
- **Also print the URL in large type** next to the code, for people who'd rather type it.

## 7. Legal and tone

- If the app touches **gambling, alcohol, finance, health or anything 18+**, check local advertising rules first. Many countries restrict promotional language.
- Present the app as **information or a tool**, not a promise ("win", "guaranteed", "get rich").
- Include the disclaimer the app already shows in its footer.

## 8. Checklist before printing

- [ ] Headline is ≤ 6 words and readable from 3 m away
- [ ] Every number on the poster is real
- [ ] QR code is static, scanned on two different phones, and opens the right URL
- [ ] URL also printed in large type
- [ ] Nothing important within 40 px of the edge
- [ ] Small print is ≥ 12 px
- [ ] Reads in grayscale
- [ ] Exported as PDF at the exact page size (A4 / Letter), one page
- [ ] Test print on the actual printer, since colours shift

## 9. Asking Claude for one

Fill in the brackets and paste this:

> Make a printable **[A4 / Letter]** poster in **[language]** for my app **[name]** (**[url]**).
> It does: **[one sentence]**. Audience: **[who walks past the poster]**.
> Use the logo at **[path]** and the brand colours **[background]**, **[accent]** (and gradient **[from → to]** if any).
> Take copy from **[translation file / landing page / meta description]**.
> Layout: dark hero with a short contrast-pair headline, a one-paragraph pitch and a visual motif showing **[what the app does]**; light bottom band with "scan to …", the URL in large gradient text and a **static** QR code in the brand style with the logo in the centre.
> Include this disclaimer: **[text]**. Don't invent statistics.
