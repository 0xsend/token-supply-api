FROM oven/bun:0.6.12

COPY . /app
WORKDIR /app
RUN bun install

CMD ["bun", "run", "index.ts"]
