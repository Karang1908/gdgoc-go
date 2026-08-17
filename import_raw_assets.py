#!/usr/bin/env python3
"""
One-shot asset import: unzip everything in RawAssets/ into the right folders
under unity-project/Assets/, keeping only files Unity actually imports.

Drop list (we IGNORE these inside the zips):
    .blend .blend1 .obj .mtl .dae .c4d .usdc .usda .ma .max .lxo .zbp .ztl
    Preview*.jpg/Preview*.png *preview*.png/.jpg  Kenney.url  Patreon.url
    License.txt      (kept actually — small, helps IP audit)

Keep (.fbx .png .jpg .ttf .ogg .font .mat .json .txt)

Run:
    python3 import_raw_assets.py
Idempotent: running twice will overwrite, no duplicates because filenames are unique.
"""
from __future__ import annotations
import os
import re
import shutil
import sys
import zipfile
from pathlib import Path

RAW = Path("/Users/karangarg/Desktop/gdg-go/RawAssets")
ASSETS = Path("/Users/karangarg/Desktop/gdg-go/unity-project/Assets")

DROP_SUFFIXES = {
    ".blend", ".blend1", ".obj", ".mtl", ".dae", ".c4d", ".usdc", ".usda",
    ".ma", ".max", ".lxo", ".zbp", ".ztl", ".url",
}
DROP_NAME_PARTS = {"preview", "kenney.url", "patreon.url"}

# (zip_name, dest_folder_relative_to_Assets, filter_fn(member) -> bool)
# filter_fn returns True for files we want to extract; False to skip.
def keep_fbx_png(member: str) -> bool:
    name = os.path.basename(member).lower()
    if not name: return False
    if any(part in name for part in DROP_NAME_PARTS): return False
    suffix = os.path.splitext(name)[1].lower()
    return suffix in {".fbx", ".png", ".jpg", ".ttf", ".ogg"}

def quaternius_fbx_only(member: str) -> bool:
    """Quaternius pack layout: <year>/FBX/*.fbx — keep only FBX/ children."""
    if not keep_fbx_png(member): return False
    parts = [p for p in member.split("/") if p]
    return any(p.lower() == "fbx" for p in parts)

def quaternius_unity_subfolder(member: str) -> bool:
    """Downtown City MegaKit has an '(Unity)' subfolder with FBX prefabs (correct
    axial rotation for Unity). Keep only that subfolder."""
    if not keep_fbx_png(member): return False
    return "(Unity)/" in member or "/(Unity)/" in member or member.startswith("(Unity)/")

def kenney_models_fbx_format(member: str) -> bool:
    """Kenney city kits put FBX under 'Models/FBX format/'."""
    if not keep_fbx_png(member): return False
    return "FBX format" in member

def kenney_audio(member: str) -> bool:
    if not keep_fbx_png(member): return False
    parts = [p for p in member.split("/") if p]
    return "Audio" in parts and member.lower().endswith(".ogg")

def kenney_skyboxes(member: str) -> bool:
    return member.startswith("Skyboxes/") and member.lower().endswith(".png")

def kenney_ui_pack(member: str) -> bool:
    """Kenney UI Pack Space Expansion: PNG/ + Font/ + .ttf at root."""
    if not keep_fbx_png(member): return False
    parts = [p for p in member.split("/") if p]
    if not parts: return False
    if parts[0] == "Font" and member.lower().endswith(".ttf"): return True
    if parts[0] == "PNG": return True
    # Skip top-level png previews
    return False

def kenney_input_prompts(member: str) -> bool:
    """Keep only Keyboard+Mouse/Default/ subfolder — Switch/Xbox/PlayStation gamepad
    prompts are not relevant to a desktop-and-mobile WebGL game."""
    if not member.lower().endswith(".png"): return False
    parts = [p for p in member.split("/") if p]
    if len(parts) < 2: return False
    return "Keyboard" in parts[0] or "Mouse" in parts[0]

def kenney_mobile_controls(member: str) -> bool:
    return member.lower().endswith(".png") and "preview" not in member.lower()

def rpg_keep_coin_only(member: str) -> bool:
    """From RPG pack, extract only the coin mesh + coin icon."""
    name = os.path.basename(member).lower()
    if "preview" in name: return False
    # Coin.fbx (mesh), Coin.png (icon), Coin_Star.fbx (alternate)
    if member.endswith("/FBX/Coin.fbx") or member.endswith("/FBX/Coin_Star.fbx"): return True
    if member.endswith("/Icons/Coin.png") or member.endswith("/Icons/Coin_Star.png"): return True
    return False

_PLANS = [
    # Quaternius packs: zip_name → (dest_folder_under Assets, filter_fn)
    ("Realistic Car Pack - Nov 2018-20260815T204210Z-1-001.zip",
        ASSETS / "Models/Quaternius/Cars", quaternius_fbx_only),
    ("Street Pack by @Quaternius-20260815T204350Z-1-001.zip",
        ASSETS / "Models/Quaternius/ModularStreets", quaternius_fbx_only),
    ("Public Transport Pack - Feb 2017-20260815T204231Z-1-001.zip",
        ASSETS / "Models/Quaternius/PublicTransport", quaternius_fbx_only),
    ("Animated Men Characters - Feb 2019-20260815T204413Z-1-001.zip",
        ASSETS / "Models/Quaternius/AnimatedMen", quaternius_fbx_only),
    ("Animated Women Characters - Feb 2019-20260815T204432Z-1-001.zip",
        ASSETS / "Models/Quaternius/AnimatedWomen", quaternius_fbx_only),
    ("Downtown City MegaKit[Standard].zip",
        ASSETS / "Models/Quaternius/DowntownCity", quaternius_unity_subfolder),
    ("Simple Nature Pack - Dec 2016-20260815T204532Z-1-001.zip",
        ASSETS / "Models/Quaternius/SimpleNature", quaternius_fbx_only),
    ("Ultimate RPG Items Pack - Aug 2019-20260815T204504Z-1-001.zip",
        ASSETS / "Models/Quaternius/RPG", rpg_keep_coin_only),

    # Kenney packs
    ("kenney_car-kit.zip",
        ASSETS / "Models/Kenney/CarKit", keep_fbx_png),
    ("kenney_city-kit-commercial_2.1.zip",
        ASSETS / "Models/Kenney/CityKitCommercial", kenney_models_fbx_format),
    ("kenney_city-kit-industrial_1.0.zip",
        ASSETS / "Models/Kenney/CityKitIndustrial", kenney_models_fbx_format),
    ("kenney_skyboxes.zip",
        ASSETS / "Textures/Sky", kenney_skyboxes),
    ("kenney_ui-audio.zip",
        ASSETS / "Audio/UI", kenney_audio),
    ("kenney_impact-sounds.zip",
        ASSETS / "Audio/Impacts", kenney_audio),
    ("kenney_music-jingles.zip",
        ASSETS / "Audio/Jingles", kenney_audio),
    ("kenney_ui-pack-space-expansion.zip",
        ASSETS / "UI/KenneyUI", kenney_ui_pack),
    ("kenney_input-prompts_1.5.zip",
        ASSETS / "UI/InputPrompts", kenney_input_prompts),
    ("mobile-controls-1.zip",
        ASSETS / "UI/MobileControls", kenney_mobile_controls),
]

# Mixamo bare FBXs
_MIXAMO_PLANS = [
    ("character.fbx", ASSETS / "Models/Mixamo/Character"),
    ("Walking.fbx", ASSETS / "Animations/Mixamo"),
    ("Idle.fbx", ASSETS / "Animations/Mixamo"),
    ("Running.fbx", ASSETS / "Animations/Mixamo"),
    ("Falling Back Death.fbx", ASSETS / "Animations/Mixamo"),
]


def extract_zip(zip_path: Path, dest: Path, filter_fn) -> tuple[int, int]:
    """Extract filtered members of a zip to dest (flattening subfolders).
    Returns (kept_count, dropped_count)."""
    if not zip_path.exists():
        print(f"  !! MISSING: {zip_path.name}")
        return (0, 0)
    dest.mkdir(parents=True, exist_ok=True)
    kept = dropped = 0
    with zipfile.ZipFile(zip_path) as zf:
        for member in zf.namelist():
            if member.endswith("/"):  # directories
                continue
            if not filter_fn(member):
                dropped += 1
                continue
            # Flatten: write to dest/basename
            target = dest / os.path.basename(member)
            # Skip if target exists and is identical (idempotent)
            with zf.open(member) as src:
                data = src.read()
            if target.exists() and target.stat().st_size == len(data):
                kept += 1
                continue
            target.write_bytes(data)
            kept += 1
    return (kept, dropped)


def copy_file(src: Path, dest: Path) -> int:
    if not src.exists():
        print(f"  !! MISSING: {src.name}")
        return 0
    dest.mkdir(parents=True, exist_ok=True)
    target = dest / src.name
    shutil.copy2(src, target)
    return 1


def main():
    print("=== Importing RawAssets → unity-project/Assets/ ===\n")
    total_kept = total_dropped = 0
    for zip_name, dest_folder, filter_fn in _PLANS:
        zip_path = RAW / zip_name
        print(f"  {zip_name}")
        print(f"    → {dest_folder.relative_to(ASSETS)}")
        kept, dropped = extract_zip(zip_path, dest_folder, filter_fn)
        print(f"    kept {kept} files, dropped {dropped}")
        total_kept += kept
        total_dropped += dropped

    print("\n=== Mixamo clips (bare FBX, copy only) ===\n")
    for src_name, dest_folder in _MIXAMO_PLANS:
        src = RAW / src_name
        n = copy_file(src, dest_folder)
        print(f"  {src_name}  →  {dest_folder.relative_to(ASSETS)}  ({n} copied)")

    print(f"\n=== DONE ===  total kept: {total_kept}  dropped: {total_dropped}")


if __name__ == "__main__":
    main()
