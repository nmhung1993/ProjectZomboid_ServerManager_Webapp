<?php

namespace App\Enums;

enum UserRole: string
{
    case SuperAdmin = 'super_admin';
    case Admin = 'admin';
    case Moderator = 'moderator';
    case Player = 'player';

    /**
     * Map a Project Zomboid in-game access level to the equivalent web role.
     *
     * PZ exposes six access levels (admin, moderator, overseer, gm, observer,
     * none). The web dashboard only distinguishes admin, moderator, and player,
     * so the elevated staff levels collapse onto Moderator and 'none' maps to
     * the regular Player role.
     */
    public static function fromPzAccessLevel(string $level): self
    {
        return match (strtolower(trim($level))) {
            'admin' => self::Admin,
            'moderator', 'overseer', 'gm', 'observer' => self::Moderator,
            default => self::Player,
        };
    }

    /**
     * Convert PZ access level name to SQLite role integer.
     * PZ role table IDs: 1=banned, 2=user, 3=priority, 4=observer, 5=gm, 6=moderator, 7=admin.
     */
    public static function pzAccessLevelToSqliteRole(string $level): int
    {
        return match (strtolower(trim($level))) {
            'admin' => 7,
            'moderator', 'overseer' => 6,
            'gm' => 5,
            'observer' => 4,
            'priority' => 3,
            'banned' => 1,
            default => 2, // 'none', 'user', 'player'
        };
    }

    /**
     * Convert UserRole enum to SQLite role integer.
     */
    public static function roleToSqliteRole(self $role): int
    {
        return match ($role) {
            self::SuperAdmin, self::Admin => 7,
            self::Moderator => 6,
            self::Player => 2,
        };
    }

    /**
     * Convert UserRole enum to PZ access level name.
     */
    public static function roleToPzAccessLevel(self $role): string
    {
        return match ($role) {
            self::SuperAdmin, self::Admin => 'admin',
            self::Moderator => 'moderator',
            self::Player => 'none',
        };
    }
}
