# RiftArmoury v1.33.4 — Automatic Role Fix + Artwork in Edit Tags

**Complete upgrade package** for the RiftArmoury v1.33.3 GitHub Pages app. Upload all extracted files to the same repository folder containing `index.html`.

This version preserves your existing RiftArmoury logo, app icons, blue colour scheme, full card inventory, scanner, deck builder, Workshop, 27 strategic roles, and the original `riftvault-local-v1` local-storage key. It does **not** migrate cards to a new account or synchronize browsers/devices.

## What's changed

1. **Corrected automatic strategic-role data parsing.** Public Riot-gallery community exports store ability text in structured `text.plain` and `text.rich` fields. v1.33.3 only interpreted plain string fields, so many cards received no suggestions. This release reads the structured fields, plus supported flat card-text and errata fields. HTML-format fallback is converted to text before classification.
2. **Automatic suggestions appear after card data loads.** When the ability catalogue finishes loading, the open Edit Tags panel refreshes automatically. If you've already started changing roles or notes, the app **preserves those unsaved edits** and prompts you to save and reopen the editor to see the updated suggestions.
3. **Full card picture at the top of Edit Tags.** The card artwork, exact collector code and name appear above the role checkboxes in both Inventory → Card Details → Edit Tags and Deck Workshop → Edit Tags. Tap the artwork to open the existing full-screen viewer, including its zoom controls. Returning to the editor preserves unsaved selections and notes.
4. **Shared manual choices remain intact.** You can select multiple of the 27 roles; manual choices and legacy notes are preserved in your existing JSON inventory backup. Neither a catalogue refresh nor a card preview changes Bulk/deck ownership or quantities.
5. **Clearer missing-data status.** The editor distinguishes catalogue loading, no matching ability data, recognised suggestions and printed abilities with no reliable role match. Only the roles supported by the current rules-based patterns are suggested; context-dependent roles such as Synergy and Late Game still need manual judgement.

## How to upgrade from v1.33.3

1. Open the **old installed app containing your inventory**, go to **Settings & Backup → Download JSON**, and save the file somewhere outside the browser.
2. Download and extract this ZIP. Upload **all extracted files** directly to the root of the **same** GitHub repository you use for RiftArmoury; overwrite the old files, not inside an additional folder. Keep `roles-v1333.js` even though its internal version is now 1.33.4.
3. Commit and check that GitHub Pages deployment completed. Close and reopen the installed app if necessary. This release changes cache-busting URL versions and upgrades the app-shell service worker to `riftvault-shell-v1.33.4`.
4. Open **Inventory → select a card → Edit Tags** or **Deck Workshop → Edit Tags**. You should see the exact card artwork at the top. Allow a network connection for first-time ability downloads. Suggested roles populate when matching text is available; they may remain empty for some cards.
5. Verify your owned-card count, Bulk allocations and decklists. If the app opens as a separate browser context, restore from the JSON backup in that context instead of assuming the data synced automatically.

## Technical scope and limits

- The ability-text feed is fetched **by your browser** from publicly available community snapshots, not from a private inventory service. No physical inventory data is sent with these requests. Indexed ability text is cached locally for up to seven days under `riftarmoury-role-text-v1334`.
- Automatic role detection is **rules-based matching**, **not generative AI**. A text match may not capture timing, conditions, interactions, or updated official rulings; it should not be considered a definitive strategic assessment.
- If a printing has ambiguous, missing, or conflicting ability data, the app avoids inventing roles. Manual tags remain possible and have priority.
- Automatic card-cost charts from v1.33.1 are unchanged. This release does not add new card-cost logic or AI deck generation.
- External catalogue availability and behaviour inside your installed Android app require real-device testing. This package was checked with synthetic card data and offline browser tests, not against an authenticated or continuously live external catalogue.
- Unofficial non-commercial Riftbound fan app. Card text and artwork belong to Riot Games, which does not endorse or sponsor RiftArmoury.

## Tests

- `python tests/test_v1334_role_fix.py` — new structured-text parsing, role refresh, exact card image, unsaved editor state, stock integrity
- `python tests/test_v1333_roles.py` — 27-role selections, shared Inventory/Workshop editor, legacy notes
- `python tests/test_v1332_card_preview.py` — full card viewer, Android Back and click behaviour
- `python tests/test_v1331_auto_costs.py` — Energy/Power curves and unknown-cost handling
- `python tests/test_v133_workshop.py` — Workshop, deck substitutions and checkpoints
- `python tests/test_v132_integration.py` — domain checks, deck assignment prompts, Rune gallery, Android navigation
- `python tests/test_official_parser_v131.py` — official updates parsing
- `node tests/test_v131_manual_and_bans.cjs`
- `node tests/test_exact_rune_art.cjs`
- `node tests/test_linked_rune_art_v131.cjs`

All ten offline automated test suites passed during packaging. Real-phone tests are still recommended after updating.
