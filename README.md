# RiftVault v1.32 — Complete App (Deck Builder + Mobile Navigation + Rune Gallery)

This is a **full release**, built directly from v1.31, not a development kit. All existing files (OCR scanner, local catalogue, price feeds, official rules updater, inventory, decks, thumbnails, and artwork verification) are included. The existing inventory storage key remains **`riftvault-local-v1`**. No ownership migration or inventory reset is performed.

## New in v1.32

### Add Cards to Deck (with Legend legality)
1. Open **My decks** → choose a deck → **+ Add Cards**. If the deck has no Legend, choose **Legend** as its section and add a Legend first.
2. The **Legal cards** tab (default) shows permitted cards for your Legend and selected deck section; **Owned cards** shows permitted cards with free copies in Bulk; **All cards** explains why other cards are not legal.
3. Choose the section (Legend, Champion, Main deck, Battlefields, Runes or Sideboard), quantity, and a card, then click **+ Add**. The decklist requirement updates **first**; your physical Bulk counts do not change.
4. If compatible physical copies are available in Bulk, RiftVault prompts you to choose exact set/collector printing, finish and quantity. Choose **Yes, assign** to move the selected physical copies into that deck, or **No, later** to leave them in Bulk. If only 2 copies exist and you added 3, at most 2 can be assigned and the third remains an unfilled requirement. If none are available, there is no prompt.
5. Each deck now shows **assigned / required** counts by section, including the chosen Legend, Champion and runes. Existing **Edit requirement → Remove** and quantity editing are preserved.

The builder checks ordinary card/rune domains against the Legend, Champion tag matching, Main Deck and Rune/Battlefield section types, three-copy shared name limits, Signature limits, Rune and Battlefield caps, sideboard cap and the app's selected Standard/2v2 ban data. Some unusual Legend abilities and special tournament rulings require manual review; a domain source that is missing may limit what you can add until catalogue data refreshes. Imported or previously saved requirements are not silently deleted by these checks.

### Mobile fixes
- **Android Back:** browser or Android system Back now navigates from artwork previews and modals to their previous screen, from deck detail to the Decks list, and between previously visited tabs. The camera is stopped when the app leaves the Scanner tab. Opening Home directly adds no fake extra history entries, and repeated redraws do not add history.
- **Rune artwork verification picker:** large galleries of linked Rune printings now scroll in a stable two-column mobile grid, with readable printing codes and non-collapsing image tiles. The v1.31 **Recommended artwork** matching the exact printed code still appears first.
- The v1.31 manual scanner, official bans, and printed artwork verification are unchanged.

### How to update an existing GitHub Pages installation
1. **First export Settings → Download JSON Backup** from the existing app on the actual phone/browser where your data lives. Save it outside the app. Installed PWA and regular Chrome may have different storage.
2. Unzip this archive and upload all contents to your GitHub repository **root**. Replace existing matching files; include both new files `features-v132.js` and `features-v132.css`. Keep the `.github/workflows/` and `scripts/` subfolders.
3. Commit and wait for GitHub Pages deployment. Close/reopen your installed RiftVault app or refresh the browser site so the new service worker `riftvault-shell-v1.32` is installed.
4. Confirm the inventory count and deck assignments before making edits. Check **My decks → + Add Cards**, the Rune artwork verification list, and Android Back. Restore your JSON backup if you accidentally opened a different storage context.

**Important:** RiftVault has no automatic desktop/phone inventory sync. JSON is the lossless backup/restore format; Excel is an export. The browser's own local storage holds your inventory.

**Testing:** v1.31's collector/artwork/official ban regressions and a v1.32 offline browser integration check passed (domain filtering, optional allocation, exact Bulk accounting, Back navigation, 17-row Rune gallery). Physical camera, installed Android PWA Back, and a live network catalogue/price refresh still require device testing.

---

# RiftVault v1.31 — Manual Set Entry, Current Ban List & Visual Rune Artwork Comparison
- **Visual Rune-art comparison:** The recommended exact-printing image is shown as a large card image; every other known Rune printing has a picture (when available) and code underneath. Selecting an alternative opens a side-by-side comparison of the recommended and selected images before confirmation, including on narrow phones. Missing artwork is labelled rather than replaced with a potentially incorrect regular Rune.


## Rune artwork recommendation and linked artwork choices (v1.31)

- In **Verify artwork**, a Rune card now presents **Recommended artwork** first, tied to its exact collector code (e.g. VEN-R03a). Unverified alternate art does not borrow ordinary Rune artwork.
- **Other linked artwork** displays the known regular and alternate-art printings of that *same Rune type* (e.g. all Mind Rune variants across sets). Each has its own code and set label.
- Tap a linked printing to preview its picture, then manually confirm if it matches your physical card. Missing alternate-art images trigger a printing-specific source verification before preview; an unverified image is not replaced with normal art.
- Confirming another printing's image affects only the **displayed image for your current exact card**. It does not transfer inventory, change collector code, foil status or deck allocations. User-chosen images remain labelled **User verified** and stay in JSON backups.
- Available choices depend on the current loaded card catalogue and internet access.

This package is a complete, GitHub Pages-ready build retaining the prior collection, scanning, deck, and artwork verification features.


## New in v1.31

### Manual collector entry
- Scanner manual entry now separates **Set** (Origins, Spiritforged, Unleashed, Vendetta, Radiance, Proving Grounds and discovered sets) from **Number** (e.g., `103`, `042a`, `R03a`, `301*`).
- The set selection persists for the next manual card; the full collector code is previewed, and exact-code lookup is used for adding cards.
- Multi-copy quantity, foil confirmation, the scan log and batch Undo remain available.

### Correct official bans (source: Riot Rules Hub, checked November 24, 2026)
- November 23, 2026 effective snapshot includes **22 Standard** and **22 2v2** entries.
- Format lists are independent: **Fight or Flight is Standard-only**, **Master Yi, Wuju Bladesman is 2v2-only**. The older app incorrectly treated all Standard bans as 2v2 bans.
- Added eight cards and two battlefields effective November 23, and fixed independent-format membership in both fallback data and live feed ingestion.
- Rejects a published JSON feed that predates the bundled November 23 snapshot instead of silently reverting the app to September. A stale or unavailable published feed is visibly called out.
- Parser now reads Standard and 2v2 separately and has offline regression tests.

### CRITICAL GitHub installation: enable scheduled updates
The existing GitHub repository currently has **only the Pages workflow**. It does **not** contain `.github/workflows/official-rules-refresh.yml`, even though the prior ZIP packages included that hidden folder. GitHub's web-based file upload may omit dot-folders or users may accidentally upload only visible files.

After uploading this ZIP:
1. Verify the repository's **main** branch has `.github/workflows/official-rules-refresh.yml` (the dot-folder `.github` must be included).
2. If the folder is missing, use GitHub's **Add file → Create new file** and enter the entire path `.github/workflows/official-rules-refresh.yml`, then paste the packaged file content and commit it.
3. Confirm `scripts/refresh_official.py` is present (normal upload).
4. In the GitHub **Actions** tab, select **Refresh official Riftbound rules and bans** and **Run workflow** once. Check that it succeeds and commits an updated `official-updates.json`. If GitHub Actions needs permissions enabled, allow actions with write access to the repository and rerun.
5. Confirm the published `official-updates.json` checked timestamp changes, then reload RiftVault and tap **Check updates**. This button only re-reads the published JSON; it cannot independently scrape Riot from the phone.

Scheduled workflow refreshes are best effort; GitHub may delay or skip runs. The app should never claim a stale or failed feed is current.

*The source tests run offline using fixtures based on Riot's current list; the updater must still be tested against Riot's live site through GitHub Actions after installation.*

---

## Prior features

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
