import { jsxRenderer } from 'hono/jsx-renderer'
import { Link, ViteClient } from 'vite-ssr-components/hono'
import { clientI18n, type Locale } from './i18n'

const themeRuntimeScript = `;window.__applyTheme=function(f,a){if(f)document.documentElement.dataset.flavor=f;if(a)document.documentElement.dataset.accent=a;var fs=document.getElementById('themeFlavorSelect'),as=document.getElementById('themeAccentSelect');if(fs&&f&&fs.value!==f)fs.value=f;if(as&&a&&as.value!==a)as.value=a};window.__saveTheme=function(){var fs=document.getElementById('themeFlavorSelect'),as=document.getElementById('themeAccentSelect'),f=fs?fs.value:'',a=as?as.value:'';window.__applyTheme(f,a);fetch('/api/manage/theme',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({flavor:f,accent:a})}).catch(function(){})};document.addEventListener('click',function(e){var b=e.target&&e.target.closest&&e.target.closest('#langSwitch');if(b&&b.dataset.targetLang&&window.__setLang){e.preventDefault();window.__setLang(b.dataset.targetLang)}});document.addEventListener('change',function(e){var t=e.target;if(t&&(t.id==='themeFlavorSelect'||t.id==='themeAccentSelect'))window.__saveTheme()});`

export const renderer = jsxRenderer((_props, c) => {
  const lang = (c.get('lang') || 'th') as Locale
  const flavor = (c.get('themeFlavor') || 'macchiato') as string
  const accent = (c.get('themeAccent') || 'sapphire') as string
  const siteTitle = (c.get('siteTitle') || '').trim() || 'Donate Tools'
  return (
    <html lang={lang} data-flavor={flavor} data-accent={accent}>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>{siteTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=IBM+Plex+Sans+Thai:wght@400;600;700&family=Space+Mono:wght@400;700&family=Work+Sans:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
        <ViteClient />
        <Link href="/src/style.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
        <script dangerouslySetInnerHTML={{ __html: clientI18n(lang) + themeRuntimeScript }} />
      </head>
      <body>{_props.children}</body>
    </html>
  )
})
