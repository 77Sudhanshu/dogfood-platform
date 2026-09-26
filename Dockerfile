FROM node:22-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

ENV DATABASE_URL="postgresql://dogfood:dogfood_dev_password@localhost:5432/dogfood"
ENV AUTH_SECRET="dogfood_local_dev_secret_change_me"

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start"]