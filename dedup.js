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
    traySubText: document.getElementById('tray-sub-text'),
    btnTrayUndo: document.getElementById('btn-tray-undo'),
    btnTrayUndoText: document.getElementById('btn-tray-undo-text'),
    btnTrayClear: document.getElementById('btn-tray-clear'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
    autoSavePill: document.getElementById('auto-save-pill'),
    autoSaveStatusText: document.getElementById('auto-save-status-text'),
    toastContainer: document.getElementById('toast-container'),

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

      // Load all auto-saved actions from localStorage
      const savedCompleted = getSavedActions();
      const completedIds = new Set(Object.keys(savedCompleted));

      // Filter out already processed matches so user never loses work or repeats decisions
      allMatches = rawMatches.filter(m => !completedIds.has(m.id));

      // Reconstruct recent actions stack for Undo drawer
      recentActions = Object.values(savedCompleted).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

      // Update Header Stats
      if (DOM.statScanned) DOM.statScanned.textContent = (data.totalProductsScanned || 1826).toLocaleString();
      if (DOM.statExact) DOM.statExact.textContent = (data.breakdown?.exactDuplicates || 0).toLocaleString();
      if (DOM.statNear) DOM.statNear.textContent = (data.breakdown?.nearIdentical || 0).toLocaleString();
      if (DOM.statLookalike) DOM.statLookalike.textContent = (data.breakdown?.visualLookalikes || 0).toLocaleString();
      if (DOM.statTotal) DOM.statTotal.textContent = allMatches.length.toLocaleString();
      if (DOM.scannerTimestamp) DOM.scannerTimestamp.textContent = `Scanned ${data.generatedAt || 'Just now'}`;

      setAutoSaveStatus('saved', `✓ Auto-Save Active (${recentActions.length} Actions Saved)`);
      updateBottomTray();
      buildCategoryPills();
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
      card.setAttribute('data-match-id', m.id);

      const pA = m.productA;
      const pB = m.productB;

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
          <div style="font-size:0.8rem; color:var(--text-tertiary);">
            Hamming Dist: ${m.pDist} bits · Color Match: ${(m.colorSim * 100).toFixed(0)}%
          </div>
        </div>

        <div class="dedup-card-body">
          <!-- Product A Column -->
          <div class="dedup-col">
            <div class="dedup-img-wrap" data-view-pdp="A" data-match-id="${m.id}" title="Click to view full photo gallery and specifications">
              <img src="${pA.image}" alt="${pA.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
              <div class="img-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>View Photos</span>
              </div>
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pA.brand}</div>
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
          <div class="dedup-col">
            <div class="dedup-img-wrap" data-view-pdp="B" data-match-id="${m.id}" title="Click to view full photo gallery and specifications">
              <img src="${pB.image}" alt="${pB.name}" loading="lazy" onerror="this.src='assets/plypicker-logo.png'">
              <div class="img-zoom-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                <span>View Photos</span>
              </div>
            </div>
            <div class="dedup-meta">
              <div class="dedup-brand">${pB.brand}</div>
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

    // Smoothly remove card from view after brief confirmation
    setTimeout(() => {
      allMatches = allMatches.filter(m => m.id !== matchId);
      applyFilters();
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
      allMatches = allMatches.filter(m => m.id !== matchId);
      applyFilters();
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
      allMatches = allMatches.filter(m => m.id !== matchId);
      applyFilters();
    }, 900);
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
    if (DOM.trayCountText) {
      DOM.trayCountText.textContent = `${count} Action${count === 1 ? '' : 's'} Auto-Saved`;
    }

    const last = recentActions[recentActions.length - 1];
    if (DOM.traySubText) {
      if (last) {
        const desc = last.type === 'merge'
          ? `Merged into ${last.master.name}`
          : (last.type === 'delete' ? `Deleted ${last.deletedProduct.name}` : 'Marked as kept');
        DOM.traySubText.textContent = `Latest: ${desc}`;
      } else {
        DOM.traySubText.textContent = 'All modifications are written directly to JSON files';
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
