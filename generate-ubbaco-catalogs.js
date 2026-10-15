const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const MANUAL_DIR = path.join(ROOT_DIR, 'Manually uploaded furniture');

function getFiles(dir) {
  try {
    return fs.readdirSync(dir).filter(f => !f.startsWith('.') && /\.(jpe?g|png|webp)$/i.test(f));
  } catch {
    return [];
  }
}

// Group files in sofa
function groupSofaFiles(files) {
  const groups = {};
  for (const f of files) {
    // Check patterns like "01 01.jpg", "03 (1).jpg", "29.jpg"
    let m = f.match(/^(\d{2})/);
    let key;
    if (m) {
      key = m[1];
    } else {
      key = 'misc';
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(`Manually uploaded furniture/sofa/${f}`);
  }
  return groups;
}

// Group files in accent chair
function groupChairFiles(files) {
  const groups = {};
  for (const f of files) {
    let key;
    if (/^ball cushions/i.test(f)) {
      key = 'ball-cushions';
    } else if (/^puffy/i.test(f)) {
      key = 'puffy-poufs';
    } else {
      let m = f.match(/^(\d{2})/);
      if (m) {
        key = m[1];
      } else {
        key = 'sculptural';
      }
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(`Manually uploaded furniture/accent chair/${f}`);
  }
  return groups;
}

function run() {
  const sofaDir = path.join(MANUAL_DIR, 'sofa');
  const chairDir = path.join(MANUAL_DIR, 'accent chair');

  const sofaFiles = getFiles(sofaDir);
  const chairFiles = getFiles(chairDir);

  const sofaGroups = groupSofaFiles(sofaFiles);
  const chairGroups = groupChairFiles(chairFiles);

  const sofas = [];
  const sortedSofaKeys = Object.keys(sofaGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const key of sortedSofaKeys) {
    const images = sofaGroups[key];
    const num = key;
    const name = `Ubbaco Designer Sofa #${num}`;
    const sku = `UBBACO-SF-${num}`;

    sofas.push({
      name,
      base_sku: sku,
      brand: 'Ubbaco',
      category: 'Sofa',
      price: 100,
      regular_price: '$100',
      url: '#',
      description: `Contemporary designer sofa from Ubbaco Atelier. Handcrafted with architectural proportions, clean modern contours, and luxurious comfort.`,
      dimensions: {
        raw: 'W --- x D --- x H --- cm',
        Width: '',
        Depth: '',
        Height: '',
        Length: ''
      },
      specifications: {
        Brand: 'Ubbaco',
        Category: 'Sofa',
        Price: '$100',
        Upholstery: 'Curated Luxury Fabric',
        Structure: 'Kiln-Dried Hardwood Frame',
        Cushioning: 'High-Resilience Architectural Foam',
        Assembly: 'Minimal Setup'
      },
      key_features: [
        'Curated Ubbaco Atelier Architecture',
        'Reinforced Solid Hardwood Joinery',
        'High-Density Multi-Layer Foam',
        'Complimentary White-Glove In-Home Placement'
      ],
      images,
      variants: [
        {
          title: 'Curated Edition',
          price: '$100',
          regular_price: '$100',
          sku,
          images
        }
      ]
    });
  }

  const chairs = [];
  const sortedChairKeys = Object.keys(chairGroups).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  for (const key of sortedChairKeys) {
    const images = chairGroups[key];
    let name, sku;
    if (key === 'ball-cushions') {
      name = 'Ubbaco Ball Cushion Accent Collection';
      sku = 'UBBACO-AC-BALL';
    } else if (key === 'puffy-poufs') {
      name = 'Ubbaco Puffy Lounge Pouf Collection';
      sku = 'UBBACO-AC-PUFFY';
    } else if (key === 'sculptural') {
      name = 'Ubbaco Sculptural Lounge Accent Chair';
      sku = 'UBBACO-AC-SCULPT';
    } else {
      name = `Ubbaco Accent Chair #${key}`;
      sku = `UBBACO-AC-${key}`;
    }

    chairs.push({
      name,
      base_sku: sku,
      brand: 'Ubbaco',
      category: 'Accent Chair',
      price: 100,
      regular_price: '$100',
      url: '#',
      description: `Sculptural accent chair from Ubbaco Atelier. Ergonomically shaped for tailored lounging and contemporary luxury interiors.`,
      dimensions: {
        raw: 'W --- x D --- x H --- cm',
        Width: '',
        Depth: '',
        Height: '',
        Length: ''
      },
      specifications: {
        Brand: 'Ubbaco',
        Category: 'Accent Chair',
        Price: '$100',
        Upholstery: 'Curated Textile / Bouclé',
        Frame: 'Hardwood / Reinforced Steel',
        Comfort: 'Ergonomic Support Cushioning',
        Assembly: 'Arrives Fully Assembled'
      },
      key_features: [
        'Architectural Sculptural Silhouette',
        'Plush High-Resilience Comfort',
        'Durable Commercial-Grade Construction',
        'Complimentary White-Glove In-Home Delivery'
      ],
      images,
      variants: [
        {
          title: 'Curated Edition',
          price: '$100',
          regular_price: '$100',
          sku,
          images
        }
      ]
    });
  }

  // Ensure output directories exist
  const sofaOutDir = path.join(ROOT_DIR, 'Sofa', 'Ubbaco');
  const chairOutDir = path.join(ROOT_DIR, 'Accent Chair', 'Ubbaco');

  if (!fs.existsSync(sofaOutDir)) fs.mkdirSync(sofaOutDir, { recursive: true });
  if (!fs.existsSync(chairOutDir)) fs.mkdirSync(chairOutDir, { recursive: true });

  const sofaOutFile = path.join(sofaOutDir, 'ubbaco_sofas.json');
  const chairOutFile = path.join(chairOutDir, 'ubbaco_accent_chairs.json');

  fs.writeFileSync(sofaOutFile, JSON.stringify(sofas, null, 2), 'utf8');
  fs.writeFileSync(chairOutFile, JSON.stringify(chairs, null, 2), 'utf8');

  console.log(`Generated ${sofas.length} Ubbaco Sofas in ${sofaOutFile}`);
  console.log(`Generated ${chairs.length} Ubbaco Accent Chairs in ${chairOutFile}`);
}

run();
