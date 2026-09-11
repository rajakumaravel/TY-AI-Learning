# Phase 3a — Lab datasets and templates

**Status:** verified on Cloudflare Pages Preview. Production deferred (ADR-007).

Phase 3 (cohort schedule and weekly missions) was withdrawn on 2026-09-11: the programme is 20–30 hours and self-paced. This slice keeps the one cross-cutting need from it: no student is blocked by a missing camera, a blocked tool, or a blank template.

## What ships

`scripts/generate-datasets.mjs` (`npm run datasets`) deterministically writes `public/datasets/`, served as static files:

| Session | File | Contents |
| --- | --- | --- |
| b1lab | `chapter1-draw-cards.txt`, `.csv` | Two rounds of six objects for the pair fallback |
| b2s2 | `cup-bottle-training-v1.zip` | 40 drawn cup/bottle PNGs, mixed backgrounds |
| b2s3 | `cup-bottle-unseen-test.zip`, `test-log-template.csv` | 10 unseen images with `labels.csv`; log template |
| b2s4 | `confusion-matrix-template.csv` | Four cells plus the accuracy formula |
| b2s5 | `cup-bottle-shortcut-trap.zip` | Cups on dark, bottles on light for training; swapped in `test/` |
| b2s6 | `cup-bottle-training-v2.zip` | Both classes on both background types |

Images are 128×128 drawn shapes rendered by a pure-Node PNG encoder, not photographs, and every README says so. Real objects remain encouraged when a camera is available.

Any activity may declare `downloads: [{ label, file, note }]`; the session page renders a "Downloads for this session" list with the `download` attribute.

## Verification

- `npm run check`: 66 tests, build copies the datasets into `dist/datasets`.
- `npm run acceptance` on the branch preview: downloads listed on the Chapter 1 lab and served with HTTP 200.
- Visual check of sample images from each set.

## Not done

- The shortcut effect has been designed in, not yet confirmed inside Teachable Machine by a person. First real run should record v1 accuracy on `test/` in the Phase 2 lab evidence.
