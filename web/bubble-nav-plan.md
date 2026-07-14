# Bubble Navigation Site — Plan

## Overview

Build a new self-contained HTML/JS/CSS page (`web/index.html`) that reads the flat Excel file
(`web/UT Flat - Effective on 2026-07-06.xlsx`), builds a 5-level hierarchy (L10→L15→L17→L20→L30)
in memory, and presents it as an animated CSS bubble-navigation UI.

No frameworks. Vanilla JS + SheetJS (CDN) only — consistent with the existing `tree/` approach.
All files live in `web/`.

---

## Sub-Tasks

---

### Sub-Task 1 — Parse the Excel file and build the in-memory tree

**Intent**
Load the flat Excel file via SheetJS (same CDN library as the existing site), trim column header
whitespace, and convert the 673 flat rows into a nested tree object that the UI can traverse.

**Expected Outcomes**
- `loadData()` async function fetches and parses the xlsx file.
- Returns a root object shaped as:
  ```
  { name, level, children: [...] }
  ```
  where each node has `name` (string), `level` (10|15|17|20|30), `children` (array),
  and leaf nodes (L30) also carry `description` (string|null).
- Duplicate paths are deduplicated (flat file may repeat parent values across rows).
- Column headers are trimmed before lookup so trailing spaces don't cause silent failures.
- The tree root is a synthetic "root" node whose children are the distinct L10 values.

**Todo List**
1. Create `web/index.html` shell with SheetJS CDN script tag and a `<script src="app.js">` tag.
2. Create `web/app.js` with `loadData()`:
   - Fetch `./UT Flat - Effective on 2026-07-06.xlsx`
   - Parse with XLSX, get sheet "Flat UT"
   - Convert to array-of-objects with `XLSX.utils.sheet_to_json`
   - Trim all header keys
   - Walk each row, building the nested tree using a Map-based dedup strategy per level path
3. Expose the built tree as a module-level variable `treeRoot`.
4. Call `init()` after data loads to kick off the UI.

**Relevant Context**
- Existing parser pattern: `tree/tree.js` → `loadExcelData()` and `buildHierarchy()`
- Column names after trimming: `L10`, `L15`, `L17`, `L20`, `L30`, `L30 Description`
- SheetJS CDN: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`
- File must be served via HTTP (same constraint as existing site)

**Status:** [x] done

---

### Sub-Task 2 — HTML structure and CSS styling

**Intent**
Define the page layout and all CSS needed for the bubble rows, nav row, arrows, fade animations,
and detail panel. No layout logic in JS — JS only adds/removes classes and injects elements.

**Expected Outcomes**
- Page has an IBM-styled header (matching `tree/index.html` look: gradient accent bar, title).
- A `#nav-row` div holds the growing sequence of selected bubbles + arrows.
- A `#levels-area` div holds the current active row of sibling bubbles.
- A `#detail-panel` div is hidden by default; shown only when an L30 leaf is selected.
- Bubble colours per level:
  - L10: `#667eea` (purple — matches existing L15 root colour)
  - L15: `#2C4A52` (dark teal)
  - L17: `#52A6A6` (mid teal)
  - L20: `#D4B86A` (gold)
  - L30: `#A67C52` (warm brown — new terminal level)
- Selected/nav bubble uses the same level colour but with a white border ring to distinguish it.
- Faded siblings use `opacity: 0.25` with `pointer-events: none`.
- Arrow between nav bubbles: a simple CSS `›` character or SVG chevron, same colour as the
  level it follows.
- Animations use CSS transitions (300ms ease) — no JS animation libraries.
- Detail panel styled as a card with subtle shadow, visible only via `.visible` class toggle.

**Todo List**
1. Write the full `<style>` block (or linked `web/style.css`) covering:
   - Page layout, header, fonts
   - `.bubble` base styles (pill shape, padding, cursor, transition)
   - `.bubble--selected` (in nav row: smaller, bordered)
   - `.bubble--faded` (opacity 0.25, no pointer events)
   - `.nav-arrow` styles
   - `#levels-area` flex-wrap row
   - `#detail-panel` card (hidden/visible states)
2. Add IBM header markup to `index.html` matching the existing site's style.
3. Add `#nav-row`, `#levels-area`, `#detail-panel` placeholders to `index.html`.

**Relevant Context**
- Reference header/colour styles: `tree/index.html` lines 1–120 (CSS section)
- Existing level colours defined in `tree/tree.js` `levelColors` object
- Keep CSS in a separate `web/style.css` for cleanliness

**Status:** [x] done

---

### Sub-Task 3 — Interaction logic (JS state machine)

**Intent**
Implement the click-driven traversal in `web/app.js`: selecting a bubble animates it into the
nav row, reveals children, and clicking a nav bubble resets back to that level.

**Expected Outcomes**
- `state.path` tracks the array of selected nodes from root down to current level.
- `renderLevel(node)` renders the children of `node` as bubbles in `#levels-area`.
- Clicking an unselected bubble:
  1. Fades out sibling bubbles (add `.bubble--faded`).
  2. After a short delay, moves the selected bubble into `#nav-row` with an arrow.
  3. Calls `renderLevel(selectedNode)` to show the next level's children.
  4. If the selected node is L30 (leaf), shows `#detail-panel` with its description instead.
- Clicking a bubble already in `#nav-row`:
  1. Truncates `state.path` back to that node's depth.
  2. Removes all nav entries and arrows deeper than that node.
  3. Re-renders the sibling bubbles for that level (un-fades them, removes deeper rows).
  4. Hides `#detail-panel`.
- `init()` calls `renderLevel(treeRoot)` to show L10 bubbles on page load.

**Todo List**
1. Implement `state` object: `{ path: [] }`.
2. Implement `renderLevel(node)` — clears `#levels-area`, creates `.bubble` elements for each
   child, attaches click handlers.
3. Implement `selectBubble(node, bubbleEl)` — fade siblings, animate selected into nav row.
4. Implement `addToNavRow(node)` — create nav bubble + arrow element, append to `#nav-row`.
5. Implement `resetToDepth(depth)` — truncate path, remove nav entries past that depth,
   re-render siblings, hide detail panel.
6. Implement `showDetailPanel(node)` — populate and show `#detail-panel`.
7. Wire `init()` to call `renderLevel(treeRoot)` after data loads.

**Relevant Context**
- Existing click/navigation pattern in `tree/tree.js` → `handleNodeClick()`, `navigateToNode()`
- CSS transition timing should match the JS delay (300ms) for smooth hand-off
- L30 nodes have no children; check `node.children.length === 0` to detect leaf

**Status:** [x] done

---

### Sub-Task 4 — Integration test and polish

**Intent**
Verify the full end-to-end flow works in-browser, fix any edge cases, and ensure the page
is self-contained and ready to use.

**Expected Outcomes**
- Page loads correctly when served via a local HTTP server from the `web/` directory.
- All 5 levels navigate correctly without JS errors.
- Nav-row reset (clicking a previous bubble) works at every level.
- Detail panel shows correct description (or "No Information Available") for all L30 nodes.
- No visual regressions: header, colours, animations all look correct.
- The Excel file path reference in `app.js` is relative and works from `web/`.

**Todo List**
1. Review `app.js` and `index.html` for any hardcoded absolute paths.
2. Confirm column header trimming works (headers have trailing spaces in the xlsx).
3. Verify dedup logic handles the full 673-row file without duplicates in the tree.
4. Check that clicking every level of the nav row correctly resets state.
5. Confirm detail panel is hidden on reset and only appears at L30.
6. Add a small footer note (matching existing site) with last-updated date from the filename.

**Relevant Context**
- The existing site must be served via `python3 -m http.server` or equivalent — same applies here
- The `tree/` site can be used as a visual reference for header/footer style

**Status:** [x] done
