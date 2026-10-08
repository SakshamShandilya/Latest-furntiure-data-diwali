# Moderna Atelier · Luxury Furniture Product Listing Page

An editorial, high-performance E-Commerce Product Listing Page (PLP) designed for contemporary furniture collections. Built with an extensible architecture that supports dynamic multi-category and multi-brand JSON additions.

---

## 🌟 Key Features

### 1. Curated Luxury Aesthetic
- **Editorial Typography**: Styled with high-contrast serif headlines (*Playfair Display*) and modern geometric sans-serif (*Plus Jakarta Sans*).
- **Dual Themes**: 
  - **Alabaster Warm Ivory**: Soft gallery neutrals with champagne borders and dark espresso accents.
  - **Obsidian Dark Luxe**: Deep charcoal and noir tones with gold highlights, toggleable via the top utility bar.
- **Micro-Interactions**: Smooth card hover elevation, multi-image hover preview, pill tag animations, and responsive layout switching.

### 2. Rich Data Extraction (90 Modani Sofas)
- Automatically parses all fields from `Sofa/Modani/modani_sofas.json`:
  - **Multi-Photo Scrubbing**: Cards preview up to 14 high-resolution lifestyle and cutout images from Modani's CDN.
  - **Dimensions Snippet**: Automatically extracts and formats dimensions (e.g., `W: 94 7/8" x D: 40 3/16" x H: 29 15/16"`).
  - **Silhouettes & Configurations**: Sectionals, 3-Seater, 2-Seater / Loveseats, Modular, and Curved profiles.
  - **Material & Fabric Tech**: Bouclé, Velvet, LiveSmart® Stain Resistant & Moisture Repellent, Duck Feather & Down fillings.
  - **Luxury Pricing**: Generates realistic luxury pricing with monthly 0% APR Affirm financing breakdown, while supporting custom `price` properties in newly imported JSONs.

### 3. Quick View & Spec Detail Modal
- **Full Studio Gallery**: High-res zoomable showcase image with an interactive horizontal thumbnail strip.
- **Technical Specification Matrix**:
  - Dimensions (Width × Depth × Height)
  - Cushion Filling & Comfort Composition
  - Inner Frame & Suspension Systems
  - Legs & Base Finish
- **Direct Official Link**: One-click button linking directly to the authentic product page on Modani.com.

### 4. Interactive Filters, Search, & Layouts
- **Instant Search**: Debounced search across title, description, dimensions, and fabric attributes (hotkey: `/`).
- **Quick Filter Pills**: Instant one-click toggles for Sectionals, 3-Seaters, Bouclé, Feather-Down, and Warm Tones.
- **Sidebar Facets**: Multi-select filtering by Silhouette, Color Swatches, Fabric, Comfort, and Price Range.
- **Layout Modes**: Switch between 4-column compact grid, 3-column luxury gallery, 2-column editorial magazine, and 1-column technical list view.
- **Side-by-Side Comparison**: Compare up to 4 selected sofas side-by-side in a floating comparison matrix.
- **Wishlist & Shopping Bag**: Persistent local storage drawers with subtotal calculations.

---

## 📥 Adding New JSON Catalogs

The application is built to accommodate new JSON files that you add:

### Method 1: In-Browser 1-Click Import (Data Hub)
1. Click **`+ Add JSON`** in the top navigation bar or **`Data Hub / Add JSON`** in the top utility bar.
2. Drag and drop any `.json` file into the dropzone (or paste raw JSON).
3. Enter or confirm the **Category Name** (e.g., `Sofa`, `Chair`, `Bed`, `Dining`) and **Brand Name** (e.g., `Modani`, `West Elm`, `CB2`).
4. Click **`Load & Integrate Catalog`**. The application validates the data and adds the category and brand to your navigation bar and filter menus.

### Method 2: Folder-Based Auto-Discovery
Organize any new JSON files in the workspace following the folder convention:
```
<Category>/
  └── <Brand>/
        └── <filename>.json
```
*Example:*
```
Chair/
  └── WestElm/
        └── chairs.json
```
Then run the sync command in your terminal:
```bash
npm run sync
```
This updates `catalog-manifest.json` and `catalogs-bundle.js`.

---

## 🚀 Running Locally

The local server is pre-configured and running at:
```
http://localhost:3000
```

To restart or run the server at any time:
```bash
npm start
```
*(Runs `server.js`, a zero-dependency Node HTTP server with built-in CORS and catalog-saving APIs).*

> **Offline Support**: The application also includes pre-bundled data in `catalogs-bundle.js`, allowing `index.html` to open directly via standard double-click even without an active server.
