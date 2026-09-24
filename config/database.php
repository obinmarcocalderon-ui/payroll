<?php

use Illuminate\Support\Str;

return [
    'default' => env('DB_CONNECTION', 'pgsql'),

    'connections' => [
        'mysql' => [
            'driver' => 'mysql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', '127.0.0.1'),
            'port' => env('DB_PORT', '3306'),
            'database' => env('DB_DATABASE', 'payroll_benefits'),
            'username' => env('DB_USERNAME', 'root'),
            'password' => env('DB_PASSWORD', ''),
            'unix_socket' => env('DB_SOCKET', ''),
            'charset' => env('DB_CHARSET', 'utf8mb4'),
            'collation' => env('DB_COLLATION', 'utf8mb4_unicode_ci'),
            'prefix' => '',
            'prefix_indexes' => true,
            'strict' => true,
            'engine' => null,
        ],

        // Kept in case you switch to Postgres/Docker later — unused
        // unless DB_CONNECTION=pgsql in your .env.
        'pgsql' => [
            'driver' => 'pgsql',
            'url' => env('DB_URL'),
            'host' => env('DB_HOST', 'postgres'),
            'port' => env('DB_PORT', '5432'),
            'database' => env('DB_DATABASE', 'payroll_benefits'),
            'username' => env('DB_USERNAME', 'payroll_user'),
            'password' => env('DB_PASSWORD', ''),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

        'employee' => [
    'driver' => 'pgsql',
    'host' => env('EMPLOYEE_DB_HOST', '127.0.0.1'),
    'port' => env('EMPLOYEE_DB_PORT', '5432'),
    'database' => env('EMPLOYEE_DB_DATABASE', 'employee_db'),
    'username' => env('EMPLOYEE_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
    'password' => env('EMPLOYEE_DB_PASSWORD', env('DB_PASSWORD', '')),
    'charset' => 'utf8',
    'prefix' => '',
    'prefix_indexes' => true,
    'search_path' => 'public',
    'sslmode' => 'prefer',
],

        'auth' => [
            'driver' => 'pgsql',
            'host' => env('AUTH_DB_HOST', 'postgres'),
            'port' => env('AUTH_DB_PORT', '5432'),
            'database' => env('AUTH_DB_DATABASE', 'auth_db'),
            'username' => env('AUTH_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('AUTH_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

                'payroll' => [
            'driver' => 'pgsql',
            'host' => env('PAYROLL_DB_HOST', 'postgres'),
            'port' => env('PAYROLL_DB_PORT', '5432'),
            'database' => env('PAYROLL_DB_DATABASE', 'payroll_db'),
            'username' => env('PAYROLL_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('PAYROLL_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

                'attendance' => [
            'driver' => 'pgsql',
            'host' => env('ATTENDANCE_DB_HOST', 'postgres'),
            'port' => env('ATTENDANCE_DB_PORT', '5432'),
            'database' => env('ATTENDANCE_DB_DATABASE', 'attendance_db'),
            'username' => env('ATTENDANCE_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('ATTENDANCE_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

                'compensation' => [
            'driver' => 'pgsql',
            'host' => env('COMPENSATION_DB_HOST', 'postgres'),
            'port' => env('COMPENSATION_DB_PORT', '5432'),
            'database' => env('COMPENSATION_DB_DATABASE', 'compensation_db'),
            'username' => env('COMPENSATION_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('COMPENSATION_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

                'claims' => [
            'driver' => 'pgsql',
            'host' => env('CLAIMS_DB_HOST', 'postgres'),
            'port' => env('CLAIMS_DB_PORT', '5432'),
            'database' => env('CLAIMS_DB_DATABASE', 'claims_db'),
            'username' => env('CLAIMS_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('CLAIMS_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],

                'benefits' => [
            'driver' => 'pgsql',
            'host' => env('BENEFITS_DB_HOST', 'postgres'),
            'port' => env('BENEFITS_DB_PORT', '5432'),
            'database' => env('BENEFITS_DB_DATABASE', 'benefits_db'),
            'username' => env('BENEFITS_DB_USERNAME', env('DB_USERNAME', 'payroll_user')),
            'password' => env('BENEFITS_DB_PASSWORD', env('DB_PASSWORD', '')),
            'charset' => 'utf8',
            'prefix' => '',
            'prefix_indexes' => true,
            'search_path' => 'public',
            'sslmode' => 'prefer',
        ],
    ],

    'migrations' => [
        'table' => 'migrations',
        'update_date_on_publish' => true,
    ],

    'redis' => [
        'client' => env('REDIS_CLIENT', 'phpredis'),

        'options' => [
            'cluster' => env('REDIS_CLUSTER', 'redis'),
            'prefix' => env('REDIS_PREFIX', Str::slug(env('APP_NAME', 'payroll'), '_').'_database_'),
        ],

        'default' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_DB', '0'),
        ],

        'cache' => [
            'url' => env('REDIS_URL'),
            'host' => env('REDIS_HOST', '127.0.0.1'),
            'username' => env('REDIS_USERNAME'),
            'password' => env('REDIS_PASSWORD'),
            'port' => env('REDIS_PORT', '6379'),
            'database' => env('REDIS_CACHE_DB', '1'),
        ],
    ],
];
