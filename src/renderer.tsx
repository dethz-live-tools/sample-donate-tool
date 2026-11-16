import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'
import { clientI18n, type Locale } from './i18n'

export const renderer = jsxRenderer((_props, c) => {
  const lang = (c.get('lang') || 'th') as Locale
  return (
    <html lang={lang}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>DONATE TOOLS — RAWBLOCK</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans+Thai:wght@400;600;700&family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: clientI18n(lang) }} />
      </head>
      <body>{_props.children}</body>
    </html>
  )
})