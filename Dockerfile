# workerd is glibc-only, so no alpine
FROM node:24-slim
COPY --from=oven/bun:1 /usr/local/bin/bun /usr/local/bin/
# workerd refuses to start without system CA certs (outbound TLS to Slip2Sure/Discord/TTS)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates && rm -rf /var/lib/apt/lists/*
# pre-create the D1 volume mount point so the non-root user can write to it
RUN mkdir -p /app/.wrangler/state && chown -R node:node /app
USER node
WORKDIR /app
COPY --chown=node:node package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY --chown=node:node . .
# lets container env vars (-e / env_file) reach the worker as bindings
ENV CLOUDFLARE_INCLUDE_PROCESS_ENV=true
EXPOSE 4173
# build at start, not in a layer: the build bakes VITE_* values and secrets into dist/
CMD ["bun", "run", "preview", "--host", "0.0.0.0"]
