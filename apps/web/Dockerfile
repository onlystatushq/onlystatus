# Build stage
FROM node@sha256:06e5c9f86bfa0aaa7163cf37a5eaa8805f16b9acb48e3f85645b09d459fc2a9f AS builder
WORKDIR /app
ENV PNPM_HOME="/pnpm" PATH="$PNPM_HOME:$PATH"
COPY . .
RUN corepack enable && \
    pnpm install --frozen-lockfile && \
    pnpm turbo run build --filter=@openstatus/web

# Serve stage
FROM nginx@sha256:65645c7bb6a0661892a8b03b89d0743208a18dd2f3f17a54ef4b76fb8e2f2a10
COPY --from=builder /app/apps/web/out /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
