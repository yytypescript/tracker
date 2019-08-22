FROM node:12-alpine

RUN set -eux \
    && apk update \
    && apk add curl \
    && curl -L --insecure https://github.com/odise/go-cron/releases/download/v0.0.7/go-cron-linux.gz | zcat > /usr/local/bin/go-cron \
    && chmod u+x /usr/local/bin/go-cron

WORKDIR /app
