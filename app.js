/**
 * ============================================================================
 * MODERNA ATELIER - LUXURY FURNITURE PRODUCT LISTING ENGINE
 * ============================================================================
 */

(function () {
  'use strict';

  // State Management
  const state = {
    theme: localStorage.getItem('moderna_theme') || 'light',
    catalogs: [],
    catalogDatabase: [],
    activeCatalogId: 'all',
    activeCategory: 'Sofa',
    selectedCategories: new Set(),
    selectedBrands: new Set(),
    selectedCatalogs: new Set(),
    viewMode: 'catalog', // 'catalog' or 'brands-directory'
    allProducts: [],
    filteredProducts: [],
    searchQuery: '',
    quickFilter: 'all',
    selectedSilhouettes: new Set(),
    selectedColors: new Set(),
    selectedMaterials: new Set(),
    selectedFrames: new Set(),
    selectedLegs: new Set(),
    selectedCushions: new Set(),
    selectedFeatures: new Set(),
    selectedAssembly: new Set(),
    selectedMedia: new Set(),
    priceMin: 200,
    priceMax: 6000,
    sortBy: 'featured',
    layoutCols: 3,
    wishlist: JSON.parse(localStorage.getItem('moderna_wishlist') || '[]'),
    cart: JSON.parse(localStorage.getItem('moderna_cart') || '[]'),
    comparison: JSON.parse(localStorage.getItem('moderna_comparison') || '[]'),
    activeQuickViewProduct: null,
    quickViewImageIndex: 0,
    sidebarOpenMobile: false
  };

  // Color Definitions for Swatches
  const COLOR_PALETTE = [
    { id: 'White', label: 'White & Ivory', hex: '#FAF9F6', border: '#DCD8CE' },
    { id: 'Beige', label: 'Beige & Sand', hex: '#E5DAC8', border: '#C7BCA7' },
    { id: 'Camel', label: 'Camel & Cognac', hex: '#9E693D', border: '#84552F' },
    { id: 'Grey', label: 'Grey & Charcoal', hex: '#707070', border: '#575757' },
    { id: 'Black', label: 'Black & Noir', hex: '#1C1B1A', border: '#0F0E0D' },
    { id: 'Green', label: 'Olive & Forest', hex: '#3B533E', border: '#2B3F2E' },
    { id: 'Brown', label: 'Warm Espresso', hex: '#4A3728', border: '#38281B' },
    { id: 'Blue', label: 'Navy & Blue', hex: '#1E2D4A', border: '#142036' }
  ];

  // Brands Metadata for Directory & Hero Branding
  const BRANDS_METADATA = {
    'Modani': {
      name: 'Modani',
      subtitle: 'Modani Atelier · Miami & Milan',
      tagline: 'Contemporary Italian Modernism',
      description: 'Renowned for clean geometric silhouettes, architectural Italian engineering, tactile bouclé textures, and plush velvets across living, bedroom, and entertainment spaces.',
      origin: 'Miami · Milan',
      badge: 'Contemporary Modern',
      monogram: 'MD',
      accentColor: '#C5A880',
      banner: 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png'
    },
    'Danetti': {
      name: 'Danetti',
      subtitle: 'Danetti London · Modern British Living',
      tagline: 'Modern British Contemporary Design',
      description: 'Sophisticated British contemporary design celebrated for versatile dining chairs, plush chenille fabrics, smooth swivel recliners, and sculpted ottomans.',
      origin: 'London, UK',
      badge: 'Modern British',
      monogram: 'DN',
      accentColor: '#9E693D',
      banner: 'https://cdn.shopify.com/s/files/1/0418/9080/7961/files/AidenFabricReclinerMassageChairMain.jpg?v=1739532939'
    },
    'Living Shapes': {
      name: 'Living Shapes',
      subtitle: 'Living Shapes Studio · Sculptural & Organic',
      tagline: 'Organic Silhouettes & Natural Materials',
      description: 'Organic curved architecture, tactile bouclé upholstery, and sculptural wooden craftsmanship inspired by nature and modern serenity.',
      origin: 'Artisan Studio',
      badge: 'Sculptural & Organic',
      monogram: 'LS',
      accentColor: '#3B533E',
      banner: 'https://cdn.shopify.com/s/files/1/0644/0710/9822/files/LS-0401-Green.jpg?v=1773813588'
    },
    'Duraster': {
      name: 'Duraster',
      subtitle: 'Duraster Craftworks · Heritage Leather',
      tagline: 'Artisan Chesterfield & Solid Wood Joinery',
      description: 'Masterfully handcrafted Chesterfield lounges, solid wood joinery, and vintage buff leather pieces built for enduring luxury.',
      origin: 'Heritage Craft',
      badge: 'Solid Wood & Leather',
      monogram: 'DR',
      accentColor: '#4A3728',
      banner: 'https://www.duraster.in/cdn/shop/products/norwich-chesterfield-lounge-1.jpg'
    },
    'Rove Concepts': {
      name: 'Rove Concepts',
      subtitle: 'Rove Concepts · Architectural Modernism',
      tagline: 'Danish & Mid-Century Minimalist Seating',
      description: 'Iconic Danish-inspired minimalist silhouettes, shearling textures, solid walnut frames, and precision mid-century entertainment consoles.',
      origin: 'Pacific Northwest',
      badge: 'Mid-Century Minimalist',
      monogram: 'RC',
      accentColor: '#707070',
      banner: 'https://cdn.roveconcepts.com/sites/default/files/Pallas_Lounge_Chair_Shearling_Almond_1.jpg'
    },
    'Estré': {
      name: 'Estré',
      subtitle: 'Estré Atelier · Sculptural Soft Living',
      tagline: 'Contemporary Minimalist Curves & Cloud Comfort',
      description: 'Organic curved silhouettes, tactile cloud beds, sculptural benches, and fluid minimalist seating tailored for serene architectural spaces.',
      origin: 'Modern Atelier',
      badge: 'Sculptural Curves',
      monogram: 'ES',
      accentColor: '#8C7853',
      banner: 'https://aiytftidftjzccdbeoib.supabase.co/storage/v1/object/public/website-media/s/2-min-799239-w16.webp'
    },
    'Bay Window': {
      name: 'Bay Window',
      subtitle: 'Bay Window · Contemporary Living',
      tagline: 'Modular Recliners & Designer Living',
      description: 'Versatile electric recliners, modular sectionals, refined bedside storage, and textured fabrics engineered for refined modern lounging.',
      origin: 'Contemporary Studio',
      badge: 'Modular & Recliner',
      monogram: 'BW',
      accentColor: '#2B4A6F',
      banner: 'https://cdn.shopify.com/s/files/1/0759/3040/3111/files/BT13931_Arcus_BedSide_Table.png'
    },
    'iFur': {
      name: 'iFur',
      subtitle: 'iFur · Modern Italian Luxury',
      tagline: 'Contemporary Vanity Tables & Sleek Living',
      description: 'Statement vanity dressing tables with fluted cabinetry, brushed metal accents, and sculpted luxury sofas crafted for sophisticated homes.',
      origin: 'Italian Modern',
      badge: 'Luxury Vanity & Living',
      monogram: 'IF',
      accentColor: '#6B4C35',
      banner: 'https://cdn.shopify.com/s/files/1/0767/3924/8359/files/fur15.png'
    },
    'Gharaana': {
      name: 'Gharaana',
      subtitle: 'Gharaana · Heritage Woodworks',
      tagline: 'Handcrafted Wooden Joinery & Dual-Tone Sofas',
      description: 'Bespoke custom dual-tone L-shaped wooden upholstered lounges and enduring artisan joinery celebrating heritage craft.',
      origin: 'Heritage Woodwork',
      badge: 'Heritage Solid Wood',
      monogram: 'GH',
      accentColor: '#5C3A21',
      banner: 'https://cdn.shopify.com/s/files/1/0917/4617/3241/files/126_04694c54-4118-4ca2-8fb2-d5f609dee558.jpg'
    },
    'Indian Nest': {
      name: 'Indian Nest',
      subtitle: 'Indian Nest · Modern Comfort',
      tagline: 'Curved Organic Bouclé & Engineered Frames',
      description: 'Thoughtfully designed modern curved sofas featuring solid reinforced wood structures and balanced Sleepwell® resilience foam.',
      origin: 'Modern Comfort',
      badge: 'Curved & Ergonomic',
      monogram: 'IN',
      accentColor: '#365342',
      banner: 'https://cdn.shopify.com/s/files/1/0738/7041/0001/files/2311AE8E-B1A6-44D5-9904-C5BA093178E9.webp'
    }
  };

  // DOM Elements Cache
  const DOM = {};

  function initDOM() {
    DOM.html = document.documentElement;
    DOM.btnThemeToggle = document.getElementById('btn-theme-toggle');
    DOM.themeText = document.getElementById('theme-text');
    DOM.categoryNavList = document.getElementById('category-nav-list');
    DOM.globalSearchInput = document.getElementById('global-search-input');
    DOM.searchClearBtn = document.getElementById('search-clear-btn');
    DOM.productsGrid = document.getElementById('products-grid');
    DOM.emptyState = document.getElementById('empty-state');
    DOM.resultsCountDisplay = document.getElementById('results-count-display');
    DOM.quickPillsRow = document.getElementById('quick-pills-row');
    DOM.appliedFiltersBar = document.getElementById('applied-filters-bar');
    DOM.sortSelect = document.getElementById('sort-select');
    DOM.layoutBtns = document.querySelectorAll('.layout-btn');
    DOM.filterSidebar = document.getElementById('filter-sidebar');
    DOM.btnToggleFilters = document.getElementById('btn-toggle-filters');
    DOM.activeFiltersCount = document.getElementById('active-filters-count');
    DOM.btnResetFilters = document.getElementById('btn-reset-filters');
    DOM.contentContainer = document.querySelector('.content-container');
    DOM.listingToolbar = document.querySelector('.listing-toolbar');

    // Breadcrumbs Elements
    DOM.crumbHome = document.getElementById('crumb-home');
    DOM.crumbBrands = document.getElementById('crumb-brands');
    DOM.crumbCategory = document.getElementById('crumb-category');
    DOM.crumbBrand = document.getElementById('crumb-brand');

    // Brands Directory Elements
    DOM.brandsDirectorySection = document.getElementById('brands-directory-section');
    DOM.brandsDirectoryGrid = document.getElementById('brands-directory-grid');
    DOM.btnBackToCatalog = document.getElementById('btn-back-to-catalog');

    // Hero Elements
    DOM.heroBrandTag = document.getElementById('hero-brand-tag');
    DOM.heroCategoryTag = document.getElementById('hero-category-tag');
    DOM.heroMainHeading = document.getElementById('hero-main-heading');
    DOM.heroSubtext = document.getElementById('hero-subtext');
    DOM.activeCatalogDisplay = document.getElementById('active-catalog-display');
    DOM.activeItemCountText = document.getElementById('active-item-count-text');
    DOM.activeFileText = document.getElementById('active-file-text');
    DOM.btnSwitchCatalog = document.getElementById('btn-switch-catalog');

    // Sidebar Filter Lists
    DOM.filterCategoriesList = document.getElementById('filter-categories-list');
    DOM.filterBrandsList = document.getElementById('filter-brands-list');
    DOM.filterSilhouetteList = document.getElementById('filter-silhouette-list');
    DOM.colorSwatchesGrid = document.getElementById('color-swatches-grid');
    DOM.filterMaterialsList = document.getElementById('filter-materials-list');
    DOM.filterFramesList = document.getElementById('filter-frames-list');
    DOM.filterLegsList = document.getElementById('filter-legs-list');
    DOM.filterCushionList = document.getElementById('filter-cushion-list');
    DOM.filterFeaturesList = document.getElementById('filter-features-list');
    DOM.filterAssemblyList = document.getElementById('filter-assembly-list');
    DOM.filterMediaList = document.getElementById('filter-media-list');
    DOM.filterCatalogsList = document.getElementById('filter-catalogs-list');
    DOM.priceSlider = document.getElementById('price-slider');
    DOM.priceMinInput = document.getElementById('price-min-input');
    DOM.priceMaxInput = document.getElementById('price-max-input');

    // Badges & Counters
    DOM.wishlistBadge = document.getElementById('wishlist-badge');
    DOM.cartBadge = document.getElementById('cart-badge');

    // Quick View Modal Elements
    DOM.quickviewModal = document.getElementById('quickview-modal');
    DOM.btnCloseQuickview = document.getElementById('btn-close-quickview');
    DOM.qvMainImg = document.getElementById('qv-main-img');
    DOM.qvThumbnailsStrip = document.getElementById('qv-thumbnails-strip');
    DOM.qvBrandText = document.getElementById('qv-brand-text');
    DOM.qvTitleText = document.getElementById('qv-title-text');
    DOM.qvPriceText = document.getElementById('qv-price-text');
    DOM.qvFinancingText = document.getElementById('qv-financing-text');
    DOM.qvDescriptionText = document.getElementById('qv-description-text');
    DOM.qvSpecsTable = document.getElementById('qv-specs-table');
    DOM.qvBtnAddCart = document.getElementById('qv-btn-add-cart');
    DOM.qvBtnWishlist = document.getElementById('qv-btn-wishlist');
    DOM.qvOfficialLink = document.getElementById('qv-official-link');
    DOM.qvImgPrevBtn = document.getElementById('qv-img-prev-btn');
    DOM.qvImgNextBtn = document.getElementById('qv-img-next-btn');
    DOM.qvCounterText = document.getElementById('qv-counter-text');
    DOM.qvThumbPrevBtn = document.getElementById('qv-thumb-prev-btn');
    DOM.qvThumbNextBtn = document.getElementById('qv-thumb-next-btn');
    DOM.qvSlideDots = document.getElementById('qv-slide-dots');
    DOM.qvMainImageWrap = document.getElementById('qv-main-image-wrap');
    DOM.qvMainVideo = document.getElementById('qv-main-video');
    DOM.qvVideoPill = document.getElementById('qv-video-pill');
    DOM.pdpBackBtn = document.getElementById('pdp-back-btn');
    DOM.pdpSubnavBadge = document.getElementById('pdp-subnav-badge');
    DOM.pdpSubnavMiniTitle = document.getElementById('pdp-subnav-mini-title');
    DOM.pdpSubnavMiniPrice = document.getElementById('pdp-subnav-mini-price');
    DOM.qvColorActiveLabel = document.getElementById('qv-color-active-label');
    DOM.qvSwatchesStrip = document.getElementById('qv-swatches-strip');
    DOM.pdpTechCardsGrid = document.getElementById('pdp-tech-cards-grid');
    DOM.pdpBlueprintSpotlight = document.getElementById('pdp-blueprint-spotlight');
    DOM.pdpBlueprintImg = document.getElementById('pdp-blueprint-img');
    DOM.pdpBlueprintLink = document.getElementById('pdp-blueprint-link');

    // Comparison Elements
    DOM.comparisonBar = document.getElementById('comparison-bar');
    DOM.comparisonPreviewThumbs = document.getElementById('comparison-preview-thumbs');
    DOM.comparisonCountText = document.getElementById('comparison-count-text');
    DOM.btnOpenComparisonModal = document.getElementById('btn-open-comparison-modal');
    DOM.btnClearComparison = document.getElementById('btn-clear-comparison');
    DOM.comparisonModal = document.getElementById('comparison-modal');
    DOM.btnCloseComparison = document.getElementById('btn-close-comparison');
    DOM.comparisonModalGrid = document.getElementById('comparison-modal-grid');

    // Wishlist Drawer Elements
    DOM.btnOpenWishlist = document.getElementById('btn-open-wishlist');
    DOM.wishlistDrawerBackdrop = document.getElementById('wishlist-drawer-backdrop');
    DOM.btnCloseWishlist = document.getElementById('btn-close-wishlist');
    DOM.wishlistItemsContainer = document.getElementById('wishlist-items-container');
    DOM.wishlistDrawerCount = document.getElementById('wishlist-drawer-count');
    DOM.btnMoveAllToBag = document.getElementById('btn-move-all-to-bag');

    // Cart Drawer Elements
    DOM.btnOpenCart = document.getElementById('btn-open-cart');
    DOM.cartDrawerBackdrop = document.getElementById('cart-drawer-backdrop');
    DOM.btnCloseCart = document.getElementById('btn-close-cart');
    DOM.cartItemsContainer = document.getElementById('cart-items-container');
    DOM.cartDrawerCount = document.getElementById('cart-drawer-count');
    DOM.cartTotalPrice = document.getElementById('cart-total-price');
    DOM.btnCheckout = document.getElementById('btn-checkout');

    // Data Hub / Add JSON Modal Elements
    DOM.btnOpenCatalogHub = document.getElementById('btn-open-catalog-hub');
    DOM.btnOpenCatalogHubTop = document.getElementById('btn-open-catalog-hub-top');
    DOM.catalogHubModal = document.getElementById('catalog-hub-modal');
    DOM.btnCloseCatalogHub = document.getElementById('btn-close-catalog-hub');
    DOM.hubDropzone = document.getElementById('hub-dropzone');
    DOM.hubFileInput = document.getElementById('hub-file-input');
    DOM.hubCategoryInput = document.getElementById('hub-category-input');
    DOM.hubBrandInput = document.getElementById('hub-brand-input');
    DOM.hubPasteArea = document.getElementById('hub-paste-area');
    DOM.btnCancelImport = document.getElementById('btn-cancel-import');
    DOM.btnSubmitImport = document.getElementById('btn-submit-import');
    DOM.hubCatalogsList = document.getElementById('hub-catalogs-list');

    // Media Audit Drawer Elements
    DOM.btnOpenMediaPanelTop = document.getElementById('btn-open-media-panel-top');
    DOM.btnOpenMediaPanel = document.getElementById('btn-open-media-panel');
    DOM.mediaBadge = document.getElementById('media-badge');
    DOM.topMediaCountText = document.getElementById('top-media-count-text');
    DOM.mediaAuditDrawerBackdrop = document.getElementById('media-audit-drawer-backdrop');
    DOM.btnCloseMediaAudit = document.getElementById('btn-close-media-audit');
    DOM.mediaAuditSearch = document.getElementById('media-audit-search');
    DOM.mediaFilterChips = document.getElementById('media-filter-chips');
    DOM.mediaAuditItemsList = document.getElementById('media-audit-items-list');
    DOM.kpiTotalImages = document.getElementById('kpi-total-images');
    DOM.kpiTotalVideos = document.getElementById('kpi-total-videos');
    DOM.kpiAvgImages = document.getElementById('kpi-avg-images');
    DOM.kpiMaxImages = document.getElementById('kpi-max-images');
    DOM.qvImagesCountText = document.getElementById('qv-images-count-text');
    DOM.qvVideoStatusText = document.getElementById('qv-video-status-text');

    // Toast Container
    DOM.toastContainer = document.getElementById('toast-container');
  }

  /* ==========================================================================
     NOTIFICATION TOAST SYSTEM
     ========================================================================== */
  function showToast(message, icon = '✦') {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerHTML = `<span style="color:var(--accent-gold); font-weight:700;">${icon}</span><span>${message}</span>`;
    DOM.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 320);
    }, 3200);
  }

  /* ==========================================================================
     THEME MANAGEMENT
     ========================================================================== */
  function applyTheme(theme) {
    state.theme = theme;
    DOM.html.setAttribute('data-theme', theme);
    localStorage.setItem('moderna_theme', theme);
    if (DOM.themeText) {
      DOM.themeText.textContent = theme === 'dark' ? 'Light Mode' : 'Dark Mode';
    }
  }

  function toggleTheme() {
    applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    showToast(`Switched to ${state.theme === 'dark' ? 'Obsidian Luxe Dark' : 'Alabaster Light'} mode`);
  }

  /* ==========================================================================
     DATA PROCESSING & ENRICHMENT
     ========================================================================== */
  function generateDeterministicPrice(name, features = {}, category = 'Sofa') {
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = (hash << 5) - hash + name.charCodeAt(i);
      hash |= 0;
    }
    const absHash = Math.abs(hash);
    const cat = (category || 'Sofa').toLowerCase();

    let base = 1890;
    if (/chair/i.test(cat)) {
      base = 790;
      if (/swivel/i.test(name)) base = 990;
      else if (/lounge/i.test(name)) base = 890;
    } else if (/bench|ottoman/i.test(cat)) {
      base = 590;
      if (/storage/i.test(name)) base = 790;
      else if (/round|pouf/i.test(name)) base = 490;
    } else if (/console|table/i.test(cat)) {
      base = 1590;
      if (/dresser/i.test(name)) base = 1990;
      else if (/credenza|sideboard/i.test(name)) base = 1790;
    } else if (/tv|media/i.test(cat)) {
      base = 1490;
    } else if (/bed/i.test(cat)) {
      base = 2190;
      if (/king/i.test(name)) base = 2490;
    } else {
      // Sofa
      if (/sectional/i.test(name)) base = 3190;
      else if (/3-?seater/i.test(name)) base = 2190;
      else if (/2-?seater|loveseat/i.test(name)) base = 1490;
    }

    const variance = (absHash % 10) * 80;
    return base + variance;
  }

  function parseDimensions(dimStr) {
    if (!dimStr) return { raw: 'Custom Proportions', width: 95 };
    const wMatch = dimStr.match(/(?:W|Diameter|L):\s*([0-9\.\s/]+)/i);
    let width = 95;
    if (wMatch) {
      const numPart = parseFloat(wMatch[1]);
      if (!isNaN(numPart)) width = numPart;
    }
    return {
      raw: dimStr,
      width: Math.round(width)
    };
  }

  function extractPrice(item, catalog) {
    let rawPrice = item.price;
    if (!rawPrice && Array.isArray(item.variants) && item.variants.length > 0) {
      for (const v of item.variants) {
        if (v.price || v.regular_price || v.member_price) {
          rawPrice = v.price || v.regular_price || v.member_price;
          break;
        }
      }
    }
    if (!rawPrice && item.specifications && item.specifications.Price) {
      rawPrice = item.specifications.Price;
    }
    if (typeof rawPrice === 'number' && rawPrice > 0) {
      return Math.round(rawPrice);
    }
    if (typeof rawPrice === 'string') {
      if (rawPrice.includes('£') || rawPrice.includes('A') || /gbp/i.test(rawPrice)) {
        const num = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
        if (!isNaN(num) && num > 0) return Math.round(num * 1.28);
      }
      if (rawPrice.includes('₹') || /rs|inr/i.test(rawPrice) || (rawPrice.includes('') && !rawPrice.includes('.'))) {
        const num = parseFloat(rawPrice.replace(/[^0-9]/g, ''));
        if (!isNaN(num) && num > 1000) return Math.round(num / 83);
      }
      const num = parseFloat(rawPrice.replace(/[^0-9.]/g, ''));
      if (!isNaN(num) && num > 0) {
        if (num > 20000) return Math.round(num / 83);
        return Math.round(num);
      }
    }
    return generateDeterministicPrice(item.name || '', item.features || {}, catalog.category);
  }

  function enrichProduct(item, index, catalog) {
    const name = item.name || (item.variants && item.variants[0]?.title) || `Luxury Piece #${index + 1}`;
    const desc = item.description || item.overview || '';
    
    // Normalized unified features
    const features = {};
    if (item.features && typeof item.features === 'object') Object.assign(features, item.features);
    if (item.the_essentials && typeof item.the_essentials === 'object') Object.assign(features, item.the_essentials);
    if (item.specifications && typeof item.specifications === 'object') Object.assign(features, item.specifications);
    if (item.details && typeof item.details === 'object') Object.assign(features, item.details);
    if (Array.isArray(item.key_features) && item.key_features.length > 0) {
      features['Key Features'] = item.key_features.join(' · ');
    }

    // Variant details
    const variantColors = [];
    const variantMaterials = [];
    if (Array.isArray(item.variants)) {
      item.variants.forEach(v => {
        if (v.color && typeof v.color === 'string') variantColors.push(v.color);
        if (v.material && typeof v.material === 'string') variantMaterials.push(v.material);
      });
    }

    const textAll = `${name} ${desc} ${variantColors.join(' ')} ${variantMaterials.join(' ')} ${Object.keys(features).join(' ')} ${Object.values(features).join(' ')}`.toLowerCase();

    const cat = (catalog.category || 'Sofa').toLowerCase();
    const isBed = /\bbed\b|\bbeds\b/i.test(cat) && !/bedside/i.test(cat);
    const isChair = /chair/i.test(cat);
    const isBench = /bench|ottoman|pouf/i.test(cat);
    const isDressingTable = /dressing/i.test(cat);
    const isBedside = /bedside/i.test(cat);
    const isConsole = /console/i.test(cat) || (/table/i.test(cat) && !isBedside && !isDressingTable);
    const isTv = /tv|media/i.test(cat);

    // Silhouettes
    const silhouettes = [];
    if (isBed) {
      if (/king/i.test(textAll)) silhouettes.push('King Bed');
      if (/queen/i.test(textAll)) silhouettes.push('Queen Bed');
      if (/platform/i.test(textAll)) silhouettes.push('Platform Bed');
      if (/headboard/i.test(textAll)) silhouettes.push('Upholstered Headboard');
      if (/adjustable/i.test(textAll)) silhouettes.push('Adjustable Headboard');
      if (/ribbed/i.test(textAll)) silhouettes.push('Ribbed Base');
      if (silhouettes.length === 0) silhouettes.push('Modern Bed');
    } else if (isChair) {
      if (/swivel|360|180/i.test(textAll)) silhouettes.push('Swivel Chair');
      if (/lounge/i.test(textAll)) silhouettes.push('Lounge Chair');
      if (/armchair/i.test(textAll)) silhouettes.push('Armchair');
      if (/bar|stool/i.test(textAll)) silhouettes.push('Bar Stool');
      if (/dining/i.test(textAll)) silhouettes.push('Dining Chair');
      if (/club/i.test(textAll)) silhouettes.push('Club Chair');
      if (/wingback|high back/i.test(textAll)) silhouettes.push('High-Back Chair');
      if (silhouettes.length === 0) silhouettes.push('Accent Chair');
    } else if (isBench) {
      if (/storage/i.test(textAll)) silhouettes.push('Storage Ottoman');
      if (/bench/i.test(textAll)) silhouettes.push('Bench');
      if (/round|circle|pouf/i.test(textAll)) silhouettes.push('Round Pouf / Ottoman');
      if (/sectional/i.test(textAll)) silhouettes.push('Sectional Ottoman');
      if (/modular/i.test(textAll)) silhouettes.push('Modular Ottoman');
      if (silhouettes.length === 0) silhouettes.push('Modern Ottoman');
    } else if (isDressingTable) {
      if (/vanity/i.test(textAll)) silhouettes.push('Vanity Set');
      if (/fluted/i.test(textAll)) silhouettes.push('Fluted Cabinet');
      if (/led|mirror/i.test(textAll)) silhouettes.push('LED Mirror Vanity');
      if (/drawer/i.test(textAll)) silhouettes.push('Multi-Drawer Vanity');
      if (silhouettes.length === 0) silhouettes.push('Luxury Dressing Table');
    } else if (isBedside) {
      if (/drawer/i.test(textAll)) silhouettes.push('Drawer Nightstand');
      if (/shelf|open/i.test(textAll)) silhouettes.push('Open Shelf Bedside');
      if (/floating/i.test(textAll)) silhouettes.push('Floating Nightstand');
      if (silhouettes.length === 0) silhouettes.push('Bedside Table');
    } else if (isConsole) {
      if (/console/i.test(textAll)) silhouettes.push('Console Table');
      if (/credenza|sideboard|buffet/i.test(textAll)) silhouettes.push('Credenza & Sideboard');
      if (/entry/i.test(textAll)) silhouettes.push('Entryway Console');
      if (silhouettes.length === 0) silhouettes.push('Architectural Console');
    } else if (isTv) {
      if (/media/i.test(textAll)) silhouettes.push('Media Console');
      if (/stand|low-?profile/i.test(textAll)) silhouettes.push('Low-Profile TV Stand');
      if (/cabinet|drawer|door/i.test(textAll)) silhouettes.push('Cabinet TV Unit');
      if (silhouettes.length === 0) silhouettes.push('TV Entertainment Unit');
    } else {
      // Sofa
      if (/chesterfield/i.test(textAll)) silhouettes.push('Chesterfield');
      if (/sectional/i.test(name) || /sectional/i.test(desc)) silhouettes.push('Sectional');
      if (/3-?seater|3 piece/i.test(name)) silhouettes.push('3-Seater');
      if (/2-?seater|loveseat/i.test(name)) silhouettes.push('2-Seater / Loveseat');
      if (/modular/i.test(textAll)) silhouettes.push('Modular');
      if (/curved|organic/i.test(textAll)) silhouettes.push('Curved Silhouette');
      if (/ottoman/i.test(textAll)) silhouettes.push('With Ottoman');
      if (silhouettes.length === 0) silhouettes.push('Modern Sofa');
    }

    // Colors
    const colors = [];
    if (/\bwhite\b|\bivory\b|\bcream\b|\balabaster\b|\bchampagne\b/i.test(textAll)) colors.push('White');
    if (/\bbeige\b|\bsand\b|\btaupe\b|\boatmeal\b|\bnatural\b/i.test(textAll)) colors.push('Beige');
    if (/\bcamel\b|\bcognac\b|\bcaramel\b|\bmocha\b|\btoffee\b/i.test(textAll)) colors.push('Camel');
    if (/\bgrey\b|\bgray\b|\bcharcoal\b|\bgreige\b|\bgraphite\b/i.test(textAll)) colors.push('Grey');
    if (/\bblack\b|\bnoir\b|\bobsidian\b/i.test(textAll)) colors.push('Black');
    if (/\bgreen\b|\bolive\b|\bemerald\b|\bsage\b|\bpistachio\b|\bteal\b/i.test(textAll)) colors.push('Green');
    if (/\bbrown\b|\bespresso\b|\bwalnut\b|\boak\b|\bacacia\b|\bchocolate\b/i.test(textAll)) colors.push('Brown');
    if (/\bblue\b|\bnavy\b|\bindigo\b|\bazure\b|\bcobalt\b/i.test(textAll)) colors.push('Blue');
    if (colors.length === 0) colors.push(isConsole || isTv ? 'Brown' : 'Beige');

    // Fabrics & Upholstery Materials
    const materials = [];
    if (/boucl[eé]/i.test(textAll)) materials.push('Bouclé');
    if (/velvet/i.test(textAll)) materials.push('Velvet');
    if (/chenille/i.test(textAll)) materials.push('Chenille');
    if (/shearling/i.test(textAll)) materials.push('Shearling');
    if (/linen/i.test(textAll)) materials.push('Linen');
    if (/buff leather|italian leather|leather/i.test(textAll)) {
      if (/buff/i.test(textAll)) materials.push('Buff Leather');
      else if (/italian/i.test(textAll)) materials.push('Italian Leather');
      else materials.push('Leather / Eco-Leather');
    }
    if (/corduroy/i.test(textAll)) materials.push('Corduroy');
    if (materials.length === 0) {
      if (isConsole || isTv) materials.push('Architectural Wood & Metal');
      else if (isBed) materials.push('Solid Wood & Fabric');
      else materials.push('Textured Weave');
    }

    // Wood & Structural Frame Materials
    const frames = [];
    if (/acacia/i.test(textAll)) frames.push('Solid Acacia Wood');
    if (/ash wood|white ash/i.test(textAll)) frames.push('Ash Wood');
    if (/walnut/i.test(textAll)) frames.push('Walnut Veneer');
    if (/oak/i.test(textAll)) frames.push('Oak & Solid Wood');
    if (/rubber wood/i.test(textAll)) frames.push('Solid Rubber Wood');
    if (/plywood|hardwood|hard wood/i.test(textAll)) frames.push('Hardwood & Plywood');
    if (/tempered glass/i.test(textAll)) frames.push('Tempered Glass');
    if (/stainless steel|polished stainless/i.test(textAll)) frames.push('Stainless Steel');
    if (/gun ?metal/i.test(textAll)) frames.push('Gunmetal Finish');
    if (/lacquer/i.test(textAll)) frames.push('Lacquered Wood');
    if (frames.length === 0) {
      if (isConsole || isTv) frames.push('Architectural Wood & Metal');
      else frames.push('Engineered Hardwood Frame');
    }

    // Base & Leg Architecture
    const legs = [];
    if (/360 swivel|360.*swivel|360 degree/i.test(textAll)) legs.push('360° Swivel Base');
    if (/180.*swivel/i.test(textAll)) legs.push('180° Swivel Base');
    if (/metal leg|powder coated leg|iron leg|black metal|steel base/i.test(textAll)) legs.push('Metal Powder-Coated Legs');
    if (/wood leg|wooden leg|solid wood leg|rubber wood leg/i.test(textAll)) legs.push('Solid Wooden Legs');
    if (/glides|subtle glides|low profile/i.test(textAll)) legs.push('Low-Profile Glides');
    if (/gas lift|height adjust/i.test(textAll)) legs.push('Gas-Lift Adjustable');
    if (legs.length === 0) {
      if (isChair) legs.push('Architectural Legs');
      else if (isBed) legs.push('Low-Profile Platform');
      else legs.push('Recessed Glides');
    }

    // Cushion Filling / Padding
    const cushions = [];
    if (/feather|down/i.test(textAll)) cushions.push('Feather & Down Blend');
    if (/40 dns|hr foam|foam/i.test(textAll)) cushions.push('High-Density Foam');
    if (/fiber/i.test(textAll)) cushions.push('Plush Fiber Fill');
    if (/firm/i.test(textAll)) cushions.push('Medium-Firm Seating');
    if (cushions.length === 0) cushions.push(isConsole || isTv ? 'Structural Architecture' : 'Ergonomic Support');

    // Features / Craft
    const craftFeatures = [];
    if (/360 swivel|180.*swivel|swivel/i.test(textAll)) craftFeatures.push('360 Swivel Base');
    if (/storage/i.test(textAll)) craftFeatures.push('Storage Compartment');
    if (/massage|electric recline/i.test(textAll)) craftFeatures.push('Electric Recline & Massage');
    if (/soft closing/i.test(textAll)) craftFeatures.push('Soft Closing Drawers');
    if (/push to open/i.test(textAll)) craftFeatures.push('Push to Open Doors');
    if (/live edge/i.test(textAll)) craftFeatures.push('Live Edge Detail');
    if (/center.*drawer|storage drawer/i.test(textAll)) craftFeatures.push('Center Storage Drawer');
    if (/cable/i.test(textAll)) craftFeatures.push('Cable Management');
    if (/slat/i.test(textAll)) craftFeatures.push('Solid Wood Slats');
    if (/metal legs|metal frame|metal base|powder coated/i.test(textAll)) craftFeatures.push('Reinforced Metal Frame');
    if (/stain resistant|moisture repellent/i.test(textAll)) craftFeatures.push('Stain & Moisture Repellent');
    if (/made in italy/i.test(textAll)) craftFeatures.push('Made in Italy');
    if (/handcrafted/i.test(textAll)) craftFeatures.push('100% Handcrafted');

    // Assembly & Installation
    const assembly = [];
    if (/fully assembled|none, delivered|none - arrives|no assembly|none required/i.test(textAll)) {
      assembly.push('Arrives Fully Assembled');
    } else if (/attach legs|attach the legs|slot frames|slot together|simple setup|minimal/i.test(textAll)) {
      assembly.push('Minimal - Attach Legs Only');
    } else if (/assembly required|taskrabbit|professional assembly|yes - free assembly/i.test(textAll)) {
      assembly.push('Assembly Required');
    } else {
      assembly.push('Minimal Setup');
    }

    // Price
    const price = extractPrice(item, catalog);
    const monthly = Math.round(price / 24);

    // Dimension
    let rawDim = features.Dimension || features.Size || features.raw || (item.dimensions && (item.dimensions.raw || item.dimensions.INCH || item.dimensions.CM || item.dimensions['Total Height'])) || null;
    const dims = parseDimensions(rawDim);

    // Images & Dimension Blueprint
    const defaultPlaceholder = isBed
      ? 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/can_you_create_a_front_facing_view_of_this_bed.png?v=1768416515'
      : (isChair
        ? 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/akira_accent_chair_front_png.png'
        : 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png');

    let images = [];
    if (Array.isArray(item.images)) {
      item.images.forEach(img => {
        if (img && typeof img === 'string' && !images.includes(img)) images.push(img);
      });
    }
    if (Array.isArray(item.variants)) {
      item.variants.forEach(v => {
        if (Array.isArray(v.images)) {
          v.images.forEach(img => {
            if (img && typeof img === 'string' && !images.includes(img)) images.push(img);
          });
        } else if (v.image && typeof v.image === 'string' && !images.includes(v.image)) {
          images.push(v.image);
        }
      });
    }
    const dimensionImage = item.dimension_image || null;
    if (dimensionImage && !images.includes(dimensionImage)) {
      images.push(dimensionImage);
    }
    if (images.length === 0) {
      images.push(defaultPlaceholder);
    }

    // Video detection across item.videos, images, descriptions and features
    const videoRegex = /\b(video|\.mp4|\.webm|\.mov|youtube|vimeo)\b/i;
    const rawVids = Array.isArray(item.videos) ? item.videos : (item.videos ? [item.videos] : []);
    const videoUrls = rawVids.map(v => (typeof v === 'string' ? v : (v?.url || ''))).filter(Boolean);
    const detectedVideos = [...videoUrls, ...images.filter(url => videoRegex.test(url))];
    const hasVideo = detectedVideos.length > 0;

    // Media & Documentation Assets
    const mediaAssets = [];
    if (hasVideo) mediaAssets.push('HD Video (1080p MP4)');
    if (images.length >= 10) mediaAssets.push('10+ High-Res Photos');
    if (dimensionImage) mediaAssets.push('Blueprint Dimensions Included');

    let bNorm = catalog.brand || item.brand || 'Modani';
    if (/estre/i.test(bNorm)) bNorm = 'Estré';
    else if (/bay\s*window/i.test(bNorm)) bNorm = 'Bay Window';
    else if (/ifur/i.test(bNorm)) bNorm = 'iFur';
    else if (/ghara?ana/i.test(bNorm)) bNorm = 'Gharaana';
    else if (/indian\s*nest/i.test(bNorm)) bNorm = 'Indian Nest';
    else if (/rove/i.test(bNorm)) bNorm = 'Rove Concepts';
    else if (/danetti/i.test(bNorm)) bNorm = 'Danetti';
    else if (/living\s*shapes/i.test(bNorm)) bNorm = 'Living Shapes';
    else if (/duraster/i.test(bNorm)) bNorm = 'Duraster';
    else if (/modani/i.test(bNorm)) bNorm = 'Modani';
    const brandName = bNorm;

    // Badges
    const badges = [];
    if (hasVideo) badges.push({ text: 'HD Video', type: 'badge-gold' });
    if (craftFeatures.includes('360 Swivel Base')) badges.push({ text: '360 Swivel', type: 'badge-gold' });
    else if (craftFeatures.includes('Electric Recline & Massage')) badges.push({ text: 'Massage Recliner', type: 'badge-gold' });
    else if (materials.includes('Buff Leather')) badges.push({ text: 'Buff Leather', type: 'badge-charcoal' });
    else if (materials.includes('Italian Leather')) badges.push({ text: 'Italian Leather', type: 'badge-gold' });
    else if (materials.includes('Bouclé')) badges.push({ text: 'Bouclé Luxe', type: 'badge-gold' });
    else if (materials.includes('Velvet')) badges.push({ text: 'Plush Velvet', type: 'badge-sage' });
    else if (silhouettes.includes('Chesterfield')) badges.push({ text: 'Chesterfield', type: 'badge-charcoal' });
    else if (silhouettes.includes('Sectional')) badges.push({ text: 'Sectional', type: 'badge-charcoal' });
    else badges.push({ text: 'Curated Craft', type: 'badge-outline' });

    return {
      id: `${catalog.id}-${index}`,
      originalIndex: index,
      name,
      url: item.url || (item.variants && item.variants[0]?.url) || `https://modani.com`,
      brand: brandName,
      category: catalog.category || 'Sofa',
      catalogId: catalog.id,
      images,
      dimensionImage,
      videos: detectedVideos,
      videoCount: detectedVideos.length,
      hasVideo,
      description: desc,
      features,
      price,
      monthly,
      dimensions: dims,
      silhouettes,
      colors,
      materials,
      frames,
      legs,
      cushions,
      craftFeatures,
      assembly,
      mediaAssets,
      badges
    };
  }

  /* ==========================================================================
     CATALOG MANAGEMENT (DISCOVERY & SWITCHING)
     ========================================================================== */
  async function initCatalogs() {
    let catalogs = [];

    // Try fetching catalog-manifest.json
    try {
      const res = await fetch('catalog-manifest.json');
      if (res.ok) {
        const manifest = await res.json();
        if (manifest.catalogs && manifest.catalogs.length > 0) {
          catalogs = manifest.catalogs;
        }
      }
    } catch {
      // Offline fallback: Use preloaded bundle
      if (window.PRELOADED_MANIFEST && window.PRELOADED_MANIFEST.catalogs) {
        catalogs = window.PRELOADED_MANIFEST.catalogs;
      }
    }

    if (catalogs.length === 0 && window.PRELOADED_MANIFEST && window.PRELOADED_MANIFEST.catalogs) {
      catalogs = window.PRELOADED_MANIFEST.catalogs;
    }

    // Merge any locally imported custom catalogs from localStorage
    const savedCustom = JSON.parse(localStorage.getItem('moderna_custom_catalogs') || '[]');
    savedCustom.forEach(c => {
      if (!catalogs.some(x => x.id === c.id)) {
        catalogs.push(c);
      }
    });

    state.catalogs = catalogs;

    // Load and enrich ALL items across all 24 catalogs into unified state.catalogDatabase
    const unifiedDatabase = [];
    for (const catalog of catalogs) {
      let rawItems = null;
      if (window.PRELOADED_DATA && window.PRELOADED_DATA[catalog.id]) {
        rawItems = window.PRELOADED_DATA[catalog.id];
      } else {
        try {
          const res = await fetch(encodeURI(catalog.relativePath));
          if (res.ok) {
            rawItems = await res.json();
          }
        } catch (err) {
          console.warn(`Could not fetch ${catalog.relativePath}:`, err);
        }
      }

      if (Array.isArray(rawItems)) {
        rawItems.forEach((item, idx) => {
          unifiedDatabase.push(enrichProduct(item, idx, catalog));
        });
      }
    }

    state.catalogDatabase = unifiedDatabase;
    state.activeCategory = 'Sofa';
    updateCategoryAndBrandPool();

    // Wire Breadcrumb Click Handlers
    if (DOM.crumbBrands) {
      DOM.crumbBrands.addEventListener('click', (e) => {
        e.preventDefault();
        showBrandsDirectory();
      });
    }
    if (DOM.crumbBrand) {
      DOM.crumbBrand.addEventListener('click', (e) => {
        e.preventDefault();
        showBrandsDirectory();
      });
    }
    if (DOM.crumbHome) {
      DOM.crumbHome.addEventListener('click', (e) => {
        e.preventDefault();
        resetAllToHome();
      });
    }
    if (DOM.crumbCategory) {
      DOM.crumbCategory.addEventListener('click', (e) => {
        e.preventDefault();
        selectCategory(state.activeCategory);
      });
    }
    if (DOM.btnBackToCatalog) {
      DOM.btnBackToCatalog.addEventListener('click', (e) => {
        e.preventDefault();
        hideBrandsDirectory();
      });
    }

    // Render Initial UI
    renderCategoryNav();
    renderBrandsDirectory();
    renderSidebarFilters();
    renderQuickFilterPills();
    updateBreadcrumbs();
    updateHeroInfo();
    updateMediaAuditStats();
    applyFiltersAndSort();
    renderCatalogHubList();

    // Check if URL hash specifies a product to open directly
    checkUrlProductHash();
    window.addEventListener('hashchange', checkUrlProductHash);
  }

  function checkUrlProductHash() {
    if (window.location.hash.startsWith('#product=')) {
      const prodId = decodeURIComponent(window.location.hash.replace('#product=', ''));
      const found = state.catalogDatabase.find(p => p.id === prodId);
      if (found) {
        openQuickView(found);
      }
    }
  }

  function updateCategoryAndBrandPool() {
    let pool = [...state.catalogDatabase];
    if (state.selectedCategories.size > 0) {
      pool = pool.filter(p => state.selectedCategories.has(p.category));
    } else if (state.activeCategory && state.activeCategory !== 'all') {
      pool = pool.filter(p => p.category.toLowerCase() === state.activeCategory.toLowerCase());
    }
    if (state.selectedBrands.size > 0) {
      pool = pool.filter(p => state.selectedBrands.has(p.brand));
    }
    if (state.selectedCatalogs.size > 0) {
      pool = pool.filter(p => state.selectedCatalogs.has(p.catalogId));
    }
    state.allProducts = pool;
  }

  function updateBreadcrumbs() {
    if (DOM.crumbCategory) {
      if (state.selectedCategories.size === 1) {
        DOM.crumbCategory.textContent = [...state.selectedCategories][0];
      } else if (state.selectedCategories.size > 1) {
        DOM.crumbCategory.textContent = `${state.selectedCategories.size} Categories`;
      } else if (state.activeCategory && state.activeCategory !== 'all') {
        DOM.crumbCategory.textContent = state.activeCategory;
      } else {
        DOM.crumbCategory.textContent = 'All Categories';
      }
    }
    if (DOM.crumbBrand) {
      if (state.selectedBrands.size === 1) {
        DOM.crumbBrand.textContent = [...state.selectedBrands][0];
      } else if (state.selectedBrands.size > 1) {
        DOM.crumbBrand.textContent = `${state.selectedBrands.size} Brands Selected`;
      } else {
        DOM.crumbBrand.textContent = 'All Brands';
      }
    }
  }

  const HERO_CONTENT_MAP = {
    'Sofa': {
      tag: 'CONTEMPORARY SOFAS',
      heading: 'Sculptural Forms & <em>Modern Living</em>',
      subtext: `Immerse yourself in our curated selection of 259 handcrafted sofas, sectionals, and organic silhouettes across Modani, Danetti, Living Shapes, and Duraster. Designed with tactile bouclé textures, rich velvets, and precision engineering.`,
      placeholder: 'Search sofas, sectionals, bouclé, beige, 95"...'
    },
    'Accent Chair': {
      tag: 'ACCENT & LOUNGE SEATING',
      heading: 'Statement Seating & <em>Sculpted Comfort</em>',
      subtext: `Elevate your sanctuary with 147 handcrafted accent and lounge chairs across Danetti, Living Shapes, Modani, and Rove Concepts. Featuring 360-degree swivel mechanisms, massage recline, tactile bouclé, and ergonomic wood architecture.`,
      placeholder: 'Search lounge chairs, 360 swivel, bouclé, velvet, walnut...'
    },
    'Beds': {
      tag: 'BEDROOM & SUITE',
      heading: 'Architectural Comfort & <em>Serene Sanctuaries</em>',
      subtext: `Immerse yourself in our bedroom suite: handcrafted low-profile platform frames, plush upholstered headboards, and solid-wood foundations across Danetti, Modani, and Living Shapes.`,
      placeholder: 'Search beds, king size, platform, bouclé, velvet, oak...'
    },
    'Bedside table': {
      tag: 'BEDSIDE ARCHITECTURE',
      heading: 'Artisan Nightstands & <em>Quiet Function</em>',
      subtext: `Curated bedside tables and nightstands crafted with soft-closing drawers, ribbed architectural accents, and solid wood frames by Danetti and Living Shapes.`,
      placeholder: 'Search bedside tables, nightstands, walnut, soft close...'
    },
    'Benches': {
      tag: 'BENCHES & OTTOMANS',
      heading: 'Versatile Accents & <em>Plush Form</em>',
      subtext: `Discover 44 sculptural ottomans, storage benches, and poufs across Modani, Danetti, and Living Shapes. Engineered with tactile chenille, Italian leather, and discrete storage.`,
      placeholder: 'Search ottomans, storage benches, round poufs, leather, bouclé...'
    },
    'Console Table': {
      tag: 'CONSOLES & SURFACES',
      heading: 'Artisan Surfaces & <em>Architectural Storage</em>',
      subtext: `Explore console tables, dressers, and credenzas by Modani and Danetti. Handcrafted with solid acacia wood, live-edge finishes, polished stainless steel, and soft-closing drawer engineering.`,
      placeholder: 'Search console tables, live edge, acacia wood, stainless steel...'
    },
    'Dinning Chair': {
      tag: 'DINING COLLECTIONS',
      heading: 'Sculpted Dining & <em>Effortless Swivel</em>',
      subtext: `Explore 64 contemporary dining chairs by Danetti featuring 180° self-correcting swivel bases, rich velvet and chenille upholstery, and tailored metal foundations.`,
      placeholder: 'Search dining chairs, swivel, mocha, velvet, champagne...'
    },
    'Bar Chair': {
      tag: 'BAR & COUNTER SEATING',
      heading: 'Elevated Angles & <em>Counter Architecture</em>',
      subtext: `Contemporary bar stools and counter seating by Danetti. Designed for kitchen islands and refined cocktail lounges with gas-lift mechanisms and plush seating.`,
      placeholder: 'Search bar stools, counter chairs, swivel, velvet...'
    },
    'Tv Unit': {
      tag: 'MEDIA & TV CONSOLES',
      heading: 'Cinematic Elegance & <em>Modern Entertainment</em>',
      subtext: `Refine your living space with minimalist TV units and media consoles by Modani, Rove Concepts, and Danetti. Built with push-to-open doors, gunmetal accents, and discrete cable management.`,
      placeholder: 'Search TV stands, media consoles, gunmetal, push to open...'
    },
    'Dressing Table': {
      tag: 'VANITY & DRESSING TABLES',
      heading: 'Sculpted Vanities &amp; <em>Modern Elegance</em>',
      subtext: `Discover bespoke vanity dressing tables by iFur. Designed with contemporary fluted storage cabinets, brushed metal hardware, and curated architectural lines.`,
      placeholder: 'Search dressing tables, vanity sets, fluted storage, mirrors...'
    }
  };

  function updateHeroInfo() {
    const singleBrand = state.selectedBrands.size === 1 ? [...state.selectedBrands][0] : null;
    const cat = state.activeCategory && state.activeCategory !== 'all' ? state.activeCategory : 'All';
    const totalCount = state.allProducts.length;
    const totalBrandCount = [...new Set(state.catalogDatabase.map(p => p.brand))].length || 10;

    if (singleBrand) {
      const meta = BRANDS_METADATA[singleBrand] || { tagline: 'Curated Atelier', description: '' };
      DOM.heroBrandTag.textContent = `${singleBrand.toUpperCase()} ATELIER`;
      DOM.heroCategoryTag.textContent = cat === 'All' ? 'CURATED ATELIER' : `${cat.toUpperCase()} COLLECTION`;
      if (DOM.heroMainHeading) {
        DOM.heroMainHeading.innerHTML = `${singleBrand} &amp; <em>${meta.tagline}</em>`;
      }
      if (DOM.heroSubtext) {
        DOM.heroSubtext.textContent = meta.description || `Discover ${totalCount} handcrafted pieces from ${singleBrand}, crafted for discerning architectural spaces.`;
      }
      DOM.activeCatalogDisplay.textContent = `${singleBrand} · ${cat === 'All' ? 'Full Atelier' : cat}`;
      DOM.activeItemCountText.textContent = `${totalCount} Pieces Loaded`;
      DOM.activeFileText.textContent = `${singleBrand.toLowerCase()}_catalog`;
      document.title = `${singleBrand} | Plypicker Luxury Living`;
    } else {
      const hero = HERO_CONTENT_MAP[cat] || {
        tag: 'CURATED COLLECTION',
        heading: 'Sculptural Forms &amp; <em>Modern Living</em>',
        subtext: `Immerse yourself in our curated selection of ${totalCount} handcrafted pieces across ${totalBrandCount} world-class design houses.`,
        placeholder: 'Search all catalogs, bouclé, beige, swivel, oak...'
      };
      DOM.heroBrandTag.textContent = state.selectedBrands.size > 1
        ? `${state.selectedBrands.size} BRANDS SELECTED`
        : `PLYPICKER · ${totalBrandCount} BRANDS`;
      DOM.heroCategoryTag.textContent = cat === 'All' ? 'ALL FURNITURE' : (hero.tag || `${cat.toUpperCase()}`);
      if (DOM.heroMainHeading) DOM.heroMainHeading.innerHTML = hero.heading;
      if (DOM.heroSubtext) DOM.heroSubtext.textContent = hero.subtext;
      DOM.activeCatalogDisplay.textContent = `${cat === 'All' ? 'All Collections' : cat} · ${totalBrandCount} Brands`;
      DOM.activeItemCountText.textContent = `${totalCount} Pieces Loaded`;
      DOM.activeFileText.textContent = `${state.catalogs.length} Catalogs Loaded`;
      if (DOM.globalSearchInput) DOM.globalSearchInput.placeholder = hero.placeholder || 'Search pieces...';
      document.title = `${cat} | Plypicker Luxury Living`;
    }
  }

  /* ==========================================================================
     BRANDS DIRECTORY SCREEN (Opened via Breadcrumbs)
     ========================================================================== */
  function renderBrandsDirectory() {
    if (!DOM.brandsDirectoryGrid) return;
    DOM.brandsDirectoryGrid.innerHTML = '';

    const allBrandNames = Object.keys(BRANDS_METADATA);

    allBrandNames.forEach(brandName => {
      const meta = BRANDS_METADATA[brandName] || {
        name: brandName,
        subtitle: `${brandName} Atelier`,
        tagline: 'Luxury Furniture',
        description: 'Exclusive handcrafted furniture designed for luxury living.',
        origin: 'Curated Studio',
        badge: 'Luxury Atelier',
        monogram: brandName.substring(0, 2).toUpperCase(),
        accentColor: '#C5A880',
        banner: 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png'
      };

      const brandProducts = state.catalogDatabase.filter(p => p.brand.toLowerCase() === brandName.toLowerCase());
      const totalCount = brandProducts.length;

      // Extract 4 preview images
      const previewImages = [];
      for (const p of brandProducts) {
        if (p.images && p.images[0] && !previewImages.includes(p.images[0])) {
          previewImages.push(p.images[0]);
          if (previewImages.length >= 4) break;
        }
      }
      while (previewImages.length < 4) {
        previewImages.push(meta.banner || 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png');
      }

      // Categories
      const catMap = {};
      brandProducts.forEach(p => {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
      });

      const card = document.createElement('div');
      card.className = 'brand-showcase-card';
      card.setAttribute('data-brand', brandName);
      card.innerHTML = `
        <div>
          <div class="brand-card-top">
            <div class="brand-card-brand-info">
              <div class="brand-card-monogram" style="border-color:${meta.accentColor};">${meta.monogram}</div>
              <div class="brand-card-title-group">
                <h3>${meta.name}</h3>
                <div class="brand-card-origin">${meta.origin} · ${meta.tagline}</div>
              </div>
            </div>
            <span class="brand-card-piece-badge">${totalCount} Pieces</span>
          </div>

          <p class="brand-card-desc">${meta.description}</p>

          <div class="brand-card-collage">
            ${previewImages.map(img => `
              <div class="brand-card-thumb-wrap">
                <img src="${img}" alt="${meta.name}" loading="lazy" onerror="this.src='https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png'">
              </div>
            `).join('')}
          </div>

          <div class="brand-card-categories">
            ${Object.entries(catMap).map(([cat, cnt]) => `
              <span class="brand-cat-pill" data-cat="${cat}" title="Browse ${meta.name} ${cat}">${cat} (${cnt})</span>
            `).join('')}
          </div>
        </div>

        <button class="brand-card-cta-btn" type="button">
          <span>Explore ${meta.name} Collection</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
        </button>
      `;

      card.querySelectorAll('.brand-cat-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
          e.stopPropagation();
          const targetCat = pill.dataset.cat;
          selectBrandAndCategory(brandName, targetCat);
        });
      });

      card.addEventListener('click', () => {
        selectBrandFromDirectory(brandName);
      });

      DOM.brandsDirectoryGrid.appendChild(card);
    });
  }

  function showBrandsDirectory() {
    state.viewMode = 'brands-directory';
    if (DOM.brandsDirectorySection) DOM.brandsDirectorySection.style.display = 'block';
    if (DOM.contentContainer) DOM.contentContainer.style.display = 'none';
    if (DOM.listingToolbar) DOM.listingToolbar.style.display = 'none';
    renderBrandsDirectory();
    if (DOM.brandsDirectorySection) {
      window.scrollTo({ top: DOM.brandsDirectorySection.offsetTop - 40, behavior: 'smooth' });
    }
  }

  function hideBrandsDirectory() {
    state.viewMode = 'catalog';
    if (DOM.brandsDirectorySection) DOM.brandsDirectorySection.style.display = 'none';
    if (DOM.contentContainer) DOM.contentContainer.style.display = 'flex';
    if (DOM.listingToolbar) DOM.listingToolbar.style.display = 'flex';
  }

  function selectBrandFromDirectory(brandName) {
    state.selectedBrands.clear();
    state.selectedBrands.add(brandName);
    state.selectedCatalogs.clear();
    state.activeCategory = 'all';
    hideBrandsDirectory();
    updateCategoryAndBrandPool();
    updateBreadcrumbs();
    updateHeroInfo();
    renderCategoryNav();
    renderSidebarFilters();
    renderQuickFilterPills();
    applyFiltersAndSort();
    if (DOM.contentContainer) {
      window.scrollTo({ top: DOM.contentContainer.offsetTop - 80, behavior: 'smooth' });
    }
    showToast(`Displaying ${brandName} collection`, '✨');
  }

  function selectBrandAndCategory(brandName, category) {
    state.selectedBrands.clear();
    state.selectedBrands.add(brandName);
    state.selectedCatalogs.clear();
    state.activeCategory = category;
    hideBrandsDirectory();
    updateCategoryAndBrandPool();
    updateBreadcrumbs();
    updateHeroInfo();
    renderCategoryNav();
    renderSidebarFilters();
    renderQuickFilterPills();
    applyFiltersAndSort();
    if (DOM.contentContainer) {
      window.scrollTo({ top: DOM.contentContainer.offsetTop - 80, behavior: 'smooth' });
    }
    showToast(`Displaying ${brandName} · ${category}`, '✨');
  }

  function resetAllToHome() {
    state.activeCategory = 'all';
    state.selectedBrands.clear();
    state.selectedCatalogs.clear();
    hideBrandsDirectory();
    resetFilters(false);
    updateCategoryAndBrandPool();
    updateBreadcrumbs();
    updateHeroInfo();
    renderCategoryNav();
    renderSidebarFilters();
    renderQuickFilterPills();
    applyFiltersAndSort();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Showing all 696 handcrafted pieces across 5 brands`, '🏛️');
  }

  function selectCategory(cat) {
    state.selectedCategories.clear();
    if (cat !== 'all') {
      state.selectedCategories.add(cat);
    }
    state.activeCategory = cat;
    state.quickFilter = 'all';
    hideBrandsDirectory();
    updateCategoryAndBrandPool();
    updateBreadcrumbs();
    updateHeroInfo();
    renderCategoryNav();
    renderSidebarFilters();
    renderQuickFilterPills();
    applyFiltersAndSort();
    if (DOM.contentContainer) {
      window.scrollTo({ top: DOM.contentContainer.offsetTop - 80, behavior: 'smooth' });
    }
  }

  /* ==========================================================================
     CATEGORY NAVIGATION BAR
     ========================================================================== */
  function renderCategoryNav() {
    DOM.categoryNavList.innerHTML = '';

    const categoriesMap = new Map();
    const brandPool = state.selectedBrands.size > 0
      ? state.catalogDatabase.filter(p => state.selectedBrands.has(p.brand))
      : state.catalogDatabase;

    brandPool.forEach(p => {
      categoriesMap.set(p.category, (categoriesMap.get(p.category) || 0) + 1);
    });

    const activeCat = (state.selectedCategories.size === 1)
      ? [...state.selectedCategories][0]
      : (state.selectedCategories.size > 1 ? 'multiple' : state.activeCategory || 'all');

    // 1. "All" pill
    const allBtn = document.createElement('button');
    allBtn.className = `category-nav-item ${activeCat === 'all' ? 'active' : ''}`;
    allBtn.innerHTML = `
      <span>All</span>
      <span class="count-badge">${brandPool.length}</span>
    `;
    allBtn.addEventListener('click', () => {
      selectCategory('all');
    });
    DOM.categoryNavList.appendChild(allBtn);

    // 2. Each Category pill
    categoriesMap.forEach((count, cat) => {
      const btn = document.createElement('button');
      btn.className = `category-nav-item ${cat === activeCat ? 'active' : ''}`;
      btn.innerHTML = `
        <span>${cat}</span>
        <span class="count-badge">${count}</span>
      `;
      btn.addEventListener('click', () => {
        selectCategory(cat);
      });
      DOM.categoryNavList.appendChild(btn);
    });
  }

  /* ==========================================================================
     QUICK FILTER PILLS
     ========================================================================== */
  function renderQuickFilterPills() {
    const cat = (state.activeCategory || 'Sofa').toLowerCase();

    let pills = [];
    if (/chair/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All Chairs', count: state.allProducts.length },
        { id: 'swivel', label: '360 Swivel', count: state.allProducts.filter(p => p.craftFeatures.includes('360 Swivel Base') || p.silhouettes.includes('Swivel Chair')).length },
        { id: 'lounge', label: 'Lounge Chairs', count: state.allProducts.filter(p => p.silhouettes.includes('Lounge Chair')).length },
        { id: 'boucle', label: 'Bouclé Luxe', count: state.allProducts.filter(p => p.materials.includes('Bouclé')).length },
        { id: 'velvet', label: 'Plush Velvet', count: state.allProducts.filter(p => p.materials.includes('Velvet')).length },
        { id: 'oak', label: 'Wood & Walnut', count: state.allProducts.filter(p => p.materials.includes('Oak & Solid Wood') || p.materials.includes('Walnut Veneer')).length },
        { id: 'video', label: 'With HD Video', count: state.allProducts.filter(p => p.hasVideo).length },
        { id: 'white', label: 'White & Ivory', count: state.allProducts.filter(p => p.colors.includes('White')).length },
        { id: 'neutral', label: 'Camel & Warm Tones', count: state.allProducts.filter(p => p.colors.includes('Camel') || p.colors.includes('Beige')).length }
      ];
    } else if (/bench|ottoman/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All Benches & Poufs', count: state.allProducts.length },
        { id: 'storage', label: 'With Storage', count: state.allProducts.filter(p => p.craftFeatures.includes('Storage Compartment') || p.silhouettes.includes('Storage Ottoman')).length },
        { id: 'leather', label: 'Italian Leather', count: state.allProducts.filter(p => p.materials.includes('Italian Leather') || p.materials.includes('Leather / Eco-Leather')).length },
        { id: 'bouclevelvet', label: 'Bouclé & Velvet', count: state.allProducts.filter(p => p.materials.includes('Bouclé') || p.materials.includes('Velvet')).length },
        { id: 'pouf', label: 'Round Poufs', count: state.allProducts.filter(p => p.silhouettes.includes('Round Pouf / Ottoman')).length },
        { id: 'video', label: 'With HD Video', count: state.allProducts.filter(p => p.hasVideo).length },
        { id: 'neutral', label: 'Beige & Warm Tones', count: state.allProducts.filter(p => p.colors.includes('Beige') || p.colors.includes('Camel')).length },
        { id: 'grey', label: 'Grey & Charcoal', count: state.allProducts.filter(p => p.colors.includes('Grey') || p.colors.includes('Black')).length }
      ];
    } else if (/console|table/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All Consoles & Tables', count: state.allProducts.length },
        { id: 'acacia', label: 'Solid Acacia Wood', count: state.allProducts.filter(p => p.materials.includes('Solid Acacia Wood')).length },
        { id: 'liveedge', label: 'Live Edge Detail', count: state.allProducts.filter(p => p.craftFeatures.includes('Live Edge Detail')).length },
        { id: 'softclose', label: 'Soft-Close Drawers', count: state.allProducts.filter(p => p.craftFeatures.includes('Soft Closing Drawers')).length },
        { id: 'glass', label: 'Tempered Glass', count: state.allProducts.filter(p => p.materials.includes('Tempered Glass')).length },
        { id: 'white', label: 'Alabaster & White', count: state.allProducts.filter(p => p.colors.includes('White')).length },
        { id: 'neutral', label: 'Warm Wood Tones', count: state.allProducts.filter(p => p.colors.includes('Brown') || p.colors.includes('Camel')).length }
      ];
    } else if (/tv|media/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All TV Units', count: state.allProducts.length },
        { id: 'pushtoopen', label: 'Push to Open Doors', count: state.allProducts.filter(p => p.craftFeatures.includes('Push to Open Doors')).length },
        { id: 'gunmetal', label: 'Gunmetal & Graphite', count: state.allProducts.filter(p => p.materials.includes('Gunmetal Finish') || p.colors.includes('Grey')).length },
        { id: 'white', label: 'Alabaster & White', count: state.allProducts.filter(p => p.colors.includes('White')).length },
        { id: 'large80', label: 'Large (80"+ Wide)', count: state.allProducts.filter(p => p.dimensions.width >= 80).length },
        { id: 'centerdrawer', label: 'Center Drawer', count: state.allProducts.filter(p => p.craftFeatures.includes('Center Storage Drawer')).length }
      ];
    } else if (/bed/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All Beds', count: state.allProducts.length },
        { id: 'king', label: 'King Size Beds', count: state.allProducts.filter(p => p.silhouettes.includes('King Bed')).length },
        { id: 'queen', label: 'Queen Beds', count: state.allProducts.filter(p => p.silhouettes.includes('Queen Bed')).length },
        { id: 'platform', label: 'Platform Beds', count: state.allProducts.filter(p => p.silhouettes.includes('Platform Bed')).length },
        { id: 'boucle', label: 'Bouclé Luxe', count: state.allProducts.filter(p => p.materials.includes('Bouclé')).length },
        { id: 'velvet', label: 'Plush Velvet', count: state.allProducts.filter(p => p.materials.includes('Velvet')).length },
        { id: 'oak', label: 'Oak & Wood Frame', count: state.allProducts.filter(p => p.materials.includes('Oak & Solid Wood')).length },
        { id: 'neutral', label: 'Beige & Warm Tones', count: state.allProducts.filter(p => p.colors.includes('Beige') || p.colors.includes('Camel')).length },
        { id: 'white', label: 'White & Ivory', count: state.allProducts.filter(p => p.colors.includes('White')).length }
      ];
    } else if (/dressing/i.test(cat)) {
      pills = [
        { id: 'all', label: 'All Dressing Tables', count: state.allProducts.length },
        { id: 'vanity', label: 'Vanity Suites', count: state.allProducts.filter(p => p.silhouettes.includes('Vanity Set') || p.silhouettes.includes('Luxury Dressing Table')).length },
        { id: 'fluted', label: 'Fluted Detail', count: state.allProducts.filter(p => p.craftFeatures.includes('Fluted Detail') || p.silhouettes.includes('Fluted Cabinet')).length },
        { id: 'softclose', label: 'Soft-Close Drawers', count: state.allProducts.filter(p => p.craftFeatures.includes('Soft Closing Drawers')).length },
        { id: 'neutral', label: 'Cream & Wood Tones', count: state.allProducts.filter(p => p.colors.includes('White') || p.colors.includes('Beige') || p.colors.includes('Camel')).length }
      ];
    } else {
      // Sofa or All
      pills = [
        { id: 'all', label: cat === 'all' ? 'All Pieces' : 'All Sofas', count: state.allProducts.length },
        { id: 'sectional', label: 'Sectionals & L-Shape', count: state.allProducts.filter(p => p.silhouettes.includes('Sectional')).length },
        { id: '3seater', label: '3-Seater Sofas', count: state.allProducts.filter(p => p.silhouettes.includes('3-Seater')).length },
        { id: 'curved', label: 'Curved Silhouette', count: state.allProducts.filter(p => p.silhouettes.includes('Curved Silhouette')).length },
        { id: 'boucle', label: 'Bouclé Luxe', count: state.allProducts.filter(p => p.materials.includes('Bouclé')).length },
        { id: 'neutral', label: 'Beige & Warm Tones', count: state.allProducts.filter(p => p.colors.includes('Beige') || p.colors.includes('Camel')).length },
        { id: 'white', label: 'White & Ivory', count: state.allProducts.filter(p => p.colors.includes('White')).length },
        { id: 'feather', label: 'Feather-Down Fill', count: state.allProducts.filter(p => p.cushions.includes('Feather & Down Blend')).length },
        { id: 'livesmart', label: 'Performance Fabric', count: state.allProducts.filter(p => p.materials.includes('LiveSmart Performance')).length }
      ];
    }

    DOM.quickPillsRow.innerHTML = '';
    pills.forEach(pill => {
      if (pill.count === 0 && pill.id !== 'all') return;
      const btn = document.createElement('button');
      btn.className = `quick-pill ${state.quickFilter === pill.id ? 'active' : ''}`;
      btn.dataset.id = pill.id;
      btn.innerHTML = `<span>${pill.label}</span> <span class="pill-count">(${pill.count})</span>`;
      btn.addEventListener('click', () => {
        state.quickFilter = pill.id;
        renderQuickFilterPills();
        applyFiltersAndSort();
      });
      DOM.quickPillsRow.appendChild(btn);
    });
  }

  /* ==========================================================================
     SIDEBAR FILTERS RENDERING
     ========================================================================== */
  function renderSidebarFilters() {
    // 1. Category & Type Filter (FIRST)
    if (DOM.filterCategoriesList) {
      DOM.filterCategoriesList.innerHTML = '';
      const allCategories = [
        'Sofa',
        'Accent Chair',
        'Dinning Chair',
        'Beds',
        'Benches',
        'Bedside table',
        'Console Table',
        'Dressing Table',
        'Tv Unit'
      ];

      const brandPool = state.selectedBrands.size > 0
        ? state.catalogDatabase.filter(p => state.selectedBrands.has(p.brand))
        : state.catalogDatabase;

      allCategories.forEach(cat => {
        const count = brandPool.filter(p => p.category.toLowerCase() === cat.toLowerCase()).length;
        const isChecked = state.selectedCategories.has(cat);
        const item = document.createElement('label');
        item.className = 'filter-checkbox-label';
        item.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${cat}" ${isChecked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${isChecked ? '✓' : ''}</div>
            <span style="font-weight:${isChecked ? '600' : '400'}; color:${isChecked ? 'var(--accent-gold)' : 'inherit'};">${cat}</span>
          </div>
          <span class="filter-item-count">${count}</span>
        `;
        item.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) {
            state.selectedCategories.add(cat);
          } else {
            state.selectedCategories.delete(cat);
          }
          if (state.selectedCategories.size === 1) {
            state.activeCategory = [...state.selectedCategories][0];
          } else if (state.selectedCategories.size === 0) {
            state.activeCategory = 'all';
          }
          updateCategoryAndBrandPool();
          updateBreadcrumbs();
          updateHeroInfo();
          renderCategoryNav();
          renderSidebarFilters();
          applyFiltersAndSort();
        });
        DOM.filterCategoriesList.appendChild(item);
      });
    }

    // 2. Brand & Atelier Filter (SECOND)
    if (DOM.filterBrandsList) {
      DOM.filterBrandsList.innerHTML = '';
      const allBrands = [
        'Modani',
        'Danetti',
        'Living Shapes',
        'Duraster',
        'Rove Concepts',
        'Estré',
        'Bay Window',
        'iFur',
        'Gharaana',
        'Indian Nest'
      ];

      let catPool = state.catalogDatabase;
      if (state.selectedCategories.size > 0) {
        catPool = state.catalogDatabase.filter(p => state.selectedCategories.has(p.category));
      } else if (state.activeCategory && state.activeCategory !== 'all') {
        catPool = state.catalogDatabase.filter(p => p.category.toLowerCase() === state.activeCategory.toLowerCase());
      }

      allBrands.forEach(brand => {
        const count = catPool.filter(p => p.brand === brand).length;
        const isChecked = state.selectedBrands.has(brand);
        const item = document.createElement('label');
        item.className = 'filter-checkbox-label';
        item.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${brand}" ${isChecked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${isChecked ? '✓' : ''}</div>
            <span style="font-weight:${isChecked ? '600' : '400'}; color:${isChecked ? 'var(--accent-gold)' : 'inherit'};">${brand}</span>
          </div>
          <span class="filter-item-count">${count}</span>
        `;
        item.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) {
            state.selectedBrands.add(brand);
          } else {
            state.selectedBrands.delete(brand);
          }
          updateCategoryAndBrandPool();
          updateBreadcrumbs();
          updateHeroInfo();
          renderCategoryNav();
          renderSidebarFilters();
          applyFiltersAndSort();
        });
        DOM.filterBrandsList.appendChild(item);
      });
    }

    // 3. Configuration & Silhouettes
    if (DOM.filterSilhouetteList) {
      const silhouetteCounts = {};
      state.allProducts.forEach(p => {
        p.silhouettes.forEach(s => { silhouetteCounts[s] = (silhouetteCounts[s] || 0) + 1; });
      });
      DOM.filterSilhouetteList.innerHTML = '';
      Object.keys(silhouetteCounts).forEach(sil => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedSilhouettes.has(sil);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${sil}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${sil}</span>
          </div>
          <span class="filter-item-count">${silhouetteCounts[sil]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedSilhouettes.add(sil);
          else state.selectedSilhouettes.delete(sil);
          applyFiltersAndSort();
        });
        DOM.filterSilhouetteList.appendChild(label);
      });
    }

    // 4. Color Swatches
    if (DOM.colorSwatchesGrid) {
      DOM.colorSwatchesGrid.innerHTML = '';
      COLOR_PALETTE.forEach(c => {
        const count = state.allProducts.filter(p => p.colors.includes(c.id)).length;
        if (count === 0 && !state.selectedColors.has(c.id)) return;
        const swatch = document.createElement('div');
        const active = state.selectedColors.has(c.id);
        swatch.className = `color-swatch-item ${active ? 'active' : ''}`;
        swatch.title = `${c.label} (${count} pieces)`;
        swatch.innerHTML = `
          <div class="color-swatch-circle" style="background-color:${c.hex}; border-color:${c.border};"></div>
          <div class="color-swatch-label">${c.id}</div>
        `;
        swatch.addEventListener('click', () => {
          if (state.selectedColors.has(c.id)) state.selectedColors.delete(c.id);
          else state.selectedColors.add(c.id);
          renderSidebarFilters();
          applyFiltersAndSort();
        });
        DOM.colorSwatchesGrid.appendChild(swatch);
      });
    }

    // 5. Fabric & Upholstery Materials
    if (DOM.filterMaterialsList) {
      const materialCounts = {};
      state.allProducts.forEach(p => {
        p.materials.forEach(m => { materialCounts[m] = (materialCounts[m] || 0) + 1; });
      });
      DOM.filterMaterialsList.innerHTML = '';
      Object.keys(materialCounts).forEach(mat => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedMaterials.has(mat);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${mat}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${mat}</span>
          </div>
          <span class="filter-item-count">${materialCounts[mat]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedMaterials.add(mat);
          else state.selectedMaterials.delete(mat);
          applyFiltersAndSort();
        });
        DOM.filterMaterialsList.appendChild(label);
      });
    }

    // 6. Wood & Frame Architecture
    if (DOM.filterFramesList) {
      const frameCounts = {};
      state.allProducts.forEach(p => {
        if (Array.isArray(p.frames)) {
          p.frames.forEach(f => { frameCounts[f] = (frameCounts[f] || 0) + 1; });
        }
      });
      DOM.filterFramesList.innerHTML = '';
      Object.keys(frameCounts).forEach(fr => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedFrames.has(fr);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${fr}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${fr}</span>
          </div>
          <span class="filter-item-count">${frameCounts[fr]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedFrames.add(fr);
          else state.selectedFrames.delete(fr);
          applyFiltersAndSort();
        });
        DOM.filterFramesList.appendChild(label);
      });
    }

    // 7. Legs & Base Architecture
    if (DOM.filterLegsList) {
      const legCounts = {};
      state.allProducts.forEach(p => {
        if (Array.isArray(p.legs)) {
          p.legs.forEach(l => { legCounts[l] = (legCounts[l] || 0) + 1; });
        }
      });
      DOM.filterLegsList.innerHTML = '';
      Object.keys(legCounts).forEach(lg => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedLegs.has(lg);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${lg}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${lg}</span>
          </div>
          <span class="filter-item-count">${legCounts[lg]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedLegs.add(lg);
          else state.selectedLegs.delete(lg);
          applyFiltersAndSort();
        });
        DOM.filterLegsList.appendChild(label);
      });
    }

    // 8. Cushion Comfort & Foam
    if (DOM.filterCushionList) {
      const cushionCounts = {};
      state.allProducts.forEach(p => {
        p.cushions.forEach(c => { cushionCounts[c] = (cushionCounts[c] || 0) + 1; });
      });
      DOM.filterCushionList.innerHTML = '';
      Object.keys(cushionCounts).forEach(cush => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedCushions.has(cush);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${cush}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${cush}</span>
          </div>
          <span class="filter-item-count">${cushionCounts[cush]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedCushions.add(cush);
          else state.selectedCushions.delete(cush);
          applyFiltersAndSort();
        });
        DOM.filterCushionList.appendChild(label);
      });
    }

    // 9. Craft & Special Features
    if (DOM.filterFeaturesList) {
      const featureCounts = {};
      state.allProducts.forEach(p => {
        p.craftFeatures.forEach(f => { featureCounts[f] = (featureCounts[f] || 0) + 1; });
      });
      DOM.filterFeaturesList.innerHTML = '';
      Object.keys(featureCounts).forEach(feat => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedFeatures.has(feat);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${feat}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${feat}</span>
          </div>
          <span class="filter-item-count">${featureCounts[feat]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedFeatures.add(feat);
          else state.selectedFeatures.delete(feat);
          applyFiltersAndSort();
        });
        DOM.filterFeaturesList.appendChild(label);
      });
    }

    // 10. Assembly & Setup
    if (DOM.filterAssemblyList) {
      const assemblyCounts = {};
      state.allProducts.forEach(p => {
        if (Array.isArray(p.assembly)) {
          p.assembly.forEach(a => { assemblyCounts[a] = (assemblyCounts[a] || 0) + 1; });
        }
      });
      DOM.filterAssemblyList.innerHTML = '';
      Object.keys(assemblyCounts).forEach(asm => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedAssembly.has(asm);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${asm}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${asm}</span>
          </div>
          <span class="filter-item-count">${assemblyCounts[asm]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedAssembly.add(asm);
          else state.selectedAssembly.delete(asm);
          applyFiltersAndSort();
        });
        DOM.filterAssemblyList.appendChild(label);
      });
    }

    // 11. Media & Documentation Assets
    if (DOM.filterMediaList) {
      const mediaCounts = {};
      state.allProducts.forEach(p => {
        if (Array.isArray(p.mediaAssets)) {
          p.mediaAssets.forEach(m => { mediaCounts[m] = (mediaCounts[m] || 0) + 1; });
        }
      });
      DOM.filterMediaList.innerHTML = '';
      Object.keys(mediaCounts).forEach(med => {
        const label = document.createElement('label');
        label.className = 'filter-checkbox-label';
        const checked = state.selectedMedia.has(med);
        label.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${med}" ${checked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${checked ? '✓' : ''}</div>
            <span>${med}</span>
          </div>
          <span class="filter-item-count">${mediaCounts[med]}</span>
        `;
        label.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) state.selectedMedia.add(med);
          else state.selectedMedia.delete(med);
          applyFiltersAndSort();
        });
        DOM.filterMediaList.appendChild(label);
      });
    }

    // 12. Catalogs Datasets Filter (24 files)
    if (DOM.filterCatalogsList) {
      DOM.filterCatalogsList.innerHTML = '';
      state.catalogs.forEach(cat => {
        const isChecked = state.selectedCatalogs.has(cat.id);
        const item = document.createElement('label');
        item.className = 'filter-checkbox-label';
        item.innerHTML = `
          <div class="checkbox-inner">
            <input type="checkbox" value="${cat.id}" ${isChecked ? 'checked' : ''} style="display:none;">
            <div class="custom-checkbox">${isChecked ? '✓' : ''}</div>
            <span style="font-size:0.8rem;">${cat.brand} (${cat.category})</span>
          </div>
          <span class="filter-item-count">${cat.itemCount || 0}</span>
        `;
        item.querySelector('input').addEventListener('change', (e) => {
          if (e.target.checked) {
            state.selectedCatalogs.add(cat.id);
          } else {
            state.selectedCatalogs.delete(cat.id);
          }
          updateCategoryAndBrandPool();
          updateBreadcrumbs();
          applyFiltersAndSort();
        });
        DOM.filterCatalogsList.appendChild(item);
      });
    }
  }

  /* ==========================================================================
     FILTERING & SORTING PIPELINE
     ========================================================================== */
  function applyFiltersAndSort() {
    let result = [...state.allProducts];

    // 1. Global Search
    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      result = result.filter(p => {
        const fullString = `${p.name} ${p.brand} ${p.category} ${p.description} ${p.dimensions.raw} ${p.colors.join(' ')} ${p.materials.join(' ')} ${(p.frames || []).join(' ')} ${(p.legs || []).join(' ')} ${(p.cushions || []).join(' ')} ${(p.craftFeatures || []).join(' ')} ${(p.assembly || []).join(' ')}`.toLowerCase();
        return fullString.includes(q);
      });
    }

    // 2. Quick Filter Pill
    if (state.quickFilter !== 'all') {
      const qf = state.quickFilter;
      if (qf === 'sectional') {
        result = result.filter(p => p.silhouettes.includes('Sectional'));
      } else if (qf === '3seater') {
        result = result.filter(p => p.silhouettes.includes('3-Seater'));
      } else if (qf === 'curved') {
        result = result.filter(p => p.silhouettes.includes('Curved Silhouette'));
      } else if (qf === 'boucle') {
        result = result.filter(p => p.materials.includes('Bouclé'));
      } else if (qf === 'velvet') {
        result = result.filter(p => p.materials.includes('Velvet'));
      } else if (qf === 'bouclevelvet') {
        result = result.filter(p => p.materials.includes('Bouclé') || p.materials.includes('Velvet'));
      } else if (qf === 'neutral') {
        result = result.filter(p => p.colors.includes('Beige') || p.colors.includes('Camel') || p.colors.includes('Brown'));
      } else if (qf === 'white') {
        result = result.filter(p => p.colors.includes('White'));
      } else if (qf === 'feather') {
        result = result.filter(p => p.cushions.includes('Feather & Down Blend'));
      } else if (qf === 'livesmart') {
        result = result.filter(p => p.materials.includes('LiveSmart Performance'));
      } else if (qf === 'king') {
        result = result.filter(p => p.silhouettes.includes('King Bed'));
      } else if (qf === 'queen') {
        result = result.filter(p => p.silhouettes.includes('Queen Bed'));
      } else if (qf === 'platform') {
        result = result.filter(p => p.silhouettes.includes('Platform Bed'));
      } else if (qf === 'oak') {
        result = result.filter(p => p.materials.includes('Oak & Wood Veneer') || p.materials.includes('Walnut Veneer') || (p.frames && p.frames.includes('Oak & Solid Wood')));
      } else if (qf === 'video') {
        result = result.filter(p => p.hasVideo);
      } else if (qf === 'swivel') {
        result = result.filter(p => p.craftFeatures.includes('360 Swivel Base') || p.silhouettes.includes('Swivel Chair') || (p.legs && p.legs.includes('360° Swivel Base')));
      } else if (qf === 'lounge') {
        result = result.filter(p => p.silhouettes.includes('Lounge Chair'));
      } else if (qf === 'storage') {
        result = result.filter(p => p.craftFeatures.includes('Storage Compartment') || p.silhouettes.includes('Storage Ottoman'));
      } else if (qf === 'leather') {
        result = result.filter(p => p.materials.includes('Italian Leather') || p.materials.includes('Leather / Eco-Leather') || p.materials.includes('Buff Leather'));
      } else if (qf === 'pouf') {
        result = result.filter(p => p.silhouettes.includes('Round Pouf / Ottoman'));
      } else if (qf === 'grey') {
        result = result.filter(p => p.colors.includes('Grey') || p.colors.includes('Black'));
      } else if (qf === 'acacia') {
        result = result.filter(p => p.materials.includes('Solid Acacia Wood') || (p.frames && p.frames.includes('Solid Acacia Wood')));
      } else if (qf === 'liveedge') {
        result = result.filter(p => p.craftFeatures.includes('Live Edge Detail'));
      } else if (qf === 'softclose') {
        result = result.filter(p => p.craftFeatures.includes('Soft Closing Drawers'));
      } else if (qf === 'glass') {
        result = result.filter(p => p.materials.includes('Tempered Glass') || (p.frames && p.frames.includes('Tempered Glass')));
      } else if (qf === 'dresser') {
        result = result.filter(p => p.silhouettes.includes('Dresser'));
      } else if (qf === 'pushtoopen') {
        result = result.filter(p => p.craftFeatures.includes('Push to Open Doors'));
      } else if (qf === 'gunmetal') {
        result = result.filter(p => p.materials.includes('Gunmetal Finish') || p.colors.includes('Grey') || (p.frames && p.frames.includes('Gunmetal Finish')));
      } else if (qf === 'large80') {
        result = result.filter(p => p.dimensions.width >= 80);
      } else if (qf === 'centerdrawer') {
        result = result.filter(p => p.craftFeatures.includes('Center Storage Drawer'));
      }
    }

    // 3. Silhouettes
    if (state.selectedSilhouettes.size > 0) {
      result = result.filter(p => p.silhouettes.some(s => state.selectedSilhouettes.has(s)));
    }

    // 4. Colors
    if (state.selectedColors.size > 0) {
      result = result.filter(p => p.colors.some(c => state.selectedColors.has(c)));
    }

    // 5. Materials / Fabrics
    if (state.selectedMaterials.size > 0) {
      result = result.filter(p => p.materials.some(m => state.selectedMaterials.has(m)));
    }

    // 6. Frames
    if (state.selectedFrames.size > 0) {
      result = result.filter(p => p.frames && p.frames.some(f => state.selectedFrames.has(f)));
    }

    // 7. Legs
    if (state.selectedLegs.size > 0) {
      result = result.filter(p => p.legs && p.legs.some(l => state.selectedLegs.has(l)));
    }

    // 8. Cushions
    if (state.selectedCushions.size > 0) {
      result = result.filter(p => p.cushions.some(c => state.selectedCushions.has(c)));
    }

    // 9. Craft Features
    if (state.selectedFeatures.size > 0) {
      result = result.filter(p => p.craftFeatures.some(f => state.selectedFeatures.has(f)));
    }

    // 10. Assembly
    if (state.selectedAssembly.size > 0) {
      result = result.filter(p => p.assembly && p.assembly.some(a => state.selectedAssembly.has(a)));
    }

    // 11. Media Assets
    if (state.selectedMedia.size > 0) {
      result = result.filter(p => p.mediaAssets && p.mediaAssets.some(m => state.selectedMedia.has(m)));
    }

    // 12. Price Range
    result = result.filter(p => p.price >= state.priceMin && p.price <= state.priceMax);

    // 13. Sorting
    if (state.sortBy === 'price-asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (state.sortBy === 'price-desc') {
      result.sort((a, b) => b.price - a.price);
    } else if (state.sortBy === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (state.sortBy === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (state.sortBy === 'images-desc') {
      result.sort((a, b) => b.images.length - a.images.length);
    }

    state.filteredProducts = result;
    renderProductsGrid();
    renderAppliedFilterTags();
    updateResultsCounter();
  }

  function renderAppliedFilterTags() {
    const tags = [];

    if (state.searchQuery) {
      tags.push({ label: `Search: "${state.searchQuery}"`, remove: () => { state.searchQuery = ''; DOM.globalSearchInput.value = ''; } });
    }
    if (state.quickFilter !== 'all') {
      const activePill = document.querySelector(`.quick-pill[data-id="${state.quickFilter}"] span`);
      const pillLabel = activePill ? activePill.textContent : state.quickFilter;
      tags.push({ label: `Preset: ${pillLabel}`, remove: () => { state.quickFilter = 'all'; renderQuickFilterPills(); } });
    }
    state.selectedCategories.forEach(cat => tags.push({
      label: `Category: ${cat}`,
      remove: () => {
        state.selectedCategories.delete(cat);
        if (state.selectedCategories.size === 1) state.activeCategory = [...state.selectedCategories][0];
        else if (state.selectedCategories.size === 0) state.activeCategory = 'all';
        updateCategoryAndBrandPool();
        updateBreadcrumbs();
        updateHeroInfo();
        renderCategoryNav();
      }
    }));
    state.selectedBrands.forEach(b => tags.push({
      label: `Brand: ${b}`,
      remove: () => {
        state.selectedBrands.delete(b);
        updateCategoryAndBrandPool();
        updateBreadcrumbs();
        updateHeroInfo();
        renderCategoryNav();
      }
    }));
    state.selectedSilhouettes.forEach(s => tags.push({ label: s, remove: () => state.selectedSilhouettes.delete(s) }));
    state.selectedColors.forEach(c => tags.push({ label: `Color: ${c}`, remove: () => state.selectedColors.delete(c) }));
    state.selectedMaterials.forEach(m => tags.push({ label: `Fabric: ${m}`, remove: () => state.selectedMaterials.delete(m) }));
    state.selectedFrames.forEach(f => tags.push({ label: `Frame: ${f}`, remove: () => state.selectedFrames.delete(f) }));
    state.selectedLegs.forEach(l => tags.push({ label: `Base: ${l}`, remove: () => state.selectedLegs.delete(l) }));
    state.selectedCushions.forEach(c => tags.push({ label: `Cushion: ${c}`, remove: () => state.selectedCushions.delete(c) }));
    state.selectedFeatures.forEach(f => tags.push({ label: f, remove: () => state.selectedFeatures.delete(f) }));
    state.selectedAssembly.forEach(a => tags.push({ label: `Assembly: ${a}`, remove: () => state.selectedAssembly.delete(a) }));
    state.selectedMedia.forEach(m => tags.push({ label: m, remove: () => state.selectedMedia.delete(m) }));
    state.selectedCatalogs.forEach(cId => {
      const catObj = state.catalogs.find(x => x.id === cId);
      tags.push({
        label: `Dataset: ${catObj ? catObj.displayName : cId}`,
        remove: () => {
          state.selectedCatalogs.delete(cId);
          updateCategoryAndBrandPool();
          updateBreadcrumbs();
        }
      });
    });
    if (state.priceMax < 6000 || state.priceMin > 200) {
      tags.push({ label: `$${state.priceMin} - $${state.priceMax}`, remove: () => { state.priceMin = 200; state.priceMax = 6000; DOM.priceSlider.value = 6000; DOM.priceMinInput.value = 200; DOM.priceMaxInput.value = 6000; } });
    }

    if (tags.length === 0) {
      DOM.appliedFiltersBar.style.display = 'none';
      DOM.activeFiltersCount.style.display = 'none';
      return;
    }

    DOM.appliedFiltersBar.style.display = 'flex';
    DOM.activeFiltersCount.style.display = 'flex';
    DOM.activeFiltersCount.textContent = tags.length;

    DOM.appliedFiltersBar.innerHTML = '';
    tags.forEach(tag => {
      const el = document.createElement('span');
      el.className = 'filter-tag';
      el.innerHTML = `<span>${tag.label}</span> <span class="filter-tag-remove">×</span>`;
      el.querySelector('.filter-tag-remove').addEventListener('click', () => {
        tag.remove();
        renderSidebarFilters();
        applyFiltersAndSort();
      });
      DOM.appliedFiltersBar.appendChild(el);
    });

    const clearAll = document.createElement('button');
    clearAll.className = 'clear-all-filters-btn';
    clearAll.textContent = 'Clear All';
    clearAll.addEventListener('click', () => resetFilters(true));
    DOM.appliedFiltersBar.appendChild(clearAll);
  }

  function resetFilters(andRender = true) {
    state.searchQuery = '';
    state.quickFilter = 'all';
    state.selectedCategories.clear();
    state.selectedBrands.clear();
    state.selectedSilhouettes.clear();
    state.selectedColors.clear();
    state.selectedMaterials.clear();
    state.selectedFrames.clear();
    state.selectedLegs.clear();
    state.selectedCushions.clear();
    state.selectedFeatures.clear();
    state.selectedAssembly.clear();
    state.selectedMedia.clear();
    state.selectedCatalogs.clear();
    state.priceMin = 200;
    state.priceMax = 6000;
    updateCategoryAndBrandPool();
    updateBreadcrumbs();
    updateHeroInfo();

    if (DOM.globalSearchInput) DOM.globalSearchInput.value = '';
    if (DOM.priceSlider) DOM.priceSlider.value = 6000;
    if (DOM.priceMinInput) DOM.priceMinInput.value = 200;
    if (DOM.priceMaxInput) DOM.priceMaxInput.value = 6000;

    if (andRender) {
      renderCategoryNav();
      renderQuickFilterPills();
      renderSidebarFilters();
      applyFiltersAndSort();
    }
  }

  function updateResultsCounter() {
    DOM.resultsCountDisplay.innerHTML = `Showing <strong>${state.filteredProducts.length}</strong> of <strong>${state.allProducts.length}</strong> handcrafted pieces`;
  }

  /* ==========================================================================
     PRODUCT CARD RENDERING & MULTI-IMAGE SCRUBBING
     ========================================================================== */
  function renderProductsGrid() {
    DOM.productsGrid.innerHTML = '';

    if (state.filteredProducts.length === 0) {
      DOM.productsGrid.style.display = 'none';
      DOM.emptyState.style.display = 'block';
      return;
    }

    DOM.productsGrid.style.display = 'grid';
    DOM.emptyState.style.display = 'none';

    state.filteredProducts.forEach(product => {
      const card = createProductCard(product);
      DOM.productsGrid.appendChild(card);
    });
  }

  function createProductCard(p) {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.dataset.id = p.id;

    const isWishlisted = state.wishlist.some(item => item.id === p.id);
    const isCompared = state.comparison.some(item => item.id === p.id);

    // Multi-image indicators
    const dotsHtml = p.images.slice(0, 6).map((_, i) => `<span class="image-dot ${i === 0 ? 'active' : ''}"></span>`).join('');

    card.innerHTML = `
      <div class="product-media-container" title="Click for Quick View or hover to explore photos">
        <img class="product-image" src="${p.images[0]}" alt="${p.name}" loading="lazy">
        <div class="card-badges-wrapper">
          ${p.badges.map(b => `<span class="luxury-badge ${b.type}">${b.text}</span>`).join('')}
        </div>
        <div class="card-photo-count-tag" title="${p.images.length} High-Res Photos">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
          <span>${p.images.length} Photos</span>
        </div>
        <div class="card-floating-actions">
          <button class="card-action-icon-btn ${isWishlisted ? 'wishlist-active' : ''}" data-action="wishlist" title="${isWishlisted ? 'Remove from Wishlist' : 'Add to Wishlist'}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="${isWishlisted ? '#E63946' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          </button>
          <button class="card-action-icon-btn ${isCompared ? 'wishlist-active' : ''}" data-action="compare" title="${isCompared ? 'Remove from Compare' : 'Compare Side-by-Side'}">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button class="card-action-icon-btn" data-action="quickview" title="Quick View">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><path d="M11 8v6M8 11h6"/></svg>
          </button>
        </div>
        ${p.images.length > 1 ? `
          <button class="card-slide-arrow prev" data-card-arrow="prev" title="Previous photo">‹</button>
          <button class="card-slide-arrow next" data-card-arrow="next" title="Next photo">›</button>
        ` : ''}
        <div class="image-dots-strip">${dotsHtml}</div>
      </div>

      <div class="product-card-body">
        <div class="product-brand-kicker">${p.brand}</div>
        <h3 class="product-title" data-action="quickview" style="cursor:pointer;">${p.name}</h3>

        <div class="product-media-meta">
          <span class="media-meta-tag" title="Total photos for this product">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <strong>${p.images.length}</strong> Images
          </span>
          <span class="media-meta-tag ${p.hasVideo ? 'has-video' : 'no-video'}" data-action="${p.hasVideo ? 'video' : 'quickview'}" style="${p.hasVideo ? 'cursor:pointer;' : ''}" title="${p.hasVideo ? `Click to watch ${p.videos.length} HD Video(s)` : 'No Video'}">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
            ${p.hasVideo ? `<strong>${p.videos.length}</strong> Video${p.videos.length > 1 ? 's' : ''}` : '0 Videos'}
          </span>
        </div>

        <div class="product-dimensions-snippet">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>
          <span>${p.dimensions.raw.replace(/Dimension:?/i, '').trim()}</span>
        </div>

        <div class="product-features-row">
          ${p.materials.slice(0, 2).map(m => `<span class="feature-pill-small">${m}</span>`).join('')}
          ${p.cushions.slice(0, 1).map(c => `<span class="feature-pill-small">${c}</span>`).join('')}
        </div>

        <div class="product-card-footer">
          <div class="price-container">
            <span class="price-main">$${p.price.toLocaleString()}</span>
            <span class="price-financing">or $${p.monthly}/mo Affirm</span>
          </div>
          <div class="card-cta-group">
            <button class="btn-quick-view" data-action="quickview">View Details</button>
            <button class="btn-add-cart-mini" data-action="cart" title="Add to Bag">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>
            </button>
          </div>
        </div>
      </div>
    `;

    // Interactive Multi-Image Scrubbing on Hover
    const mediaContainer = card.querySelector('.product-media-container');
    const mainImg = card.querySelector('.product-image');
    const dots = card.querySelectorAll('.image-dot');

    let cardImgIndex = 0;
    const updateCardImage = (idx) => {
      const len = p.images.length;
      cardImgIndex = ((idx % len) + len) % len;
      mainImg.src = p.images[cardImgIndex];
      dots.forEach((dot, i) => dot.classList.toggle('active', i === cardImgIndex));
    };

    if (p.images.length > 1) {
      const prevArrow = card.querySelector('[data-card-arrow="prev"]');
      const nextArrow = card.querySelector('[data-card-arrow="next"]');

      if (prevArrow && nextArrow) {
        prevArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          updateCardImage(cardImgIndex - 1);
        });
        nextArrow.addEventListener('click', (e) => {
          e.stopPropagation();
          updateCardImage(cardImgIndex + 1);
        });
      }

      mediaContainer.addEventListener('mousemove', (e) => {
        const rect = mediaContainer.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const ratio = Math.max(0, Math.min(1, mouseX / rect.width));
        const imgIndex = Math.min(p.images.length - 1, Math.floor(ratio * p.images.length));

        if (mainImg.src !== p.images[imgIndex]) {
          cardImgIndex = imgIndex;
          mainImg.src = p.images[imgIndex];
          dots.forEach((dot, idx) => {
            dot.classList.toggle('active', idx === imgIndex);
          });
        }
      });

      mediaContainer.addEventListener('mouseleave', () => {
        cardImgIndex = 0;
        mainImg.src = p.images[0];
        dots.forEach((dot, idx) => dot.classList.toggle('active', idx === 0));
      });
    }

    // Card Action Triggers: Clicking on specific actions or anywhere on the card to open product detail page
    card.addEventListener('click', (e) => {
      // Ignore click if clicking interactive slide arrows
      if (e.target.closest('[data-card-arrow]')) {
        return;
      }

      // Check specific utility actions
      const targetAction = e.target.closest('[data-action]');
      const action = targetAction ? targetAction.dataset.action : null;

      if (action === 'wishlist') {
        e.stopPropagation();
        toggleWishlist(p);
        return;
      }
      if (action === 'compare') {
        e.stopPropagation();
        toggleCompare(p);
        return;
      }
      if (action === 'cart') {
        e.stopPropagation();
        addToCart(p);
        return;
      }
      if (action === 'video') {
        e.stopPropagation();
        openQuickView(p);
        if (p.hasVideo && p.videos && p.videos.length > 0) {
          playQuickViewVideo(p.videos[0]);
        }
        return;
      }

      // Clicking ANYWHERE else on the product card opens its Product Detail Page!
      openQuickView(p);
    });

    return card;
  }

  /* ==========================================================================
     QUICK VIEW & DETAIL MODAL
     ========================================================================== */
  function playQuickViewVideo(videoUrl) {
    if (!DOM.qvMainVideo) return;
    DOM.qvMainImg.style.display = 'none';
    DOM.qvMainVideo.style.display = 'block';
    DOM.qvMainVideo.src = videoUrl;
    DOM.qvMainVideo.play().catch(e => console.log('Autoplay deferred:', e));

    // Update active thumb
    const thumbs = DOM.qvThumbnailsStrip.querySelectorAll('.qv-thumb');
    thumbs.forEach(t => t.classList.toggle('active', t.classList.contains('qv-thumb-video')));
    if (DOM.qvCounterText) {
      DOM.qvCounterText.textContent = `▶ Video`;
    }
  }

  function setQuickViewImage(index, direction) {
    const p = state.activeQuickViewProduct;
    if (!p || !p.images || p.images.length === 0) return;

    // Hide video if playing and show photo
    if (DOM.qvMainVideo) {
      DOM.qvMainVideo.pause();
      DOM.qvMainVideo.style.display = 'none';
    }
    DOM.qvMainImg.style.display = 'block';

    const len = p.images.length;
    const oldIdx = state.quickViewImageIndex;
    const targetIdx = ((index % len) + len) % len;
    state.quickViewImageIndex = targetIdx;

    const animDir = direction || (targetIdx >= oldIdx ? 'next' : 'prev');

    // Directional physical slide animation
    DOM.qvMainImg.classList.remove('anim-slide-next', 'anim-slide-prev', 'fading');
    void DOM.qvMainImg.offsetWidth; // Reflow to restart animation
    DOM.qvMainImg.src = p.images[targetIdx];
    DOM.qvMainImg.classList.add(animDir === 'next' ? 'anim-slide-next' : 'anim-slide-prev');

    // Update Counter
    if (DOM.qvCounterText) {
      DOM.qvCounterText.textContent = `${targetIdx + 1} / ${len}`;
    }

    // Update Slide Indicator Dots
    if (DOM.qvSlideDots) {
      const dots = DOM.qvSlideDots.querySelectorAll('.qv-slide-dot');
      dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === targetIdx);
      });
    }

    // Update active thumbnail
    const thumbs = DOM.qvThumbnailsStrip.querySelectorAll('.qv-thumb');
    thumbs.forEach((t, i) => {
      if (i === targetIdx) {
        t.classList.add('active');
        if (DOM.qvThumbnailsStrip) {
          DOM.qvThumbnailsStrip.scrollTo({
            left: t.offsetLeft - (DOM.qvThumbnailsStrip.clientWidth / 2) + (t.clientWidth / 2),
            behavior: targetIdx === 0 ? 'auto' : 'smooth'
          });
        }
      } else {
        t.classList.remove('active');
      }
    });
  }

  function openQuickView(p) {
    state.activeQuickViewProduct = p;
    state.quickViewImageIndex = 0;

    // Reset video player
    if (DOM.qvMainVideo) {
      DOM.qvMainVideo.pause();
      DOM.qvMainVideo.src = '';
      DOM.qvMainVideo.style.display = 'none';
    }
    DOM.qvMainImg.style.display = 'block';

    // Sticky Subnav Elements
    if (DOM.pdpSubnavBadge) {
      DOM.pdpSubnavBadge.textContent = `${p.brand.toUpperCase()} ATELIER · ${p.category.toUpperCase()}`;
    }
    if (DOM.pdpSubnavMiniTitle) {
      DOM.pdpSubnavMiniTitle.textContent = p.name;
    }
    if (DOM.pdpSubnavMiniPrice) {
      DOM.pdpSubnavMiniPrice.textContent = `$${p.price.toLocaleString()}`;
    }

    DOM.qvBrandText.textContent = `${p.brand.toUpperCase()} ATELIER`;
    DOM.qvTitleText.textContent = p.name;
    DOM.qvPriceText.textContent = `$${p.price.toLocaleString()}`;
    DOM.qvFinancingText.textContent = `or $${p.monthly}/mo with 0% APR Financing`;
    if (DOM.qvDescriptionText) {
      DOM.qvDescriptionText.textContent = '';
      DOM.qvDescriptionText.style.display = 'none';
    }

    // Media Audit badges in Quick View
    if (DOM.qvImagesCountText) {
      DOM.qvImagesCountText.innerHTML = `<strong>${p.images.length}</strong> High-Res Photos Loaded`;
    }
    if (DOM.qvVideoStatusText) {
      DOM.qvVideoStatusText.innerHTML = p.hasVideo
        ? `<strong>${p.videos.length} HD Video${p.videos.length > 1 ? 's' : ''}</strong> (Click to Watch)`
        : `<strong>0 Videos</strong> in Product Data`;
      if (p.hasVideo && p.videos && p.videos.length > 0) {
        DOM.qvVideoPill.classList.remove('no-video');
        DOM.qvVideoPill.classList.add('has-video');
        DOM.qvVideoPill.style.cursor = 'pointer';
        DOM.qvVideoPill.onclick = () => playQuickViewVideo(p.videos[0]);
      } else {
        DOM.qvVideoPill.classList.add('no-video');
        DOM.qvVideoPill.classList.remove('has-video');
        DOM.qvVideoPill.style.cursor = 'default';
        DOM.qvVideoPill.onclick = null;
      }
    }

    // Colorway and Finish Swatches
    if (DOM.qvSwatchesStrip) {
      DOM.qvSwatchesStrip.innerHTML = '';
      const colors = (p.colors && p.colors.length > 0) ? p.colors : ['Curated Finish'];
      if (DOM.qvColorActiveLabel) DOM.qvColorActiveLabel.textContent = colors[0];

      const colorHexMap = {
        'White': '#FAF9F6', 'Beige': '#E5DAC8', 'Camel': '#9E693D',
        'Grey': '#707070', 'Black': '#1C1B1A', 'Green': '#3B533E',
        'Brown': '#4A3728', 'Blue': '#1E2D4A'
      };

      colors.forEach((col, idx) => {
        const btn = document.createElement('button');
        btn.className = `pdp-color-swatch-btn ${idx === 0 ? 'active' : ''}`;
        btn.type = 'button';
        const hex = colorHexMap[col] || '#C5A880';
        btn.innerHTML = `
          <span class="pdp-color-circle" style="background:${hex};"></span>
          <span>${col}</span>
        `;
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          DOM.qvSwatchesStrip.querySelectorAll('.pdp-color-swatch-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          if (DOM.qvColorActiveLabel) DOM.qvColorActiveLabel.textContent = col;
        });
        DOM.qvSwatchesStrip.appendChild(btn);
      });
    }

    // Render Slide Indicator Dots
    if (DOM.qvSlideDots) {
      DOM.qvSlideDots.innerHTML = '';
      p.images.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = `qv-slide-dot ${i === 0 ? 'active' : ''}`;
        dot.title = `Slide to photo ${i + 1}`;
        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          setQuickViewImage(i, i >= state.quickViewImageIndex ? 'next' : 'prev');
        });
        DOM.qvSlideDots.appendChild(dot);
      });
    }

    // Render Thumbnails
    DOM.qvThumbnailsStrip.innerHTML = '';
    p.images.forEach((imgUrl, i) => {
      const thumb = document.createElement('img');
      thumb.className = `qv-thumb ${i === 0 ? 'active' : ''}`;
      thumb.src = imgUrl;
      thumb.alt = `${p.name} preview ${i + 1}`;
      thumb.dataset.index = i;
      thumb.addEventListener('click', (e) => {
        e.stopPropagation();
        setQuickViewImage(i, i >= state.quickViewImageIndex ? 'next' : 'prev');
      });
      DOM.qvThumbnailsStrip.appendChild(thumb);
    });

    // If product has video, append interactive video thumbnail
    if (p.hasVideo && p.videos && p.videos.length > 0) {
      const vidThumb = document.createElement('div');
      vidThumb.className = 'qv-thumb qv-thumb-video';
      vidThumb.title = 'Watch HD Video in showcase player';
      vidThumb.innerHTML = `
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><polygon points="6 4 20 12 6 20 6 4"/></svg>
        <span style="font-size:0.6rem; font-weight:700; text-transform:uppercase; margin-top:2px;">Video</span>
      `;
      vidThumb.addEventListener('click', (e) => {
        e.stopPropagation();
        playQuickViewVideo(p.videos[0]);
      });
      DOM.qvThumbnailsStrip.appendChild(vidThumb);
    }

    setQuickViewImage(0, 'next');

    // Specifications Summary Table
    if (DOM.qvSpecsTable && DOM.qvSpecsTable.querySelector('tbody')) {
      DOM.qvSpecsTable.querySelector('tbody').innerHTML = '';
      const specs = [
        { label: 'Category & Brand', value: `${p.category} · ${p.brand}` },
        { label: 'Dimensions', value: p.dimensions.raw.replace(/Dimension:?/i, '').trim() },
        { label: 'Media Assets', value: `${p.images.length} Photos · ${p.hasVideo ? `${p.videos.length} HD Video${p.videos.length > 1 ? 's' : ''}` : '0 Videos'}` },
        { label: 'Silhouettes', value: p.silhouettes.join(', ') || 'Modern Silhouette' },
        { label: 'Upholstery & Fabric', value: p.materials.join(', ') || 'Fine Textile' },
        { label: 'Colorway', value: p.colors.join(', ') || 'Curated Finish' }
      ];

      if (p.dimensionImage) {
        specs.push({
          label: 'Blueprint Diagram',
          value: `<a href="${p.dimensionImage}" target="_blank" rel="noopener noreferrer" style="color:var(--accent-gold); font-weight:700; text-decoration:underline;">📐 View Dimension Schematic</a>`
        });
      }

      if (p.features['Cushion Filling']) specs.push({ label: 'Cushion Filling', value: p.features['Cushion Filling'] });
      if (p.features['Inner Frame']) specs.push({ label: 'Inner Frame', value: p.features['Inner Frame'] });
      if (p.features['Suspension']) specs.push({ label: 'Suspension', value: p.features['Suspension'] });
      if (p.features['Legs']) specs.push({ label: 'Legs & Base', value: p.features['Legs'] });

      specs.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `<th>${s.label}</th><td>${s.value}</td>`;
        DOM.qvSpecsTable.querySelector('tbody').appendChild(tr);
      });
    }

    // Technical Spec Cards Grid (Deep Dive Section)
    if (DOM.pdpTechCardsGrid) {
      DOM.pdpTechCardsGrid.innerHTML = '';
      const rawDimClean = p.dimensions.raw ? p.dimensions.raw.replace(/Dimension:?/i, '').trim() : 'Tailored spatial scale';
      const techCards = [
        {
          meta: '01 / DIMENSIONS & SCALE',
          title: 'Architectural Proportions',
          body: rawDimClean,
          features: [
            `Category: ${p.category} · ${p.brand}`,
            `Silhouette: ${p.silhouettes.join(', ') || 'Contemporary Silhouette'}`,
            `Schematic: ${p.dimensionImage ? 'Blueprint Diagram Included' : 'Spatial Proportions Specified'}`
          ]
        },
        {
          meta: '02 / UPHOLSTERY & TEXTILES',
          title: 'Tactile Comfort & Weave',
          body: `Upholstered in ${p.materials.join(', ') || 'fine textile'}. Engineered for tactile indulgence, high abrasion resistance, and lasting aesthetic grace.`,
          features: [
            `Materials: ${p.materials.join(', ') || 'Textured Weave'}`,
            `Palette: ${p.colors.join(', ') || 'Curated Finish'}`,
            `Care: Vacuum regularly with soft brush attachment`
          ]
        },
        {
          meta: '03 / STRUCTURAL FRAME & JOINERY',
          title: 'Engineered Hardwood Frame',
          body: p.features['Inner Frame'] || (p.frames.length > 0 ? p.frames.join(', ') : 'Kiln-dried solid hardwood joinery with reinforced corner blocks to resist warping and structural stress.'),
          features: [
            `Structure: ${p.frames.join(', ') || 'Solid Hardwood & Plywood'}`,
            `Suspension: ${p.features['Suspension'] || 'High-tensile sinuous steel springs & heavy-duty webbing'}`,
            `Warranty: 10-Year structural frame guarantee`
          ]
        },
        {
          meta: '04 / CUSHION ARCHITECTURE',
          title: 'Multi-Density Resilience',
          body: p.features['Cushion Filling'] || (p.cushions.length > 0 ? p.cushions.join(', ') : 'Layered 40 DNS high-resilience memory foam encased in soft polyester fiber for plush, contouring comfort.'),
          features: [
            `Filling: ${p.cushions.join(', ') || 'High-Density Foam'}`,
            `Firmness: Medium-firm balanced ergonomic support`,
            `Recovery: High shape memory cores`
          ]
        },
        {
          meta: '05 / BASE & HARDWARE',
          title: 'Foundational Craft',
          body: p.features['Legs'] || (p.legs.length > 0 ? p.legs.join(', ') : 'Architectural low-profile structural glides designed to protect flooring while anchoring the piece.'),
          features: [
            `Base Style: ${p.legs.join(', ') || 'Recessed Architectural Glides'}`,
            `Joinery: ${p.craftFeatures.join(', ') || 'Precision-machined metal joinery'}`,
            `Cycle Test: Tested for 25,000+ continuous motion cycles`
          ]
        },
        {
          meta: '06 / WHITE-GLOVE LOGISTICS',
          title: 'Delivery & Complimentary Care',
          body: `Delivered via premium white-glove logistics. Includes in-room placement, unboxing, assembly inspection, and full packaging removal.`,
          features: [
            `Assembly: ${p.assembly.join(', ') || 'Arrives Fully Assembled'}`,
            `Inspection: Multi-point artisan quality control`,
            `Trial: 30-Day risk-free atelier in-home return`
          ]
        }
      ];

      techCards.forEach(card => {
        const el = document.createElement('div');
        el.className = 'pdp-tech-card';
        el.innerHTML = `
          <span class="pdp-card-meta-tag">${card.meta}</span>
          <h4 class="pdp-card-title">${card.title}</h4>
          <p class="pdp-card-body">${card.body}</p>
          <ul class="pdp-card-feature-list">
            ${card.features.map(f => `<li>${f}</li>`).join('')}
          </ul>
        `;
        DOM.pdpTechCardsGrid.appendChild(el);
      });
    }

    // Dedicated Blueprint Spotlight Card
    if (DOM.pdpBlueprintSpotlight) {
      if (p.dimensionImage) {
        DOM.pdpBlueprintSpotlight.style.display = 'grid';
        if (DOM.pdpBlueprintImg) DOM.pdpBlueprintImg.src = p.dimensionImage;
        if (DOM.pdpBlueprintLink) DOM.pdpBlueprintLink.href = p.dimensionImage;
      } else {
        DOM.pdpBlueprintSpotlight.style.display = 'none';
      }
    }

    // Official Atelier Link
    DOM.qvOfficialLink.href = p.url;
    DOM.qvOfficialLink.title = `Visit official product on ${p.brand}`;

    // Add to Bag Button with Live Price
    if (DOM.qvBtnAddCart) {
      DOM.qvBtnAddCart.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg> <span>Add to Bag — $${p.price.toLocaleString()}</span>`;
    }

    // Wishlist Button State
    const isSaved = state.wishlist.some(x => x.id === p.id);
    DOM.qvBtnWishlist.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved ? '#E63946' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;

    DOM.quickviewModal.classList.add('active');
    const modalBox = DOM.quickviewModal.querySelector('.modal-box');
    if (modalBox) {
      modalBox.scrollTop = 0;
      requestAnimationFrame(() => {
        modalBox.scrollTop = 0;
      });
      setTimeout(() => {
        modalBox.scrollTop = 0;
      }, 50);
    }
    try {
      if (window.location.hash !== `#product=${encodeURIComponent(p.id)}`) {
        history.replaceState(null, null, `#product=${encodeURIComponent(p.id)}`);
      }
    } catch {
      // Ignored
    }
  }

  function closeQuickView() {
    if (DOM.qvMainVideo) {
      DOM.qvMainVideo.pause();
      DOM.qvMainVideo.src = '';
      DOM.qvMainVideo.style.display = 'none';
    }
    if (DOM.qvMainImg) {
      DOM.qvMainImg.style.display = 'block';
    }
    DOM.quickviewModal.classList.remove('active');
    const modalBox = DOM.quickviewModal ? DOM.quickviewModal.querySelector('.modal-box') : null;
    if (modalBox) modalBox.scrollTop = 0;
    state.activeQuickViewProduct = null;
    if (window.location.hash.startsWith('#product=')) {
      try {
        history.replaceState(null, null, window.location.pathname + window.location.search);
      } catch {
        window.location.hash = '';
      }
    }
  }

  /* ==========================================================================
     WISHLIST & CART MANAGEMENT
     ========================================================================== */
  function toggleWishlist(product) {
    const idx = state.wishlist.findIndex(item => item.id === product.id);
    if (idx > -1) {
      state.wishlist.splice(idx, 1);
      showToast(`Removed "${product.name}" from saved pieces`, '♡');
    } else {
      state.wishlist.push(product);
      showToast(`Added "${product.name}" to your wishlist`, '♥');
    }
    localStorage.setItem('moderna_wishlist', JSON.stringify(state.wishlist));
    updateBadges();
    renderProductsGrid();
    renderWishlistDrawer();
  }

  function addToCart(product) {
    const existing = state.cart.find(item => item.id === product.id);
    if (existing) {
      existing.qty = (existing.qty || 1) + 1;
    } else {
      state.cart.push({ ...product, qty: 1 });
    }
    localStorage.setItem('moderna_cart', JSON.stringify(state.cart));
    updateBadges();
    renderCartDrawer();
    showToast(`Added "${product.name}" to your shopping bag`, '🛍️');
  }

  function updateBadges() {
    DOM.wishlistBadge.textContent = state.wishlist.length;
    DOM.wishlistDrawerCount.textContent = state.wishlist.length;

    const totalCartItems = state.cart.reduce((acc, cur) => acc + (cur.qty || 1), 0);
    DOM.cartBadge.textContent = totalCartItems;
    DOM.cartDrawerCount.textContent = totalCartItems;
  }

  function renderWishlistDrawer() {
    DOM.wishlistItemsContainer.innerHTML = '';
    if (state.wishlist.length === 0) {
      DOM.wishlistItemsContainer.innerHTML = `
        <div class="drawer-empty-state">
          <div class="drawer-empty-icon">♡</div>
          <h4>Your wishlist is empty</h4>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:0.35rem;">
            Save your favorite contemporary sofas to revisit anytime.
          </p>
        </div>
      `;
      DOM.btnMoveAllToBag.style.display = 'none';
      return;
    }

    DOM.btnMoveAllToBag.style.display = 'flex';
    state.wishlist.forEach(p => {
      const item = document.createElement('div');
      item.className = 'drawer-item';
      item.innerHTML = `
        <img class="drawer-item-img" src="${p.images[0]}" alt="${p.name}">
        <div class="drawer-item-info">
          <div class="drawer-item-title">${p.name}</div>
          <div class="drawer-item-price">$${p.price.toLocaleString()}</div>
          <div style="display:flex; gap:0.6rem; margin-top:0.5rem;">
            <button class="action-btn primary" data-move="${p.id}" style="height:30px; font-size:0.75rem; padding:0 0.8rem;">Add to Bag</button>
            <button class="action-btn" data-remove="${p.id}" style="height:30px; font-size:0.75rem; padding:0 0.8rem;">Remove</button>
          </div>
        </div>
      `;
      item.querySelector('[data-move]').addEventListener('click', () => {
        addToCart(p);
        toggleWishlist(p);
      });
      item.querySelector('[data-remove]').addEventListener('click', () => {
        toggleWishlist(p);
      });
      DOM.wishlistItemsContainer.appendChild(item);
    });
  }

  function renderCartDrawer() {
    DOM.cartItemsContainer.innerHTML = '';
    if (state.cart.length === 0) {
      DOM.cartItemsContainer.innerHTML = `
        <div class="drawer-empty-state">
          <div class="drawer-empty-icon">🛍️</div>
          <h4>Your bag is empty</h4>
          <p style="color:var(--text-secondary); font-size:0.85rem; margin-top:0.35rem;">
            Explore our curated Italian sofa collection and discover your sanctuary.
          </p>
        </div>
      `;
      DOM.cartTotalPrice.textContent = '$0';
      return;
    }

    let subtotal = 0;
    state.cart.forEach(p => {
      const qty = p.qty || 1;
      subtotal += p.price * qty;

      const item = document.createElement('div');
      item.className = 'drawer-item';
      item.innerHTML = `
        <img class="drawer-item-img" src="${p.images[0]}" alt="${p.name}">
        <div class="drawer-item-info">
          <div class="drawer-item-title">${p.name}</div>
          <div class="drawer-item-price">$${p.price.toLocaleString()}</div>
          <div style="display:flex; align-items:center; gap:0.75rem; margin-top:0.5rem;">
            <div style="display:flex; align-items:center; border:1px solid var(--border-subtle); border-radius:var(--radius-pill); overflow:hidden;">
              <button data-qty-minus="${p.id}" style="padding:2px 8px; font-weight:700;">−</button>
              <span style="font-size:0.85rem; padding:0 6px;">${qty}</span>
              <button data-qty-plus="${p.id}" style="padding:2px 8px; font-weight:700;">+</button>
            </div>
            <button data-cart-remove="${p.id}" style="font-size:0.75rem; color:var(--text-tertiary); text-decoration:underline;">Remove</button>
          </div>
        </div>
      `;
      item.querySelector('[data-qty-plus]').addEventListener('click', () => {
        p.qty = qty + 1;
        localStorage.setItem('moderna_cart', JSON.stringify(state.cart));
        renderCartDrawer();
        updateBadges();
      });
      item.querySelector('[data-qty-minus]').addEventListener('click', () => {
        if (qty > 1) p.qty = qty - 1;
        else state.cart = state.cart.filter(x => x.id !== p.id);
        localStorage.setItem('moderna_cart', JSON.stringify(state.cart));
        renderCartDrawer();
        updateBadges();
      });
      item.querySelector('[data-cart-remove]').addEventListener('click', () => {
        state.cart = state.cart.filter(x => x.id !== p.id);
        localStorage.setItem('moderna_cart', JSON.stringify(state.cart));
        renderCartDrawer();
        updateBadges();
      });
      DOM.cartItemsContainer.appendChild(item);
    });

    DOM.cartTotalPrice.textContent = `$${subtotal.toLocaleString()}`;
  }

  /* ==========================================================================
     COMPARISON MATRIX LOGIC
     ========================================================================== */
  function toggleCompare(product) {
    const idx = state.comparison.findIndex(x => x.id === product.id);
    if (idx > -1) {
      state.comparison.splice(idx, 1);
      showToast(`Removed "${product.name}" from comparison`, '⚖️');
    } else {
      if (state.comparison.length >= 4) {
        showToast('You can compare up to 4 sofas simultaneously', 'ℹ️');
        return;
      }
      state.comparison.push(product);
      showToast(`Added "${product.name}" to comparison matrix`, '⚖️');
    }
    localStorage.setItem('moderna_comparison', JSON.stringify(state.comparison));
    updateComparisonBar();
    renderProductsGrid();
  }

  function updateComparisonBar() {
    if (state.comparison.length === 0) {
      DOM.comparisonBar.classList.remove('active');
      return;
    }

    DOM.comparisonBar.classList.add('active');
    DOM.comparisonCountText.textContent = `${state.comparison.length} item${state.comparison.length > 1 ? 's' : ''}`;

    DOM.comparisonPreviewThumbs.innerHTML = '';
    state.comparison.forEach(p => {
      const img = document.createElement('img');
      img.className = 'comparison-thumb-mini';
      img.src = p.images[0];
      img.alt = p.name;
      img.title = p.name;
      DOM.comparisonPreviewThumbs.appendChild(img);
    });
  }

  function renderComparisonModal() {
    DOM.comparisonModalGrid.innerHTML = '';
    if (state.comparison.length === 0) {
      DOM.comparisonModal.classList.remove('active');
      return;
    }

    state.comparison.forEach(p => {
      const col = document.createElement('div');
      col.className = 'comparison-column';
      col.innerHTML = `
        <div style="position:relative; margin-bottom:1rem;">
          <img src="${p.images[0]}" alt="${p.name}" style="width:100%; height:160px; object-fit:contain; background:#F4F2EE; border-radius:var(--radius-sm); padding:6px;">
          <button data-remove-compare="${p.id}" style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.6); color:#fff; border-radius:50%; width:24px; height:24px; display:flex; align-items:center; justify-content:center; font-size:12px;" title="Remove">×</button>
        </div>
        <div style="font-size:0.72rem; font-weight:700; color:var(--accent-gold); text-transform:uppercase;">${p.brand}</div>
        <h4 style="font-family:var(--font-serif); font-size:1.15rem; margin-bottom:0.35rem;">${p.name}</h4>
        <div style="font-size:1.2rem; font-weight:700; margin-bottom:1rem;">$${p.price.toLocaleString()}</div>

        <div style="border-top:1px solid var(--border-subtle); padding:0.65rem 0;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Dimensions</div>
          <div style="font-size:0.85rem; font-weight:600;">${p.dimensions.raw.replace(/Dimension:?/i, '').trim()}</div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding:0.65rem 0;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Silhouette</div>
          <div style="font-size:0.85rem; font-weight:600;">${p.silhouettes.join(', ')}</div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding:0.65rem 0;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Fabric &amp; Materials</div>
          <div style="font-size:0.85rem; font-weight:600;">${p.materials.join(', ')}</div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding:0.65rem 0;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Cushion Filling</div>
          <div style="font-size:0.85rem; font-weight:600;">${p.features['Cushion Filling'] || 'High-Density Foam'}</div>
        </div>

        <div style="border-top:1px solid var(--border-subtle); padding:0.65rem 0;">
          <div style="font-size:0.75rem; color:var(--text-tertiary);">Inner Frame &amp; Legs</div>
          <div style="font-size:0.85rem; font-weight:600;">${p.features['Inner Frame'] || 'Hardwood / Plywood'} · ${p.features['Legs'] || 'Subtle glides'}</div>
        </div>

        <div style="margin-top:auto; padding-top:1.25rem; display:flex; flex-direction:column; gap:0.5rem;">
          <button class="action-btn primary" data-compare-add-cart="${p.id}" style="width:100%; justify-content:center;">Add to Bag</button>
          <a href="${p.url}" target="_blank" rel="noopener noreferrer" class="btn-qv-link" style="width:100%; justify-content:center; height:38px; font-size:0.75rem;">Official Page ↗</a>
        </div>
      `;

      col.querySelector('[data-remove-compare]').addEventListener('click', () => {
        toggleCompare(p);
        renderComparisonModal();
      });

      col.querySelector('[data-compare-add-cart]').addEventListener('click', () => {
        addToCart(p);
      });

      DOM.comparisonModalGrid.appendChild(col);
    });
  }

  /* ==========================================================================
     MEDIA & ASSET AUDIT DRAWER LOGIC
     ========================================================================== */
  let mediaAuditFilter = 'all';
  let mediaAuditSearchTerm = '';

  function openMediaAuditDrawer() {
    renderMediaAuditDrawer();
    DOM.mediaAuditDrawerBackdrop.classList.add('active');
  }

  function updateMediaAuditStats() {
    const totalItems = state.allProducts.length;
    const totalImages = state.allProducts.reduce((acc, p) => acc + p.images.length, 0);
    const totalVideos = state.allProducts.filter(p => p.hasVideo).length;
    const avgImages = totalItems > 0 ? (totalImages / totalItems).toFixed(2) : '0';
    const maxImgItem = [...state.allProducts].sort((a, b) => b.images.length - a.images.length)[0];

    if (DOM.kpiTotalImages) DOM.kpiTotalImages.textContent = totalImages;
    if (DOM.kpiTotalVideos) {
      DOM.kpiTotalVideos.textContent = totalVideos;
      DOM.kpiTotalVideos.style.color = totalVideos > 0 ? 'var(--accent-sage)' : 'var(--text-tertiary)';
    }
    if (DOM.kpiAvgImages) DOM.kpiAvgImages.textContent = avgImages;
    if (DOM.kpiMaxImages) DOM.kpiMaxImages.textContent = maxImgItem ? maxImgItem.images.length : '14';

    if (DOM.mediaBadge) DOM.mediaBadge.textContent = totalImages;
    if (DOM.topMediaCountText) {
      DOM.topMediaCountText.textContent = `Media: ${totalImages} Img · ${totalVideos} Vid`;
    }
    const heroMediaStats = document.getElementById('active-media-stats-text');
    if (heroMediaStats) {
      heroMediaStats.textContent = `${totalImages} Images · ${totalVideos} Videos`;
    }

    let pngCount = 0;
    let jpgCount = 0;
    let webpCount = 0;
    state.allProducts.forEach(p => {
      p.images.forEach(img => {
        if (/\.png/i.test(img)) pngCount++;
        else if (/\.jpe?g/i.test(img)) jpgCount++;
        else if (/\.webp/i.test(img)) webpCount++;
      });
    });

    const formatStrip = document.querySelector('.media-format-strip');
    if (formatStrip) {
      formatStrip.innerHTML = totalVideos > 0
        ? `<span>Format: <strong>${pngCount} PNG</strong> · <strong>${jpgCount} JPG</strong> · <strong>${webpCount} WebP</strong></span>
           <span style="color:var(--accent-sage); font-weight:700;">🎥 ${totalVideos} Products with 1080p/720p HD MP4</span>`
        : `<span>Format: <strong>${pngCount} PNG</strong> · <strong>${jpgCount} JPG</strong> · <strong>${webpCount} WebP</strong></span>
           <span style="color:var(--accent-rust); font-weight:600;">No .mp4 / video streams found</span>`;
    }

    const chipAll = document.querySelector('[data-img-filter="all"]');
    if (chipAll) chipAll.textContent = `All (${totalItems})`;
    const chipVideo = document.querySelector('[data-img-filter="hasvideo"]');
    if (chipVideo) chipVideo.textContent = `🎥 With Videos (${totalVideos})`;
    const chip10 = document.querySelector('[data-img-filter="10plus"]');
    if (chip10) chip10.textContent = `10+ Photos (${state.allProducts.filter(p => p.images.length >= 10).length})`;
    const chip6to9 = document.querySelector('[data-img-filter="6to9"]');
    if (chip6to9) chip6to9.textContent = `6–9 Photos (${state.allProducts.filter(p => p.images.length >= 6 && p.images.length <= 9).length})`;
    const chipUnder6 = document.querySelector('[data-img-filter="under6"]');
    if (chipUnder6) chipUnder6.textContent = `< 6 Photos (${state.allProducts.filter(p => p.images.length < 6).length})`;
  }

  function renderMediaAuditDrawer() {
    updateMediaAuditStats();

    // Filter products
    let items = [...state.allProducts];
    if (mediaAuditSearchTerm.trim()) {
      const q = mediaAuditSearchTerm.toLowerCase().trim();
      items = items.filter(p => p.name.toLowerCase().includes(q));
    }

    if (mediaAuditFilter === 'hasvideo') {
      items = items.filter(p => p.hasVideo);
    } else if (mediaAuditFilter === '10plus') {
      items = items.filter(p => p.images.length >= 10);
    } else if (mediaAuditFilter === '6to9') {
      items = items.filter(p => p.images.length >= 6 && p.images.length <= 9);
    } else if (mediaAuditFilter === 'under6') {
      items = items.filter(p => p.images.length < 6);
    }

    DOM.mediaAuditItemsList.innerHTML = '';
    if (items.length === 0) {
      DOM.mediaAuditItemsList.innerHTML = `<div style="text-align:center; padding:2.5rem 1rem; color:var(--text-tertiary);">No products match your media filter.</div>`;
      return;
    }

    items.forEach(p => {
      const row = document.createElement('div');
      row.className = 'media-audit-row';
      const isTop = p.images.length >= 10;
      row.innerHTML = `
        <div class="media-audit-row-left">
          <span class="media-audit-idx">#${p.originalIndex + 1}</span>
          <img class="media-audit-thumb" src="${p.images[0]}" alt="${p.name}">
          <div style="min-width:0;">
            <div class="media-audit-name" title="${p.name}">${p.name}</div>
            <div style="font-size:0.72rem; color:var(--text-tertiary);">${p.silhouettes[0] || 'Sofa'} · $${p.price.toLocaleString()}</div>
          </div>
        </div>
        <div class="media-audit-badges">
          <span class="badge-media-count ${isTop ? 'highlight' : ''}" title="${p.images.length} High-Res Images">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            <strong>${p.images.length}</strong> Images
          </span>
          <span class="badge-video-status ${p.hasVideo ? 'has-video' : 'no-video'}">
            ${p.hasVideo ? `🎥 ${p.videos.length} Video${p.videos.length > 1 ? 's' : ''}` : '0 Videos'}
          </span>
          <button class="action-btn" data-view-media="${p.id}" style="height:28px; padding:0 0.65rem; font-size:0.72rem;">View</button>
        </div>
      `;

      row.querySelector('[data-view-media]').addEventListener('click', () => {
        DOM.mediaAuditDrawerBackdrop.classList.remove('active');
        openQuickView(p);
      });

      DOM.mediaAuditItemsList.appendChild(row);
    });
  }

  /* ==========================================================================
     DATA HUB: ADD NEW JSONS & IMPORT ENGINE
     ========================================================================== */
  function renderCatalogHubList() {
    DOM.hubCatalogsList.innerHTML = '';
    state.catalogs.forEach(c => {
      const active = c.id === state.activeCatalogId;
      const row = document.createElement('div');
      row.className = 'catalog-row-item';
      row.innerHTML = `
        <div>
          <div style="font-weight:700; font-size:0.95rem;">${c.category} · ${c.brand}</div>
          <div style="font-size:0.75rem; color:var(--text-tertiary);">${c.itemCount || 90} items · ${c.fileName || 'JSON dataset'}</div>
        </div>
        <div>
          ${active
            ? `<span class="luxury-badge badge-sage">Active Catalog</span>`
            : `<button class="action-btn" data-switch-catalog="${c.id}" style="height:32px; font-size:0.75rem; padding:0 0.85rem;">Switch</button>`
          }
        </div>
      `;
      const btn = row.querySelector('[data-switch-catalog]');
      if (btn) {
        btn.addEventListener('click', () => {
          loadCatalog(c.id);
          DOM.catalogHubModal.classList.remove('active');
        });
      }
      DOM.hubCatalogsList.appendChild(row);
    });
  }

  async function handleImportJson(category, brand, jsonData, fileName = '') {
    if (!Array.isArray(jsonData) || jsonData.length === 0) {
      showToast('Error: JSON file must contain an array of product objects', '❌');
      return;
    }

    const cleanCategory = (category || 'Sofa').trim();
    const cleanBrand = (brand || 'Modani').trim();
    const catId = `${cleanCategory.toLowerCase()}-${cleanBrand.toLowerCase()}`;
    const cleanFileName = fileName || `${cleanBrand.toLowerCase()}_${cleanCategory.toLowerCase()}.json`;

    // Attempt saving to local server disk if server is running
    try {
      const res = await fetch('/api/save-catalog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: cleanCategory,
          brand: cleanBrand,
          fileName: cleanFileName,
          data: jsonData
        })
      });
      if (res.ok) {
        const body = await res.json();
        showToast(`Catalog saved directly to ${cleanCategory}/${cleanBrand}/${cleanFileName}`, '💾');
      }
    } catch {
      // Local server not running or file:// protocol; fallback to localStorage
    }

    // Save to localStorage
    localStorage.setItem(`moderna_data_${catId}`, JSON.stringify(jsonData));

    const newCatalog = {
      id: catId,
      category: cleanCategory,
      brand: cleanBrand,
      fileName: cleanFileName,
      relativePath: `${cleanCategory}/${cleanBrand}/${cleanFileName}`,
      itemCount: jsonData.length
    };

    // Update catalog list
    const existingIdx = state.catalogs.findIndex(c => c.id === catId);
    if (existingIdx > -1) {
      state.catalogs[existingIdx] = newCatalog;
    } else {
      state.catalogs.push(newCatalog);
    }

    // Persist custom catalogs registry
    const customList = state.catalogs.filter(c => c.id !== 'sofa-modani');
    localStorage.setItem('moderna_custom_catalogs', JSON.stringify(customList));

    renderCategoryNav();
    renderCatalogHubList();
    await loadCatalog(catId);

    DOM.catalogHubModal.classList.remove('active');
    showToast(`Successfully integrated ${cleanBrand} ${cleanCategory} (${jsonData.length} products)!`, '✨');
  }

  /* ==========================================================================
     EVENT LISTENERS & BINDINGS
     ========================================================================== */
  function setupEventListeners() {
    // Theme Switcher
    DOM.btnThemeToggle.addEventListener('click', toggleTheme);

    // Layout Buttons
    DOM.layoutBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const cols = parseInt(btn.dataset.cols, 10);
        state.layoutCols = cols;
        DOM.layoutBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        DOM.productsGrid.className = `products-grid cols-${cols}`;
      });
    });

    // Search Input
    let debounceTimer;
    DOM.globalSearchInput.addEventListener('input', (e) => {
      clearTimeout(debounceTimer);
      const val = e.target.value;
      DOM.searchClearBtn.style.display = val ? 'flex' : 'none';
      debounceTimer = setTimeout(() => {
        state.searchQuery = val;
        applyFiltersAndSort();
      }, 180);
    });

    DOM.searchClearBtn.addEventListener('click', () => {
      DOM.globalSearchInput.value = '';
      DOM.searchClearBtn.style.display = 'none';
      state.searchQuery = '';
      applyFiltersAndSort();
      DOM.globalSearchInput.focus();
    });

    // Keyboard shortcut '/' to search
    window.addEventListener('keydown', (e) => {
      if (e.key === '/' && document.activeElement !== DOM.globalSearchInput && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        DOM.globalSearchInput.focus();
      } else if (e.key === 'Escape') {
        closeQuickView();
        DOM.catalogHubModal.classList.remove('active');
        DOM.wishlistDrawerBackdrop.classList.remove('active');
        DOM.cartDrawerBackdrop.classList.remove('active');
        DOM.comparisonModal.classList.remove('active');
        if (DOM.mediaAuditDrawerBackdrop) DOM.mediaAuditDrawerBackdrop.classList.remove('active');
      } else if (DOM.quickviewModal && DOM.quickviewModal.classList.contains('active')) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          setQuickViewImage(state.quickViewImageIndex + 1, 'next');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          setQuickViewImage(state.quickViewImageIndex - 1, 'prev');
        }
      }
    });

    // Sort Dropdown
    DOM.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFiltersAndSort();
    });

    // Price Slider & Inputs
    DOM.priceSlider.addEventListener('input', (e) => {
      state.priceMax = parseInt(e.target.value, 10);
      DOM.priceMaxInput.value = state.priceMax;
      applyFiltersAndSort();
    });

    DOM.priceMinInput.addEventListener('change', (e) => {
      state.priceMin = Math.max(0, parseInt(e.target.value, 10) || 0);
      applyFiltersAndSort();
    });

    DOM.priceMaxInput.addEventListener('change', (e) => {
      state.priceMax = parseInt(e.target.value, 10) || 6000;
      DOM.priceSlider.value = state.priceMax;
      applyFiltersAndSort();
    });

    // Mobile / Sidebar Toggle
    DOM.btnToggleFilters.addEventListener('click', () => {
      state.sidebarOpenMobile = !state.sidebarOpenMobile;
      DOM.filterSidebar.classList.toggle('mobile-open', state.sidebarOpenMobile);
    });

    // Filter Group Accordion Collapsing
    document.querySelectorAll('.filter-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const group = header.closest('.filter-group');
        if (group) {
          group.classList.toggle('collapsed');
        }
      });
    });

    // Reset Filters Button
    DOM.btnResetFilters.addEventListener('click', () => resetFilters(true));

    // Quick View Modal
    DOM.btnCloseQuickview.addEventListener('click', closeQuickView);
    if (DOM.pdpBackBtn) {
      DOM.pdpBackBtn.addEventListener('click', closeQuickView);
    }
    DOM.quickviewModal.addEventListener('click', (e) => {
      if (e.target === DOM.quickviewModal) closeQuickView();
    });

    // Quick View Main Image Next / Prev Slide Buttons
    if (DOM.qvImgNextBtn) {
      DOM.qvImgNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setQuickViewImage(state.quickViewImageIndex + 1, 'next');
      });
    }
    if (DOM.qvImgPrevBtn) {
      DOM.qvImgPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setQuickViewImage(state.quickViewImageIndex - 1, 'prev');
      });
    }

    // Quick View Thumbnail Carousel Buttons (Advances active photo & auto-scrolls strip)
    if (DOM.qvThumbNextBtn) {
      DOM.qvThumbNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setQuickViewImage(state.quickViewImageIndex + 1, 'next');
      });
    }
    if (DOM.qvThumbPrevBtn) {
      DOM.qvThumbPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        setQuickViewImage(state.quickViewImageIndex - 1, 'prev');
      });
    }

    // Interactive Drag / Swipe on Main Image Showcase
    if (DOM.qvMainImageWrap) {
      let touchStartX = 0;
      let touchStartY = 0;
      let isDragging = false;

      // Touch events for mobile/trackpad swipe
      DOM.qvMainImageWrap.addEventListener('touchstart', (e) => {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }, { passive: true });

      DOM.qvMainImageWrap.addEventListener('touchend', (e) => {
        if (!e.changedTouches || !e.changedTouches[0]) return;
        const diffX = e.changedTouches[0].screenX - touchStartX;
        const diffY = e.changedTouches[0].screenY - touchStartY;
        if (Math.abs(diffX) > 35 && Math.abs(diffX) > Math.abs(diffY)) {
          if (diffX < 0) {
            setQuickViewImage(state.quickViewImageIndex + 1, 'next');
          } else {
            setQuickViewImage(state.quickViewImageIndex - 1, 'prev');
          }
        }
      }, { passive: true });

      // Mouse drag events for intuitive desktop slide
      DOM.qvMainImageWrap.addEventListener('mousedown', (e) => {
        if (e.target.closest('.gallery-nav-btn')) return;
        isDragging = true;
        touchStartX = e.clientX;
      });

      window.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        isDragging = false;
        const diffX = e.clientX - touchStartX;
        if (Math.abs(diffX) > 40) {
          if (diffX < 0) {
            setQuickViewImage(state.quickViewImageIndex + 1, 'next');
          } else {
            setQuickViewImage(state.quickViewImageIndex - 1, 'prev');
          }
        }
      });
    }

    DOM.qvBtnAddCart.addEventListener('click', () => {
      if (state.activeQuickViewProduct) {
        addToCart(state.activeQuickViewProduct);
      }
    });

    DOM.qvBtnWishlist.addEventListener('click', () => {
      if (state.activeQuickViewProduct) {
        toggleWishlist(state.activeQuickViewProduct);
        const isSaved = state.wishlist.some(x => x.id === state.activeQuickViewProduct.id);
        DOM.qvBtnWishlist.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="${isSaved ? '#E63946' : 'none'}" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
      }
    });

    // Wishlist Drawer
    DOM.btnOpenWishlist.addEventListener('click', () => {
      renderWishlistDrawer();
      DOM.wishlistDrawerBackdrop.classList.add('active');
    });
    DOM.btnCloseWishlist.addEventListener('click', () => DOM.wishlistDrawerBackdrop.classList.remove('active'));
    DOM.wishlistDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.wishlistDrawerBackdrop) DOM.wishlistDrawerBackdrop.classList.remove('active');
    });

    DOM.btnMoveAllToBag.addEventListener('click', () => {
      state.wishlist.forEach(p => addToCart(p));
      state.wishlist = [];
      localStorage.setItem('moderna_wishlist', '[]');
      updateBadges();
      renderWishlistDrawer();
      showToast('All saved pieces moved to bag', '🛍️');
    });

    // Cart Drawer
    DOM.btnOpenCart.addEventListener('click', () => {
      renderCartDrawer();
      DOM.cartDrawerBackdrop.classList.add('active');
    });
    DOM.btnCloseCart.addEventListener('click', () => DOM.cartDrawerBackdrop.classList.remove('active'));
    DOM.cartDrawerBackdrop.addEventListener('click', (e) => {
      if (e.target === DOM.cartDrawerBackdrop) DOM.cartDrawerBackdrop.classList.remove('active');
    });

    DOM.btnCheckout.addEventListener('click', () => {
      if (state.cart.length === 0) return;
      showToast('Thank you! Mock White-Glove Checkout initiated', '🎉');
      state.cart = [];
      localStorage.setItem('moderna_cart', '[]');
      updateBadges();
      renderCartDrawer();
      DOM.cartDrawerBackdrop.classList.remove('active');
    });

    // Catalog Switcher & Hub Modals
    const openHub = () => {
      renderCatalogHubList();
      DOM.catalogHubModal.classList.add('active');
    };
    DOM.btnOpenCatalogHub.addEventListener('click', openHub);
    DOM.btnOpenCatalogHubTop.addEventListener('click', openHub);
    DOM.btnSwitchCatalog.addEventListener('click', openHub);
    DOM.btnCloseCatalogHub.addEventListener('click', () => DOM.catalogHubModal.classList.remove('active'));
    DOM.btnCancelImport.addEventListener('click', () => DOM.catalogHubModal.classList.remove('active'));
    DOM.catalogHubModal.addEventListener('click', (e) => {
      if (e.target === DOM.catalogHubModal) DOM.catalogHubModal.classList.remove('active');
    });

    // File Drag & Drop on Hub
    DOM.hubDropzone.addEventListener('click', () => DOM.hubFileInput.click());
    DOM.hubDropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.hubDropzone.classList.add('drag-over');
    });
    DOM.hubDropzone.addEventListener('dragleave', () => DOM.hubDropzone.classList.remove('drag-over'));
    DOM.hubDropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.hubDropzone.classList.remove('drag-over');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processUploadedFile(e.dataTransfer.files[0]);
      }
    });

    DOM.hubFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        processUploadedFile(e.target.files[0]);
      }
    });

    function processUploadedFile(file) {
      if (!file.name.endsWith('.json')) {
        showToast('Please select a valid .json file', '⚠️');
        return;
      }
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const parsed = JSON.parse(evt.target.result);
          // Auto-detect brand/category from file name if possible
          const nameLower = file.name.toLowerCase();
          if (nameLower.includes('sofa')) DOM.hubCategoryInput.value = 'Sofa';
          if (nameLower.includes('chair')) DOM.hubCategoryInput.value = 'Chair';
          if (nameLower.includes('table')) DOM.hubCategoryInput.value = 'Table';
          if (nameLower.includes('modani')) DOM.hubBrandInput.value = 'Modani';

          handleImportJson(DOM.hubCategoryInput.value, DOM.hubBrandInput.value, parsed, file.name);
        } catch (err) {
          showToast(`Invalid JSON file: ${err.message}`, '❌');
        }
      };
      reader.readAsText(file);
    }

    // Submit Paste or Input Import
    DOM.btnSubmitImport.addEventListener('click', () => {
      const pasteVal = DOM.hubPasteArea.value.trim();
      if (pasteVal) {
        try {
          const parsed = JSON.parse(pasteVal);
          handleImportJson(DOM.hubCategoryInput.value, DOM.hubBrandInput.value, parsed);
        } catch (err) {
          showToast(`Invalid JSON syntax: ${err.message}`, '❌');
        }
      } else {
        showToast('Please drop a JSON file or paste JSON code to import', 'ℹ️');
      }
    });

    // Comparison Floating Bar & Modal Listeners
    DOM.btnOpenComparisonModal.addEventListener('click', () => {
      renderComparisonModal();
      DOM.comparisonModal.classList.add('active');
    });
    DOM.btnCloseComparison.addEventListener('click', () => DOM.comparisonModal.classList.remove('active'));
    DOM.comparisonModal.addEventListener('click', (e) => {
      if (e.target === DOM.comparisonModal) DOM.comparisonModal.classList.remove('active');
    });
    DOM.btnClearComparison.addEventListener('click', () => {
      state.comparison = [];
      localStorage.setItem('moderna_comparison', '[]');
      updateComparisonBar();
      renderProductsGrid();
      showToast('Comparison cleared', '🧹');
    });

    // Media & Asset Audit Drawer Listeners
    if (DOM.btnOpenMediaPanel) DOM.btnOpenMediaPanel.addEventListener('click', openMediaAuditDrawer);
    if (DOM.btnOpenMediaPanelTop) DOM.btnOpenMediaPanelTop.addEventListener('click', openMediaAuditDrawer);
    if (DOM.btnCloseMediaAudit) DOM.btnCloseMediaAudit.addEventListener('click', () => DOM.mediaAuditDrawerBackdrop.classList.remove('active'));
    if (DOM.mediaAuditDrawerBackdrop) {
      DOM.mediaAuditDrawerBackdrop.addEventListener('click', (e) => {
        if (e.target === DOM.mediaAuditDrawerBackdrop) DOM.mediaAuditDrawerBackdrop.classList.remove('active');
      });
    }

    if (DOM.mediaAuditSearch) {
      DOM.mediaAuditSearch.addEventListener('input', (e) => {
        mediaAuditSearchTerm = e.target.value;
        renderMediaAuditDrawer();
      });
    }

    if (DOM.mediaFilterChips) {
      DOM.mediaFilterChips.querySelectorAll('[data-img-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
          DOM.mediaFilterChips.querySelectorAll('[data-img-filter]').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          mediaAuditFilter = btn.dataset.imgFilter;
          renderMediaAuditDrawer();
        });
      });
    }
  }

  /* ==========================================================================
     APP INITIALIZATION
     ========================================================================== */
  async function init() {
    initDOM();
    applyTheme(state.theme);
    updateBadges();
    updateComparisonBar();
    setupEventListeners();
    await initCatalogs();
    updateMediaAuditStats();
  }

  // Launch on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
