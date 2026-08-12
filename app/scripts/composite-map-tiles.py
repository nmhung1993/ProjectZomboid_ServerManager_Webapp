#!/usr/bin/env python3
"""Merge pzmap2dzi top-level mod pyramids into a base map pyramid."""

import argparse
import json
import math
import re
import shutil
from pathlib import Path

from PIL import Image


def read_info(map_path: Path) -> dict:
    with (map_path / "map_info.json").open(encoding="utf-8") as info_file:
        return json.load(info_file)


def read_tile_settings(map_path: Path) -> tuple[int, str]:
    dzi = (map_path / "layer0.dzi").read_text(encoding="utf-8")
    tile_size = int(re.search(r'TileSize="(\d+)"', dzi).group(1))
    image_format = re.search(r'Format="([^"]+)"', dzi).group(1)

    return tile_size, image_format


def max_level(info: dict) -> int:
    return math.ceil(math.log2(max(int(info["w"]), int(info["h"]))))


def tile_path(map_path: Path, level: int, x: int, y: int, extension: str) -> Path:
    return map_path / "layer0_files" / str(level) / f"{x}_{y}.{extension}"


def existing_tile(map_path: Path, level: int, x: int, y: int, extension: str) -> Path | None:
    preferred = tile_path(map_path, level, x, y, extension)
    if preferred.is_file():
        return preferred

    for fallback_extension in ("jpg", "webp", "png"):
        candidate = tile_path(map_path, level, x, y, fallback_extension)
        if candidate.is_file():
            return candidate

    return None


def effective_tile_size(info: dict, level: int, maximum_level: int, x: int, y: int, tile_size: int) -> tuple[int, int]:
    scale = 2 ** (maximum_level - level)
    width = math.ceil(int(info["w"]) / scale)
    height = math.ceil(int(info["h"]) / scale)

    return min(tile_size, width - x * tile_size), min(tile_size, height - y * tile_size)


def rebuild_parents(base_path: Path, base_info: dict, modified_tiles: set[tuple[int, int]], start_level: int, tile_size: int, extension: str) -> None:
    maximum_level = max_level(base_info)
    affected = modified_tiles

    for level in range(start_level - 1, -1, -1):
        affected = {(x // 2, y // 2) for x, y in affected}
        for x, y in affected:
            width, height = effective_tile_size(base_info, level, maximum_level, x, y, tile_size)
            if width <= 0 or height <= 0:
                continue

            image = Image.new("RGB", (tile_size, tile_size))
            for child_y in range(2):
                for child_x in range(2):
                    source = existing_tile(base_path, level + 1, x * 2 + child_x, y * 2 + child_y, extension)
                    if source is None:
                        continue
                    with Image.open(source) as child:
                        image.paste(child.convert("RGB").resize((tile_size // 2, tile_size // 2)), (child_x * tile_size // 2, child_y * tile_size // 2))

            destination = tile_path(base_path, level, x, y, extension)
            destination.parent.mkdir(parents=True, exist_ok=True)
            image.crop((0, 0, width, height)).save(destination)


def merge_mod(base_path: Path, mod_path: Path, base_info: dict, tile_size: int, extension: str) -> int:
    mod_info = read_info(mod_path)
    mod_tile_size, _ = read_tile_settings(mod_path)
    if mod_tile_size != tile_size or mod_info.get("sqr") != base_info.get("sqr"):
        raise ValueError(f"{mod_path} does not use the same tile scale as {base_path}")

    x_shift_pixels = int(base_info.get("x0", 0)) - int(mod_info.get("x0", 0))
    y_shift_pixels = int(base_info.get("y0", 0)) - int(mod_info.get("y0", 0))
    if x_shift_pixels % tile_size or y_shift_pixels % tile_size:
        raise ValueError(f"{mod_path} is not aligned to the base tile grid")

    x_shift = x_shift_pixels // tile_size
    y_shift = y_shift_pixels // tile_size
    source_level = max_level(mod_info)
    # Both native levels use the same world-pixel scale even though the base
    # world has more DZI levels because it covers a larger area.
    destination_level = max_level(base_info)
    modified: set[tuple[int, int]] = set()

    for source in (mod_path / "layer0_files" / str(source_level)).glob("*_*.*"):
        match = re.fullmatch(r"(\d+)_(\d+)\.[^.]+", source.name)
        if match is None:
            continue
        x = int(match.group(1)) + x_shift
        y = int(match.group(2)) + y_shift
        destination = tile_path(base_path, destination_level, x, y, extension)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, destination)
        modified.add((x, y))

    rebuild_parents(base_path, base_info, modified, destination_level, tile_size, extension)
    return len(modified)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", required=True, type=Path)
    parser.add_argument("--mod", action="append", default=[], dest="mods", type=Path)
    args = parser.parse_args()

    base_info = read_info(args.base)
    tile_size, extension = read_tile_settings(args.base)
    for mod_path in args.mods:
        merged = merge_mod(args.base, mod_path, base_info, tile_size, extension)
        print(f"Merged {merged} native tiles from {mod_path.name}")


if __name__ == "__main__":
    main()
