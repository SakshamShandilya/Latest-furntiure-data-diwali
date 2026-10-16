'use client';

import React, { useState, useMemo, useEffect } from 'react';

/**
 * Plypicker Luxury Living - Sofa Product-Wise Pricing & Customization Panel
 * Built for Next.js / React with Tailwind CSS.
 * Provides:
 *  1. Product-Wise Directory: Inspect all sofas, their categories, Base Sofa Cost, Fabric Cost, Exclusive Price (No GST), and Final Price (18% GST).
 *  2. Direct Inline Category Switcher: Change categories right on the listing row with live recalculation.
 *  3. Sofa Detail Editor Modal: Edit sofa dimensions, configuration, fabric consumption, and add-ons.
 *  4. Global Category Manager: Add unlimited categories and change rate per foot globally with real-time propagation across all products.
 *  5. Deep Configurator Studio: Deep single-product bespoke builder with compliant MongoDB JSON export.
 */

export interface PricingCategory {
  code: string;
  tier: string;
  rate: number;
  isDefault?: boolean;
  description?: string;
}

export interface FabricPricingConfig {
  key: string;
  name: string;
  delta: number;
  image: string;
}

export interface SofaProduct {
  id: string;
  catalogFile?: string;
  catalogIndex?: number;
  brand: string;
  name: string;
  image: string;
  images?: string[];
  category: string; // e.g. "A", "B", "C", "D"
  configuration: 'Straight Line' | 'Curved Sofa' | 'L-Shape' | '3+2 Sofa' | 'U-Shape' | '3+2+1' | '3+1+1' | '3+2+2';
  partALen: number;
  partBLen: number;
  partCLen: number;
  depth: number;
  consumptionRate: number;
  fabric: string;
  extraRound?: number;
  extraSquare?: number;
  extraBall?: number;
}

export const FABRICS: FabricPricingConfig[] = [
  { key: 'Standard', name: 'Standard / Base Fabric', delta: 0, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/suede.png' },
  { key: 'Velvet', name: 'Velvet', delta: 450, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/velvet.png' },
  { key: 'Suede', name: 'Suede', delta: 450, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/suede.png' },
  { key: 'Rexin', name: 'Rexin', delta: 450, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/rexin.png' },
  { key: 'Linen', name: 'Linen', delta: 600, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/linen.png' },
  { key: 'Boucle', name: 'Boucle', delta: 700, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/boucle.png' },
  { key: 'Leatherite', name: 'Leatherite', delta: 750, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/leatherite.png' },
  { key: 'Vegan Leather', name: 'Vegan Leather', delta: 950, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/vegan_leather.png' },
  { key: 'Genuine Leather', name: 'Genuine Leather', delta: 4500, image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/leather.png' },
];

export const INITIAL_CATEGORIES: PricingCategory[] = [
  { code: 'A', tier: 'Standard', rate: 6500, isDefault: true, description: 'High-durability everyday luxury frames & standard resilient foam' },
  { code: 'B', tier: 'Mid-Tier', rate: 7500, isDefault: false, description: 'Solid hardwood reinforcement & high-resilience ergonomic foam' },
  { code: 'C', tier: 'Premium', rate: 8500, isDefault: false, description: 'Hand-tied pocket springs, premium hardwood & feather layers' },
  { code: 'D', tier: 'Luxury Premium', rate: 12717.65, isDefault: false, description: 'Italian architectural grade, hand-carved detailing & bespoke ergonomics' },
];

// Sample Initial Products
export const INITIAL_PRODUCTS: SofaProduct[] = [
  {
    id: 'sofa_modani_1',
    brand: 'Modani',
    name: 'Nido Sofa White',
    image: 'https://cdn.shopify.com/s/files/1/0898/9048/8616/files/nido_sofa_wh_front_1500_png.png?v=1745895976',
    category: 'A',
    configuration: 'Straight Line',
    partALen: 7.91,
    partBLen: 0,
    partCLen: 0,
    depth: 30,
    consumptionRate: 3,
    fabric: 'Boucle',
    extraRound: 0, extraSquare: 0, extraBall: 0
  },
  {
    id: 'sofa_baywindow_1',
    brand: 'Baywindow',
    name: 'Monterey Static Lounger LH',
    image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/leather.png',
    category: 'B',
    configuration: 'L-Shape',
    partALen: 6.0,
    partBLen: 3.5,
    partCLen: 0,
    depth: 32,
    consumptionRate: 3,
    fabric: 'Genuine Leather',
    extraRound: 2, extraSquare: 0, extraBall: 0
  },
  {
    id: 'sofa_ubbaco_1',
    brand: 'Ubbaco',
    name: 'Ubbaco Designer Sectional #01',
    image: 'assets/plypicker-icon-240.png',
    category: 'C',
    configuration: '3+2 Sofa',
    partALen: 7.0,
    partBLen: 5.0,
    partCLen: 0,
    depth: 34,
    consumptionRate: 3,
    fabric: 'Velvet',
    extraRound: 0, extraSquare: 2, extraBall: 0
  },
  {
    id: 'sofa_estre_1',
    brand: 'Estre',
    name: 'Sterling Curved Architectural Sofa',
    image: 'https://dlkotil4uzvzh.cloudfront.net/sofa-inline/boucle.png',
    category: 'D',
    configuration: 'Curved Sofa',
    partALen: 8.5,
    partBLen: 0,
    partCLen: 0,
    depth: 36,
    consumptionRate: 2,
    fabric: 'Boucle',
    extraRound: 0, extraSquare: 0, extraBall: 1
  }
];

export function computeTotalLength(
  config: string,
  partA: number,
  partB: number,
  partC: number
): number {
  if (config === 'Straight Line' || config === 'Curved Sofa') {
    return Math.max(1, partA);
  } else if (['U-Shape', '3+2+1', '3+1+1', '3+2+2'].includes(config)) {
    return Math.round((partA + partB + partC) * 100) / 100;
  } else {
    return Math.round((partA + partB) * 100) / 100;
  }
}

export function formatINR(val: number): string {
  return '₹' + Math.round(val).toLocaleString('en-IN');
}

export default function SofaPricingPanel() {
  // Global Categories State
  const [categories, setCategories] = useState<PricingCategory[]>(INITIAL_CATEGORIES);
  const [sofas, setSofas] = useState<SofaProduct[]>(INITIAL_PRODUCTS);

  // Active View ('directory' or 'configurator')
  const [activeView, setActiveView] = useState<'directory' | 'configurator'>('directory');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBrand, setFilterBrand] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [activeFabricEval, setActiveFabricEval] = useState('Boucle');
  const [sortBy, setSortBy] = useState<'name' | 'price_asc' | 'price_desc' | 'length'>('name');

  // Modals State
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingSofa, setEditingSofa] = useState<SofaProduct | null>(null);

  // New Category Form State
  const [newCatCode, setNewCatCode] = useState('');
  const [newCatTier, setNewCatTier] = useState('');
  const [newCatRate, setNewCatRate] = useState<number>(9500);
  const [newCatDesc, setNewCatDesc] = useState('');

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function triggerToast(msg: string) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  }

  // Helper to get category rate
  const getCatRate = (code: string) => {
    const found = categories.find(c => c.code.toUpperCase() === code.toUpperCase());
    return found ? found.rate : 6500;
  };

  // Pricing Calculation Helper
  const calculatePricing = (sofa: SofaProduct, evalFabricKey = activeFabricEval) => {
    const ratePerFt = getCatRate(sofa.category);
    const totalLen = computeTotalLength(sofa.configuration, sofa.partALen, sofa.partBLen, sofa.partCLen);
    const cons = sofa.consumptionRate || (sofa.configuration === 'Curved Sofa' ? 2 : 3);
    const fabricObj = FABRICS.find(f => f.key === evalFabricKey) || FABRICS[5];
    const fabricDelta = fabricObj.delta;

    const baseCost = Math.round(totalLen * ratePerFt);
    const fabricCost = Math.round(cons * totalLen * fabricDelta);
    const pillowsCost = ((sofa.extraRound || 0) * 1200) + ((sofa.extraSquare || 0) * 1200) + ((sofa.extraBall || 0) * 2200);

    const subtotal = baseCost + fabricCost + pillowsCost;
    const gst = Math.round(subtotal * 0.18);
    const grandTotal = subtotal + gst;

    return {
      ratePerFt,
      totalLen,
      consumption: cons,
      fabricKey: fabricObj.key,
      fabricDelta,
      baseCost,
      fabricCost,
      pillowsCost,
      subtotal,
      gst,
      grandTotal,
    };
  };

  // Inline Category Change
  const handleCategoryChange = (sofaId: string, newCat: string) => {
    setSofas(prev => prev.map(s => s.id === sofaId ? { ...s, category: newCat } : s));
    triggerToast(`✓ Sofa category updated to Category ${newCat}!`);
  };

  // Filtered & Sorted Sofas
  const filteredSofas = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sofas
      .filter(s => {
        if (filterBrand !== 'ALL' && s.brand !== filterBrand) return false;
        if (filterCategory !== 'ALL' && s.category.toUpperCase() !== filterCategory.toUpperCase()) return false;
        if (q && !s.name.toLowerCase().includes(q) && !s.brand.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        const pA = calculatePricing(a);
        const pB = calculatePricing(b);
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'price_asc') return pA.subtotal - pB.subtotal;
        if (sortBy === 'price_desc') return pB.subtotal - pA.subtotal;
        if (sortBy === 'length') return pB.totalLen - pA.totalLen;
        return 0;
      });
  }, [sofas, searchQuery, filterBrand, filterCategory, sortBy, categories, activeFabricEval]);

  // Brand Options
  const brands = useMemo(() => Array.from(new Set(sofas.map(s => s.brand))), [sofas]);

  // Global Category Actions
  const handleAddCategory = () => {
    if (!newCatCode.trim()) return;
    const code = newCatCode.trim().toUpperCase();
    const existing = categories.find(c => c.code === code);
    if (existing) {
      setCategories(prev => prev.map(c => c.code === code ? { ...c, tier: newCatTier, rate: newCatRate, description: newCatDesc } : c));
    } else {
      setCategories(prev => [...prev, {
        code,
        tier: newCatTier || 'Custom',
        rate: Number(newCatRate) || 6500,
        isDefault: false,
        description: newCatDesc
      }]);
    }
    setNewCatCode('');
    setNewCatTier('');
    setNewCatDesc('');
    triggerToast(`✓ Category ${code} added!`);
  };

  const handleUpdateCategoryRate = (code: string, newRate: number) => {
    setCategories(prev => prev.map(c => c.code === code ? { ...c, rate: newRate } : c));
  };

  const handleDeleteCategory = (code: string) => {
    setCategories(prev => prev.filter(c => c.code !== code));
    triggerToast(`Category ${code} removed.`);
  };

  return (
    <div className="min-h-screen bg-[#121110] text-[#FAF8F5] p-6 lg:p-10 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-[#D4AF37] text-[#121110] font-bold px-6 py-3 rounded-full shadow-2xl z-50 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header Bar */}
      <header className="max-w-7xl mx-auto mb-8 border-b border-white/10 pb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/15 border border-[#D4AF37]/40 rounded-full text-xs font-bold uppercase tracking-wider text-[#D4AF37] mb-2">
            ✨ Official Pricing & Customization Engine
          </div>
          <h1 className="text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white">
            Sofa Product-Wise Pricing Studio
          </h1>
          <p className="text-sm text-[#AFA89F] max-w-2xl mt-1">
            Real-time valuations across all listed sofas. Inspect Base Cost, Fabric Surcharge, Exclusive Price (without GST), and Final Price (with 18% GST).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCatModalOpen(true)}
            className="px-4 py-2 rounded-full border border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37] hover:text-[#121110] font-bold text-sm transition-all"
          >
            ⚙️ Global Category Rates & Add Category
          </button>
        </div>
      </header>

      {/* Active Category Rates Strip */}
      <div className="max-w-7xl mx-auto mb-6 bg-[#1A1917] border border-white/10 rounded-xl p-3 flex flex-wrap items-center gap-3">
        <span className="text-xs font-extrabold text-[#D4AF37] uppercase tracking-wider">⚡ Active Rates:</span>
        {categories.map(cat => (
          <div key={cat.code} className="inline-flex items-center gap-2 bg-[#22201D] border border-white/10 px-3 py-1 rounded-full text-xs">
            <span className="font-bold text-[#D4AF37]">Cat {cat.code} ({cat.tier}):</span>
            <span className="font-mono font-bold text-white">{formatINR(cat.rate)}/ft</span>
          </div>
        ))}
      </div>

      {/* Controls & Filter Bar */}
      <div className="max-w-7xl mx-auto mb-6 bg-[#22201D] border border-white/10 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <input
            type="text"
            placeholder="Search sofa by name or brand..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="bg-[#1A1917] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37] min-w-[240px]"
          />

          <select
            value={filterBrand}
            onChange={e => setFilterBrand(e.target.value)}
            className="bg-[#1A1917] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="ALL">All Brands ({brands.length})</option>
            {brands.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="bg-[#1A1917] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="ALL">All Categories</option>
            {categories.map(c => <option key={c.code} value={c.code}>Category {c.code}</option>)}
          </select>

          <select
            value={activeFabricEval}
            onChange={e => setActiveFabricEval(e.target.value)}
            className="bg-[#1A1917] border border-white/10 rounded-lg px-3 py-2 text-sm text-[#D4AF37] font-semibold focus:outline-none focus:border-[#D4AF37]"
          >
            {FABRICS.map(f => (
              <option key={f.key} value={f.key}>
                View with: {f.name} ({f.delta > 0 ? `+${formatINR(f.delta)}/m` : '₹0'})
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="bg-[#1A1917] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
          >
            <option value="name">Sort: Name (A-Z)</option>
            <option value="price_asc">Sort: Price Ex-GST (Low to High)</option>
            <option value="price_desc">Sort: Price Ex-GST (High to Low)</option>
            <option value="length">Sort: Length (Long to Short)</option>
          </select>
        </div>

        <button
          onClick={() => { setSearchQuery(''); setFilterBrand('ALL'); setFilterCategory('ALL'); }}
          className="text-xs text-[#AFA89F] hover:text-white underline"
        >
          Reset Filters
        </button>
      </div>

      {/* Main Pricing Directory Table */}
      <div className="w-full bg-[#22201D] border border-white/10 rounded-xl overflow-x-auto shadow-2xl">
        <table className="w-full text-left text-xs border-collapse table-fixed">
          <colgroup>
            <col style={{ width: '22%' }} />
            <col style={{ width: '11%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '14%' }} />
          </colgroup>
          <thead>
            <tr className="bg-[#1A1917] border-b border-white/10 text-[11px] font-bold uppercase tracking-wider text-[#AFA89F]">
              <th className="p-3">Product</th>
              <th className="p-3">Category</th>
              <th className="p-3">Dimensions</th>
              <th className="p-3">Base Cost</th>
              <th className="p-3">Fabric Cost</th>
              <th className="p-3">Excl. GST</th>
              <th className="p-3">Final (18% GST)</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filteredSofas.map(sofa => {
              const prices = calculatePricing(sofa);
              return (
                <tr key={sofa.id} className="hover:bg-white/[0.02] transition-colors">
                  {/* Product */}
                  <td className="p-3 overflow-hidden">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={sofa.image}
                        alt={sofa.name}
                        className="w-16 h-12 rounded-lg object-cover bg-black/40 border border-white/15 shadow-md flex-shrink-0 transition-transform duration-200 hover:scale-150 hover:z-20 hover:border-[#D4AF37] cursor-pointer"
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="font-bold text-white text-xs truncate" title={sofa.name}>{sofa.name}</div>
                        <div className="flex items-center gap-1.5 mt-0.5 truncate">
                          <span className="bg-[#D4AF37]/20 text-[#D4AF37] px-1.5 py-0.5 rounded text-[10px] font-bold">
                            {sofa.brand}
                          </span>
                          <span className="bg-white/10 text-[#AFA89F] px-1.5 py-0.5 rounded text-[10px] truncate">
                            {sofa.configuration}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Inline Category Dropdown */}
                  <td className="p-3">
                    <select
                      value={sofa.category}
                      onChange={e => handleCategoryChange(sofa.id, e.target.value)}
                      className="bg-[#2A2824] border border-[#D4AF37] text-[#D4AF37] font-bold rounded px-2 py-1 text-xs focus:outline-none w-full max-w-[115px] truncate"
                    >
                      {categories.map(c => (
                        <option key={c.code} value={c.code}>
                          Cat {c.code} ({formatINR(c.rate)}/ft)
                        </option>
                      ))}
                    </select>
                    <div className="text-[10px] text-[#AFA89F] mt-0.5">{formatINR(prices.ratePerFt)}/ft</div>
                  </td>

                  {/* Dimensions */}
                  <td className="p-3">
                    <div className="font-mono font-bold text-[#D4AF37] text-xs">{prices.totalLen.toFixed(1)} ft</div>
                    <div className="text-[10px] text-[#AFA89F]">{sofa.depth || 30}"D</div>
                  </td>

                  {/* 1. Base Sofa Cost */}
                  <td className="p-3">
                    <div className="font-mono font-bold text-white text-xs">{formatINR(prices.baseCost)}</div>
                    <div className="text-[10px] text-[#AFA89F]">{prices.totalLen.toFixed(1)}' × {formatINR(prices.ratePerFt)}</div>
                  </td>

                  {/* 2. Fabric Cost */}
                  <td className="p-3">
                    <div className="font-mono font-bold text-white text-xs">{formatINR(prices.fabricCost)}</div>
                    <div className="text-[10px] text-[#AFA89F]">{prices.consumption}m/ft × +{formatINR(prices.fabricDelta)}</div>
                  </td>

                  {/* 3. Exclusive Price (Without GST) */}
                  <td className="p-3">
                    <div className="font-mono font-bold text-[#2ECC71] text-xs">{formatINR(prices.subtotal)}</div>
                    <div className="text-[10px] text-[#AFA89F]">Base + Fabric</div>
                  </td>

                  {/* 4. Final Price (With 18% GST) */}
                  <td className="p-3">
                    <div className="font-mono font-extrabold text-[#D4AF37] text-sm">{formatINR(prices.grandTotal)}</div>
                    <div className="text-[10px] text-[#AFA89F]">Incl. 18% GST</div>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <button
                      onClick={() => { setEditingSofa(sofa); setIsEditModalOpen(true); }}
                      className="px-2.5 py-1 bg-[#D4AF37] text-[#121110] font-bold rounded text-xs hover:bg-[#E5C158] transition-all whitespace-nowrap"
                    >
                      ✏️ Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Global Category Rates Modal */}
      {isCatModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#22201D] border border-[#D4AF37]/50 rounded-2xl max-w-2xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-xl font-serif font-bold text-white">⚙️ Global Category Rates & Add Category</h2>
              <button onClick={() => setIsCatModalOpen(false)} className="text-[#AFA89F] hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto">
              {categories.map(c => (
                <div key={c.code} className="flex items-center gap-3 bg-[#1A1917] p-3 rounded-lg border border-white/5">
                  <span className="font-bold text-[#D4AF37] w-12 text-center text-lg">{c.code}</span>
                  <span className="text-sm font-semibold text-white w-28">{c.tier}</span>
                  <div className="flex items-center gap-1 flex-1">
                    <span className="text-xs text-[#AFA89F]">₹</span>
                    <input
                      type="number"
                      value={c.rate}
                      onChange={e => handleUpdateCategoryRate(c.code, parseFloat(e.target.value) || 0)}
                      className="bg-[#2A2824] border border-white/10 rounded px-2 py-1 text-sm font-mono font-bold text-white w-28"
                    />
                    <span className="text-xs text-[#AFA89F]">/ ft</span>
                  </div>
                  {!c.isDefault && (
                    <button onClick={() => handleDeleteCategory(c.code)} className="text-red-400 hover:text-red-300 text-sm">
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Add New Category */}
            <div className="bg-[#1A1917] p-4 rounded-xl border border-white/10 mb-6">
              <h3 className="text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">➕ Add New Category</h3>
              <div className="grid grid-cols-4 gap-2">
                <input
                  type="text"
                  placeholder="Code (e.g. E)"
                  value={newCatCode}
                  onChange={e => setNewCatCode(e.target.value)}
                  className="bg-[#22201D] border border-white/10 rounded p-2 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="Tier (e.g. Luxury)"
                  value={newCatTier}
                  onChange={e => setNewCatTier(e.target.value)}
                  className="bg-[#22201D] border border-white/10 rounded p-2 text-xs text-white"
                />
                <input
                  type="number"
                  placeholder="Rate (₹/ft)"
                  value={newCatRate}
                  onChange={e => setNewCatRate(parseFloat(e.target.value) || 0)}
                  className="bg-[#22201D] border border-white/10 rounded p-2 text-xs text-white"
                />
                <button
                  onClick={handleAddCategory}
                  className="bg-[#D4AF37] text-[#121110] font-bold rounded p-2 text-xs hover:bg-[#E5C158]"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => { setIsCatModalOpen(false); triggerToast('✨ Category rates updated globally across all sofas!'); }}
                className="px-5 py-2 rounded-full bg-[#D4AF37] text-[#121110] font-bold text-sm"
              >
                Apply Globally
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Sofa Details Modal */}
      {isEditModalOpen && editingSofa && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#22201D] border border-[#D4AF37]/50 rounded-2xl max-w-xl w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <h2 className="text-xl font-serif font-bold text-white">✏️ Edit: {editingSofa.name}</h2>
              <button onClick={() => setIsEditModalOpen(false)} className="text-[#AFA89F] hover:text-white text-xl">✕</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-[#AFA89F] uppercase">Product Name</label>
                <input
                  type="text"
                  value={editingSofa.name}
                  onChange={e => setEditingSofa({ ...editingSofa, name: e.target.value })}
                  className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#AFA89F] uppercase">Category</label>
                  <select
                    value={editingSofa.category}
                    onChange={e => setEditingSofa({ ...editingSofa, category: e.target.value })}
                    className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1"
                  >
                    {categories.map(c => (
                      <option key={c.code} value={c.code}>Cat {c.code} ({formatINR(c.rate)}/ft)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-[#AFA89F] uppercase">Configuration</label>
                  <select
                    value={editingSofa.configuration}
                    onChange={e => setEditingSofa({ ...editingSofa, configuration: e.target.value as any })}
                    className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1"
                  >
                    <option value="Straight Line">Straight Line</option>
                    <option value="Curved Sofa">Curved Sofa</option>
                    <option value="L-Shape">L-Shape</option>
                    <option value="3+2 Sofa">3+2 Sofa</option>
                    <option value="U-Shape">U-Shape</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-[#AFA89F] uppercase">Part A (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingSofa.partALen}
                    onChange={e => setEditingSofa({ ...editingSofa, partALen: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#AFA89F] uppercase">Part B (ft)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingSofa.partBLen}
                    onChange={e => setEditingSofa({ ...editingSofa, partBLen: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-[#AFA89F] uppercase">Depth (in)</label>
                  <input
                    type="number"
                    value={editingSofa.depth}
                    onChange={e => setEditingSofa({ ...editingSofa, depth: parseFloat(e.target.value) || 30 })}
                    className="w-full bg-[#1A1917] border border-white/10 rounded p-2 text-sm text-white mt-1 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded text-sm text-[#AFA89F] hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setSofas(prev => prev.map(s => s.id === editingSofa.id ? editingSofa : s));
                  setIsEditModalOpen(false);
                  triggerToast(`✓ Updated ${editingSofa.name}`);
                }}
                className="px-5 py-2 rounded bg-[#D4AF37] text-[#121110] font-bold text-sm hover:bg-[#E5C158]"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
