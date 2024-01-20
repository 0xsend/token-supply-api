FROM oven/bun:1.0.1

COPY . /app
WORKDIR /app
RUN bun install

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}

CMD ["bun", "start"]
