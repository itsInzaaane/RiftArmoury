# RiftArmoury v1.33.3 — Multi-role deck analysis and shared tags (complete app)

This is a **complete GitHub Pages replacement package** based on v1.33.2. It retains all existing inventory/scanner/deck functionality, blue styling, logo and app icons, and the original `riftvault-local-v1` storage key. Updating the same installed site/browser should preserve inventory; back up JSON first.

## Changes

- **27 roles in 5 groups.** `Finisher` is now `Late Game`; `Debuff` was added. Cards may have any combination of strategic roles.
- **One shared editor.** Edit Tags is available in Inventory → card details and in Deck Workshop. Edits are stored once by normalized card name in the original backed-up JSON state; all printings/copies of that name see them.
- **Automatic suggestions from printed rules text**, where public community catalogue metadata is accessible and sufficiently clear. The rules engine recognizes specific actions (such as drawing, damage, healing, movement, cost reduction), but **does not invent strategic roles when card text is missing or ambiguous**. It does not automatically assign contextual roles such as Synergy, Combo Payoff or Late Game on cost alone. These remain manually selectable until deck-context analysis is implemented.
- **Overrides and reset.** You can add and remove any suggested tags. Your selections take priority; reset returns to current suggestions. Former single-role annotations are treated as manual choices when first upgraded, including conversion from `Finisher` to `Late Game`. Existing freeform notes and fallback costs are preserved.
- **Card-role charts support multiple labels per copy**, and substitutions reward overlapping roles; the role totals can therefore exceed the deck size.
- **Homepage artwork slightly clearer.** A subtle reduction in dark overlay and increase in artwork mask opacity, desktop and mobile, without changing the logo/blue palette or home layout.
- **Card preview remains separate:** Tapping a card still opens full artwork. Edit Tags remains its own button.

## Automatic text data and limits

Printed ability text is retrieved from public, community-maintained card datasets when available, separately from the card-cost catalogue. It is cached for 7 days in `riftarmoury-role-text-v1333`, with no inventory or deck data sent to the provider. It tries the publicly available Riot-gallery community JSON export, then a community release with corrected rules text when available. These feeds are external and can fail; if they do, previously cached ability data or your manually assigned roles remain usable. A Refresh Suggestions control retries the feed. **A role suggestion is a best-effort pattern match, not AI, a ruling, or a proven strategic evaluation.** Ambiguous conditions are not guaranteed to be understood. Manual choices take precedence. The precise 27-role classification system is a preparatory step for a future intelligent deck engine, not a complete AI Deck Doctor yet.

## Upgrade steps

1. In your **existing** installed RiftArmoury app, select **Settings & Backup → Download JSON**. Save that backup somewhere outside the browser.
2. Extract this ZIP and upload **all contents**, not the containing folder, into the root of your existing GitHub Pages repository, replacing old files. Include new `roles-v1333.js` beside `index.html`.
3. Commit and wait for GitHub Pages deployment. Close/reopen your installed app to activate the `riftvault-shell-v1.33.3` service-worker cache.
4. Open **Inventory → select a card → Edit Tags** or **Deck Workshop → Edit Tags**, tick several roles, and Save. Check that both views display the same tags.
5. Open the **Home** page and verify the background card illustration is clearer but readable. Verify owned-card totals/decks unchanged.

This is an unofficial, non-commercial Riftbound fan utility. Card information and artwork are © Riot Games, not an endorsement.

## Tests

`python tests/test_v1333_roles.py` tests the new role system and UI. Earlier v1.33.2/1.33.1, v1.32, artwork and ban-list regression tests are included. Existing tests for the old *single-select* tag editor have been updated only where their expected UI explicitly changed.


### Verification performed

- `python tests/test_v1333_roles.py` — multi-role tagging, catalogue text suggestions, editor sync, old annotations, independent card preview, and physical inventory integrity
- `python tests/test_v1332_card_preview.py` — older preview controls and Android Back navigation
- `python tests/test_v1331_auto_costs.py` — resource curve values and unknown-cost handling
- `python tests/test_v133_workshop.py` — original Deck Workshop workflow
- `python tests/test_v132_integration.py` — Legend rules and Bulk allocation
- `python tests/test_official_parser_v131.py` — official-update parsing
- `node tests/test_v131_manual_and_bans.cjs`
- `node tests/test_exact_rune_art.cjs`
- `node tests/test_linked_rune_art_v131.cjs`

All listed offline tests passed. Live public catalogue availability and actual Android camera/PWA operation still require device testing.
