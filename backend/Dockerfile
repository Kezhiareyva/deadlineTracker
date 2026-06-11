FROM node:20-alpine

# Install dependencies yang dibutuhkan oleh Puppeteer & Chromium (whatsapp-web.js)
RUN apk add --no-cache \
    chromium \
    font-noto-cjk \
    font-noto-cjk-fallback \
    font-noto-cjk-sc \
    font-noto-cjk-tc \
    font-noto-cjk-jp \
    font-noto-cjk-ko

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8080

CMD ["node", "server.js"]
