FROM node:20-alpine AS builder
WORKDIR /app

ARG PRISMA_DATABASE_URL
ENV PRISMA_DATABASE_URL=$PRISMA_DATABASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY app ./app
COPY components ./components
COPY contexts ./contexts
COPY hooks ./hooks
COPY lib ./lib
COPY prisma ./prisma
COPY public ./public
COPY next.config.mjs ./next.config.mjs
COPY tsconfig.json ./tsconfig.json
COPY next-env.d.ts ./next-env.d.ts
COPY postcss.config.mjs ./postcss.config.mjs
COPY eslint.config.mjs ./eslint.config.mjs
COPY proxy.ts ./proxy.ts
COPY components.json ./components.json

# Use compile build mode to avoid DB-dependent prerender during image build.
RUN npm run prisma:generate && npx next build --experimental-build-mode=compile

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000

CMD ["sh", "-c", "npm run prisma:deploy && npx prisma db push && npm run start"]
