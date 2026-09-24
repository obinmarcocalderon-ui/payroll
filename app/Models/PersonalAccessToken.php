<?php

namespace App\Models;

use Laravel\Sanctum\PersonalAccessToken as SanctumPersonalAccessToken;

/**
 * Extends Sanctum's token model to add ess_verified_at — see the
 * add_ess_verified_at_to_personal_access_tokens_table migration.
 * Registered via Sanctum::usePersonalAccessTokenModel() in AppServiceProvider.
 */
class PersonalAccessToken extends SanctumPersonalAccessToken
{
    protected $connection = 'auth';
    protected $casts = [
        'abilities' => 'json',
        'last_used_at' => 'datetime',
        'expires_at' => 'datetime',
        'ess_verified_at' => 'datetime',
    ];
}
