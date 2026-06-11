FROM node:20-alpine

# Install dependencies yang dibutuhkan oleh Puppeteer & Chromium di Alpine
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk \
    font-noto-cjk-fallback \
    font-noto-cjk-sc \
    font-noto-cjk-tc \
    font-noto-cjk-jp \
    font-noto-cjk-ko \
    font-noto-emoji

# Beri tahu Puppeteer untuk menggunakan Chromium bawaan sistem, bukan men-download sendiri
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8080

CMD ["node", "server.js"]
