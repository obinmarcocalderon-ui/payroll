FROM php:8.3-cli-alpine

RUN apk add --no-cache postgresql-libs postgresql-dev \
    && docker-php-ext-install pdo pdo_pgsql \
    && apk del postgresql-dev

WORKDIR /app
COPY index.php .

EXPOSE 8005

CMD ["php", "-S", "0.0.0.0:8005", "index.php"]