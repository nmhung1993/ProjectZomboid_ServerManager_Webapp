<?php

namespace App\Services;

class ItemIconResolver
{
    private string $iconsDir;

    private string $iconsUrlPrefix;

    public function __construct(?string $iconsDir = null, string $iconsUrlPrefix = '/images/items')
    {
        $this->iconsDir = $iconsDir ?? public_path('images/items');
        $this->iconsUrlPrefix = $iconsUrlPrefix;
    }

    /**
     * Resolve an item's full type to its icon URL path.
     *
     * Maps "Base.Axe" -> "/images/items/Item_Axe.png"
     * Falls back to placeholder SVG if the icon file doesn't exist.
     */
    public function resolve(string $fullType): string
    {
        $iconFilename = $this->toIconFilename($fullType);
        $iconPath = $this->iconsDir.'/'.$iconFilename;

        if (file_exists($iconPath)) {
            return $this->iconsUrlPrefix.'/'.$iconFilename;
        }

        return $this->iconsUrlPrefix.'/placeholder.svg';
    }

    /**
     * Resolve many item types with a single directory read.
     *
     * @param  array<int, string>  $fullTypes
     * @return array<string, string>
     */
    public function resolveMany(array $fullTypes): array
    {
        $files = is_dir($this->iconsDir) ? scandir($this->iconsDir) : false;
        $availableIcons = $files === false ? [] : array_fill_keys($files, true);
        $resolved = [];

        foreach ($fullTypes as $fullType) {
            if (isset($resolved[$fullType])) {
                continue;
            }

            $iconFilename = $this->toIconFilename($fullType);
            $resolved[$fullType] = isset($availableIcons[$iconFilename])
                ? $this->iconsUrlPrefix.'/'.$iconFilename
                : $this->iconsUrlPrefix.'/placeholder.svg';
        }

        return $resolved;
    }

    /**
     * Convert a full item type to the PZwiki icon filename.
     *
     * "Base.Axe" -> "Item_Axe.png"
     * "Farming.HandShovel" -> "Item_HandShovel.png"
     */
    public function toIconFilename(string $fullType): string
    {
        // Strip the module prefix (everything before and including the dot)
        $parts = explode('.', $fullType, 2);
        $itemName = $parts[1] ?? $parts[0];

        return 'Item_'.$itemName.'.png';
    }

    /**
     * Check whether an icon file exists for the given item type.
     */
    public function hasIcon(string $fullType): bool
    {
        $iconFilename = $this->toIconFilename($fullType);

        return file_exists($this->iconsDir.'/'.$iconFilename);
    }
}
