FROM oven/bun:latest

WORKDIR /site1

COPY package.json ./
COPY bun.lockb ./
COPY src ./
COPY main.js .

RUN bun install
