FROM oven/bun:1-alpine AS base
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build the application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# ---> NEW: Generate Prisma Client <---
# This ensures Next.js has access to the generated client during the build process.
RUN bunx prisma generate

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Run build script which includes standalone copying commands in package.json
RUN bun run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Copy the standalone output from builder
COPY --from=builder /app/.next/standalone ./

# Next.js standalone output doesn't include public/ and .next/static folders
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

CMD ["bun", "server.js"]