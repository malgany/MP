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
  .product-preview-canvas{background:transparent}
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
  .product-preview-canvas{background:#f7f8f9}
  
  /* Prevent inherited page styles from interfering */
  *, *::before, *::after { box-sizing: border-box; }
  body, h1, h2, h3, h4, p, figure, blockquote { margin: 0; }
  
  /* Ensure --blue-400 etc. resolve from core.css variables */
  :root { --color-inherit: inherit; }
  
  /* Improve font rendering in iframe */
  body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  
  /* Contain layout */
  #__preview_root { display:flex; align-items:center; justify-content:center; width:100%; height:100%; }
  
  </style>
</head><body><div id="__preview_root">${innerHtml}</div></body></html>`;
  }

  window.WidgetPreview = { buildPreviewSrcdoc, buildFullPreviewSrcdoc };
})();


