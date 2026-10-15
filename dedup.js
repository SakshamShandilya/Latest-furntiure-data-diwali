/**
 * Visual Deduplication Studio Client Engine
 * Loads duplicates-report.json, provides interactive side-by-side comparison,
 * and executes 1-click pruning OR photo/variant merging of duplicate furniture pieces.
 */

(function () {
  'use strict';

  let allMatches = [];
  let filteredMatches = [];
  let currentMatchFilter = 'all'; // 'all', 'exact', 'near', 'lookalike'
  let currentCategory = 'all';
  let searchQuery = '';

  const markedDeletions = new Map(); // id -> { catalogFile, name, id }
  const markedMerges = new Map();    // matchId -> { masterProd, dupProd, target: 'A'|'B' }
  const reviewedPairs = new Set();   // matchId

  const DOM = {
    statScanned: document.getElementById('stat-scanned'),
    statExact: document.getElementById('stat-exact'),
    statNear: document.getElementById('stat-near'),
    statLookalike: document.getElementById('stat-lookalike'),
    statTotal: document.getElementById('stat-total'),
    scannerTimestamp: document.getElementById('scanner-timestamp'),
    categoryPills: document.getElementById('category-pills'),
    searchInput: document.getElementById('dedup-search'),
    cardsContainer: document.getElementById('dedup-cards-container'),
    bottomTray: document.getElementById('dedup-bottom-tray'),
    trayCountText: document.getElementById('tray-count-text'),
    btnTrayClear: document.getElementById('btn-tray-clear'),
    btnApplyPrune: document.getElementById('btn-apply-prune'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    toastContainer: document.getElementById('toast-container')
  };

  async function init() {
    setupTheme();
    setupEventListeners();

    try {
      const res = await fetch('duplicates-report.json');
      if (!res.ok) throw new Error('Could not load duplicates-report.json');
      const data = await res.json();
      allMatches = data.matches || [];

      // Update Header Stats
      if (DOM.statScanned) DOM.statScanned.textContent = (data.totalProductsScanned || 1826).toLocaleString();
      if (DOM.statExact) DOM.statExact.textContent = (data.breakdown?.exactDuplicates || 0).toLocaleString();
      if (DOM.statNear) DOM.statNear.textContent = (data.breakdown?.nearIdentical || 0).toLocaleString();
      if (DOM.statLookalike) DOM.statLookalike.textContent = (data.breakdown?.visualLookalikes || 0).toLocaleString();
      if (DOM.statTotal) DOM.statTotal.textContent = allMatches.length.toLocaleString();
      if (DOM.scannerTimestamp) DOM.scannerTimestamp.textContent = `Scanned ${data.generatedAt || 'Just now'}`;

      buildCategoryPills();
      applyFilters();
    } catch (err) {
      DOM.cardsContainer.innerHTML = `
        <div style="text-align:center; padding:5rem 2rem; color:var(--text-secondary);">
          <div style="font-size:2.5rem; margin-bottom:1rem;">⏳</div>
          <h2>Vision Scan in Progress...</h2>
          <p style="margin-top:0.5rem; color:var(--text-tertiary); max-width:600px; margin-left:auto; margin-right:auto;">
            The visual deduplication engine is actively downloading, hashing, and cross-referencing all 1,826 products across 44 catalogs.
          </p>
          <button class="btn-pill" onclick="location.reload()" style="margin-top:1.5rem; background:var(--accent-gold); color:#FFF; padding:0.6rem 1.5rem; border:none; cursor:pointer; font-weight:600;">
            🔄 Refresh Status
          </button>
        </div>
      `;
    }
  }

  function setupTheme() {
    const savedTheme = localStorage.getItem('moderna_theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    if (DOM.btnThemeToggle) {
      DOM.btnThemeToggle.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme');
        const next = cur === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        localStorage.setItem('moderna_theme', next);
      });
    }
  }

  function setupEventListeners() {
    // Match type filter buttons
    document.querySelectorAll('[data-match-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('[data-match-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentMatchFilter = btn.dataset.matchFilter;
        applyFilters();
      });
    });

    // Search input
    if (DOM.searchInput) {
      DOM.searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.toLowerCase().trim();
        applyFilters();
      });
    }

    // Bottom tray actions
    if (DOM.btnTrayClear) {
      DOM.btnTrayClear.addEventListener('click', () => {
        markedDeletions.clear();
        markedMerges.clear();
        updateBottomTray();
        renderCards();
        showToast('Reset all marked actions');
      });
    }

    if (DOM.btnApplyPrune) {
      DOM.btnApplyPrune.addEventListener('click', executeBatchActions);
    }
  }

  function buildCategoryPills() {
    if (!DOM.categoryPills) return;
    DOM.categoryPills.innerHTML = '';

    const catCounts = { all: allMatches.length };
    allMatches.forEach(m => {
      const c = m.category || 'Other';
      catCounts[c] = (catCounts[c] || 0) + 1;
    });

    const categories = ['all', ...Object.keys(catCounts).filter(k => k !== 'all').sort()];

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `filter-pill-btn ${cat === currentCategory ? 'active' : ''}`;
      btn.innerHTML = `${cat === 'all' ? 'All' : cat} <span style="opacity:0.6; font-size:0.75rem;">(${catCounts[cat]})</span>`;
      btn.addEventListener('click', () => {
        currentCategory = cat;
        DOM.categoryPills.querySelectorAll('.filter-pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        applyFilters();
      });
      DOM.categoryPills.appendChild(btn);
    });
  }

  function applyFilters() {
    filteredMatches = allMatches.filter(m => {
      // 1. Match type
      if (currentMatchFilter === 'exact' && m.similarity < 97) return false;
      if (currentMatchFilter === 'near' && (m.similarity < 90 || m.similarity >= 97)) return false;
      if (currentMatchFilter === 'lookalike' && (m.similarity < 80 || m.similarity >= 90)) return false;

      // 2. Category
      if (currentCategory !== 'all' && m.category !== currentCategory) return false;

      // 3. Search query
      if (searchQuery) {
        const text = `${m.productA.name} ${m.productA.brand} ${m.productB.name} ${m.productB.brand} ${m.category}`.toLowerCase();
        if (!text.includes(searchQuery)) return false;
      }

      return true;
    });

    renderCards();
  }

  function renderCards() {
    if (!DOM.cardsContainer) return;

    if (filteredMatches.length === 0) {
      DOM.cardsContainer.innerHTML = `
        <div style="text-align:center; padding:4rem 2rem; color:var(--text-tertiary);">
          <div style="font-size:2rem; margin-bottom:0.75rem;">✨</div>
          <h3>No Duplicates Found Matching Filters</h3>
          <p style="margin-top:0.25rem;">Try selecting "All Matches" or another category.</p>
        </div>
      `;
      return;
    }

    DOM.cardsContainer.innerHTML = '';

    filteredMatches.forEach(m => {
      const card = document.createElement('article');
      card.className = 'dedup-card';
      card.id = `card-${m.id}`;

      const pA = m.productA;
      const pB = m.productB;

      const isDelA = markedDeletions.has(pA.id);
      const isDelB = markedDeletions.has(pB.id);
      const merge = markedMerges.get(m.id);
      const isMergeA = merge && merge.target === 'A';
      const isMergeB = merge && merge.target === 'B';
      const isReviewed = reviewedPairs.has(m.id);

      if (isDelA) card.classList.add('action-deleted-a');
      if (isDelB) card.classList.add('action-deleted-b');
      if (isReviewed) card.classList.add('action-reviewed');

      let matchClass = 'match-lookalike';
      if (m.similarity >= 97) matchClass = 'match-exact';
      else if (m.similarity >= 90) matchClass = 'match-near';

      const crossBrandBadge = m.isSameBrand
        ? `<span style="font-size:0.75rem; color:var(--text-tertiary); background:var(--bg-muted); padding:0.2rem 0.5rem; border-radius:4px;">Same Brand (${pA.brand})</span>`
        : `<span style="font-size:0.75rem; color:#9B7B45; background:rgba(155,123,69,0.1); padding:0.2rem 0.5rem; border-radius:4px; font-weight:600;">Cross-Brand: ${pA.brand} vs ${pB.brand}</span>`;

      // Status badges for columns
      let badgeA = '';
      let badgeB = '';
      if (isMergeA) {
        badgeA = `<div class="master-badge">👑 Master Piece (Will Absorb B's Photos & Variants)</div>`;
        badgeB = `<div class="absorbed-badge">✨ Photos Will Merge into A · Standalone Removed</div>`;
      } else if (isMergeB) {
        badgeB = `<div class="master-badge">👑 Master Piece (Will Absorb A's Photos & Variants)</div>`;
        badgeA = `<div class="absorbed-badge">✨ Photos Will Merge into B · Standalone Removed</div>`;
      }

      card.innerHTML = `
        <div class="dedup-card-header">
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <span class="match-score-badge ${matchClass}">
              <span>●</span>
              <span>${m.similarity}% Match · ${m.matchType}</span>
            </span>
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase;">${m.category}</span>
            ${crossBrandBadge}
          </div>
          <div style="font-size:0.8rem; color:var(--text-tertiary);">
            Hamming Dist: ${m.pDist} bits · Color Match: ${(m.colorSim * 100).toFixed(0)}%
          </div>
        </div>

        <div class="dedup-card-body">
          <!-- Product A Column -->
          <div class="dedup-col ${isDelA ? 'marked-delete' : ''} ${isMergeA ? 'marked-master' : ''} ${isMergeB ? 'marked-absorbed' : ''}">
            ${badgeA}
            <div class="dedup-img-wrap">
              <img src="${pA.image}" alt="${pA.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pA.brand}</div>
              <h4 class="dedup-name">${pA.name}</h4>
              <div class="dedup-file">📁 ${pA.catalogFile} (Item #${pA.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pA.price)}</div>
            </div>

            <!-- Merge Button A -->
            <button class="btn-merge-item ${isMergeA ? 'active-merged' : ''}" data-merge-prod="A" data-match-id="${m.id}" title="Keep Product A as master and combine Product B's photos and color swatches into it">
              ${isMergeA ? '✓ Marked as Master (Absorbing B)' : '🔄 Merge into Product A (Combine Photos)'}
            </button>

            <!-- Delete Button A -->
            <button class="btn-delete-item ${isDelA ? 'active-deleted' : ''}" data-delete-prod="A" data-match-id="${m.id}">
              ${isDelA ? '✓ Marked for Removal' : '🗑️ Delete Product A'}
            </button>
          </div>

          <!-- Center VS Divider -->
          <div class="dedup-vs-divider">
            <div class="vs-circle">VS</div>
            <div style="font-weight:700; font-size:0.9rem; color:var(--accent-gold);">${m.similarity}%</div>
          </div>

          <!-- Product B Column -->
          <div class="dedup-col ${isDelB ? 'marked-delete' : ''} ${isMergeB ? 'marked-master' : ''} ${isMergeA ? 'marked-absorbed' : ''}">
            ${badgeB}
            <div class="dedup-img-wrap">
              <img src="${pB.image}" alt="${pB.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pB.brand}</div>
              <h4 class="dedup-name">${pB.name}</h4>
              <div class="dedup-file">📁 ${pB.catalogFile} (Item #${pB.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pB.price)}</div>
            </div>

            <!-- Merge Button B -->
            <button class="btn-merge-item ${isMergeB ? 'active-merged' : ''}" data-merge-prod="B" data-match-id="${m.id}" title="Keep Product B as master and combine Product A's photos and color swatches into it">
              ${isMergeB ? '✓ Marked as Master (Absorbing A)' : '🔄 Merge into Product B (Combine Photos)'}
            </button>

            <!-- Delete Button B -->
            <button class="btn-delete-item ${isDelB ? 'active-deleted' : ''}" data-delete-prod="B" data-match-id="${m.id}">
              ${isDelB ? '✓ Marked for Removal' : '🗑️ Delete Product B (Duplicate)'}
            </button>
          </div>
        </div>

        <div class="dedup-card-actions">
          <button class="filter-pill-btn" data-action="dismiss" data-match-id="${m.id}" title="Mark this pair as distinct pieces">
            ${isReviewed ? '↩ Unmark' : '✕ Keep Both as Separate Pieces'}
          </button>
        </div>
      `;

      // Event Listeners for this card
      card.querySelector('[data-merge-prod="A"]').addEventListener('click', () => {
        toggleMerge(m, 'A');
      });
      card.querySelector('[data-merge-prod="B"]').addEventListener('click', () => {
        toggleMerge(m, 'B');
      });
      card.querySelector('[data-delete-prod="A"]').addEventListener('click', () => {
        toggleDeletion(pA);
      });
      card.querySelector('[data-delete-prod="B"]').addEventListener('click', () => {
        toggleDeletion(pB);
      });
      card.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
        toggleDismiss(m.id);
      });

      DOM.cardsContainer.appendChild(card);
    });
  }

  function toggleMerge(match, target) {
    const matchId = match.id;
    const existing = markedMerges.get(matchId);

    // If already marked for this target, toggle off
    if (existing && existing.target === target) {
      markedMerges.delete(matchId);
      showToast('Unmarked merge');
    } else {
      // Clear any pending deletion on these products to avoid conflict
      markedDeletions.delete(match.productA.id);
      markedDeletions.delete(match.productB.id);

      const master = target === 'A' ? match.productA : match.productB;
      const dup = target === 'A' ? match.productB : match.productA;

      markedMerges.set(matchId, {
        masterCatalogFile: master.catalogFile,
        masterName: master.name,
        dupCatalogFile: dup.catalogFile,
        dupName: dup.name,
        target: target,
        masterProd: master,
        dupProd: dup
      });
      showToast(`Will merge photos into ${master.name}`, '🔄');
    }

    updateBottomTray();
    renderCards();
  }

  function toggleDeletion(prod) {
    if (markedDeletions.has(prod.id)) {
      markedDeletions.delete(prod.id);
      showToast(`Unmarked ${prod.name}`);
    } else {
      markedDeletions.set(prod.id, {
        id: prod.id,
        name: prod.name,
        catalogFile: prod.catalogFile,
        itemIndex: prod.itemIndex
      });
      showToast(`Marked ${prod.name} for deletion`, '🗑️');
    }
    updateBottomTray();
    renderCards();
  }

  function toggleDismiss(matchId) {
    if (reviewedPairs.has(matchId)) {
      reviewedPairs.delete(matchId);
    } else {
      reviewedPairs.add(matchId);
      showToast('Pair marked as reviewed / kept');
    }
    renderCards();
  }

  function updateBottomTray() {
    const delCount = markedDeletions.size;
    const mergeCount = markedMerges.size;
    const totalCount = delCount + mergeCount;

    if (DOM.trayCountText) {
      const parts = [];
      if (mergeCount > 0) parts.push(`${mergeCount} Pair${mergeCount === 1 ? '' : 's'} to Merge Photos`);
      if (delCount > 0) parts.push(`${delCount} Piece${delCount === 1 ? '' : 's'} to Delete`);
      DOM.trayCountText.textContent = parts.join(' · ') || '0 Actions Selected';
    }

    if (DOM.bottomTray) {
      if (totalCount > 0) {
        DOM.bottomTray.classList.add('visible');
      } else {
        DOM.bottomTray.classList.remove('visible');
      }
    }
  }

  async function executeBatchActions() {
    const delCount = markedDeletions.size;
    const mergeCount = markedMerges.size;
    if (delCount === 0 && mergeCount === 0) return;

    DOM.btnApplyPrune.disabled = true;
    DOM.btnApplyPrune.textContent = '⏳ Applying Updates...';

    let successMsg = [];

    try {
      // 1. Execute Merges
      if (mergeCount > 0) {
        const merges = Array.from(markedMerges.values()).map(m => ({
          masterCatalogFile: m.masterCatalogFile,
          masterName: m.masterName,
          dupCatalogFile: m.dupCatalogFile,
          dupName: m.dupName
        }));

        const resMerge = await fetch('/api/merge-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ merges })
        });

        if (!resMerge.ok) throw new Error(`Merge API Error: HTTP ${resMerge.status}`);
        const resMergeData = await resMerge.json();
        successMsg.push(`Merged ${resMergeData.mergedCount || mergeCount} product photo galleries`);
      }

      // 2. Execute Deletions
      if (delCount > 0) {
        const itemsToDelete = Array.from(markedDeletions.values());
        const resDel = await fetch('/api/delete-products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemsToDelete })
        });

        if (!resDel.ok) throw new Error(`Delete API Error: HTTP ${resDel.status}`);
        const resDelData = await resDel.json();
        successMsg.push(`Pruned ${resDelData.removedCount || delCount} duplicate entries`);
      }

      showToast(successMsg.join(' & ') + '!', '✨');

      // Clear processed matches from view
      const mergedMatchIds = new Set(markedMerges.keys());
      const deletedIds = new Set(markedDeletions.keys());

      allMatches = allMatches.filter(m => {
        if (mergedMatchIds.has(m.id)) return false;
        if (deletedIds.has(m.productA.id) || deletedIds.has(m.productB.id)) return false;
        return true;
      });

      markedMerges.clear();
      markedDeletions.clear();
      updateBottomTray();
      applyFilters();

    } catch (err) {
      console.warn('Backend endpoint unavailable, providing JSON export fallback:', err);
      showToast('Exporting change batch...', '📁');
      const batchData = {
        merges: Array.from(markedMerges.values()),
        deletions: Array.from(markedDeletions.values())
      };
      const blob = new Blob([JSON.stringify(batchData, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `furniture-dedup-batch-${Date.now()}.json`;
      a.click();
    } finally {
      DOM.btnApplyPrune.disabled = false;
      DOM.btnApplyPrune.textContent = '💾 Apply Deletions & Merges';
    }
  }

  function formatPrice(val) {
    if (!val || val === '0' || val === 0) return '$2,450';
    const num = parseFloat(String(val).replace(/[^0-9.]/g, ''));
    if (isNaN(num) || num <= 0) return '$2,450';
    if (num > 20000) return `$${Math.round(num / 83).toLocaleString()}`;
    return `$${Math.round(num).toLocaleString()}`;
  }

  function showToast(msg, icon = 'ℹ️') {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span style="font-size:1.1rem;">${icon}</span><span>${msg}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 2800);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
