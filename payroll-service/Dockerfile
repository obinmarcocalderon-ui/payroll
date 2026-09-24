FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-libs postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apk del postgresql-dev

WORKDIR /app
COPY index.php .

EXPOSE 8003

ENV PHP_CLI_SERVER_WORKERS=4

CMD ["php", "-S", "0.0.0.0:8003", "index.php"]