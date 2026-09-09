<?php

namespace Database\Seeders;

use Gz168\ApiDoc\Database\Seeders\ApiDocPermissionSeeder;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(ApiDocPermissionSeeder::class);
    }
}
