# RiftVault v1.30 — Manual Artwork Verification + Inventory Thumbnails

This package is a complete, GitHub Pages-ready build, based on v1.29.

## New features

- On an individual card preview, use **Verify artwork** to check or change artwork; unavailable exact Rune artwork automatically opens this verification panel.
- **Retry source lookup** checks an exact alternate-art Rune printing against the external provider. If not found, no regular-Rune fallback is shown.
- Preview a **direct HTTPS artwork URL** or select a **JPEG/PNG/WebP image** from your device, then choose **Yes, this is my artwork**.
- Manually chosen images are labelled **User verified**, distinct from **Source verified**. File selections are compressed locally into JPEG (not uploaded to a server).
- Manual selections are associated with the full collector code, including its `a` or `*` suffix. This changes the displayed picture only; card counts, foil finishes, prices, and deck assignments are unchanged.
- Manual artwork overrides are stored under `data.artworkOverrides` in the existing collection and included in JSON export/restore. They are local to that browser unless imported elsewhere. Back up regularly; saved images count toward local storage limits.
- In Inventory > Find cards you own, larger and **frameless** full-card thumbnails now occupy more of the row. Text stays single-line and truncates with ellipsis if screen space is too narrow.

## Installation

1. Export a JSON backup from the existing app.
2. Extract this ZIP and upload all included files and folders into the **root** of your GitHub Pages repository; preserve `.github/workflows/` and `scripts/`.
3. Commit changes and reload the published app after GitHub Pages deployment.
4. Verify with `VEN-R03a` on a phone or desktop with internet access.

## Notes

- The provider API and remote image hosting require internet connectivity. A manual confirmation is **not** proof of authenticity or provider-verified artwork.
- Enter URLs only from trusted sites. An HTTPS image URL must point to an image the site permits embedding; otherwise select a local file.
- File compression uses the browser's `createImageBitmap` and Canvas APIs and may be unavailable on older browsers.
- The rest of the app, including v1.28 deck safeguards and Rune gallery and v1.29 exact-Rune checks, remains unchanged.
