FROM ruby:3.3.4

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
  build-essential \
  libpq-dev \
  postgresql-client \
  nodejs \
  git \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app/api
