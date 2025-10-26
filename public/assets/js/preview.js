(function () {
  function buildPreviewSrcdoc(innerHtml) {
    return `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://cdn.openai.com">
<link rel="preload" href="https://cdn.openai.com/common/fonts/openai-sans/v2/OpenAISans-Regular.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="https://cdn.openai.com/common/fonts/openai-sans/v2/OpenAISans-Semibold.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="stylesheet" href="/lib/core.css">
<style>
  html,body{height:100%;transform-origin: 0 0;transform: scale(0.8);}
  body{margin: 10% 0px 0px 40%;display:flex;justify-content:center;background:transparent}
  :root{color-scheme: light}
</style>
</head><body>${innerHtml}</body></html>`;
  }

  function buildFullPreviewSrcdoc(innerHtml) {
    return `<!DOCTYPE html><html lang="en" data-theme="light"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="preconnect" href="https://cdn.openai.com">
<link rel="preload" href="https://cdn.openai.com/common/fonts/openai-sans/v2/OpenAISans-Regular.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="preload" href="https://cdn.openai.com/common/fonts/openai-sans/v2/OpenAISans-Semibold.woff2" as="font" type="font/woff2" crossorigin="anonymous">
<link rel="stylesheet" href="/lib/core.css">
<style>
  html,body{height:100%;}
  body{margin:0;display:flex;align-items:center;justify-content:center;background:#f7f8f9}
  :root{color-scheme: light}
</style>
</head><body>${innerHtml}</body></html>`;
  }

  window.WidgetPreview = { buildPreviewSrcdoc, buildFullPreviewSrcdoc };
})();


