FROM composer:2 AS vendor
WORKDIR /app
COPY composer.json composer.lock* ./
RUN composer install --no-dev --no-interaction --no-progress --prefer-dist --no-scripts --ignore-platform-req=ext-sockets

FROM php:8.3-cli
WORKDIR /var/www/html

RUN apt-get update && apt-get install -y \
    libpq-dev \
    libzip-dev \
    libonig-dev \
    unzip \
    git \
    && docker-php-ext-install pdo pdo_pgsql pgsql bcmath zip sockets pcntl \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

COPY --from=vendor /app/vendor /var/www/html/vendor
COPY . .

RUN php vendor/bin/rr get-binary --no-interaction && chmod +x rr

EXPOSE 8000
CMD ["sh", "-c", "php artisan migrate --force && (php artisan user:create Admin \"$ADMIN_EMAIL\" admin --password=\"$ADMIN_PASSWORD\" || true) && php artisan octane:start --host=0.0.0.0 --port=${PORT:-8000} --server=roadrunner"]