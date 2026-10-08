/**
 * Scan workspace directories for any <Category>/<Brand>/*.json product catalog files.
 * Generates:
 * 1. catalog-manifest.json (for fetch API)
 * 2. catalogs-bundle.js (embedded global fallback for file:// protocol without CORS)
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = __dirname;
const IGNORE_DIRS = new Set(['.git', '.agents', '.gemini', 'node_modules', 'dist', 'build']);

function scanCatalogs() {
  const catalogs = [];
  const allData = {};

  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  for (const ent of entries) {
    if (!ent.isDirectory() || IGNORE_DIRS.has(ent.name) || ent.name.startsWith('.')) continue;

    const categoryDir = path.join(ROOT_DIR, ent.name);
    let brandEntries;
    try {
      brandEntries = fs.readdirSync(categoryDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const bEnt of brandEntries) {
      if (!bEnt.isDirectory() || bEnt.name.startsWith('.')) continue;

      const brandDir = path.join(categoryDir, bEnt.name);
      let files;
      try {
        files = fs.readdirSync(brandDir, { withFileTypes: true });
      } catch {
        continue;
      }

      const jsonFiles = files.filter(f => f.isFile() && f.name.endsWith('.json'));
      const hasMultiple = jsonFiles.length > 1;

      for (const f of jsonFiles) {
        const relPath = `${ent.name}/${bEnt.name}/${f.name}`;
        const fullPath = path.join(brandDir, f.name);

        try {
          const raw = fs.readFileSync(fullPath, 'utf8');
          const items = JSON.parse(raw);
          if (Array.isArray(items)) {
            const isLatest = /latest/i.test(f.name);
            const safeCategory = ent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            const safeBrand = bEnt.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
            let catalogId = `${safeCategory}-${safeBrand}`;
            let displayName = bEnt.name;

            if (isLatest) {
              catalogId = `${safeCategory}-${safeBrand}-latest`;
              displayName = `${bEnt.name} (Latest Edition)`;
            } else if (hasMultiple) {
              const slug = f.name.replace(/\.json$/i, '').replace(/[^a-zA-Z0-9]+/g, '-').toLowerCase().replace(/^-+|-+$/g, '');
              catalogId = `${safeCategory}-${safeBrand}-${slug}`;
              displayName = `${bEnt.name} (${f.name.replace(/\.json$/i, '')})`;
            }

            let totalImages = 0;
            let totalVideos = 0;
            const videoRegex = /\b(video|\.mp4|\.webm|\.mov|youtube|vimeo)\b/i;
            items.forEach(it => {
              const itemImgs = [];
              if (Array.isArray(it.images)) itemImgs.push(...it.images);
              if (Array.isArray(it.variants)) {
                it.variants.forEach(v => {
                  if (Array.isArray(v.images)) {
                    v.images.forEach(img => {
                      if (!itemImgs.includes(img)) itemImgs.push(img);
                    });
                  }
                });
              }
              if (it.dimension_image && !itemImgs.includes(it.dimension_image)) itemImgs.push(it.dimension_image);
              totalImages += itemImgs.length;

              const vids = Array.isArray(it.videos) ? it.videos : (it.videos ? [it.videos] : []);
              const allV = [...vids, ...itemImgs.filter(url => videoRegex.test(url))];
              totalVideos += allV.length;
            });

            const brandName = bEnt.name === 'Rove' ? 'Rove Concepts' : bEnt.name;

            const catObj = {
              id: catalogId,
              category: ent.name,
              brand: brandName,
              rawBrand: bEnt.name,
              displayName: `${brandName} · ${ent.name}${hasMultiple ? ` (${f.name.replace(/\.json$/i, '')})` : ''}`,
              fileName: f.name,
              relativePath: relPath,
              itemCount: items.length,
              totalImages,
              totalVideos,
              isLatest,
              default: isLatest || (!hasMultiple && ent.name === 'Sofa' && bEnt.name === 'Modani')
            };
            catalogs.push(catObj);
            allData[catalogId] = items;
          }
        } catch (err) {
          console.error(`[Scan] Error parsing ${relPath}:`, err.message);
        }
      }
    }
  }

  // Ensure default catalog comes first
  catalogs.sort((a, b) => (b.default ? 1 : 0) - (a.default ? 1 : 0));

  const manifest = {
    updatedAt: new Date().toISOString(),
    totalCatalogs: catalogs.length,
    catalogs
  };

  fs.writeFileSync(path.join(ROOT_DIR, 'catalog-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[Scan] Wrote catalog-manifest.json with ${catalogs.length} catalogs.`);

  // Write catalogs-bundle.js for offline file:// support
  const bundleContent = `/** Auto-generated catalog bundle for offline and file:// support */
window.PRELOADED_MANIFEST = ${JSON.stringify(manifest, null, 2)};
window.PRELOADED_DATA = ${JSON.stringify(allData)};
`;
  fs.writeFileSync(path.join(ROOT_DIR, 'catalogs-bundle.js'), bundleContent, 'utf8');
  console.log(`[Scan] Wrote catalogs-bundle.js successfully.`);

  return catalogs;
}

if (require.main === module) {
  scanCatalogs();
}

module.exports = { scanCatalogs };
