#!/usr/bin/env python3
"""
Plypicker Visual Deduplication Engine
Scans all 1,903 products across 44 catalogs using multi-spectral perceptual hashing,
HSV color histogram vectors, and geometric structural similarity.
"""

import os
import sys
import json
import time
import hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
import urllib.parse

# Set stdout/stderr to UTF-8 on Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

from PIL import Image
import numpy as np
import imagehash
import requests

ROOT_DIR = Path(__file__).resolve().parent
CACHE_DIR = ROOT_DIR / ".cache_dedup"
CACHE_DIR.mkdir(exist_ok=True)

USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_image_cache_path(url_or_path: str) -> Path:
    h = hashlib.sha256(url_or_path.encode("utf-8")).hexdigest()[:16]
    return CACHE_DIR / f"{h}.jpg"

def load_or_fetch_thumbnail(url_or_path: str, max_size=(320, 320)) -> Path:
    """Downloads or loads an image and saves a standardized 320x320 thumbnail in cache."""
    cache_path = get_image_cache_path(url_or_path)
    if cache_path.exists() and cache_path.stat().st_size > 500:
        return cache_path

    try:
        if url_or_path.startswith("http://") or url_or_path.startswith("https://"):
            headers = {"User-Agent": USER_AGENT}
            resp = requests.get(url_or_path, headers=headers, timeout=10)
            if resp.status_code == 200:
                from io import BytesIO
                img = Image.open(BytesIO(resp.content)).convert("RGB")
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                img.save(cache_path, "JPEG", quality=85)
                return cache_path
        else:
            # Local file path
            local_path = ROOT_DIR / url_or_path
            if not local_path.exists():
                local_path = ROOT_DIR / urllib.parse.unquote(url_or_path)
            if local_path.exists():
                img = Image.open(local_path).convert("RGB")
                img.thumbnail(max_size, Image.Resampling.LANCZOS)
                img.save(cache_path, "JPEG", quality=85)
                return cache_path
    except Exception as e:
        # Ignore failed downloads
        pass

    return None

def extract_visual_fingerprint(thumb_path: Path):
    """Computes DCT pHash, dHash, wHash, and HSV color histogram."""
    try:
        with Image.open(thumb_path) as img:
            rgb_img = img.convert("RGB")
            
            # 1. Perceptual Hashes
            p_h = imagehash.phash(rgb_img)
            d_h = imagehash.dhash(rgb_img)
            w_h = imagehash.whash(rgb_img)

            # 2. Color Histogram in HSV
            hsv_img = rgb_img.convert("HSV")
            arr = np.array(hsv_img)
            # 8 hue bins, 4 sat bins, 4 val bins = 128-dim descriptor
            hist, _ = np.histogramdd(
                arr.reshape(-1, 3),
                bins=(8, 4, 4),
                range=((0, 256), (0, 256), (0, 256))
            )
            hist = hist.flatten()
            norm = np.linalg.norm(hist)
            if norm > 0:
                hist = hist / norm

            return {
                "phash": p_h,
                "dhash": d_h,
                "whash": w_h,
                "color_hist": hist
            }
    except Exception as e:
        return None

def compute_similarity(f1, f2):
    """Calculates normalized visual similarity between two fingerprints."""
    if not f1 or not f2:
        return 0.0

    p_dist = f1["phash"] - f2["phash"]   # 0 to 64
    d_dist = f1["dhash"] - f2["dhash"]   # 0 to 64
    w_dist = f1["whash"] - f2["whash"]   # 0 to 64

    # Cosine similarity of color histograms
    color_sim = float(np.dot(f1["color_hist"], f2["color_hist"]))

    # Weight the metrics
    hash_dist = (p_dist * 0.45) + (d_dist * 0.35) + (w_dist * 0.20)
    hash_sim = max(0.0, 1.0 - (hash_dist / 32.0)) # 32 bits difference = 0% similarity

    # Blend structural hash similarity and color similarity
    # Furniture silhouette is 70% weight, color/fabric tone is 30% weight
    total_sim = (hash_sim * 0.70) + (color_sim * 0.30)
    return round(total_sim * 100, 2), p_dist, d_dist, round(color_sim, 3)

def load_all_products():
    manifest_path = ROOT_DIR / "catalog-manifest.json"
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    all_products = []
    print(f"[*] Reading {len(manifest['catalogs'])} catalogs from manifest...")

    for cat in manifest["catalogs"]:
        rel_path = cat["relativePath"]
        full_path = ROOT_DIR / rel_path
        if not full_path.exists():
            continue

        try:
            with open(full_path, "r", encoding="utf-8") as f:
                items = json.load(f)

            for idx, item in enumerate(items):
                # Resolve primary image
                img = None
                if isinstance(item.get("images"), list) and len(item["images"]) > 0:
                    img = item["images"][0]
                elif isinstance(item.get("variants"), list) and len(item["variants"]) > 0:
                    v_imgs = item["variants"][0].get("images")
                    if isinstance(v_imgs, list) and len(v_imgs) > 0:
                        img = v_imgs[0]

                if not img:
                    continue

                prod_id = f"{cat['id']}_item_{idx}"
                name = item.get("name") or (item.get("variants") and item["variants"][0].get("title")) or f"Piece #{idx+1}"
                price = item.get("price") or (item.get("variants") and item["variants"][0].get("price")) or 0

                all_products.append({
                    "id": prod_id,
                    "name": name,
                    "brand": cat["brand"],
                    "category": cat["category"],
                    "catalogId": cat["id"],
                    "catalogFile": rel_path,
                    "itemIndex": idx,
                    "price": str(price),
                    "image": img
                })
        except Exception as e:
            print(f"Error reading {rel_path}: {e}")

    print(f"[*] Total products loaded with valid images: {len(all_products)}")
    return all_products

def main():
    print("=" * 70)
    print("PLYPICKER LUXURY LIVING - HIGH-ACCURACY VISION SCANNER")
    print("=" * 70)

    products = load_all_products()

    # Step 1: Preload / Cache Thumbnails
    print(f"\n[Step 1/3] Downloading & caching thumbnails for {len(products)} pieces...")
    start_time = time.time()
    
    thumb_map = {}
    with ThreadPoolExecutor(max_workers=24) as executor:
        future_to_prod = {executor.submit(load_or_fetch_thumbnail, p["image"]): p for p in products}
        completed = 0
        for future in as_completed(future_to_prod):
            p = future_to_prod[future]
            try:
                path = future.result()
                if path:
                    thumb_map[p["id"]] = path
            except Exception:
                pass
            completed += 1
            if completed % 250 == 0 or completed == len(products):
                print(f"  Processed {completed}/{len(products)} images...")

    elapsed_dl = round(time.time() - start_time, 1)
    print(f"[OK] Caching complete: {len(thumb_map)} valid thumbnails in {elapsed_dl}s.")

    # Step 2: Compute Fingerprints
    print(f"\n[Step 2/3] Extracting multi-hash & color fingerprints...")
    t0 = time.time()
    fingerprints = {}
    for p in products:
        p_id = p["id"]
        if p_id in thumb_map:
            fp = extract_visual_fingerprint(thumb_map[p_id])
            if fp:
                fingerprints[p_id] = fp

    print(f"[OK] Fingerprinted {len(fingerprints)} items in {round(time.time() - t0, 1)}s.")

    # Step 3: Pairwise Deduplication Scan
    print(f"\n[Step 3/3] Scanning for duplicate furniture designs...")
    t1 = time.time()

    # Partition by Category
    by_category = {}
    for p in products:
        if p["id"] not in fingerprints:
            continue
        c = p["category"]
        if c not in by_category:
            by_category[c] = []
        by_category[c].append(p)

    matches = []
    SIMILARITY_THRESHOLD = 80.0  # 80%+ similarity flag

    for cat_name, cat_prods in by_category.items():
        n = len(cat_prods)
        print(f"  Checking category '{cat_name}' ({n} items)...")
        for i in range(n):
            p1 = cat_prods[i]
            fp1 = fingerprints[p1["id"]]
            for j in range(i + 1, n):
                p2 = cat_prods[j]
                fp2 = fingerprints[p2["id"]]

                score, p_dist, d_dist, color_sim = compute_similarity(fp1, fp2)

                if score >= SIMILARITY_THRESHOLD:
                    # Determine match category
                    if score >= 97.0 or (p_dist <= 3 and d_dist <= 3):
                        match_type = "Exact Duplicate"
                    elif score >= 90.0:
                        match_type = "Near-Identical Design"
                    else:
                        match_type = "Visual Lookalike"

                    is_same_brand = (p1["brand"].lower() == p2["brand"].lower())

                    matches.append({
                        "id": f"dup_{len(matches) + 1}",
                        "similarity": score,
                        "matchType": match_type,
                        "pDist": int(p_dist),
                        "dDist": int(d_dist),
                        "colorSim": color_sim,
                        "isSameBrand": is_same_brand,
                        "category": cat_name,
                        "productA": p1,
                        "productB": p2
                    })

    # Sort matches by highest similarity first
    matches.sort(key=lambda m: m["similarity"], reverse=True)

    print(f"[OK] Pairwise scan complete in {round(time.time() - t1, 1)}s.")
    print("=" * 70)
    print(f"TOTAL DUPLICATE PAIRS FOUND: {len(matches)}")
    print(f"  - Exact Photo Duplicates (>=97%):     {len([m for m in matches if m['similarity'] >= 97])}")
    print(f"  - Near-Identical Designs (90%-96%): {len([m for m in matches if 90 <= m['similarity'] < 97])}")
    print(f"  - Visual Lookalikes (80%-89%):       {len([m for m in matches if 80 <= m['similarity'] < 90])}")
    print("=" * 70)

    report = {
        "generatedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
        "totalProductsScanned": len(products),
        "totalDuplicatesFound": len(matches),
        "breakdown": {
            "exactDuplicates": len([m for m in matches if m['similarity'] >= 97]),
            "nearIdentical": len([m for m in matches if 90 <= m['similarity'] < 97]),
            "visualLookalikes": len([m for m in matches if 80 <= m['similarity'] < 90])
        },
        "matches": matches
    }

    report_path = ROOT_DIR / "duplicates-report.json"
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"[✓] Written report to: {report_path.name}")

if __name__ == "__main__":
    main()
