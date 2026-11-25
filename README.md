# RiftArmoury v1.33 — Complete app (Deck Workshop)

**This is the complete, GitHub Pages-ready application.** It is built on RiftVault v1.32 and includes the original camera/OCR scanner, set/card artwork, foil support, deck allocation, ban-list updater, JSON backups, prices, collection dashboard and Android navigation.

## What changed in v1.33

- **Name: RiftArmoury.** The browser title, sidebar name, installed app manifest, export filenames and visible app wording are renamed. **The original logo, icons, navy/blue theme, and CSS layout are deliberately preserved.** The original `riftvault-*.png` asset filename may still appear in the package to preserve references; the graphic itself is unchanged.
- **Deck Workshop.** Open **My Decks → Open Workshop**, the sidebar **Deck Workshop** (or **More** on mobile), or the **Deck Workshop** button inside a deck.
- **New deck workflow.** Tap **Start new deck** to create an empty deck. Select a Legend, then add cards using the v1.32 legal-card picker. A fully automated deck generator is planned for v1.34; this version does not silently generate a deck or claim it can.
- **Resource curve.** View the deck's Energy cost histogram for your **recorded** Energy values, plus the number of unrecorded costs. Power requirements are saved as notes. The current catalogue lacks consistently reliable printed cost and ability data; costs are therefore **manually entered** in this release and missing values are explicitly Unknown. The app never invents cost numbers.
- **Card roles and strategy notes.** Assign a role (draw, removal, early pressure, finisher, etc.), optional printed Energy and Power numbers, and a strategy note to any Main Deck, Champion or Sideboard entry. These annotations are stored in your JSON inventory backup, by card name.
- **Legal substitution finder.** Choose one Main Deck or Sideboard card to replace. Recommendations are limited to the same printed card type and checked against the selected Legend, deck section, copy limits, and current in-app bans by the v1.32 validator **after hypothetically removing one copy**. Sort prioritises matching manually recorded role, cards physically in Bulk, and similar manually recorded cost. The ranking is **rules-based, not generative AI**; unusual card text and special tournament exceptions still require manual verification.
- **Safe one-card swaps.** Review the source and replacement cards before changing one requirement. An allocated source copy is returned to Bulk when no longer required. If a free replacement copy exists in Bulk, the familiar **optional assignment prompt** appears; otherwise, the requirement stays missing. Inventory totals never increase automatically.
- **Deck version history.** Create manual checkpoints or automatically save previous requirement lists before edits. Review an older snapshot before restoring. On restore, compatible physical allocations are preserved where possible, and any excess allocations become free in Bulk; **no new ownership is created**. History stores up to 15 snapshots per deck and travels with the JSON backup.

## Updating an installed RiftVault v1.32 safely

1. Open the existing app in the phone/browser where your collection lives. Go to **Settings & Backup → Download JSON**. Save a backup outside the app.
2. Extract the ZIP. Upload **every file and folder from the extracted package**, including the new `features-v133.js` and `features-v133.css`, to the **root** of your existing GitHub Pages repository. Replace older versions; do **not** place all files inside a nested `riftarmoury-v133-full` folder. Keep `.github/workflows/` and `scripts/` if used for automatic rule updates.
3. Commit and confirm GitHub Pages deployment succeeded. Refresh or restart the installed app to load the new app-shell cache `riftvault-shell-v1.33`. On some Android installations, the launcher label is cached by the OS until the app shortcut is refreshed or reinstalled; **back up first** before attempting reinstall.
4. Confirm your existing total owned, Bulk, deck assignments and scanner still show the expected counts. Visit **My Decks → Open Workshop**.

**CRITICAL DATA COMPATIBILITY:** v1.33 intentionally continues to use browser localStorage key `riftvault-local-v1` and backup `type: "RiftVaultBackup"`, as well as the existing IndexedDB backup name. Renaming them would risk hiding your saved inventory or breaking older restore files. The app name changes; the storage identities **do not**. Reusing the original GitHub Pages URL and installed browser profile preserves the same origin. Changing repository/site URL or switching to a separate installed-browser context can make existing cards appear missing; use **Restore JSON** in the new context. There is still **no desktop–phone automatic sync**.

## Known limitations and next releases

- v1.33 delivers the **local Smart Deck foundation** only. **Automated collection-aware deck generation** is scoped for v1.34, **Deck Doctor** for v1.35, and the **optional online AI advisor** for v1.36. This package has no generative AI model or API connection.
- Recommendations cannot establish that a candidate is strategically better without reliable card ability text and completed annotations. Candidate scores use recorded role, printed type, availability and recorded Energy. They are transparent hints, not guaranteed win-rate or matchup predictions.
- Basic Constructed legality checks depend on available catalogue domains and the packaged/updated bans. Always verify tournament legality and current card errata through [official Riot rules](https://playriftbound.com/en-us/rules-hub/).
- Initial catalogue, pricing and OCR scripts need network access until cached. The app's main inventory stays on-device.
- Camera, Android system Back and installed PWA naming require real-device checks. Offline Chromium tests do not substitute for phone testing.

## Offline testing performed

From the folder with Python, Node.js, Playwright and Chromium:

```
node tests/test_exact_rune_art.cjs
node tests/test_linked_rune_art_v131.cjs
node tests/test_v131_manual_and_bans.cjs
python tests/test_official_parser_v131.py
python tests/test_v132_integration.py
python tests/test_v133_workshop.py
```

The v1.33 integration test exercises rebranding, the mobile Workshop layout, role/cost annotation, valid/incompatible substitutions, opt-in Bulk allocation, and deck requirement history/restore against synthetic offline cards without touching your real collection.

## Credits

RiftArmoury is an unofficial personal-use fan tool, not endorsed by Riot Games. Riftbound cards, artwork and trademarks belong to their owners. Existing third-party card data and Tesseract.js licensing remain as described in preceding releases.
