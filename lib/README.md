# Marketplace Widget Parser & Preview

Biblioteca independente que reutiliza o bundle oficial do Marketplace para:
1. Converter o pseudo-JSX de widgets em uma arvore JSON (`parseWidget`).
2. Renderizar o widget com o mesmo renderer usado no builder original (`renderWidgetToHtml`).

## Estrutura

- `core.js`: parser headless (gera somente JSON).
- `renderer.js`: carrega o bundle oficial dentro de um DOM simulado (`jsdom`) e expõe utilitários de renderização.
- `bundle/index-chunk-*.js`: cópia dos três chunks oficiais (`index-chunk-1/2/3.js`).
- `widgets-declaration.js`: declarações TypeScript copiadas do bundle para mapear os componentes válidos.

## Requisitos

- Node.js >= 18.
- [`typescript`](https://www.npmjs.com/package/typescript) para o parser (`npm install typescript`).
- [`jsdom`](https://www.npmjs.com/package/jsdom) para renderização (`npm install jsdom`).
- Nenhum outro ativo externo é necessário; os chunks já estão incluídos.

## Uso rápido

```js
const { parseWidget, renderWidgetToHtml } = require('./lib');

const view = `<Card size="md">
  <Row>
    <Col gap={1}>
      <Caption value={date.name} size="lg" />
      <Title value={date.number} size="3xl" />
    </Col>
    <Col flex="auto">
      {events.map((item) => (
        <Row
          key={item.id}
          padding={{ x: 3, y: 2 }}
          gap={3}
          radius="xl"
          background={item.isNew ? 'none' : 'surface-secondary'}
          border={item.isNew ? { size: 1, color: item.color, style: 'dashed' } : undefined}
        >
          <Box width={4} height="40px" radius="full" background={item.color} />
          <Col>
            <Text value={item.title} />
            <Text value={item.time} size="sm" color="tertiary" />
          </Col>
        </Row>
      ))}
    </Col>
  </Row>
</Card>`;

const state = {
  date: { name: 'Friday', number: '28' },
  events: [
    { id: 'lunch', title: 'Lunch', time: '12:00 - 12:45 PM', color: 'red-400', isNew: false },
    { id: 'q1-roadmap-review', title: 'Q1 roadmap review', time: '1:00 - 2:00 PM', color: 'blue-400', isNew: true },
    { id: 'team-standup', title: 'Team standup', time: '3:30 - 4:00 PM', color: 'red-400', isNew: false },
  ],
};

// Arvore JSON (sem dependência de DOM):
const { widgetTree } = parseWidget(view, state);
console.log(widgetTree);

// Renderização fiel usando o preview oficial (requer jsdom).
(async () => {
  const html = await renderWidgetToHtml(view, state);
  console.log(html);
})();
```

## API

### `parseWidget(viewSource, state, options?)`

Retorna:
- `widgetTree`: arvore JSON gerada a partir do pseudo-JSX.
- `componentNames`: lista dos componentes presentes nas declarações.

Opções:
- `options.ts`: instância personalizada de TypeScript.
- `options.compilerOptions`: overrides para `transpileModule`.
- `options.declarations`: string alternativa com as declarações.

### `renderWidgetToHtml(viewSource, state, options?) -> Promise<string>`

Renderiza o widget com o mesmo renderer usado no Marketplace e devolve o HTML.

Opções:
- `options.window`: forneça um objeto `window` customizado (caso já utilize `jsdom`).
- `options.bundleDir`: diretório contendo os chunks (`index-chunk-*.js`).
- `options.chunkFiles`: lista personalizada de arquivos de chunk.
- `options.flushDelay`: tempo (ms) aguardado após o render para permitir efeitos assíncronos (padrão `0`).

### `renderWidgetToDom(viewSource, state, options?) -> Promise<{ html, element }>`

Executa a renderização dentro do DOM simulado e retorna o html e o primeiro elemento renderizado (desanexado). Útil para inspeções adicionais.

### `getPreviewApi(options?)`

Retorna `{ Renderer, React, ReactDOM }` carregados do bundle.

### `resetPreviewRuntime()`

Encerra o ambiente atual (`jsdom`) permitindo recarregar o bundle (útil em testes).

## Observações

- Os chunks ocupam alguns megabytes, mas garantem a fidelidade do renderizador oficial.
- A renderização monta o widget em `jsdom`, portanto alguns efeitos que dependem de APIs exclusivas do navegador podem não aparecer exatamente como no browser.
- O `view` é executado via `new Function` dentro do renderer: continue usando apenas templates confiáveis.
