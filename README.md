# Cheap Mobile Screenshot API (Vercel)

Minimal API endpoint using `puppeteer-core` + `@sparticuz/chromium-min`.

## Endpoint

- `GET /api/screenshot`

Query params:

- `url` (required): target URL (`http` or `https`)
- `width` (optional, default `390`)
- `height` (optional, default `844`)
- `fullPage` (optional, `true|false`, default `false`)
- `quality` (optional, webp only, `1-100`, default `80`)

## Required environment variable

- `CHROMIUM_PACK_URL`: direct URL to your hosted `chromium-v#-pack.tar`

Example:

```bash
CHROMIUM_PACK_URL=https://your-bucket.example.com/chromium-v138-pack.tar
```

## Run locally

```bash
npm install
npm run dev
```

## Deploy

```bash
vercel
```

Set `CHROMIUM_PACK_URL` in your Vercel project environment variables.

## Example call

```bash
curl "https://your-project.vercel.app/api/screenshot?url=https://example.com&width=390&height=844&quality=70" --output mobile.webp
```
