FROM node:20-slim

# Menggunakan Debian (slim) lebih stabil untuk Puppeteer dibanding Alpine
# Install Chromium dan fonts yang dibutuhkan
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf libxss1 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Beri tahu Puppeteer untuk menggunakan Chromium bawaan sistem
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npx prisma generate

EXPOSE 8080

CMD ["node", "server.js"]
