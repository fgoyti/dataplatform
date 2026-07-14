// ─── State ────────────────────────────────────────────────────────────────────
// path = array of selected node objects, one per level chosen so far
const state = { path: [] };

// Flat list of L30 leaf nodes, each with an `ancestors` array built during tree construction
let l30Leaves = [];

// ─── Data loading & tree building ─────────────────────────────────────────────
async function loadData() {
    try {
        const response = await fetch('UT Flat - Effective on 2026-07-06.xlsx');
        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const sheet = workbook.Sheets['Flat UT'];
        const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, defval: null });

        // Trim all header keys (they have trailing spaces in the xlsx)
        const cleaned = rows.map(row => {
            const out = {};
            for (const key of Object.keys(row)) {
                out[key.trim()] = row[key];
            }
            return out;
        });

        return buildTree(cleaned);
    } catch (err) {
        showError('Failed to load data: ' + err.message);
        return null;
    }
}

/**
 * Convert flat rows into a nested tree.
 * Each node: { name, level, children[], description? }
 * A synthetic root node (level 0) wraps all distinct L10 values.
 */
function buildTree(rows) {
    const root = { name: 'root', level: 0, children: [] };

    // Use a Map keyed by full path string to deduplicate each level
    const maps = {
        10: new Map(), // key: L10
        15: new Map(), // key: L10|L15
        17: new Map(), // key: L10|L15|L17
        20: new Map(), // key: L10|L15|L17|L20
        30: new Map(), // key: L10|L15|L17|L20|L30
    };

    const LEVELS = ['L10', 'L15', 'L17', 'L20', 'L30'];
    const NUM    = [10,    15,    17,    20,    30];

    for (const row of rows) {
        // Build each node for this row, skipping rows with missing values
        const values = LEVELS.map(col => row[col]);
        if (values.some(v => !v)) continue; // skip incomplete rows

        for (let i = 0; i < LEVELS.length; i++) {
            const pathKey = values.slice(0, i + 1).join('|');
            if (!maps[NUM[i]].has(pathKey)) {
                const node = {
                    name: values[i],
                    level: NUM[i],
                    children: [],
                };
                if (i === 4) {
                    // L30 leaf — attach description and ancestor chain
                    node.description = row['L30 Description'] || null;
                    // ancestors[0..3] will be filled in once all parent nodes exist
                    node._pathValues = values; // [L10, L15, L17, L20, L30]
                }
                maps[NUM[i]].set(pathKey, node);

                // Attach to parent
                if (i === 0) {
                    root.children.push(node);
                } else {
                    const parentKey = values.slice(0, i).join('|');
                    const parent = maps[NUM[i - 1]].get(parentKey);
                    if (parent) parent.children.push(node);
                }
            }
        }
    }

    // Second pass: resolve ancestor node references for each L30 leaf
    for (const [pathKey, leaf] of maps[30]) {
        const vals = leaf._pathValues; // [L10, L15, L17, L20, L30]
        leaf.ancestors = [
            maps[10].get(vals[0]),
            maps[15].get(vals.slice(0,2).join('|')),
            maps[17].get(vals.slice(0,3).join('|')),
            maps[20].get(vals.slice(0,4).join('|')),
            leaf,
        ];
        l30Leaves.push(leaf);
    }

    return root;
}

// ─── Rendering ────────────────────────────────────────────────────────────────

/** Render the children of `node` as a bubble row in #levels-area. */
function renderLevel(node) {
    const area = document.getElementById('levels-area');
    area.innerHTML = '';

    if (!node.children || node.children.length === 0) return;

    const row = document.createElement('div');
    row.className = 'level-row';
    row.dataset.parentName = node.name;

    for (const child of node.children) {
        const bubble = document.createElement('button');
        bubble.className = 'bubble';
        bubble.dataset.level = child.level;
        bubble.textContent = child.name;
        bubble.addEventListener('click', () => onBubbleClick(child, bubble, row));
        row.appendChild(bubble);
    }

    area.appendChild(row);
}

/** Called when a bubble in the active levels area is clicked. */
function onBubbleClick(node, bubbleEl, rowEl) {
    // 1. Fade out all sibling bubbles
    const siblings = rowEl.querySelectorAll('.bubble');
    siblings.forEach(b => {
        if (b !== bubbleEl) b.classList.add('bubble--faded');
    });

    // 2. After fade, move the selected bubble into the nav row
    setTimeout(() => {
        addToNavRow(node, state.path.length);
        state.path.push(node);

        // 3. Show children or detail panel
        if (node.children && node.children.length > 0) {
            hideDetailPanel();
            renderLevel(node);
        } else {
            // Leaf (L30) — clear levels area and show detail panel
            document.getElementById('levels-area').innerHTML = '';
            showDetailPanel(node);
        }
    }, 300);
}

// ─── Nav row ──────────────────────────────────────────────────────────────────

/**
 * Append a nav bubble + arrow to #nav-row.
 * `depth` is the index in state.path this bubble will occupy.
 */
function addToNavRow(node, depth) {
    const navRow = document.getElementById('nav-row');

    // Arrow before every entry except the first
    if (depth > 0) {
        const arrow = document.createElement('span');
        arrow.className = 'nav-arrow';
        arrow.textContent = '›';
        arrow.dataset.depth = depth; // used for cleanup
        navRow.appendChild(arrow);
    }

    const bubble = document.createElement('button');
    bubble.className = 'bubble bubble--nav';
    bubble.dataset.level = node.level;
    bubble.dataset.depth = depth;
    bubble.textContent = node.name;
    bubble.addEventListener('click', () => resetToDepth(depth));
    navRow.appendChild(bubble);
}

/** Reset state back to the level represented by `depth` in the nav row.
 *  The clicked bubble and everything deeper is removed from the nav row,
 *  and the siblings for that level are re-shown in the levels area.
 */
function resetToDepth(depth) {
    const navRow = document.getElementById('nav-row');

    // Remove the clicked bubble and everything deeper (bubbles + arrows)
    const entries = navRow.querySelectorAll('[data-depth]');
    entries.forEach(el => {
        if (parseInt(el.dataset.depth) >= depth) el.remove();
    });

    // Truncate state path: keep only ancestors above `depth`
    // path[0..depth-1] are the selections above the clicked level
    state.path = state.path.slice(0, depth);

    // Re-render siblings: children of the node above the reset level,
    // or treeRoot's children if resetting all the way to L10
    const parentNode = depth === 0 ? treeRoot : state.path[depth - 1];
    hideDetailPanel();
    renderLevel(parentNode);
}

// ─── Detail panel ─────────────────────────────────────────────────────────────

function showDetailPanel(node) {
    const panel = document.getElementById('detail-panel');
    document.getElementById('detail-title').textContent = node.name;
    document.getElementById('detail-description').textContent =
        node.description || 'No Information Available';
    document.getElementById('levels-area').style.display = 'none';
    panel.classList.add('visible');
}

function hideDetailPanel() {
    const panel = document.getElementById('detail-panel');
    panel.classList.remove('visible');
    document.getElementById('levels-area').style.display = '';
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function showError(msg) {
    const area = document.getElementById('levels-area');
    area.innerHTML = `<span class="error">${msg}</span>`;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

let treeRoot = null;

async function init() {
    treeRoot = await loadData();
    if (!treeRoot) return;
    renderLevel(treeRoot);
    initSearch();
}

// ─── Search ───────────────────────────────────────────────────────────────────

function initSearch() {
    const input    = document.getElementById('l30-search');
    const dropdown = document.getElementById('search-dropdown');
    if (!input || !dropdown) return;

    input.addEventListener('input', () => {
        const q = input.value.trim().toLowerCase();
        if (q.length < 2) {
            closeDropdown(input, dropdown);
            return;
        }
        const matches = l30Leaves.filter(n => n.name.toLowerCase().includes(q));
        renderDropdown(matches, q, input, dropdown);
    });

    // Close on outside click
    document.addEventListener('mousedown', e => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            closeDropdown(input, dropdown);
        }
    });

    // Keyboard navigation
    input.addEventListener('keydown', e => {
        const items = dropdown.querySelectorAll('.search-option');
        const focused = dropdown.querySelector('.search-option.focused');
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (!focused) {
                items[0] && items[0].classList.add('focused');
            } else {
                const next = focused.nextElementSibling;
                if (next && next.classList.contains('search-option')) {
                    focused.classList.remove('focused');
                    next.classList.add('focused');
                }
            }
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (focused) {
                const prev = focused.previousElementSibling;
                focused.classList.remove('focused');
                if (prev && prev.classList.contains('search-option')) {
                    prev.classList.add('focused');
                }
            }
        } else if (e.key === 'Enter') {
            if (focused) {
                focused.click();
            }
        } else if (e.key === 'Escape') {
            closeDropdown(input, dropdown);
        }
    });
}

/** Highlight the query substring inside text, returning HTML string. */
function highlight(text, q) {
    const idx = text.toLowerCase().indexOf(q);
    if (idx === -1) return escapeHtml(text);
    return escapeHtml(text.slice(0, idx))
        + '<mark>' + escapeHtml(text.slice(idx, idx + q.length)) + '</mark>'
        + escapeHtml(text.slice(idx + q.length));
}

function escapeHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function renderDropdown(matches, q, input, dropdown) {
    dropdown.innerHTML = '';
    if (matches.length === 0) {
        dropdown.innerHTML = '<div class="search-no-results">No matches found</div>';
    } else {
        const MAX = 40;
        matches.slice(0, MAX).forEach(leaf => {
            const item = document.createElement('div');
            item.className = 'search-option';
            item.setAttribute('role', 'option');
            // Breadcrumb = L10 › L15 › L17 › L20
            const ancs = leaf.ancestors;
            const breadcrumb = [ancs[0].name, ancs[1].name, ancs[2].name, ancs[3].name].join(' › ');
            item.innerHTML = highlight(leaf.name, q)
                + `<span class="search-breadcrumb">${escapeHtml(breadcrumb)}</span>`;
            item.addEventListener('mousedown', e => {
                e.preventDefault(); // prevent input blur before click fires
                closeDropdown(input, dropdown);
                input.value = '';
                navigateToLeaf(leaf);
            });
            dropdown.appendChild(item);
        });
    }
    dropdown.classList.add('open');
    input.setAttribute('aria-expanded', 'true');
}

function closeDropdown(input, dropdown) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    input.setAttribute('aria-expanded', 'false');
}

/**
 * Simulate clicking through the hierarchy to land on `leaf`.
 * The leaf's `ancestors` array is [l10, l15, l17, l20, l30].
 * We reset to root then walk down, updating state and nav row.
 */
function navigateToLeaf(leaf) {
    // Reset to root (clear nav row, state, levels area, detail panel)
    const navRow = document.getElementById('nav-row');
    navRow.innerHTML = '';
    state.path = [];
    hideDetailPanel();

    const ancestors = leaf.ancestors; // [l10, l15, l17, l20, leaf]

    // Walk through each level except the last (which is the leaf itself)
    for (let i = 0; i < ancestors.length; i++) {
        const node = ancestors[i];
        addToNavRow(node, i);
        state.path.push(node);
    }

    // Show the detail panel for the leaf
    document.getElementById('levels-area').innerHTML = '';
    showDetailPanel(leaf);

    // Scroll the nav row into view
    navRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

window.addEventListener('DOMContentLoaded', init);
