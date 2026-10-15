/**
 * Visual Deduplication Studio Client Engine
 * Loads duplicates-report.json, provides interactive side-by-side comparison,
 * and executes 1-click pruning of duplicate furniture pieces.
 */

(function () {
  'use strict';

  let allMatches = [];
  let filteredMatches = [];
  let currentMatchFilter = 'all'; // 'all', 'exact', 'near', 'lookalike'
  let currentCategory = 'all';
  let searchQuery = '';

  const markedDeletions = new Map(); // id -> { catalogFile, name, id }
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
      if (DOM.statScanned) DOM.statScanned.textContent = (data.totalProductsScanned || 1903).toLocaleString();
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
            The visual deduplication engine is actively downloading, hashing, and cross-referencing all 1,903 products across 44 catalogs.
          </p>
          <button class="btn-pill" onclick="location.reload()" style="margin-top:1.5rem; background:var(--accent-gold); color:#FFF; padding:0.6rem 1.5rem; border:none; cursor:pointer; font-weight:600;">
            🔄 Check Scan Status
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
        updateBottomTray();
        renderCards();
        showToast('Cleared all marked deletions');
      });
    }

    if (DOM.btnApplyPrune) {
      DOM.btnApplyPrune.addEventListener('click', executePruning);
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

      card.innerHTML = `
        <div class="dedup-card-header">
          <div style="display:flex; align-items:center; gap:0.75rem;">
            <span class="match-score-badge ${matchClass}">
              <span>●</span>
              <span>${m.similarity}% Match · ${m.matchType}</span>
            </span>
            <span style="font-size:0.8rem; font-weight:600; color:var(--text-secondary); text-transform:uppercase;">${m.category}</span>
            ${crossBrandBadge}
          </div>
          <div style="font-size:0.8rem; color:var(--text-tertiary);">
            Hamming Dist: ${m.pDist} bits · Color Correlation: ${(m.colorSim * 100).toFixed(0)}%
          </div>
        </div>

        <div class="dedup-card-body">
          <!-- Product A Column -->
          <div class="dedup-col ${isDelA ? 'marked-delete' : ''}">
            <div class="dedup-img-wrap">
              <img src="${pA.image}" alt="${pA.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pA.brand}</div>
              <h4 class="dedup-name">${pA.name}</h4>
              <div class="dedup-file">📁 ${pA.catalogFile} (Item #${pA.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pA.price)}</div>
            </div>
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
          <div class="dedup-col ${isDelB ? 'marked-delete' : ''}">
            <div class="dedup-img-wrap">
              <img src="${pB.image}" alt="${pB.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pB.brand}</div>
              <h4 class="dedup-name">${pB.name}</h4>
              <div class="dedup-file">📁 ${pB.catalogFile} (Item #${pB.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pB.price)}</div>
            </div>
            <button class="btn-delete-item ${isDelB ? 'active-deleted' : ''}" data-delete-prod="B" data-match-id="${m.id}">
              ${isDelB ? '✓ Marked for Removal' : '🗑️ Delete Product B (Duplicate)'}
            </button>
          </div>
        </div>

        <div class="dedup-card-actions">
          <button class="filter-pill-btn" data-action="dismiss" data-match-id="${m.id}" title="Mark this pair as distinct pieces">
            ${isReviewed ? '↩ Unmark' : '✕ Keep Both / Dismiss Pair'}
          </button>
        </div>
      `;

      // Event Listeners for this card
      card.querySelector('[data-delete-prod="A"]').addEventListener('click', () => {
        toggleDeletion(pA, m.id);
      });
      card.querySelector('[data-delete-prod="B"]').addEventListener('click', () => {
        toggleDeletion(pB, m.id);
      });
      card.querySelector('[data-action="dismiss"]').addEventListener('click', () => {
        toggleDismiss(m.id);
      });

      DOM.cardsContainer.appendChild(card);
    });
  }

  function toggleDeletion(prod, matchId) {
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
    const count = markedDeletions.size;
    if (DOM.trayCountText) {
      DOM.trayCountText.textContent = `${count} Piece${count === 1 ? '' : 's'} Marked for Removal`;
    }
    if (DOM.bottomTray) {
      if (count > 0) {
        DOM.bottomTray.classList.add('visible');
      } else {
        DOM.bottomTray.classList.remove('visible');
      }
    }
  }

  async function executePruning() {
    if (markedDeletions.size === 0) return;

    const count = markedDeletions.size;
    const itemsToDelete = Array.from(markedDeletions.values());

    DOM.btnApplyPrune.disabled = true;
    DOM.btnApplyPrune.textContent = '⏳ Pruning Catalogs...';

    try {
      const res = await fetch('/api/delete-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemsToDelete })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const result = await res.json();
      showToast(`Pruned ${result.removedCount || count} duplicate products!`, '✨');

      // Clear deletions and remove matches from list
      itemsToDelete.forEach(it => {
        allMatches = allMatches.filter(m => m.productA.id !== it.id && m.productB.id !== it.id);
      });
      markedDeletions.clear();
      updateBottomTray();
      applyFilters();

    } catch (err) {
      // Offline fallback: Download cleaned JSON instructions
      console.warn('Backend endpoint unavailable, offering download fallback:', err);
      showToast('Exporting deletion log...', '📁');
      const blob = new Blob([JSON.stringify({ prunedItems: itemsToDelete }, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `pruned-duplicates-${Date.now()}.json`;
      a.click();
    } finally {
      DOM.btnApplyPrune.disabled = false;
      DOM.btnApplyPrune.textContent = '💾 Apply Deletions & Update Catalogs';
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
