<?php

namespace App\Rules;

use App\Services\RconSanitizer;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Validates that a string matches a safe RCON identifier format.
 * Supports three modes: 'player' (alphanumeric + underscore), 'item' (+ dots),
 * and 'skill' (alphanumeric only).
 */
class RconSafeIdentifier implements ValidationRule
{
    private const PATTERNS = [
        'player' => RconSanitizer::PLAYER_NAME_PATTERN,
        'item' => RconSanitizer::ITEM_ID_PATTERN,
        'skill' => RconSanitizer::SKILL_PATTERN,
    ];

    public function __construct(
        private readonly string $type = 'player',
    ) {}

    /**
     * @param  \Closure(string, ?string=): \Illuminate\Translation\PotentiallyTranslatedString  $fail
     */
    public function validate(string $attribute, mixed $value, Closure $fail): void
    {
        $pattern = self::PATTERNS[$this->type] ?? self::PATTERNS['player'];

        if (! preg_match($pattern, (string) $value)) {
            $fail($this->message());
        }
    }

    private function message(): string
    {
        return match ($this->type) {
            'item' => 'The :attribute must contain only letters, numbers, dots, and underscores.',
            'skill' => 'The :attribute must contain only letters and numbers.',
            default => 'The :attribute must contain only letters, numbers, and underscores.',
        };
    }
}
