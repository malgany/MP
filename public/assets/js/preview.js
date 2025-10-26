(function () {
  let coreCssInline = null;
  function setCoreCss(cssText) {
    coreCssInline = typeof cssText === 'string' && cssText.length ? cssText : null;
  }

  function buildHead(inlineScale) {
    const base = [
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
    ];
    // Prefere CSS inline; se indisponível, usa link absoluto para /lib/core.css
    const styleBlock = coreCssInline
      ? `<style>${coreCssInline}</style>`
      : '<link rel="stylesheet" href="/lib/core.css">';
    const extra = inlineScale
      ? '<style>html,body{height:100%;transform-origin:0 0;transform:scale(0.8);}body{margin:10% 0 0 40%;display:flex;justify-content:center;background:transparent}</style>'
      : '<style>html,body{height:100%;}body{margin:0;display:flex;align-items:center;justify-content:center;background:#f7f8f9}:root{color-scheme: light}</style>';
    return `${base.join('')}${styleBlock}${extra}`;
  }

  function buildPreviewSrcdoc(innerHtml) {
    return `<!DOCTYPE html><html lang="en"><head>${buildHead(true)}</head><body>${innerHtml}</body></html>`;
  }

  function buildFullPreviewSrcdoc(innerHtml) {
    return `<!DOCTYPE html><html lang="en"><head>${buildHead(false)}</head><body>${innerHtml}</body></html>`;
  }

  window.WidgetPreview = { buildPreviewSrcdoc, buildFullPreviewSrcdoc, setCoreCss };
})();


