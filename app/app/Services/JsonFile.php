<?php

namespace App\Services;

class JsonFile
{
    /**
     * Read and decode a JSON file, returning default on failure.
     */
    public static function read(string $path, array $default): array
    {
        if (! file_exists($path)) {
            return $default;
        }

        $content = file_get_contents($path);
        if ($content === false) {
            return $default;
        }

        $data = json_decode($content, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return $default;
        }

        return $data;
    }

    /**
     * Write JSON data atomically using temp file + rename.
     */
    public static function writeAtomic(string $path, array $data): bool
    {
        $dir = dirname($path);
        if ($dir === '' || $dir === '.' || is_file($dir)) {
            return false;
        }

        if (! is_dir($dir) && ! @mkdir($dir, 0755, true) && ! is_dir($dir)) {
            return false;
        }

        $tmpPath = $path.'.tmp.'.getmypid().'.'.bin2hex(random_bytes(4));
        $json = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);

        if (file_put_contents($tmpPath, $json) === false) {
            return false;
        }

        if (! @rename($tmpPath, $path)) {
            @unlink($tmpPath);

            return false;
        }

        return true;
    }
}