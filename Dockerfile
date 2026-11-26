# syntax=docker/dockerfile:1
#
# Cloud Run (me-west1). Next.js standalone + Prisma + Payload + sharp.
# לא נבדק בפועל ב-Docker בזמן הכתיבה — ראה docs/deploy/gcp-cloud-run.md § "מה נבדק".
#
# שלבים: deps -> build -> migrate (אופציונלי, --target migrate) -> runner (ברירת מחדל, האחרון).

ARG NODE_VERSION=22.23.5

# ── deps: התקנה דטרמיניסטית לפי package-lock ─────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS deps
# openssl: דרוש למנוע של Prisma. ca-certificates: חיבורי TLS (Neon, GCS).
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package.json package-lock.json ./
# postinstall מריץ prisma generate ולכן ה-schema חייב להיות קיים כבר כאן
COPY prisma ./prisma
RUN npm ci

# ── build ────────────────────────────────────────────────────────────
FROM deps AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production \
    NEXT_OUTPUT=standalone
# ערכי PLACEHOLDER לבילד בלבד (src/env.ts מאמת בזמן טעינת מודולים). אינם נשמרים בתמונה
# הסופית (שלב runner נפרד) והאפליקציה מקבלת את הערכים האמיתיים בזמן ריצה מ-Cloud Run.
# הבילד לא מתחבר ל-DB: דפי CMS סטטיים נבנים עם ברירות המחדל ומתרעננים בריצה (ISR).
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" \
    DIRECT_URL="postgresql://build:build@localhost:5432/build" \
    PAYLOAD_SECRET="build-placeholder-not-a-real-secret" \
    AUTH_SECRET="build-placeholder-not-a-real-secret" \
    AUTH_URL="https://build.invalid" \
    npm run build

# ── migrate: prisma migrate deploy (Cloud Run Job / הרצה ידנית) ─────
# docker build --target migrate ...   (ראה deploy/gcp/cloudbuild-migrate.yaml)
FROM deps AS migrate
WORKDIR /app
COPY prisma ./prisma
CMD ["npx", "prisma", "migrate", "deploy"]

# ── runner: התמונה שרצה ב-Cloud Run ─────────────────────────────────
FROM node:${NODE_VERSION}-bookworm-slim AS runner
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=8080

RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

# standalone כולל node_modules מצומצם, server.js, ו-wp-plugin/dist (outputFileTracingIncludes)
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 8080
# Cloud Run מזריק PORT; server.js של standalone קורא PORT ו-HOSTNAME מהסביבה
CMD ["node", "server.js"]
