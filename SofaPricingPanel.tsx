import React, { useState, useMemo } from 'react';

/**
 * Plypicker Luxury Living - Sofa Product Data Entry & Real-Time Pricing Panel
 * Built for Next.js / React with Tailwind CSS.
 * Drives precise sofa valuations using linear length, category rate per foot,
 * fabric consumption, and multi-variant upholstery deltas with dual-key MongoDB compatibility.
 */

export interface FabricPricingConfig {
  key: string;
  name: string;
  delta: number;
  image: string;
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

export const CATEGORY_RATES: Record<string, { tier: string; rate: number }> = {
  A: { tier: 'Standard', rate: 6500 },
  B: { tier: 'Mid-Tier', rate: 7500 },
  C: { tier: 'Premium', rate: 8500 },
  D: { tier: 'Luxury Premium', rate: 12717.65 },
};

export const CONFIGURATIONS = [
  'Straight Line',
  'Curved Sofa',
  'L-Shape',
  '3+2 Sofa',
  'U-Shape',
  '3+2+1',
  '3+1+1',
  '3+2+2',
] as const;

export type SofaConfigType = typeof CONFIGURATIONS[number];

export default function SofaPricingPanel() {
  // Identity State
  const [productName, setProductName] = useState('Donald Luxury Sectional Sofa');
  const [brand, setBrand] = useState('Baywindow');
  const [city, setCity] = useState<'Pune' | 'Mumbai' | 'Navi Mumbai'>('Pune');
  const [imagesText, setImagesText] = useState('https://dlkotil4uzvzh.cloudfront.net/sofa-inline/boucle.png');

  // Category & Rate State
  const [selectedCat, setSelectedCat] = useState<'A' | 'B' | 'C' | 'D' | 'Custom'>('A');
  const [customRate, setCustomRate] = useState<number>(9500);

  // Configuration & Dimensions State
  const [configuration, setConfiguration] = useState<SofaConfigType>('L-Shape');
  const [partAFt, setPartAFt] = useState(6);
  const [partAIn, setPartAIn] = useState(0);
  const [partADepth, setPartADepth] = useState(30);

  const [partBFt, setPartBFt] = useState(3);
  const [partBIn, setPartBIn] = useState(0);
  const [partBDepth, setPartBDepth] = useState(30);

  const [partCFt, setPartCFt] = useState(0);
  const [partCIn, setPartCIn] = useState(0);
  const [partCDepth, setPartCDepth] = useState(30);

  const [consumptionRate, setConsumptionRate] = useState(3);

  // Active Selected Fabric for Preview
  const [activeFabricKey, setActiveFabricKey] = useState('Boucle');

  // Add-ons State
  const [pillows, setPillows] = useState({ round: 2, square: 0, ball: 0 });
  const [cushionComfort, setCushionComfort] = useState('Soft');
  const [legType, setLegType] = useState('Metal');
  const [sampleKit, setSampleKit] = useState(false);

  // Output Tabs
  const [activeTab, setActiveTab] = useState<'full' | 'single' | 'storefront'>('full');
  const [copied, setCopied] = useState(false);

  // Computed Values
  const ratePerFt = useMemo(() => {
    if (selectedCat === 'Custom') return customRate || 0;
    return CATEGORY_RATES[selectedCat]?.rate || 6500;
  }, [selectedCat, customRate]);

  const partALen = useMemo(() => {
    return Math.round((partAFt + (partAIn / 12)) * 100) / 100;
  }, [partAFt, partAIn]);

  const showPartB = configuration !== 'Straight Line' && configuration !== 'Curved Sofa';
  const showPartC = ['U-Shape', '3+2+1', '3+1+1', '3+2+2'].includes(configuration);

  const partBLen = useMemo(() => {
    if (!showPartB) return 0;
    return Math.round((partBFt + (partBIn / 12)) * 100) / 100;
  }, [partBFt, partBIn, showPartB]);

  const partCLen = useMemo(() => {
    if (!showPartC) return 0;
    return Math.round((partCFt + (partCIn / 12)) * 100) / 100;
  }, [partCFt, partCIn, showPartC]);

  const totalLength = useMemo(() => {
    return Math.round((partALen + partBLen + partCLen) * 100) / 100;
  }, [partALen, partBLen, partCLen]);

  const sizeStr = useMemo(() => {
    if (partALen) {
      if (partBLen && partBLen > 0) {
        return `${partALen}' x ${partBLen}'`;
      } else if (partADepth && partADepth > 0) {
        return `${partALen}' x ${Math.round((partADepth / 12) * 10) / 10}'`;
      } else {
        return `${partALen}'`;
      }
    }
    return 'Standard';
  }, [partALen, partBLen, partADepth]);

  const activeFabric = useMemo(() => {
    return FABRICS.find((f) => f.key === activeFabricKey) || FABRICS[0];
  }, [activeFabricKey]);

  // Pricing Formulas
  const baseCost = useMemo(() => Math.round(totalLength * ratePerFt), [totalLength, ratePerFt]);
  const fabricCost = useMemo(
    () => Math.round(consumptionRate * totalLength * activeFabric.delta),
    [consumptionRate, totalLength, activeFabric.delta]
  );
  const addonsCost = useMemo(
    () => pillows.round * 1200 + pillows.square * 1200 + pillows.ball * 2200,
    [pillows]
  );

  const subtotal = useMemo(() => baseCost + fabricCost + addonsCost, [baseCost, fabricCost, addonsCost]);
  const gst = useMemo(() => Math.round(subtotal * 0.18), [subtotal]);
  const grandTotal = useMemo(() => subtotal + gst, [subtotal, gst]);

  // Dual-Key Notation Desc Object
  const descObject = useMemo(() => {
    return {
      'Design Category': selectedCat,
      design_category: selectedCat,
      'Part A Length': String(partALen),
      'Dim.A.Length': String(partALen),
      'Dim A Length': String(partALen),
      'Part A Depth': String(partADepth),
      'Dim.A.Depth': String(partADepth),
      'Part B Length': showPartB ? String(partBLen) : '',
      'Dim.B.Length': showPartB ? String(partBLen) : '',
      'Part B Depth': showPartB ? String(partBDepth) : '',
      'Dim.B.Depth': showPartB ? String(partBDepth) : '',
      'Part C Length': showPartC ? String(partCLen) : '',
      'Dim.C.Length': showPartC ? String(partCLen) : '',
      Configuration: configuration,
      Size: sizeStr,
      'Cushion Comfort': cushionComfort,
      Legs: legType,
    };
  }, [selectedCat, partALen, partADepth, showPartB, partBLen, partBDepth, showPartC, partCLen, configuration, sizeStr, cushionComfort, legType]);

  // All 9 Auto-Generated Variants Array
  const variantsArray = useMemo(() => {
    const images = imagesText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);
    return FABRICS.map((f) => {
      const vPrice = Math.round(totalLength * ratePerFt + consumptionRate * totalLength * f.delta);
      return {
        city,
        product_name: `${productName} in ${f.name}`,
        price: vPrice,
        discounted_price: vPrice,
        discounted_percent: 0,
        consumption_rate: consumptionRate,
        laborPerFloor: 150,
        applicability: 1,
        is_active: true,
        attributes: {
          var: f.name,
          color: 'Default',
          finish: f.name,
          images: images.length ? images : [f.image],
        },
      };
    });
  }, [imagesText, totalLength, ratePerFt, consumptionRate, city, productName]);

  // JSON Output based on active tab
  const jsonExportString = useMemo(() => {
    const images = imagesText.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean);

    if (activeTab === 'full') {
      return JSON.stringify(
        {
          product_name: productName,
          brand,
          city,
          furniture_category_id: '650c7d3f9b6be37852216adb',
          sofa_subcategory_id: '650c83879b6be37852216ae0',
          category: 'Sofa',
          subcategory: 'Luxury Sofas',
          consumption_rate: consumptionRate,
          desc: descObject,
          base_price: baseCost,
          price: variantsArray[0]?.price || baseCost,
          discounted_price: variantsArray[0]?.discounted_price || baseCost,
          images,
          vars: variantsArray,
        },
        null,
        2
      );
    } else if (activeTab === 'single') {
      const activePrice = Math.round(totalLength * ratePerFt + consumptionRate * totalLength * activeFabric.delta);
      return JSON.stringify(
        {
          price: activePrice,
          discounted_price: activePrice,
          consumption_rate: consumptionRate,
          desc: descObject,
          attributes: {
            var: activeFabric.name,
            color: 'Default',
            finish: activeFabric.name,
          },
        },
        null,
        2
      );
    } else {
      return JSON.stringify(
        {
          name: `${productName} (${configuration})`,
          brand,
          category: 'Sofa',
          price: grandTotal,
          image: images[0] || activeFabric.image,
          images,
          dimensions: {
            Length: `${totalLength} ft`,
            Depth: `${partADepth} in`,
            Configuration: configuration,
            Size: sizeStr,
          },
          specifications: {
            'Design Category': `Category ${selectedCat}`,
            'Total Length (ft)': totalLength,
            Fabric: activeFabric.name,
            'Consumption Rate': `${consumptionRate} m/ft`,
            'Cushion Comfort': cushionComfort,
            Legs: legType,
          },
        },
        null,
        2
      );
    }
  }, [activeTab, productName, brand, city, consumptionRate, descObject, baseCost, variantsArray, imagesText, totalLength, ratePerFt, activeFabric, grandTotal, partADepth, configuration, sizeStr, selectedCat, cushionComfort, legType]);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonExportString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#121110] text-[#FAF8F5] p-6 lg:p-10 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Banner */}
        <div className="border-b border-[#D4AF37]/30 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#D4AF37] mb-2">
              ✨ Official Plypicker Sofa Pricing Engine
            </div>
            <h1 className="text-3xl lg:text-4xl font-serif font-bold tracking-tight text-white">
              Sofa Product Data Entry &amp; Pricing Panel
            </h1>
            <p className="text-sm text-[#AFA89F] mt-1">
              Drive linear foot rates, multi-variant fabric deltas, and dual-key MongoDB export in real time.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-lg bg-gradient-to-r from-[#D4AF37] to-[#B89020] text-[#121110] font-bold text-sm shadow-lg hover:shadow-[#D4AF37]/30 transition-all transform hover:-translate-y-0.5"
            >
              {copied ? '✓ Copied!' : '📋 Copy MongoDB JSON'}
            </button>
          </div>
        </div>

        {/* Two-Column Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Inputs (7 Cols) */}
          <div className="lg:col-span-7 space-y-6">

            {/* 1. Identity */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#D4AF37] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-extrabold flex items-center justify-center">1</span>
                Product Master Information
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase font-bold text-[#AFA89F]">Master Product Name</label>
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full mt-1 bg-[#22201D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-[#AFA89F]">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full mt-1 bg-[#22201D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
                <div>
                  <label className="text-xs uppercase font-bold text-[#AFA89F]">City (Mandatory Enum)</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value as any)}
                    className="w-full mt-1 bg-[#22201D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  >
                    <option value="Pune">Pune</option>
                    <option value="Mumbai">Mumbai</option>
                    <option value="Navi Mumbai">Navi Mumbai</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs uppercase font-bold text-[#AFA89F]">CDN Image URLs (comma/newline separated)</label>
                  <input
                    type="text"
                    value={imagesText}
                    onChange={(e) => setImagesText(e.target.value)}
                    className="w-full mt-1 bg-[#22201D] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            {/* 2. Category */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-[#D4AF37] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-extrabold flex items-center justify-center">2</span>
                  Design Category Rate (₹ / ft)
                </h2>
                <span className="text-xs font-mono font-bold text-[#D4AF37] bg-[#D4AF37]/10 px-2.5 py-1 rounded-full border border-[#D4AF37]/30">
                  ₹{ratePerFt.toLocaleString('en-IN')}/ft
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {(['A', 'B', 'C', 'D'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      selectedCat === cat
                        ? 'border-[#D4AF37] bg-[#D4AF37]/15 shadow-md shadow-[#D4AF37]/10'
                        : 'border-white/10 bg-[#22201D] hover:border-white/30'
                    }`}
                  >
                    <div className="text-[10px] uppercase font-bold text-[#D4AF37]">Category {cat}</div>
                    <div className="text-xs font-bold text-white">{CATEGORY_RATES[cat].tier}</div>
                    <div className="text-xs font-mono text-[#D4AF37] mt-1 font-extrabold">
                      ₹{CATEGORY_RATES[cat].rate.toLocaleString('en-IN')}/ft
                    </div>
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setSelectedCat('Custom')}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selectedCat === 'Custom'
                      ? 'border-[#D4AF37] bg-[#D4AF37]/15'
                      : 'border-white/10 bg-[#22201D] hover:border-white/30'
                  }`}
                >
                  <div className="text-[10px] uppercase font-bold text-[#D4AF37]">Custom</div>
                  <div className="text-xs font-bold text-white">Dynamic</div>
                  <input
                    type="number"
                    value={customRate}
                    onChange={(e) => setCustomRate(parseFloat(e.target.value) || 0)}
                    className="w-full mt-1 bg-black/40 border border-white/20 rounded px-1.5 py-0.5 text-xs font-mono text-[#D4AF37]"
                  />
                </button>
              </div>
            </div>

            {/* 3. Configuration & Dimensions */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-6 shadow-xl space-y-5">
              <h2 className="text-lg font-serif font-bold text-[#D4AF37] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-extrabold flex items-center justify-center">3</span>
                Configuration &amp; Linear Dimensions
              </h2>

              {/* Config Buttons */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CONFIGURATIONS.map((cfg) => (
                  <button
                    key={cfg}
                    type="button"
                    onClick={() => {
                      setConfiguration(cfg);
                      if (cfg === 'Curved Sofa' && consumptionRate === 3) setConsumptionRate(2);
                    }}
                    className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                      configuration === cfg
                        ? 'bg-[#D4AF37] text-[#121110] font-bold border-[#D4AF37]'
                        : 'bg-[#22201D] text-[#AFA89F] border-white/10 hover:text-white'
                    }`}
                  >
                    {cfg}
                  </button>
                ))}
              </div>

              {/* Part A */}
              <div className="bg-[#22201D] p-4 rounded-lg border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-bold text-[#D4AF37]">
                  <span>Part A (Main Section)</span>
                  <span className="font-mono">{partALen.toFixed(2)} ft</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[10px] uppercase text-[#AFA89F]">Feet</label>
                    <input
                      type="number"
                      value={partAFt}
                      onChange={(e) => setPartAFt(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-[#AFA89F]">Inches</label>
                    <input
                      type="number"
                      value={partAIn}
                      onChange={(e) => setPartAIn(parseFloat(e.target.value) || 0)}
                      className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase text-[#AFA89F]">Depth</label>
                    <select
                      value={partADepth}
                      onChange={(e) => setPartADepth(parseFloat(e.target.value))}
                      className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                    >
                      {[26, 28, 30, 32, 34, 36].map((d) => (
                        <option key={d} value={d}>{d}&quot;</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Part B */}
              {showPartB && (
                <div className="bg-[#22201D] p-4 rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#D4AF37]">
                    <span>Part B (Chaise / 2-Seater)</span>
                    <span className="font-mono">{partBLen.toFixed(2)} ft</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Feet</label>
                      <input
                        type="number"
                        value={partBFt}
                        onChange={(e) => setPartBFt(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Inches</label>
                      <input
                        type="number"
                        value={partBIn}
                        onChange={(e) => setPartBIn(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Depth</label>
                      <select
                        value={partBDepth}
                        onChange={(e) => setPartBDepth(parseFloat(e.target.value))}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      >
                        {[26, 28, 30, 32, 34, 36].map((d) => (
                          <option key={d} value={d}>{d}&quot;</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Part C */}
              {showPartC && (
                <div className="bg-[#22201D] p-4 rounded-lg border border-white/5 space-y-2">
                  <div className="flex justify-between text-xs font-bold text-[#D4AF37]">
                    <span>Part C (Opposite Return / 1-Seater)</span>
                    <span className="font-mono">{partCLen.toFixed(2)} ft</span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Feet</label>
                      <input
                        type="number"
                        value={partCFt}
                        onChange={(e) => setPartCFt(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Inches</label>
                      <input
                        type="number"
                        value={partCIn}
                        onChange={(e) => setPartCIn(parseFloat(e.target.value) || 0)}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-[#AFA89F]">Depth</label>
                      <select
                        value={partCDepth}
                        onChange={(e) => setPartCDepth(parseFloat(e.target.value))}
                        className="w-full mt-1 bg-[#1A1917] border border-white/10 rounded px-2 py-1 text-sm text-white"
                      >
                        {[26, 28, 30, 32, 34, 36].map((d) => (
                          <option key={d} value={d}>{d}&quot;</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Live Banner */}
              <div className="bg-gradient-to-r from-[#D4AF37]/15 to-emerald-500/10 border border-[#D4AF37]/30 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-[11px] uppercase font-bold text-[#AFA89F]">Total Linear Length</div>
                  <div className="text-2xl font-mono font-extrabold text-[#D4AF37]">{totalLength.toFixed(2)} ft</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase font-bold text-[#AFA89F]">Formatted Size String</div>
                  <div className="text-lg font-mono font-bold text-white">{sizeStr}</div>
                </div>
                <div className="w-full text-xs text-[#AFA89F] border-t border-white/10 pt-2 font-mono">
                  Base Formula: {totalLength} ft × ₹{ratePerFt.toLocaleString('en-IN')} = ₹{baseCost.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* 4. Fabrics */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-serif font-bold text-[#D4AF37] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-extrabold flex items-center justify-center">4</span>
                  Fabric Upholstery Matrix
                </h2>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#AFA89F]">Consumption:</span>
                  <input
                    type="number"
                    value={consumptionRate}
                    onChange={(e) => setConsumptionRate(parseFloat(e.target.value) || 3)}
                    className="w-14 bg-[#22201D] border border-white/10 rounded px-2 py-0.5 text-center text-white font-mono"
                  />
                  <span className="text-[#AFA89F]">m/ft</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {FABRICS.map((f) => {
                  const varPrice = Math.round(totalLength * ratePerFt + consumptionRate * totalLength * f.delta);
                  const isSelected = activeFabricKey === f.key;
                  return (
                    <div
                      key={f.key}
                      onClick={() => setActiveFabricKey(f.key)}
                      className={`p-3 rounded-lg border flex items-center gap-3 cursor-pointer transition-all ${
                        isSelected
                          ? 'border-[#D4AF37] bg-[#D4AF37]/15 shadow-md shadow-[#D4AF37]/10'
                          : 'border-white/10 bg-[#22201D] hover:border-white/30'
                      }`}
                    >
                      <img src={f.image} alt={f.name} className="w-10 h-10 rounded object-cover border border-white/10" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-white truncate">{f.name}</div>
                        <div className="text-[10px] text-[#D4AF37]">{f.delta > 0 ? `+₹${f.delta}/m` : 'Included'}</div>
                        <div className="text-xs font-mono font-bold text-white mt-0.5">
                          ₹{varPrice.toLocaleString('en-IN')}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5. Add-ons */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-6 shadow-xl space-y-4">
              <h2 className="text-lg font-serif font-bold text-[#D4AF37] flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#D4AF37] text-black text-xs font-extrabold flex items-center justify-center">5</span>
                Add-on Customizations
              </h2>

              <div className="divide-y divide-white/5 text-sm">
                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Base Pillow</div>
                    <div className="text-xs text-[#AFA89F]">1 Round or Square Pillow</div>
                  </div>
                  <span className="text-xs font-bold text-emerald-400">FREE (₹0)</span>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Extra Round Pillows (+₹1,200)</div>
                  </div>
                  <div className="flex items-center border border-white/10 rounded bg-[#22201D]">
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, round: Math.max(0, p.round - 1) }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-mono font-bold">{pillows.round}</span>
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, round: p.round + 1 }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Extra Square Pillows (+₹1,200)</div>
                  </div>
                  <div className="flex items-center border border-white/10 rounded bg-[#22201D]">
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, square: Math.max(0, p.square - 1) }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-mono font-bold">{pillows.square}</span>
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, square: p.square + 1 }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Extra Ball Pillows (+₹2,200)</div>
                  </div>
                  <div className="flex items-center border border-white/10 rounded bg-[#22201D]">
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, ball: Math.max(0, p.ball - 1) }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      -
                    </button>
                    <span className="px-3 text-xs font-mono font-bold">{pillows.ball}</span>
                    <button
                      type="button"
                      onClick={() => setPillows((p) => ({ ...p, ball: p.ball + 1 }))}
                      className="px-2 py-0.5 text-base font-bold text-white hover:bg-white/10"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Cushion Comfort Level</div>
                  </div>
                  <select
                    value={cushionComfort}
                    onChange={(e) => setCushionComfort(e.target.value)}
                    className="bg-[#22201D] border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                  >
                    <option value="Super soft">Super Soft</option>
                    <option value="Soft">Soft</option>
                    <option value="Normal Hard">Normal Hard</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div className="py-2.5 flex justify-between items-center">
                  <div>
                    <div className="font-bold">Leg Type</div>
                  </div>
                  <select
                    value={legType}
                    onChange={(e) => setLegType(e.target.value)}
                    className="bg-[#22201D] border border-white/10 rounded px-2.5 py-1 text-xs text-white"
                  >
                    <option value="Metal">Metal (Gold / Black)</option>
                    <option value="Wooden">Natural Teak Wood</option>
                    <option value="PVC">Concealed PVC</option>
                  </select>
                </div>
              </div>
            </div>

          </div>

          {/* Right Column: Sticky Summary & JSON (5 Cols) */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-8">
            
            {/* Price Hero */}
            <div className="bg-gradient-to-br from-[#D4AF37]/20 via-[#1A1917] to-[#141311] border-2 border-[#D4AF37] rounded-xl p-6 shadow-2xl space-y-4">
              <div className="text-xs uppercase font-extrabold tracking-wider text-[#D4AF37]">
                Real-Time Valuation (Incl. 18% GST)
              </div>
              <div className="text-4xl lg:text-5xl font-serif font-extrabold text-white">
                ₹{grandTotal.toLocaleString('en-IN')}
              </div>
              <div className="text-xs text-[#AFA89F]">
                Category {selectedCat} (₹{ratePerFt.toLocaleString('en-IN')}/ft) · {totalLength.toFixed(2)} ft {configuration} · {activeFabric.name}
              </div>

              {/* Breakdown */}
              <div className="border-t border-white/10 pt-4 space-y-2 text-sm">
                <div className="flex justify-between text-[#AFA89F]">
                  <span>Base Cost ({totalLength} ft × ₹{ratePerFt.toLocaleString('en-IN')})</span>
                  <span className="font-mono text-white font-bold">₹{baseCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#AFA89F]">
                  <span>Fabric Cost ({consumptionRate} m/ft × ₹{activeFabric.delta}/m)</span>
                  <span className="font-mono text-white font-bold">₹{fabricCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#AFA89F]">
                  <span>Add-ons &amp; Pillows</span>
                  <span className="font-mono text-white font-bold">₹{addonsCost.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t border-dashed border-white/20 pt-2 flex justify-between font-bold text-white">
                  <span>Subtotal (Excl. GST)</span>
                  <span className="font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-[#AFA89F]">
                  <span>GST (18%)</span>
                  <span className="font-mono text-white">₹{gst.toLocaleString('en-IN')}</span>
                </div>
                <div className="border-t-2 border-[#D4AF37] pt-2 flex justify-between text-base font-extrabold text-[#D4AF37]">
                  <span>Grand Total</span>
                  <span className="font-mono">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>

            {/* JSON Output Container */}
            <div className="bg-[#1A1917] border border-white/10 rounded-xl p-5 shadow-xl space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wide">Production Output</h3>
                <span className="text-[10px] text-[#AFA89F] font-mono">Dual-Key Spec Compliant</span>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab('full')}
                  className={`pb-2 px-2.5 font-bold border-b-2 transition-all ${
                    activeTab === 'full' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#AFA89F]'
                  }`}
                >
                  Full Product (9 Vars)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('single')}
                  className={`pb-2 px-2.5 font-bold border-b-2 transition-all ${
                    activeTab === 'single' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#AFA89F]'
                  }`}
                >
                  Single Variant
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('storefront')}
                  className={`pb-2 px-2.5 font-bold border-b-2 transition-all ${
                    activeTab === 'storefront' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-[#AFA89F]'
                  }`}
                >
                  Storefront Item
                </button>
              </div>

              {/* Code */}
              <pre className="bg-[#0E0D0C] border border-white/5 rounded-lg p-3 text-[11px] font-mono text-[#D4D0C8] overflow-x-auto max-h-80 overflow-y-auto leading-relaxed">
                {jsonExportString}
              </pre>

              <button
                type="button"
                onClick={handleCopy}
                className="w-full py-2.5 rounded-lg bg-[#D4AF37] text-[#121110] font-bold text-xs uppercase tracking-wider hover:bg-[#E5C158] transition-all"
              >
                {copied ? '✓ Copied to Clipboard!' : '📋 Copy JSON Document'}
              </button>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
