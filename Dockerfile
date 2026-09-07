# ffmpeg with libass + harfbuzz is the one hard requirement — Devanagari captions
# need complex-text shaping, which drawtext cannot do. Debian's ffmpeg has both.
FROM node:22-bookworm-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg fontconfig ca-certificates \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Full install: `next build` needs typescript and tailwind, which are devDeps.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build && npm prune --omit=dev

# The bundled Noto Sans Devanagari is what libass resolves by name.
RUN fc-cache -f /app/assets/fonts

ENV NODE_ENV=production
ENV CAPTION_FONT="Noto Sans Devanagari"
ENV CAPTION_FONTS_DIR=/app/assets/fonts
# Render mounts the persistent disk here; the store and all assets live under it.
ENV KATHA_DATA_DIR=/data
ENV PORT=4321

EXPOSE 4321
CMD ["npm", "run", "start"]
