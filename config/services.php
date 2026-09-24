<?php

return [

    /*
    |--------------------------------------------------------------------
    | Internal Service-to-Service API Key
    |--------------------------------------------------------------------
    |
    | Shared secret used to authenticate internal API calls between our
    | domain "services" (e.g. Payroll calling the Employee internal
    | endpoint). See App\Http\Middleware\VerifyInternalApiKey.
    |
    */
    'internal_api_key' => env('INTERNAL_API_KEY'),

];