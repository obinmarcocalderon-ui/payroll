<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Laravel\Sanctum\PersonalAccessToken;

class PruneIdleTokens extends Command
{
    protected $signature = 'sanctum:prune-idle';
    protected $description = 'Delete tokens that have been idle for more than 5 minutes.';

    public function handle(): void
    {
        $deleted = PersonalAccessToken::where('last_used_at', '<', now()->subMinutes(5))
            ->orWhere(function ($query) {
                $query->whereNull('last_used_at')
                    ->where('created_at', '<', now()->subMinutes(5));
            })
            ->delete();

        if ($deleted > 0) {
            $this->info("Pruned {$deleted} idle token(s).");
        }
    }
}