# Design QA — mobile menu and suburb search

## Source visual truth

- Figma mobile closed: `/Users/matt/.codex/visualizations/2026/08/03/019fca00-f0f0-7d61-a496-4f6d82a2c978/brisbane-kerbside-menu/figma-mobile-closed-final.png`
- Figma mobile sheet open: `/Users/matt/.codex/visualizations/2026/08/03/019fca00-f0f0-7d61-a496-4f6d82a2c978/brisbane-kerbside-menu/figma-mobile-open-final.png`
- Figma desktop search: `/Users/matt/.codex/visualizations/2026/08/03/019fca00-f0f0-7d61-a496-4f6d82a2c978/brisbane-kerbside-menu/figma-desktop-search-final.png`

## Browser-rendered implementation evidence

- Mobile closed: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-implementation-mobile-closed-passed.png`
- Mobile sheet open: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-implementation-mobile-open-final.png`
- Desktop search: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-implementation-desktop-1800-polished.png`
- Closed comparison: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-qa-mobile-closed.png`
- Open comparison: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-qa-mobile-open.png`
- Desktop comparison: `/Users/matt/.codex/visualizations/2026/08/04/brisbane-kerbside-qa-desktop-search.png`

## Viewports and normalization

- Mobile CSS viewport: 390 × 844, device scale factor 1.
- Mobile open source and implementation pixels: 390 × 844.
- The in-app browser returned one neutral closed-state screenshot at 375 × 812 despite reporting a 390 × 844 inner viewport. For the closed comparison only, the 390 × 844 source was normalized to 375 × 812 before placing both images side by side. Findings caused solely by that capture scaling were ignored.
- Desktop source and implementation pixels/CSS viewport: 1800 × 900, device scale factor 1. No density normalization was required.

## States and interactions tested

- Mobile menu closed and open.
- Circular hamburger morphs into the X over a 320 ms transition.
- Escape closes the sheet and restores document scrolling.
- Sheet slides from the right, locks document scrolling, and exposes all 38 collection weeks in its own scroll area.
- Selecting 17 Aug 2026 from the sheet closes it and changes the selected map week to 17 Aug 2026.
- Mobile suburb search for `New` returns New Farm, Newstead, and Newmarket.
- Selecting New Farm navigates to `/suburbs/new-farm/`, whose heading and filter context both identify New Farm.
- Desktop search is visible while the mobile menu is hidden.
- Browser console checked after the interaction flow: no warnings or errors.

## Full-view comparison evidence

The three side-by-side comparisons were opened and reviewed together. The implementation preserves the approved two-column desktop structure, 390 px mobile composition, cream/dark-green/lime palette, circular menu control, right-hand sheet, search result hierarchy, and realistic collection data. The live Leaflet map uses its responsive fit bounds rather than the static crop in the Figma mock; this is intentional because the highlighted geometry changes with the selected week.

## Focused comparison evidence

No extra crop was needed: the 390 × 844 open-state comparison renders the menu/X control, search field, sheet edge, date rows, dividers, typography, and truncation at readable 1:1 size. The desktop comparison likewise leaves the search input and three result rows legible at their exact 1800 × 900 source size.

## Required fidelity surfaces

- Fonts and typography: the implementation keeps the existing production Georgia display face and Inter/system UI stack. This is a deliberate product constraint; the Figma substitute serif was used only because Georgia was unavailable in the design file. Hierarchy, two-line hero wrapping, weights, casing, and line heights match the approved direction.
- Spacing and layout rhythm: mobile map height, hero/search/list sequence, 48 px circular menu control, 36 px exposed backdrop edge, sheet width, desktop 42/58 split, search result clearance, borders, radii, and shadows were checked. No actionable spacing mismatch remains.
- Colors and visual tokens: existing production tokens `#182d27`, `#f4f1e8`, and `#e4ff68` are used consistently for controls, surfaces, active rows, and focus treatment. Contrast remains strong.
- Image quality and asset fidelity: the production Leaflet/OpenStreetMap/CARTO map remains live and sharp. Menu, close, and search icons come from the Material icon set through `react-icons`; no handcrafted SVG, text glyph, or placeholder asset is used.
- Copy and content: the sheet contains all 38 real collection weeks, search results show real suburb dates, and the home description now mentions suburb search.

## Comparison history

1. Initial desktop capture — blocked.
   - [P1] Search results overlapped the hero heading.
   - [P2] The desktop hero wrapped across three lines instead of the approved two.
   - Fixes: reserved vertical space while results are open, aligned desktop panel padding/search offsets to the Figma coordinates, and reduced the desktop display scale.
   - Post-fix evidence: `brisbane-kerbside-implementation-desktop-1800-polished.png`; results clear the hero and the heading uses two lines.
2. Initial mobile comparison — blocked.
   - [P2] The gap between the hero, search field, and list was taller than the approved mobile rhythm.
   - Fixes: reduced mobile intro bottom padding and tightened the search-to-list margin.
   - Post-fix evidence: `brisbane-kerbside-implementation-mobile-closed-passed.png`; the search and first collection row align closely with the approved state.
3. Final comparison — passed.
   - No actionable P0, P1, or P2 differences remain.

## Follow-up polish

- [P3] The X receives a visible lime keyboard focus ring in automated focused-state captures. This is intentionally retained for accessibility; neutral pointer use does not change the layout.

final result: passed
