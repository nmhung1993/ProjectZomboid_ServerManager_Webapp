#!/usr/bin/env python3
"""Build one local vanilla-plus-mod DZI pyramid from downloaded B42 tiles."""

import argparse
import json
import math
import os
import re
import shutil
import sys
from pathlib import Path

from PIL import Image


IMAGE_EXTENSIONS = ("jpg", "webp", "png")


def read_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def read_dzi(path: Path) -> tuple[int, str]:
    content = path.read_text(encoding="utf-8")
    size = re.search(r'TileSize="(\d+)"', content)
    image_format = re.search(r'Format="([^\"]+)"', content)
    if size is None or image_format is None:
        raise ValueError(f"Invalid DZI metadata: {path}")
    return int(size.group(1)), image_format.group(1)


def maximum_level(info: dict) -> int:
    return math.ceil(math.log2(max(int(info["w"]), int(info["h"]))))


def tile_file(root: Path, level: int, x: int, y: int) -> Path | None:
    stem = root / "layer0_files" / str(level) / f"{x}_{y}"
    for extension in IMAGE_EXTENSIONS:
        candidate = stem.with_suffix(f".{extension}")
        if candidate.is_file():
            return candidate
    return None


def output_tile(root: Path, level: int, x: int, y: int, extension: str) -> Path:
    return root / "layer0_files" / str(level) / f"{x}_{y}.{extension}"


def tile_dimensions(info: dict, level: int, x: int, y: int, tile_size: int) -> tuple[int, int]:
    scale = 2 ** (maximum_level(info) - level)
    width = math.ceil(int(info["w"]) / scale)
    height = math.ceil(int(info["h"]) / scale)
    return min(tile_size, width - x * tile_size), min(tile_size, height - y * tile_size)


def is_map_pixel(image: Image.Image) -> Image.Image:
    # The CDN top-view renderer uses black for cells without map content.
    # Retaining the base underneath those pixels avoids black rectangles.
    grayscale = image.convert("L")
    return grayscale.point(lambda value: 255 if value > 30 else 0)


def composite_mod(base: Path, mod: Path) -> int:
    base_info = read_json(base / "map_info.json")
    mod_info = read_json(mod / "map_info.json")
    base_tile_size, base_extension = read_dzi(base / "layer0.dzi")
    mod_tile_size, _ = read_dzi(mod / "layer0.dzi")
    base_level = maximum_level(base_info)
    mod_level = maximum_level(mod_info)

    # Native pixel coordinates are related to PZ world squares by:
    #     pixel = world * sqr + x0   =>   world = (pixel - x0) / sqr
    # Convert mod pixels → PZ squares → vanilla pixels so 256px/webp mod tiles
    # merge correctly into the 1024px/jpg vanilla pyramid.
    base_pixels_per_square = float(base_info["sqr"])
    mod_pixels_per_square = float(mod_info["sqr"])
    if base_pixels_per_square <= 0 or mod_pixels_per_square <= 0:
        raise ValueError(f"Invalid square scale for {mod}")

    base_x0 = float(base_info.get("x0", 0))
    base_y0 = float(base_info.get("y0", 0))
    mod_x0 = float(mod_info.get("x0", 0))
    mod_y0 = float(mod_info.get("y0", 0))

    modified: set[tuple[int, int]] = set()
    source_dir = mod / "layer0_files" / str(mod_level)
    for source in source_dir.glob("*_*"):
        match = re.fullmatch(r"(\d+)_(\d+)\.(?:jpg|webp|png)", source.name)
        if match is None:
            continue

        source_x, source_y = int(match.group(1)), int(match.group(2))
        world_x = (source_x * mod_tile_size - mod_x0) / mod_pixels_per_square
        world_y = (source_y * mod_tile_size - mod_y0) / mod_pixels_per_square
        target_x = round(world_x * base_pixels_per_square + base_x0)
        target_y = round(world_y * base_pixels_per_square + base_y0)
        scale = base_pixels_per_square / mod_pixels_per_square
        target_size = round(mod_tile_size * scale)
        if target_size <= 0:
            continue

        # Mods outside the vanilla canvas cannot be represented without
        # changing the authoritative vanilla map geometry.
        if target_x >= int(base_info["w"]) or target_y >= int(base_info["h"]) or target_x + target_size <= 0 or target_y + target_size <= 0:
            continue

        with Image.open(source) as image:
            overlay = image.convert("RGB").resize((target_size, target_size), Image.Resampling.LANCZOS)
        mask = is_map_pixel(overlay)

        first_x = max(0, target_x // base_tile_size)
        first_y = max(0, target_y // base_tile_size)
        last_x = min((int(base_info["w"]) - 1) // base_tile_size, (target_x + target_size - 1) // base_tile_size)
        last_y = min((int(base_info["h"]) - 1) // base_tile_size, (target_y + target_size - 1) // base_tile_size)
        for tile_y in range(first_y, last_y + 1):
            for tile_x in range(first_x, last_x + 1):
                destination = output_tile(base, base_level, tile_x, tile_y, base_extension)
                width, height = tile_dimensions(base_info, base_level, tile_x, tile_y, base_tile_size)
                if width <= 0 or height <= 0:
                    continue
                if destination.is_file():
                    with Image.open(destination) as existing:
                        canvas = existing.convert("RGB")
                else:
                    canvas = Image.new("RGB", (width, height))

                left = max(target_x, tile_x * base_tile_size)
                top = max(target_y, tile_y * base_tile_size)
                right = min(target_x + target_size, tile_x * base_tile_size + width)
                bottom = min(target_y + target_size, tile_y * base_tile_size + height)
                source_box = (left - target_x, top - target_y, right - target_x, bottom - target_y)
                canvas.paste(overlay.crop(source_box), (left - tile_x * base_tile_size, top - tile_y * base_tile_size), mask.crop(source_box))
                destination.parent.mkdir(parents=True, exist_ok=True)
                canvas.save(destination)
                modified.add((tile_x, tile_y))

    rebuild_parents(base, base_info, modified, base_level, base_tile_size, base_extension)
    return len(modified)


def rebuild_parents(base: Path, info: dict, affected: set[tuple[int, int]], start_level: int, tile_size: int, extension: str) -> None:
    for level in range(start_level - 1, -1, -1):
        affected = {(x // 2, y // 2) for x, y in affected}
        for x, y in affected:
            width, height = tile_dimensions(info, level, x, y, tile_size)
            if width <= 0 or height <= 0:
                continue
            canvas = Image.new("RGB", (tile_size, tile_size))
            for child_y in range(2):
                for child_x in range(2):
                    child = tile_file(base, level + 1, x * 2 + child_x, y * 2 + child_y)
                    if child is None:
                        continue
                    with Image.open(child) as image:
                        canvas.paste(image.convert("RGB").resize((tile_size // 2, tile_size // 2), Image.Resampling.LANCZOS), (child_x * tile_size // 2, child_y * tile_size // 2))
            destination = output_tile(base, level, x, y, extension)
            destination.parent.mkdir(parents=True, exist_ok=True)
            canvas.crop((0, 0, width, height)).save(destination)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--vanilla", type=Path, required=True)
    parser.add_argument("--mods", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--mod", action="append", default=[], dest="mod_keys")
    parser.add_argument("--skip-base", action="store_true", help="Reuse the existing output map_data as the base instead of copying vanilla")
    args = parser.parse_args()

    vanilla_base = args.vanilla / "html" / "map_data" / "base_top"
    output_map_data = args.output / "html" / "map_data"
    base = output_map_data / "base_top"

    if args.skip_base:
        if not (base / "map_info.json").is_file():
            raise FileNotFoundError(f"Skipped base not found: {base}. Run once without --skip-base first.")
        print("Skipping base copy; reusing existing merged output", file=sys.stderr)
    else:
        if not (vanilla_base / "map_info.json").is_file():
            raise FileNotFoundError(f"Vanilla map metadata not found: {vanilla_base}")
        # Start from a clean vanilla pyramid, then composite mods directly.
        # We avoid directory rename/swap because Docker Desktop's Windows bind
        # mount does not reliably rename directories that another container
        # (the running app) is reading.
        shutil.rmtree(output_map_data, ignore_errors=True)
        shutil.copytree(args.vanilla / "html" / "map_data", output_map_data)
        base = output_map_data / "base_top"

    for key in args.mod_keys:
        mod = args.mods / "html" / "map_data" / "mod_maps" / key / "base_top"
        if not (mod / "map_info.json").is_file():
            print(f"WARNING: {key}: tiles not found; skipped", file=sys.stderr)
            continue
        merged = composite_mod(base, mod)
        print(f"{key}: updated {merged} vanilla native tiles")

    os.utime(base / "map_info.json", None)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())