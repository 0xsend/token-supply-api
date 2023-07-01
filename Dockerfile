FROM oven/bun:0.6.12

COPY . /app
WORKDIR /app
RUN bun install

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

CMD ["bun", "run", "index.ts"]
