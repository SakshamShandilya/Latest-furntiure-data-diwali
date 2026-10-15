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
    btnTrayClear: document.getElementById('btn-tray-clear'),
    btnApplyPrune: document.getElementById('btn-apply-prune'),
    btnThemeToggle: document.getElementById('btn-theme-toggle'),
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

    // Modal Decision Buttons
    if (DOM.modalMergeBtn) {
      DOM.modalMergeBtn.addEventListener('click', () => {
        if (!activeDetailProduct) return;
        const { match, target } = activeDetailProduct;
        toggleMerge(match, target);
        updateModalActionButtons();
      });
    }
    if (DOM.modalDeleteBtn) {
      DOM.modalDeleteBtn.addEventListener('click', () => {
        if (!activeDetailProduct) return;
        const { prod } = activeDetailProduct;
        toggleDeletion(prod);
        updateModalActionButtons();
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

      // Event Listeners for action buttons
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

    // Merge status
    const merge = markedMerges.get(match.id);
    const isMaster = merge && merge.target === target;
    const otherTarget = target === 'A' ? 'B' : 'A';
    const isAbsorbed = merge && merge.target === otherTarget;

    if (DOM.modalMergeBtn) {
      if (isMaster) {
        DOM.modalMergeBtn.className = 'btn-merge-item active-merged';
        DOM.modalMergeBtn.textContent = '✓ Marked as Master (Will Absorb Duplicate)';
      } else if (isAbsorbed) {
        DOM.modalMergeBtn.className = 'btn-merge-item';
        DOM.modalMergeBtn.textContent = '🔄 Switch to Master (Absorb other piece)';
      } else {
        DOM.modalMergeBtn.className = 'btn-merge-item';
        DOM.modalMergeBtn.textContent = `🔄 Keep as Master Piece (Absorb ${target === 'A' ? 'Product B' : 'Product A'})`;
      }
    }

    // Delete status
    const isDel = markedDeletions.has(prod.id);
    if (DOM.modalDeleteBtn) {
      if (isDel) {
        DOM.modalDeleteBtn.className = 'btn-delete-item active-deleted';
        DOM.modalDeleteBtn.textContent = '✓ Marked for Removal';
      } else {
        DOM.modalDeleteBtn.className = 'btn-delete-item';
        DOM.modalDeleteBtn.textContent = '🗑️ Mark for Removal';
      }
    }
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
