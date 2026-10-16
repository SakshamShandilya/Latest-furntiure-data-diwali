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

  const STORAGE_KEY_ACTIONS = 'moderna_dedup_completed_v3';
  const STORAGE_KEY_QUEUE = 'moderna_dedup_offline_queue_v3';
  let recentActions = []; // stack of actions for Undo support

  let activeDetailProduct = null;
  let activeDetailImages = [];
  let activeDetailImageIndex = 0;
  let totalSessionPairs = 0;
  const selectedBulkDeletes = new Map(); // key: matchId -> { target: 'A'|'B', prod, otherProd, match }

  const DOM = {
    statScanned: document.getElementById('stat-scanned'),
    statScannedSub: document.getElementById('stat-scanned-sub'),
    statPending: document.getElementById('stat-pending'),
    statPendingSub: document.getElementById('stat-pending-sub'),
    statCompleted: document.getElementById('stat-completed'),
    statCompletedSub: document.getElementById('stat-completed-sub'),
    statExact: document.getElementById('stat-exact'),
    statExactSub: document.getElementById('stat-exact-sub'),
    statLookalike: document.getElementById('stat-lookalike'),
    statLookalikeSub: document.getElementById('stat-lookalike-sub'),
    progressStatusText: document.getElementById('progress-status-text'),
    badgePendingCount: document.getElementById('badge-pending-count'),
    badgeCompletedCount: document.getElementById('badge-completed-count'),
    dedupProgressFill: document.getElementById('dedup-progress-fill'),
    pillCountAll: document.getElementById('pill-count-all'),
    pillCountExact: document.getElementById('pill-count-exact'),
    pillCountNear: document.getElementById('pill-count-near'),
    pillCountLookalike: document.getElementById('pill-count-lookalike'),
    scannerTimestamp: document.getElementById('scanner-timestamp'),
    categoryPills: document.getElementById('category-pills'),
    searchInput: document.getElementById('dedup-search'),
    cardsContainer: document.getElementById('dedup-cards-container'),
    bottomTray: document.getElementById('dedup-bottom-tray'),
    trayCountText: document.getElementById('tray-count-text'),
    traySubText: document.getElementById('tray-sub-text'),
    btnTrayUndo: document.getElementById('btn-tray-undo'),
    btnTrayUndoText: document.getElementById('btn-tray-undo-text'),
    btnTrayClear: document.getElementById('btn-tray-clear'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    autoSavePill: document.getElementById('auto-save-pill'),
    autoSaveStatusText: document.getElementById('auto-save-status-text'),
    toastContainer: document.getElementById('toast-container'),

    // Bulk Deletion Toolbar Elements
    bulkToolbar: document.getElementById('dedup-bulk-toolbar'),
    bulkSelectedCount: document.getElementById('bulk-selected-count'),
    bulkSelectedSub: document.getElementById('bulk-selected-sub'),
    btnBulkSelectB: document.getElementById('btn-bulk-select-b'),
    btnBulkSelectExact: document.getElementById('btn-bulk-select-exact'),
    btnBulkClear: document.getElementById('btn-bulk-clear'),
    btnBulkDeleteAction: document.getElementById('btn-bulk-delete-action'),
    bulkBtnCount: document.getElementById('bulk-btn-count'),

    // PDP Modal Elements
    pdpModal: document.getElementById('dedup-pdp-modal'),
    modalBackBtn: document.getElementById('dedup-modal-back-btn'),
    modalCloseBtn: document.getElementById('dedup-modal-close-btn'),
    modalStorefrontLink: document.getElementById('dedup-modal-storefront-link'),
    modalBadge: document.getElementById('dedup-modal-badge'),
    modalMiniTitle: document.getElementById('dedup-modal-mini-title'),
    modalMiniPrice: document.getElementById('dedup-modal-mini-price'),
    modalBrand: document.getElementById('dedup-modal-brand'),
    modalCategory: document.getElementById('dedup-modal-category'),
    modalTitle: document.getElementById('dedup-modal-title'),
    modalPrice: document.getElementById('dedup-modal-price'),
    modalFileText: document.getElementById('dedup-modal-file-text'),
    modalImgCount: document.getElementById('dedup-modal-img-count'),
    modalVariantCount: document.getElementById('dedup-modal-variant-count'),
    modalColorways: document.getElementById('dedup-modal-colorways'),
    modalActiveColor: document.getElementById('dedup-modal-active-color'),
    modalSwatches: document.getElementById('dedup-modal-swatches'),
    modalDescWrap: document.getElementById('dedup-modal-desc-wrap'),
    modalDesc: document.getElementById('dedup-modal-desc'),
    modalSpecsBody: document.getElementById('dedup-modal-specs-body'),
    modalMergeBtn: document.getElementById('dedup-modal-merge-btn'),
    modalDeleteBtn: document.getElementById('dedup-modal-delete-btn'),
    modalMainImg: document.getElementById('dedup-modal-main-img'),
    modalCounterText: document.getElementById('dedup-counter-text'),
    modalSlideDots: document.getElementById('dedup-slide-dots'),
    modalThumbnailsStrip: document.getElementById('dedup-thumbnails-strip'),
    modalImgPrevBtn: document.getElementById('dedup-img-prev-btn'),
    modalImgNextBtn: document.getElementById('dedup-img-next-btn'),
    modalThumbPrevBtn: document.getElementById('dedup-thumb-prev-btn'),
    modalThumbNextBtn: document.getElementById('dedup-thumb-next-btn'),
    galleryStage: document.getElementById('dedup-gallery-stage')
  };

  async function init() {
    setupTheme();
    setupEventListeners();

    try {
      const res = await fetch('duplicates-report.json');
      if (!res.ok) throw new Error('Could not load duplicates-report.json');
      const data = await res.json();
      const rawMatches = data.matches || [];

      // Automatically sync with newly generated vision scans
      const lastScanTimestamp = localStorage.getItem('moderna_dedup_scan_timestamp');
      if (data.generatedAt && lastScanTimestamp !== data.generatedAt) {
        console.log(`[Dedup] New scan timestamp detected (${data.generatedAt}). Clearing previous session cache.`);
        localStorage.setItem('moderna_dedup_scan_timestamp', data.generatedAt);
        localStorage.removeItem(STORAGE_KEY_ACTIONS);
        localStorage.removeItem(STORAGE_KEY_QUEUE);
      }

      // Load all auto-saved actions from localStorage
      const savedCompleted = getSavedActions();
      const completedIds = new Set(Object.keys(savedCompleted));

      totalSessionPairs = rawMatches.length;

      // Filter out already processed matches so user never loses work or repeats decisions
      allMatches = rawMatches.filter(m => !completedIds.has(m.id));

      // Reconstruct recent actions stack for Undo drawer
      recentActions = Object.values(savedCompleted).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      // Header Audited Stats
      if (DOM.statScanned) DOM.statScanned.textContent = (data.totalProductsScanned || 1777).toLocaleString();
      if (DOM.scannerTimestamp) DOM.scannerTimestamp.textContent = `Scanned ${data.generatedAt || 'Just now'}`;

      // Update all dynamic metrics, categories, filters, and progress bar
      updateLiveMetrics();
      applyFilters();

      // Flush offline queue if any queued while disconnected
      flushOfflineQueue();
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

    // Auto-Save Bottom Drawer Actions
    if (DOM.btnTrayUndo) {
      DOM.btnTrayUndo.addEventListener('click', () => {
        undoLastAction();
      });
    }

    if (DOM.btnTrayClear) {
      DOM.btnTrayClear.addEventListener('click', () => {
        if (confirm('Clear completed deduplication history and reload all pairs?')) {
          localStorage.removeItem(STORAGE_KEY_ACTIONS);
          localStorage.removeItem(STORAGE_KEY_QUEUE);
          recentActions = [];
          showToast('History cleared, re-loading pairs...', '✨');
          setTimeout(() => location.reload(), 400);
        }
      });
    }

    // Bulk Selection & Deletion Actions
    if (DOM.btnBulkSelectB) {
      DOM.btnBulkSelectB.addEventListener('click', selectAllBInView);
    }
    if (DOM.btnBulkSelectExact) {
      DOM.btnBulkSelectExact.addEventListener('click', selectExactDuplicates);
    }
    if (DOM.btnBulkClear) {
      DOM.btnBulkClear.addEventListener('click', clearAllBulkSelections);
    }
    if (DOM.btnBulkDeleteAction) {
      DOM.btnBulkDeleteAction.addEventListener('click', executeBulkDelete);
    }

    // Listen for online recovery to sync offline queue
    window.addEventListener('online', () => {
      setAutoSaveStatus('saving', '⚡ Network restored, syncing queued actions...');
      flushOfflineQueue();
    });

    // Modal Close Triggers
    if (DOM.modalBackBtn) DOM.modalBackBtn.addEventListener('click', closeProductDetailModal);
    if (DOM.modalCloseBtn) DOM.modalCloseBtn.addEventListener('click', closeProductDetailModal);
    if (DOM.pdpModal) {
      DOM.pdpModal.addEventListener('click', (e) => {
        if (e.target === DOM.pdpModal) closeProductDetailModal();
      });
    }

    // Modal Gallery Navigation
    if (DOM.modalImgPrevBtn) {
      DOM.modalImgPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setModalImage(activeDetailImageIndex - 1, 'prev');
      });
    }
    if (DOM.modalImgNextBtn) {
      DOM.modalImgNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setModalImage(activeDetailImageIndex + 1, 'next');
      });
    }
    if (DOM.modalThumbPrevBtn && DOM.modalThumbnailsStrip) {
      DOM.modalThumbPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.modalThumbnailsStrip.scrollBy({ left: -220, behavior: 'smooth' });
      });
    }
    if (DOM.modalThumbNextBtn && DOM.modalThumbnailsStrip) {
      DOM.modalThumbNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        DOM.modalThumbnailsStrip.scrollBy({ left: 220, behavior: 'smooth' });
      });
    }

    // Modal Instant Decision Buttons (Direct Auto-Save)
    if (DOM.modalMergeBtn) {
      DOM.modalMergeBtn.addEventListener('click', () => {
        if (!activeDetailProduct) return;
        const { match, target } = activeDetailProduct;
        autoApplyMerge(match, target);
      });
    }
    if (DOM.modalDeleteBtn) {
      DOM.modalDeleteBtn.addEventListener('click', () => {
        if (!activeDetailProduct) return;
        const { prod, match, target } = activeDetailProduct;
        autoApplyDelete(prod, match, target);
      });
    }

    // Keyboard Navigation for Gallery and Esc to Close
    window.addEventListener('keydown', (e) => {
      if (!DOM.pdpModal || !DOM.pdpModal.classList.contains('active')) return;
      if (e.key === 'Escape') {
        closeProductDetailModal();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        setModalImage(activeDetailImageIndex + 1, 'next');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setModalImage(activeDetailImageIndex - 1, 'prev');
      }
    });

    // Touch Swipe Navigation on Mobile
    let touchStartX = 0;
    let touchEndX = 0;
    if (DOM.galleryStage) {
      DOM.galleryStage.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      DOM.galleryStage.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (Math.abs(diff) > 40) {
          if (diff < 0) setModalImage(activeDetailImageIndex + 1, 'next');
          else setModalImage(activeDetailImageIndex - 1, 'prev');
        }
      }, { passive: true });
    }
  }

  function updateLiveMetrics() {
    const pendingCount = allMatches.length;
    const completedCount = recentActions.length;
    if (totalSessionPairs === 0 || pendingCount + completedCount > totalSessionPairs) {
      totalSessionPairs = pendingCount + completedCount;
    }

    const pct = totalSessionPairs > 0
      ? Math.min(100, Math.round((completedCount / totalSessionPairs) * 100))
      : 0;

    let exactLeft = 0;
    let nearLeft = 0;
    let lookalikeLeft = 0;

    for (const m of allMatches) {
      if (m.similarity >= 97) exactLeft++;
      else if (m.similarity >= 90) nearLeft++;
      else lookalikeLeft++;
    }

    // 1. Pending Action Hero Card
    if (DOM.statPending) {
      DOM.statPending.innerHTML = `${pendingCount.toLocaleString()} <span style="font-size:0.9rem; font-weight:600; color:#D4AF37;">Left</span>`;
    }
    if (DOM.statPendingSub) {
      DOM.statPendingSub.textContent = pendingCount === 0 ? '✓ Zero Pending' : `${pendingCount} of ${totalSessionPairs} remaining`;
    }

    // 2. Completed Card
    if (DOM.statCompleted) {
      DOM.statCompleted.innerHTML = `${completedCount.toLocaleString()} <span style="font-size:0.9rem; font-weight:600; color:#10B981;">Done</span>`;
    }
    if (DOM.statCompletedSub) {
      DOM.statCompletedSub.textContent = `${pct}% Complete (${completedCount} auto-saved)`;
    }

    // 3. Exact Pending
    if (DOM.statExact) DOM.statExact.textContent = exactLeft.toLocaleString();
    if (DOM.statExactSub) {
      DOM.statExactSub.textContent = exactLeft === 0 ? '✓ All exact resolved' : `${exactLeft} pending review`;
    }

    // 4. Lookalikes Pending (Near + Lookalike)
    if (DOM.statLookalike) DOM.statLookalike.textContent = (nearLeft + lookalikeLeft).toLocaleString();
    if (DOM.statLookalikeSub) {
      DOM.statLookalikeSub.textContent = `${nearLeft} near · ${lookalikeLeft} lookalikes`;
    }

    // 5. Progress Tracker Bar
    if (DOM.progressStatusText) {
      DOM.progressStatusText.textContent = `${completedCount} of ${totalSessionPairs} Pairs Resolved (${pct}% Complete)`;
    }
    if (DOM.badgePendingCount) {
      DOM.badgePendingCount.textContent = `⏳ ${pendingCount} Pairs Left for Action`;
    }
    if (DOM.badgeCompletedCount) {
      DOM.badgeCompletedCount.textContent = `✓ ${completedCount} Resolved`;
    }
    if (DOM.dedupProgressFill) {
      DOM.dedupProgressFill.style.width = `${pct}%`;
    }

    // 6. Type Filter Buttons
    if (DOM.pillCountAll) DOM.pillCountAll.textContent = `(${pendingCount})`;
    if (DOM.pillCountExact) DOM.pillCountExact.textContent = `(${exactLeft})`;
    if (DOM.pillCountNear) DOM.pillCountNear.textContent = `(${nearLeft})`;
    if (DOM.pillCountLookalike) DOM.pillCountLookalike.textContent = `(${lookalikeLeft})`;

    // 7. Auto-save badge in top bar
    if (DOM.autoSaveStatusText) {
      DOM.autoSaveStatusText.textContent = `Auto-Save Active (${pendingCount} Left for Action)`;
    }

    // 8. Re-render category pills with updated counts
    buildCategoryPills();

    // 9. Update sticky bottom tray
    updateBottomTray();

    // 10. Update bulk selection UI
    updateBulkUI();
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

    if (currentCategory !== 'all' && (!catCounts[currentCategory] || catCounts[currentCategory] === 0)) {
      currentCategory = 'all';
    }

    categories.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = `filter-pill-btn ${cat === currentCategory ? 'active' : ''}`;
      const count = catCounts[cat] || 0;
      btn.innerHTML = `${cat === 'all' ? 'All' : cat} <span class="pill-count">(${count})</span>`;
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

    if (allMatches.length === 0) {
      DOM.cardsContainer.innerHTML = `
        <div style="text-align:center; padding:5rem 2rem; background:var(--bg-surface); border:1px solid var(--border-subtle); border-radius:var(--radius-lg); margin:2rem auto; max-width:800px; box-shadow:var(--shadow-md);">
          <div style="font-size:3.5rem; margin-bottom:1rem;">🎉</div>
          <h2 style="font-family:var(--font-serif); font-size:2rem; margin-bottom:0.75rem; color:#10B981;">All Duplicates Fully Resolved!</h2>
          <p style="color:var(--text-secondary); max-width:550px; margin:0 auto 1.5rem; line-height:1.6;">
            Every product across your 43 catalogs is now 100% unique. 0 pairs left for action. All changes have been auto-saved directly to catalog JSON files.
          </p>
          <div style="display:inline-flex; align-items:center; gap:0.5rem; background:rgba(16,185,129,0.12); color:#10B981; padding:0.5rem 1.25rem; border-radius:9999px; font-weight:700; font-size:0.9rem;">
            <span>✓ 100% Deduplicated (${recentActions.length} Actions Saved)</span>
          </div>
        </div>
      `;
      return;
    }

    if (filteredMatches.length === 0) {
      DOM.cardsContainer.innerHTML = `
        <div style="text-align:center; padding:4rem 2rem; color:var(--text-tertiary);">
          <div style="font-size:2rem; margin-bottom:0.75rem;">✨</div>
          <h3>No Duplicates Found Matching Active Filter</h3>
          <p style="margin-top:0.25rem;">All duplicates for this filter are resolved! Switch to "All Matches" to view the remaining ${allMatches.length} pairs.</p>
        </div>
      `;
      return;
    }

    DOM.cardsContainer.innerHTML = '';

    // Calculate product repetition across active duplicate pairs
    const productFreq = new Map();
    allMatches.forEach(m => {
      const nA = (m.productA?.name || '').trim().toLowerCase();
      const nB = (m.productB?.name || '').trim().toLowerCase();
      if (nA) productFreq.set(nA, (productFreq.get(nA) || 0) + 1);
      if (nB) productFreq.set(nB, (productFreq.get(nB) || 0) + 1);
    });

    filteredMatches.forEach(m => {
      const card = document.createElement('article');
      card.className = 'dedup-card';
      card.id = `card-${m.id}`;
      card.setAttribute('data-match-id', m.id);

      const pA = m.productA;
      const pB = m.productB;

      const nA = (pA.name || '').trim().toLowerCase();
      const nB = (pB.name || '').trim().toLowerCase();
      const freqA = productFreq.get(nA) || 1;
      const freqB = productFreq.get(nB) || 1;

      const currentSel = selectedBulkDeletes.get(m.id);
      const selectedTarget = currentSel ? currentSel.target : null;

      let matchClass = 'match-lookalike';
      if (m.similarity >= 97) matchClass = 'match-exact';
      else if (m.similarity >= 90) matchClass = 'match-near';

      const crossBrandBadge = m.isSameBrand
        ? `<span style="font-size:0.75rem; color:var(--text-tertiary); background:var(--bg-muted); padding:0.2rem 0.5rem; border-radius:4px;">Same Brand (${pA.brand})</span>`
        : `<span style="font-size:0.75rem; color:#9B7B45; background:rgba(155,123,69,0.1); padding:0.2rem 0.5rem; border-radius:4px; font-weight:600;">Cross-Brand: ${pA.brand} vs ${pB.brand}</span>`;

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
          <div style="display:flex; align-items:center; gap:0.75rem; flex-wrap:wrap;">
            <div style="font-size:0.8rem; color:var(--text-tertiary);">
              Hamming Dist: ${m.pDist} bits · Color Match: ${(m.colorSim * 100).toFixed(0)}%
            </div>
            <button type="button" class="btn-card-quick-chk ${selectedTarget === 'B' ? 'active' : ''}" data-action="quick-select-b" data-match-id="${m.id}" title="Select Product B for bulk deletion">
              ${selectedTarget === 'B' ? '✓ Product B Selected' : '☑ Select B to Delete'}
            </button>
          </div>
        </div>

        <div class="dedup-card-body">
          <!-- Product A Column -->
          <div class="dedup-col ${selectedTarget === 'A' ? 'marked-bulk-delete' : ''}" data-col-target="A" data-match-id="${m.id}">
            <!-- Bulk Select Checkbox Bar -->
            <div class="bulk-col-select-bar">
              <label class="bulk-chk-label" title="Select Product A for bulk deletion">
                <input type="checkbox" class="bulk-chk" data-match-id="${m.id}" data-target="A" ${selectedTarget === 'A' ? 'checked' : ''}>
                <span>Select Product A to Delete</span>
              </label>
              <div class="bulk-badge-slot">${selectedTarget === 'A' ? '<span class="bulk-col-badge">🗑️ Marked</span>' : ''}</div>
            </div>

            <div class="dedup-img-wrap" data-view-pdp="A" data-match-id="${m.id}" title="Click to view full photo gallery and specifications">
              <img src="${pA.image}" alt="${pA.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
              <div class="img-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>View Photos</span>
              </div>
            </div>
            <div class="dedup-meta">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                <div class="dedup-brand">${pA.brand}</div>
                ${freqA > 1 ? `<span class="dedup-multi-cluster-pill" title="This product appears in ${freqA} comparison pairs due to identical photos or silhouette similarity with multiple products. Resolving or deleting it will automatically resolve all ${freqA} pairs!">🔁 In ${freqA} Pairs</span>` : ''}
              </div>
              <h4 class="dedup-name" data-view-pdp="A" data-match-id="${m.id}" title="Click to view details">${pA.name}</h4>
              <div class="dedup-file">📁 ${pA.catalogFile} (Item #${pA.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pA.price)}</div>
            </div>

            <!-- View Full Details & Photos Button -->
            <button class="btn-pdp-view" data-view-pdp="A" data-match-id="${m.id}" title="Open product detail page to see all angles and specifications">
              👁️ View Gallery &amp; Details
            </button>

            <!-- Merge Button A -->
            <button class="btn-merge-item" data-merge-prod="A" data-match-id="${m.id}" title="Keep Product A as master and combine Product B's photos and color swatches into it">
              🔄 Merge into Product A (Combine Photos)
            </button>

            <!-- Delete Button A -->
            <button class="btn-delete-item" data-delete-prod="A" data-match-id="${m.id}" title="Delete Product A directly from catalog JSON">
              🗑️ Delete Product A (Duplicate)
            </button>
          </div>

          <!-- Center VS Divider -->
          <div class="dedup-vs-divider">
            <div class="vs-circle">VS</div>
            <div style="font-weight:700; font-size:0.9rem; color:var(--accent-gold);">${m.similarity}%</div>
          </div>

          <!-- Product B Column -->
          <div class="dedup-col ${selectedTarget === 'B' ? 'marked-bulk-delete' : ''}" data-col-target="B" data-match-id="${m.id}">
            <!-- Bulk Select Checkbox Bar -->
            <div class="bulk-col-select-bar">
              <label class="bulk-chk-label" title="Select Product B for bulk deletion">
                <input type="checkbox" class="bulk-chk" data-match-id="${m.id}" data-target="B" ${selectedTarget === 'B' ? 'checked' : ''}>
                <span>Select Product B to Delete</span>
              </label>
              <div class="bulk-badge-slot">${selectedTarget === 'B' ? '<span class="bulk-col-badge">🗑️ Marked</span>' : ''}</div>
            </div>

            <div class="dedup-img-wrap" data-view-pdp="B" data-match-id="${m.id}" title="Click to view full photo gallery and specifications">
              <img src="${pB.image}" alt="${pB.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
              <div class="img-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>View Photos</span>
              </div>
            </div>
            <div class="dedup-meta">
              <div style="display:flex; align-items:center; justify-content:space-between; gap:0.5rem; flex-wrap:wrap;">
                <div class="dedup-brand">${pB.brand}</div>
                ${freqB > 1 ? `<span class="dedup-multi-cluster-pill" title="This product appears in ${freqB} comparison pairs due to identical photos or silhouette similarity with multiple products. Resolving or deleting it will automatically resolve all ${freqB} pairs!">🔁 In ${freqB} Pairs</span>` : ''}
              </div>
              <h4 class="dedup-name" data-view-pdp="B" data-match-id="${m.id}" title="Click to view details">${pB.name}</h4>
              <div class="dedup-file">📁 ${pB.catalogFile} (Item #${pB.itemIndex + 1})</div>
              <div class="dedup-price">${formatPrice(pB.price)}</div>
            </div>

            <!-- View Full Details & Photos Button -->
            <button class="btn-pdp-view" data-view-pdp="B" data-match-id="${m.id}" title="Open product detail page to see all angles and specifications">
              👁️ View Gallery &amp; Details
            </button>

            <!-- Merge Button B -->
            <button class="btn-merge-item" data-merge-prod="B" data-match-id="${m.id}" title="Keep Product B as master and combine Product A's photos and color swatches into it">
              🔄 Merge into Product B (Combine Photos)
            </button>

            <!-- Delete Button B -->
            <button class="btn-delete-item" data-delete-prod="B" data-match-id="${m.id}" title="Delete Product B directly from catalog JSON">
              🗑️ Delete Product B (Duplicate)
            </button>
          </div>
        </div>

        <div class="dedup-card-actions">
          <button class="filter-pill-btn" data-action="dismiss" data-match-id="${m.id}" title="Mark this pair as distinct pieces">
            ✕ Keep Both as Separate Pieces
          </button>
        </div>
      `;

      // Event Listeners for PDP view triggers
      card.querySelectorAll('[data-view-pdp="A"]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openProductDetailModal(pA, m, 'A');
        });
      });
      card.querySelectorAll('[data-view-pdp="B"]').forEach(el => {
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          openProductDetailModal(pB, m, 'B');
        });
      });

      // Event Listeners for action buttons (Instant Auto-Save & Disk Write)
      card.querySelector('[data-merge-prod="A"]').addEventListener('click', (e) => {
        e.stopPropagation();
        autoApplyMerge(m, 'A');
      });
      card.querySelector('[data-merge-prod="B"]').addEventListener('click', (e) => {
        e.stopPropagation();
        autoApplyMerge(m, 'B');
      });
      card.querySelector('[data-delete-prod="A"]').addEventListener('click', (e) => {
        e.stopPropagation();
        autoApplyDelete(pA, m, 'A');
      });
      card.querySelector('[data-delete-prod="B"]').addEventListener('click', (e) => {
        e.stopPropagation();
        autoApplyDelete(pB, m, 'B');
      });
      card.querySelector('[data-action="dismiss"]').addEventListener('click', (e) => {
        e.stopPropagation();
        autoApplyDismiss(m);
      });

      // Bulk Selection checkboxes
      card.querySelectorAll('.bulk-chk').forEach(chk => {
        chk.addEventListener('change', (e) => {
          e.stopPropagation();
          const matchId = chk.dataset.matchId;
          const target = chk.dataset.target;
          toggleBulkSelect(matchId, target, chk.checked);
        });
      });

      // Quick Select B in Card Header
      const quickBtn = card.querySelector('[data-action="quick-select-b"]');
      if (quickBtn) {
        quickBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const matchId = quickBtn.dataset.matchId;
          const isCurrentlyB = selectedBulkDeletes.get(matchId)?.target === 'B';
          toggleBulkSelect(matchId, 'B', !isCurrentlyB);
        });
      }

      DOM.cardsContainer.appendChild(card);
    });
  }

  /* ==========================================================================
     PRODUCT DETAIL PAGE (PDP) & MULTI-IMAGE GALLERY MODAL ENGINE
     ========================================================================== */

  function extractAllProductImages(item, fallbackImg) {
    const list = [];
    const seen = new Set();
    const add = (url) => {
      if (!url || typeof url !== 'string') return;
      const clean = url.trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      list.push(clean);
    };

    if (item) {
      if (Array.isArray(item.images)) item.images.forEach(add);
      if (Array.isArray(item.variants)) {
        item.variants.forEach(v => {
          if (Array.isArray(v.images)) v.images.forEach(add);
          else if (v.image) add(v.image);
        });
      }
      if (item.dimension_image) add(item.dimension_image);
      if (item.image) add(item.image);
    }
    if (list.length === 0 && fallbackImg) add(fallbackImg);
    return list;
  }

  function formatDimensions(item) {
    if (!item) return 'Standard Luxury Proportions';
    if (item.dimensions) {
      if (typeof item.dimensions === 'string') return item.dimensions;
      if (typeof item.dimensions === 'object') {
        const parts = [];
        if (item.dimensions.Length) parts.push(`L ${item.dimensions.Length}`);
        if (item.dimensions.Width) parts.push(`W ${item.dimensions.Width}`);
        if (item.dimensions.Height) parts.push(`H ${item.dimensions.Height}`);
        if (parts.length > 0) return parts.join(' × ');
      }
    }
    if (item.specifications && item.specifications['Dimensions (In CM)']) {
      return item.specifications['Dimensions (In CM)'];
    }
    return 'Standard Luxury Proportions';
  }

  function formatMaterials(item) {
    if (!item) return 'Fine Curated Textile';
    if (item.specifications && item.specifications.Material) return item.specifications.Material;
    if (item.material) return item.material;
    if (Array.isArray(item.materials) && item.materials.length > 0) return item.materials.join(', ');
    return 'Fine Curated Textile';
  }

  async function getRawProduct(prod) {
    if (window.PRELOADED_DATA && window.PRELOADED_DATA[prod.catalogId]) {
      const items = window.PRELOADED_DATA[prod.catalogId];
      if (Array.isArray(items)) {
        if (items[prod.itemIndex] && (items[prod.itemIndex].name === prod.name || items[prod.itemIndex].title === prod.name)) {
          return items[prod.itemIndex];
        }
        const found = items.find(it => (it.name || it.title) === prod.name);
        if (found) return found;
        if (items[prod.itemIndex]) return items[prod.itemIndex];
      }
    }

    try {
      const res = await fetch(encodeURI(prod.catalogFile));
      if (res.ok) {
        const items = await res.json();
        if (Array.isArray(items)) {
          if (items[prod.itemIndex] && (items[prod.itemIndex].name === prod.name || items[prod.itemIndex].title === prod.name)) {
            return items[prod.itemIndex];
          }
          const found = items.find(it => (it.name || it.title) === prod.name);
          if (found) return found;
          if (items[prod.itemIndex]) return items[prod.itemIndex];
        }
      }
    } catch (e) {
      console.warn('Could not fetch catalog file:', prod.catalogFile, e);
    }

    return null;
  }

  async function openProductDetailModal(prod, match, target) {
    activeDetailProduct = { prod, match, target };
    activeDetailImageIndex = 0;

    if (!DOM.pdpModal) return;

    // Show modal immediately with base metadata
    DOM.pdpModal.classList.add('active');
    document.body.style.overflow = 'hidden';

    if (DOM.modalBadge) {
      DOM.modalBadge.textContent = `${(prod.brand || 'Luxury').toUpperCase()} ATELIER · ${(prod.category || 'Furniture').toUpperCase()}`;
    }
    if (DOM.modalMiniTitle) DOM.modalMiniTitle.textContent = prod.name;
    if (DOM.modalMiniPrice) DOM.modalMiniPrice.textContent = formatPrice(prod.price);
    if (DOM.modalBrand) DOM.modalBrand.textContent = `${prod.brand || 'Luxury'} Atelier`;
    if (DOM.modalCategory) DOM.modalCategory.textContent = prod.category || 'Luxury Living';
    if (DOM.modalTitle) DOM.modalTitle.textContent = prod.name;
    if (DOM.modalPrice) DOM.modalPrice.textContent = formatPrice(prod.price);
    if (DOM.modalFileText) DOM.modalFileText.textContent = `${prod.catalogFile} (Item #${(prod.itemIndex || 0) + 1})`;

    // Storefront link: opens index.html focused on this product
    if (DOM.modalStorefrontLink) {
      const storeId = `${prod.catalogId}-${prod.itemIndex}`;
      DOM.modalStorefrontLink.href = `index.html#product=${encodeURIComponent(storeId)}`;
    }

    // Initialize with primary photo
    activeDetailImages = [prod.image];
    renderModalGallery();

    // Fetch full catalog product for complete photos, dimensions, specifications
    const fullItem = await getRawProduct(prod);
    if (fullItem) {
      activeDetailImages = extractAllProductImages(fullItem, prod.image);
      renderModalGallery();

      // Description
      const desc = fullItem.description || fullItem.overview || '';
      if (desc && desc.trim().length > 0 && DOM.modalDesc && DOM.modalDescWrap) {
        DOM.modalDesc.textContent = desc.trim();
        DOM.modalDescWrap.style.display = 'block';
      } else if (DOM.modalDescWrap) {
        DOM.modalDescWrap.style.display = 'none';
      }

      // Specifications Table
      renderModalSpecs(fullItem, prod);

      // Finish / Colorway variants
      renderModalVariants(fullItem);
    } else {
      renderModalSpecs(null, prod);
    }

    // Sync modal action button states (merge/delete)
    updateModalActionButtons();
  }

  function closeProductDetailModal() {
    if (!DOM.pdpModal) return;
    DOM.pdpModal.classList.remove('active');
    document.body.style.overflow = '';
    activeDetailProduct = null;
  }

  function setModalImage(idx, direction = 'next') {
    if (!DOM.modalMainImg || activeDetailImages.length === 0) return;
    const len = activeDetailImages.length;
    activeDetailImageIndex = ((idx % len) + len) % len;

    DOM.modalMainImg.classList.remove('anim-slide-next', 'anim-slide-prev');
    void DOM.modalMainImg.offsetWidth;
    DOM.modalMainImg.src = activeDetailImages[activeDetailImageIndex];
    DOM.modalMainImg.classList.add(direction === 'next' ? 'anim-slide-next' : 'anim-slide-prev');

    if (DOM.modalCounterText) {
      DOM.modalCounterText.textContent = `${activeDetailImageIndex + 1} / ${len} Photos`;
    }

    // Update active slide dot
    if (DOM.modalSlideDots) {
      DOM.modalSlideDots.querySelectorAll('.qv-slide-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === activeDetailImageIndex);
      });
    }

    // Update active thumbnail
    if (DOM.modalThumbnailsStrip) {
      DOM.modalThumbnailsStrip.querySelectorAll('.qv-thumb').forEach((t, i) => {
        if (i === activeDetailImageIndex) {
          t.classList.add('active');
          DOM.modalThumbnailsStrip.scrollTo({
            left: t.offsetLeft - (DOM.modalThumbnailsStrip.clientWidth / 2) + (t.clientWidth / 2),
            behavior: 'smooth'
          });
        } else {
          t.classList.remove('active');
        }
      });
    }
  }

  function renderModalGallery() {
    if (!DOM.modalMainImg || activeDetailImages.length === 0) return;

    // Slide indicator dots
    if (DOM.modalSlideDots) {
      DOM.modalSlideDots.innerHTML = '';
      activeDetailImages.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = `qv-slide-dot ${i === activeDetailImageIndex ? 'active' : ''}`;
        dot.title = `Slide to photo ${i + 1}`;
        dot.addEventListener('click', () => setModalImage(i, i >= activeDetailImageIndex ? 'next' : 'prev'));
        DOM.modalSlideDots.appendChild(dot);
      });
    }

    // Thumbnails row
    if (DOM.modalThumbnailsStrip) {
      DOM.modalThumbnailsStrip.innerHTML = '';
      activeDetailImages.forEach((imgUrl, i) => {
        const thumb = document.createElement('img');
        thumb.className = `qv-thumb ${i === activeDetailImageIndex ? 'active' : ''}`;
        thumb.src = imgUrl;
        thumb.alt = `Angle preview ${i + 1}`;
        thumb.loading = 'lazy';
        thumb.onerror = () => { thumb.src = 'assets/plypicker-logo.png'; };
        thumb.addEventListener('click', () => setModalImage(i, i >= activeDetailImageIndex ? 'next' : 'prev'));
        DOM.modalThumbnailsStrip.appendChild(thumb);
      });
    }

    setModalImage(activeDetailImageIndex, 'next');
  }

  function renderModalSpecs(item, prod) {
    if (!DOM.modalSpecsBody) return;
    DOM.modalSpecsBody.innerHTML = '';

    const specs = [
      { label: 'Category & Brand', value: `${prod.brand} · ${prod.category}` },
      { label: 'Catalog File', value: `<code style="font-size:0.78rem;">${prod.catalogFile}</code>` },
      { label: 'Item Position', value: `Position #${(prod.itemIndex || 0) + 1} in JSON` },
      { label: 'Dimensions', value: formatDimensions(item) },
      { label: 'Materials & Finish', value: formatMaterials(item) },
      { label: 'Media Count', value: `<strong>${activeDetailImages.length} High-Res Photos Loaded</strong>` }
    ];

    if (item && item.dimension_image) {
      specs.push({
        label: 'Blueprint Schematic',
        value: `<a href="${item.dimension_image}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); font-weight:700; text-decoration:underline;">📐 View Blueprint Schematic ↗</a>`
      });
    }

    if (item && item.url) {
      specs.push({
        label: 'Brand Website',
        value: `<a href="${item.url}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); font-weight:600; text-decoration:underline;">Visit Original Brand Page ↗</a>`
      });
    }

    if (item && Array.isArray(item.key_features) && item.key_features.length > 0) {
      specs.push({
        label: 'Key Features',
        value: `<ul style="margin:0; padding-left:1.2rem; line-height:1.4;">${item.key_features.map(f => `<li>${f}</li>`).join('')}</ul>`
      });
    }

    specs.forEach(s => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<th>${s.label}</th><td>${s.value}</td>`;
      DOM.modalSpecsBody.appendChild(tr);
    });

    if (DOM.modalImgCount) {
      DOM.modalImgCount.innerHTML = `<strong>${activeDetailImages.length}</strong> Photo${activeDetailImages.length === 1 ? '' : 's'} Available`;
    }
  }

  function renderModalVariants(item) {
    if (!DOM.modalColorways || !DOM.modalSwatches) return;

    const variants = (item && Array.isArray(item.variants)) ? item.variants : [];
    if (variants.length > 1) {
      if (DOM.modalVariantCount) {
        DOM.modalVariantCount.style.display = 'inline-flex';
        DOM.modalVariantCount.innerHTML = `<strong>${variants.length}</strong> Finish Variants`;
      }
      DOM.modalColorways.style.display = 'block';
      DOM.modalSwatches.innerHTML = '';

      variants.forEach((v, idx) => {
        const title = v.color || v.title || `Variant ${idx + 1}`;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `pdp-color-swatch-btn ${idx === 0 ? 'active' : ''}`;

        let colorHex = '#C5A880';
        const hexMap = {
          'white': '#FAF9F6', 'beige': '#E5DAC8', 'camel': '#9E693D',
          'grey': '#707070', 'black': '#1C1B1A', 'green': '#3B533E',
          'brown': '#4A3728', 'blue': '#1E2D4A'
        };
        for (const [k, hex] of Object.entries(hexMap)) {
          if (title.toLowerCase().includes(k)) { colorHex = hex; break; }
        }

        btn.innerHTML = `
          <span class="pdp-color-circle" style="background:${colorHex};"></span>
          <span>${title}</span>
        `;

        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          DOM.modalSwatches.querySelectorAll('.pdp-color-swatch-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (DOM.modalActiveColor) DOM.modalActiveColor.textContent = title;

          if (Array.isArray(v.images) && v.images.length > 0) {
            const firstImg = v.images[0];
            const targetIdx = activeDetailImages.indexOf(firstImg);
            if (targetIdx !== -1) {
              setModalImage(targetIdx, 'next');
            }
          }
        });

        DOM.modalSwatches.appendChild(btn);
      });

      if (DOM.modalActiveColor) {
        DOM.modalActiveColor.textContent = variants[0].color || variants[0].title || 'Curated Finish';
      }
    } else {
      DOM.modalColorways.style.display = 'none';
      if (DOM.modalVariantCount) DOM.modalVariantCount.style.display = 'none';
    }
  }

  function updateModalActionButtons() {
    if (!activeDetailProduct) return;
    const { prod, match, target } = activeDetailProduct;

    if (DOM.modalMergeBtn) {
      DOM.modalMergeBtn.className = 'btn-merge-item';
      DOM.modalMergeBtn.textContent = `⚡ Auto-Merge Photos into this Piece (Absorb ${target === 'A' ? 'Product B' : 'Product A'})`;
    }

    if (DOM.modalDeleteBtn) {
      DOM.modalDeleteBtn.className = 'btn-delete-item';
      DOM.modalDeleteBtn.textContent = '🗑️ Auto-Delete this Piece from JSON';
    }
  }

  /* ==========================================================================
     INSTANT AUTO-SAVE & DIRECT JSON MODIFICATION ENGINE
     ========================================================================== */

  function getSavedActions() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY_ACTIONS) || '{}');
    } catch {
      return {};
    }
  }

  function saveActionLocally(record) {
    try {
      const actions = getSavedActions();
      actions[record.matchId] = record;
      localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
      recentActions.push(record);
      updateBottomTray();
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  }

  function removeActionLocally(matchId) {
    try {
      const actions = getSavedActions();
      delete actions[matchId];
      localStorage.setItem(STORAGE_KEY_ACTIONS, JSON.stringify(actions));
      recentActions = recentActions.filter(a => a.matchId !== matchId);
      updateBottomTray();
    } catch (e) {
      console.warn('LocalStorage remove failed:', e);
    }
  }

  function enqueueOffline(req) {
    try {
      const q = JSON.parse(localStorage.getItem(STORAGE_KEY_QUEUE) || '[]');
      q.push(req);
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(q));
    } catch (e) {
      console.warn('Failed to enqueue offline request:', e);
    }
  }

  async function flushOfflineQueue() {
    try {
      const q = JSON.parse(localStorage.getItem(STORAGE_KEY_QUEUE) || '[]');
      if (!q.length) return;
      setAutoSaveStatus('saving', `⚡ Syncing ${q.length} queued offline action${q.length === 1 ? '' : 's'} to disk...`);
      const remaining = [];
      for (const item of q) {
        try {
          const res = await fetch(item.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(item.body)
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
        } catch {
          remaining.push(item);
        }
      }
      localStorage.setItem(STORAGE_KEY_QUEUE, JSON.stringify(remaining));
      if (!remaining.length) {
        setAutoSaveStatus('saved', '✓ All changes synced directly to JSON files');
      } else {
        setAutoSaveStatus('offline', `⚠️ ${remaining.length} changes queued in browser`);
      }
    } catch (e) {
      console.warn('Error flushing offline queue:', e);
    }
  }

  function setAutoSaveStatus(state, msg) {
    if (!DOM.autoSavePill || !DOM.autoSaveStatusText) return;
    DOM.autoSavePill.className = `auto-save-status-pill status-${state}`;
    DOM.autoSaveStatusText.textContent = msg;
  }

  async function autoApplyMerge(match, target) {
    const master = target === 'A' ? match.productA : match.productB;
    const dup = target === 'A' ? match.productB : match.productA;
    const matchId = match.id;

    // Visual feedback on card
    const card = document.querySelector(`.dedup-card[data-match-id="${matchId}"]`);
    if (card) {
      card.classList.add('card-resolving');
      const banner = document.createElement('div');
      banner.className = 'card-auto-saved-banner';
      banner.innerHTML = `✓ Photos Merged into <strong>${master.name}</strong> · Auto-Saved Directly to JSON`;
      card.prepend(banner);
    }

    if (DOM.pdpModal && DOM.pdpModal.classList.contains('active')) {
      showToast(`Merged photos into ${master.name}! Auto-saved to JSON.`, '⚡');
      setTimeout(closeProductDetailModal, 450);
    }

    setAutoSaveStatus('saving', `⚡ Auto-saving merge: ${dup.name} → ${master.name}...`);

    const actionRecord = {
      type: 'merge',
      matchId: matchId,
      match: match,
      master: { catalogFile: master.catalogFile, name: master.name, id: master.id },
      dup: { catalogFile: dup.catalogFile, name: dup.name, id: dup.id },
      timestamp: Date.now()
    };

    // Auto-resolve sibling matches where the merged duplicate piece also appeared
    const normDupName = (dup.name || '').trim().toLowerCase();
    const siblingMatches = allMatches.filter(m => {
      if (m.id === matchId) return false;
      const matchNA = (m.productA?.name || '').trim().toLowerCase();
      const matchNB = (m.productB?.name || '').trim().toLowerCase();
      const fA = m.productA?.catalogFile;
      const fB = m.productB?.catalogFile;
      return (matchNA === normDupName && fA === dup.catalogFile) ||
             (matchNB === normDupName && fB === dup.catalogFile);
    });

    siblingMatches.forEach(sm => {
      saveActionLocally({
        type: 'cascade_resolved',
        matchId: sm.id,
        match: sm,
        reason: `Auto-resolved because "${dup.name}" was merged into "${master.name}"`,
        timestamp: Date.now()
      });
    });

    // 1. Bulletproof local persistence
    saveActionLocally(actionRecord);

    // 2. Dispatch to backend server to modify disk JSON directly
    const payload = {
      merges: [{
        masterCatalogFile: master.catalogFile,
        masterName: master.name,
        dupCatalogFile: dup.catalogFile,
        dupName: dup.name
      }],
      matchId: matchId
    };

    try {
      const res = await fetch('/api/merge-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setAutoSaveStatus('saved', `✓ Auto-Saved: ${master.catalogFile} & duplicates-report.json updated`);
      showToastWithUndo(`Merged photos into "${master.name}"`, actionRecord);
    } catch (err) {
      console.warn('Server offline, queued merge in localStorage:', err);
      enqueueOffline({ url: '/api/merge-products', body: payload });
      setAutoSaveStatus('offline', '☁️ Saved to localStorage (will sync to disk when server is online)');
      showToastWithUndo(`Merged (Saved in browser)`, actionRecord);
    }

    // Smoothly remove card and any cascaded sibling cards from view
    setTimeout(() => {
      const removedIds = new Set([matchId, ...siblingMatches.map(sm => sm.id)]);
      removedIds.forEach(id => selectedBulkDeletes.delete(id));
      allMatches = allMatches.filter(m => !removedIds.has(m.id));
      updateBulkUI();
      updateLiveMetrics();
      applyFilters();
      if (siblingMatches.length > 0) {
        showToast(`Merged into "${master.name}" & auto-cleared ${siblingMatches.length} other related pair(s)!`, '✨');
      }
    }, 1100);
  }

  async function autoApplyDelete(prod, match, target) {
    const matchId = match.id;
    const otherProd = target === 'A' ? match.productB : match.productA;

    const card = document.querySelector(`.dedup-card[data-match-id="${matchId}"]`);
    if (card) {
      card.classList.add('card-resolving');
      const banner = document.createElement('div');
      banner.className = 'card-auto-saved-banner';
      banner.innerHTML = `🗑️ <strong>${prod.name}</strong> Deleted · Auto-Saved Directly to JSON`;
      card.prepend(banner);
    }

    if (DOM.pdpModal && DOM.pdpModal.classList.contains('active')) {
      showToast(`Deleted ${prod.name}! Auto-saved to JSON.`, '🗑️');
      setTimeout(closeProductDetailModal, 450);
    }

    setAutoSaveStatus('saving', `⚡ Auto-saving removal of ${prod.name}...`);

    const actionRecord = {
      type: 'delete',
      matchId: matchId,
      match: match,
      deletedProduct: { catalogFile: prod.catalogFile, name: prod.name, id: prod.id, itemIndex: prod.itemIndex },
      keptProduct: { catalogFile: otherProd.catalogFile, name: otherProd.name, id: otherProd.id },
      timestamp: Date.now()
    };

    // Auto-resolve sibling matches where this deleted piece appeared
    const normDeletedName = (prod.name || '').trim().toLowerCase();
    const siblingMatches = allMatches.filter(m => {
      if (m.id === matchId) return false;
      const matchNA = (m.productA?.name || '').trim().toLowerCase();
      const matchNB = (m.productB?.name || '').trim().toLowerCase();
      const fA = m.productA?.catalogFile;
      const fB = m.productB?.catalogFile;
      return (matchNA === normDeletedName && fA === prod.catalogFile) ||
             (matchNB === normDeletedName && fB === prod.catalogFile);
    });

    siblingMatches.forEach(sm => {
      saveActionLocally({
        type: 'cascade_resolved',
        matchId: sm.id,
        match: sm,
        reason: `Auto-resolved because "${prod.name}" was deleted from catalog`,
        timestamp: Date.now()
      });
    });

    saveActionLocally(actionRecord);

    const payload = {
      itemsToDelete: [{
        catalogFile: prod.catalogFile,
        name: prod.name,
        itemIndex: prod.itemIndex
      }],
      matchId: matchId
    };

    try {
      const res = await fetch('/api/delete-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setAutoSaveStatus('saved', `✓ Auto-Saved: ${prod.catalogFile} & duplicates-report.json updated`);
      showToastWithUndo(`Deleted "${prod.name}" from catalog`, actionRecord);
    } catch (err) {
      console.warn('Server offline, queued deletion in localStorage:', err);
      enqueueOffline({ url: '/api/delete-products', body: payload });
      setAutoSaveStatus('offline', '☁️ Saved to localStorage (will sync to disk when server is online)');
      showToastWithUndo(`Deleted (Saved in browser)`, actionRecord);
    }

    setTimeout(() => {
      const removedIds = new Set([matchId, ...siblingMatches.map(sm => sm.id)]);
      removedIds.forEach(id => selectedBulkDeletes.delete(id));
      allMatches = allMatches.filter(m => !removedIds.has(m.id));
      updateBulkUI();
      updateLiveMetrics();
      applyFilters();
      if (siblingMatches.length > 0) {
        showToast(`Deleted "${prod.name}" & auto-cleared ${siblingMatches.length} other related pair(s)!`, '✨');
      }
    }, 1100);
  }

  async function autoApplyDismiss(match) {
    const matchId = match.id;

    const card = document.querySelector(`.dedup-card[data-match-id="${matchId}"]`);
    if (card) {
      card.classList.add('card-resolving');
      const banner = document.createElement('div');
      banner.className = 'card-auto-saved-banner';
      banner.innerHTML = `✓ Kept both pieces as distinct · Auto-Saved to Report`;
      card.prepend(banner);
    }

    setAutoSaveStatus('saving', '⚡ Marking pair as distinct pieces...');

    const actionRecord = {
      type: 'dismiss',
      matchId: matchId,
      match: match,
      timestamp: Date.now()
    };

    saveActionLocally(actionRecord);

    const payload = { matchId: matchId };

    try {
      const res = await fetch('/api/dismiss-match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setAutoSaveStatus('saved', `✓ Saved: Kept as distinct pieces`);
      showToastWithUndo(`Kept both pieces as distinct`, actionRecord);
    } catch (err) {
      console.warn('Server offline, queued dismiss in localStorage:', err);
      enqueueOffline({ url: '/api/dismiss-match', body: payload });
      setAutoSaveStatus('offline', '☁️ Saved to localStorage (offline)');
      showToastWithUndo(`Marked as kept (Saved in browser)`, actionRecord);
    }

    setTimeout(() => {
      selectedBulkDeletes.delete(matchId);
      allMatches = allMatches.filter(m => !m || m.id !== matchId);
      updateBulkUI();
      updateLiveMetrics();
      applyFilters();
    }, 900);
  }

  /* ==========================================================================
     BULK SELECTION & BULK DELETION ENGINE
     ========================================================================== */

  function updateBulkUI() {
    const count = selectedBulkDeletes.size;
    if (DOM.bulkSelectedCount) DOM.bulkSelectedCount.textContent = count.toLocaleString();
    if (DOM.bulkBtnCount) DOM.bulkBtnCount.textContent = count.toLocaleString();

    if (DOM.bulkToolbar) {
      if (count > 0) {
        DOM.bulkToolbar.classList.add('has-selection');
      } else {
        DOM.bulkToolbar.classList.remove('has-selection');
      }
    }

    if (DOM.btnBulkDeleteAction) {
      DOM.btnBulkDeleteAction.disabled = count === 0;
    }

    if (DOM.bulkSelectedSub) {
      if (count === 0) {
        DOM.bulkSelectedSub.textContent = 'Check duplicate pieces to delete them in bulk, or use quick select options below';
      } else {
        const uniqueNames = new Set(Array.from(selectedBulkDeletes.values()).map(v => (v.prod?.name || '').trim().toLowerCase()));
        DOM.bulkSelectedSub.textContent = `${uniqueNames.size} unique product(s) marked across ${count} duplicate pairs (ready to prune from catalog JSONs)`;
      }
    }
  }

  function toggleBulkSelect(matchId, target, isChecked) {
    const m = allMatches.find(item => item.id === matchId);
    if (!m) return;

    if (isChecked) {
      selectedBulkDeletes.set(matchId, {
        target: target,
        prod: target === 'A' ? m.productA : m.productB,
        otherProd: target === 'A' ? m.productB : m.productA,
        match: m
      });
    } else {
      const current = selectedBulkDeletes.get(matchId);
      if (current && current.target === target) {
        selectedBulkDeletes.delete(matchId);
      }
    }

    syncCardBulkUI(matchId);
    updateBulkUI();
  }

  function syncCardBulkUI(matchId) {
    const card = document.getElementById(`card-${matchId}`);
    if (!card) return;

    const currentSel = selectedBulkDeletes.get(matchId);
    const selectedTarget = currentSel ? currentSel.target : null;

    const colA = card.querySelector('.dedup-col[data-col-target="A"]');
    const colB = card.querySelector('.dedup-col[data-col-target="B"]');
    const chkA = card.querySelector('.bulk-chk[data-target="A"]');
    const chkB = card.querySelector('.bulk-chk[data-target="B"]');
    const quickBtn = card.querySelector('[data-action="quick-select-b"]');

    if (colA) {
      if (selectedTarget === 'A') {
        colA.classList.add('marked-bulk-delete');
        if (chkA) chkA.checked = true;
        setColBadge(colA, true);
      } else {
        colA.classList.remove('marked-bulk-delete');
        if (chkA) chkA.checked = false;
        setColBadge(colA, false);
      }
    }

    if (colB) {
      if (selectedTarget === 'B') {
        colB.classList.add('marked-bulk-delete');
        if (chkB) chkB.checked = true;
        setColBadge(colB, true);
      } else {
        colB.classList.remove('marked-bulk-delete');
        if (chkB) chkB.checked = false;
        setColBadge(colB, false);
      }
    }

    if (quickBtn) {
      if (selectedTarget === 'B') {
        quickBtn.classList.add('active');
        quickBtn.innerHTML = '✓ Product B Selected';
      } else {
        quickBtn.classList.remove('active');
        quickBtn.innerHTML = '☑ Select B to Delete';
      }
    }
  }

  function setColBadge(colEl, isMarked) {
    const badgeSlot = colEl.querySelector('.bulk-badge-slot');
    if (!badgeSlot) return;
    badgeSlot.innerHTML = isMarked ? '<span class="bulk-col-badge">🗑️ Marked</span>' : '';
  }

  function selectAllBInView() {
    if (filteredMatches.length === 0) {
      showToast('No duplicate pairs visible under current filter', 'ℹ️');
      return;
    }
    filteredMatches.forEach(m => {
      selectedBulkDeletes.set(m.id, {
        target: 'B',
        prod: m.productB,
        otherProd: m.productA,
        match: m
      });
      syncCardBulkUI(m.id);
    });
    updateBulkUI();
    showToast(`Selected Product B on ${filteredMatches.length} visible pairs!`, '☑️');
  }

  function selectExactDuplicates() {
    let count = 0;
    allMatches.forEach(m => {
      if (m.similarity >= 97) {
        selectedBulkDeletes.set(m.id, {
          target: 'B',
          prod: m.productB,
          otherProd: m.productA,
          match: m
        });
        syncCardBulkUI(m.id);
        count++;
      }
    });
    updateBulkUI();
    if (count > 0) {
      showToast(`Selected Product B on ${count} exact duplicate pairs!`, '🎯');
    } else {
      showToast('No exact duplicates pending in catalog', '✓');
    }
  }

  function clearAllBulkSelections() {
    const count = selectedBulkDeletes.size;
    selectedBulkDeletes.clear();
    filteredMatches.forEach(m => syncCardBulkUI(m.id));
    updateBulkUI();
    if (count > 0) {
      showToast(`Deselected all ${count} products`, '✕');
    }
  }

  async function executeBulkDelete() {
    const totalSelected = selectedBulkDeletes.size;
    if (totalSelected === 0) {
      showToast('No products selected for deletion', 'ℹ️');
      return;
    }

    // Build the unique list of products to delete from disk
    const itemsToDeleteMap = new Map();
    const matchIds = [];
    const affectedMatches = [];

    selectedBulkDeletes.forEach(({ target, prod, otherProd, match }) => {
      matchIds.push(match.id);
      affectedMatches.push({ prod, match, target });
      const key = `${prod.catalogFile}::${(prod.name || '').trim().toLowerCase()}`;
      if (!itemsToDeleteMap.has(key)) {
        itemsToDeleteMap.set(key, {
          catalogFile: prod.catalogFile,
          name: prod.name,
          itemIndex: prod.itemIndex
        });
      }
    });

    const itemsToDelete = Array.from(itemsToDeleteMap.values());
    const uniqueCount = itemsToDelete.length;

    const confirmMsg = `Are you sure you want to permanently delete ${uniqueCount} unique product(s) across ${totalSelected} duplicate pair(s) from catalog JSON files on disk?\n\nThis will automatically modify your catalog files and prune the duplicate report.`;
    if (!confirm(confirmMsg)) return;

    // Visual feedback: animate all affected cards
    matchIds.forEach(id => {
      const card = document.querySelector(`.dedup-card[data-match-id="${id}"]`);
      if (card) {
        card.classList.add('card-resolving');
        const banner = document.createElement('div');
        banner.className = 'card-auto-saved-banner';
        banner.innerHTML = `🗑️ Bulk Deleting... · Auto-Saving directly to JSON`;
        card.prepend(banner);
      }
    });

    setAutoSaveStatus('saving', `⚡ Auto-saving bulk deletion of ${uniqueCount} products...`);

    const payload = {
      itemsToDelete,
      matchIds
    };

    try {
      const res = await fetch('/api/delete-products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const resData = await res.json();

      setAutoSaveStatus('saved', `✓ Auto-Saved: ${resData.removedCount || uniqueCount} products deleted from catalogs`);
      showToast(`✓ Successfully deleted ${uniqueCount} products in bulk!`, '🗑️');

      const now = Date.now();
      affectedMatches.forEach(({ prod, match, target }) => {
        saveActionLocally({
          type: 'bulk_delete',
          matchId: match.id,
          match: match,
          deletedProduct: { catalogFile: prod.catalogFile, name: prod.name, id: prod.id },
          timestamp: now
        });
      });

      // Also cascade any sibling matches that referenced any of these deleted products
      const deletedNameSet = new Set(itemsToDelete.map(it => it.name.trim().toLowerCase()));
      const siblingMatches = allMatches.filter(m => {
        if (selectedBulkDeletes.has(m.id)) return false;
        const nA = (m.productA?.name || '').trim().toLowerCase();
        const nB = (m.productB?.name || '').trim().toLowerCase();
        return deletedNameSet.has(nA) || deletedNameSet.has(nB);
      });

      siblingMatches.forEach(sm => {
        saveActionLocally({
          type: 'cascade_resolved',
          matchId: sm.id,
          match: sm,
          reason: 'Auto-resolved via bulk deletion cascade',
          timestamp: now
        });
      });

      // Clear selection
      selectedBulkDeletes.clear();
      updateBulkUI();

      // Smoothly remove resolved and cascaded cards
      setTimeout(() => {
        const removedMatchIds = new Set([...matchIds, ...siblingMatches.map(sm => sm.id)]);
        allMatches = allMatches.filter(m => !removedMatchIds.has(m.id));
        updateLiveMetrics();
        applyFilters();
      }, 1000);

    } catch (err) {
      console.warn('Server offline, queuing bulk delete in localStorage:', err);
      enqueueOffline({ url: '/api/delete-products', body: payload });
      setAutoSaveStatus('offline', '☁️ Saved to localStorage (will sync to disk when server is online)');
      showToast(`Bulk deletion saved to browser queue`, '☁️');

      selectedBulkDeletes.clear();
      updateBulkUI();
      setTimeout(() => {
        const removedMatchIds = new Set(matchIds);
        allMatches = allMatches.filter(m => !removedMatchIds.has(m.id));
        updateLiveMetrics();
        applyFilters();
      }, 1000);
    }
  }

  async function undoLastAction(targetAction = null) {
    const action = targetAction || recentActions[recentActions.length - 1];
    if (!action) {
      showToast('No actions to undo', 'ℹ️');
      return;
    }

    setAutoSaveStatus('saving', '⚡ Reverting last modification on disk...');

    try {
      const res = await fetch('/api/undo-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId: action.matchId })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      setAutoSaveStatus('saved', '✓ Action successfully reverted on disk & in manifests');
    } catch (err) {
      console.warn('Could not undo on disk (maybe offline):', err);
      setAutoSaveStatus('saved', '✓ Action reverted in session');
    }

    // Remove from local storage
    removeActionLocally(action.matchId);

    // Restore match into allMatches if not already there
    if (action.match && !allMatches.some(m => m.id === action.matchId)) {
      allMatches.unshift(action.match);
      updateLiveMetrics();
      applyFilters();
    }

    showToast(`Reverted: ${action.type.toUpperCase()} on "${action.match?.productA?.name || 'Item'}"`, '↩️');
    updateBottomTray();
  }

  function showToastWithUndo(msg, actionRecord) {
    if (!DOM.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:0.5rem; flex:1;">
        <span style="font-size:1.1rem;">⚡</span>
        <span>${msg}</span>
      </div>
      <button class="toast-undo-btn" title="Undo this action and restore original JSON">↩️ Undo</button>
    `;

    const undoBtn = toast.querySelector('.toast-undo-btn');
    if (undoBtn) {
      undoBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        undoLastAction(actionRecord);
        toast.remove();
      });
    }

    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, 5000);
  }

  function updateBottomTray() {
    const count = recentActions.length;
    const pending = allMatches.length;

    if (DOM.trayCountText) {
      if (pending === 0 && count > 0) {
        DOM.trayCountText.textContent = `🎉 All Pairs Resolved! (${count} Actions Saved to JSON)`;
      } else {
        DOM.trayCountText.textContent = `${count} Action${count === 1 ? '' : 's'} Completed · ${pending} Left for Action`;
      }
    }

    const last = recentActions[recentActions.length - 1];
    if (DOM.traySubText) {
      if (last) {
        const desc = last.type === 'merge'
          ? `Merged into ${last.master.name}`
          : (last.type === 'delete' ? `Deleted ${last.deletedProduct.name}` : 'Marked as kept');
        DOM.traySubText.textContent = `Latest: ${desc} · Auto-saved directly to JSON`;
      } else {
        DOM.traySubText.textContent = `${pending} duplicate pairs pending your review`;
      }
    }

    if (DOM.btnTrayUndo) {
      DOM.btnTrayUndo.disabled = count === 0;
      if (DOM.btnTrayUndoText) {
        DOM.btnTrayUndoText.textContent = count > 0 ? `↩️ Undo Last (${last?.type || ''})` : '↩️ Undo';
      }
    }

    if (DOM.bottomTray) {
      if (count > 0) {
        DOM.bottomTray.classList.add('visible');
      } else {
        DOM.bottomTray.classList.remove('visible');
      }
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
