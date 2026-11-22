# Hebrew domain index: desktop height validation

## Scope

Only desktop vertical spacing in `css/domains-index-2027.css` changed.
Rules are restricted to `html[lang=he]` at widths of at least 761px.
No content, font sizes, icons, colors, links, column order, JavaScript,
generator output, service worker, or publishing configuration changed.
The challenge link's inline stylesheet is overridden through specificity,
so the generator does not need a parallel style change.

## Measured Chromium results

Measurements were taken after local fonts and eager images loaded.
Document height includes the viewport minimum; content bottom is the bottom
of `main`, including its footer and padding.

| Viewport | Before document / scroll | After document / scroll | After content bottom | Fifth row bottom | Continue bottom |
| --- | --- | --- | --- | --- | --- |
| 1366×768 | 932 / 164px | 768 / 0px | 717.69px | 580.69px | 668.69px |
| 1920×1080 | 1080 / 0px | 1080 / 0px | 780.41px | 643.41px | 731.41px |
| 1366×600 | 932 / 332px | 693 / 93px | 693.22px | 556.22px | 644.22px |
| 761×768 | 939 / 171px | 768 / 0px | 735.69px | 598.69px | 686.69px |

Both target desktop viewports show all ten cards and the entire continuation
link without scrolling. At 600px tall, ordinary scrolling remains available
instead of clipping content. Fonts and icon sizes are unchanged.

## Regression checks

- Ten cards; exactly two columns / five rows above 760px, ordered RTL.
- Single column at 760px and 390px, exact pre-change geometry preserved.
- Exact pre-change Arabic index and Hebrew internal-domain geometry preserved
  at all six viewports, including 760/761px and the short desktop.
- Content, links, text sizes, line heights and colors matched the baseline.
- No horizontal overflow or clipped index text in any viewport.
- Resizing the same page from 1080px to 600px and back changes and restores
  card padding without a reload.
- Hover transform and visible keyboard focus remain functional.
- Existing domain and course-language browser suites passed without errors.
- All 12 domain static tests passed, including generator reproducibility.
- Running app preview visually checked at 1366×768.

## Reproduction

```sh
# Before making a future spacing change, capture its comparison baseline:
DOMAIN_INDEX_BASELINE=1 node tests/domains-index-height-browser.cjs
# Then apply the change and run:
node tests/domains-index-height-browser.cjs
node --test tests/domains-2027.test.cjs
CHROME_BIN=/repl/tools/bin/chromium node tests/domains-2027-browser.cjs
CHROME_BIN=/repl/tools/bin/chromium node tests/course-language-browser.cjs
```

Set `CHROME_BIN` to the local Chromium executable where necessary.
The focused test can also run standalone without saved baseline files; in
that case it still checks layout, clipping, links, focus, hover and resize,
but exact pre-change geometry comparisons require the baseline.

Before/after screenshots for 1366×768, 1920×1080 and 390×844 and JSON metrics
are retained locally in the ignored directory
`generated-artifacts/domains-index-height/`. They are not committed or deployed.
No Push, publishing, new branch, or service-worker change was performed.
