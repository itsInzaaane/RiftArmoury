# RiftArmoury v1.33.1 — Automatic Resource Curve (complete app)

This is the **full GitHub Pages-ready application**, based on RiftArmoury v1.33. It includes the entire inventory app, scanner, deck building, existing artwork and ban-list features, and the Deck Workshop. **The logo, icons, and blue theme are unchanged.** This is a focused maintenance update, not the future v1.34 AI deck generator.

## Fixed in v1.33.1

- **Automatic Energy and Power:** Deck Workshop looks up printed card costs using public Riftbound card catalogue metadata. There is **no need to key in costs** for cards with matching data. It initially checks the community-maintained Riot gallery snapshot (`Dystorted888/riftbound-card-data`), then falls back to the existing `slimtreble/Riftbound-card-data` catalogue. If the online sources are temporarily unavailable, locally cached cost metadata remains available.
- **Two resource charts:** The Workshop shows Energy and Power distributions separately, alongside known/unknown counts and averages. Both charts include **Main Deck + Chosen Champion**, excluding Sideboard cards. `0` is treated as a known zero, not missing data.
- **Better notes:** Printed costs display as auto-loaded values. Role and strategy notes remain editable. The old manual cost fields are now **optional fallback fields** shown only when automatic values are unavailable; saved v1.33 manual notes are retained.
- **Clear missing-data handling:** Costs that cannot be matched are labelled **Unknown**, not guessed or treated as zero. A **Refresh** button retries the public card-cost sources.
- **Preserved inventory:** The same `riftvault-local-v1` localStorage key and JSON backup format remain in use. The new cost cache is separate from ownership, stock allocation, deck requirements, and version history.

### Data sources and limitations

The printed costs come from publicly documented community JSON snapshots of Riot's card gallery. These are **printed Energy and Power costs**, not dynamic discounts or modifications caused by abilities during gameplay. Matching uses the collector code first and an unambiguous card name as a fallback. Rare catalogue gaps, special printings, variants, or newly released cards may remain Unknown. Source data can be incomplete or outdated, and this package's offline tests **do not verify the live network endpoints on your particular phone**.

Cost snapshots are downloaded automatically when online and cached locally for up to seven days. If a source cannot be contacted or a card has not been indexed, the app will show Unknown; the user can press **Refresh** in Deck Workshop. The app will not send your inventory or deck contents to the cost providers—it requests public card catalogue data only.

Source credit: <https://github.com/Dystorted888/riftbound-card-data> and <https://github.com/slimtreble/Riftbound-card-data>. Riftbound cards and graphics are © Riot Games. This is an unofficial non-commercial fan utility.

## Updating safely from v1.33

1. On your phone, open your existing **RiftArmoury** app and select **Settings & Backup → Download JSON**. Keep the downloaded backup outside the app.
2. Extract **RiftArmoury-v1.33.1-Automatic-Resource-Curve.zip**.
3. Upload **the contents** of the extracted folder into the root of your existing GitHub Pages repository, overwriting the old files. Do not upload the containing folder as a nested directory. Make sure the new **`costs-v1331.js`** file is uploaded alongside `app.js`, `features-v133.js`, and `index.html`.
4. Commit; check that GitHub Pages has deployed successfully. Close and reopen the installed app or refresh it to load the new `riftvault-shell-v1.33.1` service worker cache.
5. Open **My Decks → Deck Workshop**, select an existing deck, and confirm that **Energy cost** and **Power requirement** populate automatically. Internet access is needed for the initial public card-cost download. Tap **Refresh** if values remain Unknown.
6. Confirm the owned-card total and deck allocations remain unchanged.

**Data safety:** Updating the existing site in the **same browser/storage context** should preserve your inventory. Switching GitHub Pages domains, using a different browser, or uninstalling an installed PWA can expose a different storage context. Restore your JSON backup in that case. As before, desktop and phone inventories do not automatically sync.

## Testing

Tested with offline Chromium/Playwright fixtures and regression suites:

```
python tests/test_v1331_auto_costs.py
python tests/test_v133_workshop.py
python tests/test_v132_integration.py
python tests/test_official_parser_v131.py
node tests/test_v131_manual_and_bans.cjs
node tests/test_exact_rune_art.cjs
node tests/test_linked_rune_art_v131.cjs
```

Test coverage includes automatic matching by printed code, known zero and unknown costs, the separate Power curve, exclusion of Sideboard cards from the active-deck resource curve, source caching, optional legacy manual notes, resource UI, preserving the ownership key, legal swaps and inventory accounting. Real-world network availability and Android installed-PWA behaviour still require phone testing.
