<?php

namespace Database\Factories;

use App\Models\ModUpdateSetting;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<ModUpdateSetting> */
class ModUpdateSettingFactory extends Factory
{
    protected $model = ModUpdateSetting::class;

    public function definition(): array
    {
        return [
            'enabled' => true,
            'check_interval_minutes' => 15,
            'notify_discord' => true,
            'auto_restart' => true,
            'restart_delay_minutes' => 5,
            'skip_if_scheduled_within_minutes' => 30,
            'last_checked_at' => null,
            'known_mod_timestamps' => [],
        ];
    }

    public function disabled(): static
    {
        return $this->state(['enabled' => false]);
    }
}
