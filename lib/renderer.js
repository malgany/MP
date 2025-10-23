const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DEFAULT_CHUNK_FILES = ["index-chunk-1.js", "index-chunk-2.js", "index-chunk-3.js"];
let cachedRuntime = null;

function ensureStructuredClone(target, fallback) {
    if (typeof target.structuredClone !== "function" && typeof fallback === "function") {
        // eslint-disable-next-line no-param-reassign
        target.structuredClone = fallback;
    }
}

function ensureCreateRange(windowObject) {
    if (typeof windowObject.document.createRange === "function") {
        return;
    }
    windowObject.document.createRange = () => ({
        setStart: () => {},
        setEnd: () => {},
        commonAncestorContainer: windowObject.document.body,
    });
}

function ensureRequestAnimationFrame(windowObject) {
    if (typeof windowObject.requestAnimationFrame !== "function") {
        windowObject.requestAnimationFrame = (callback) => windowObject.setTimeout(() => callback(Date.now()), 16);
    }
    if (typeof windowObject.cancelAnimationFrame !== "function") {
        windowObject.cancelAnimationFrame = (id) => windowObject.clearTimeout(id);
    }
}

function ensureMutationObserver(windowObject) {
    if (typeof windowObject.MutationObserver === "function") {
        return;
    }
    class NoopMutationObserver {
        constructor() {
            this.records = [];
        }
        observe() {}
        disconnect() {}
        takeRecords() {
            return this.records;
        }
    }
    windowObject.MutationObserver = NoopMutationObserver;
}

function ensureCrypto(windowObject) {
    if (windowObject.crypto && typeof windowObject.crypto.randomUUID === "function") {
        return;
    }
    try {
        // eslint-disable-next-line global-require
        const nodeCrypto = require("crypto");
        const cryptoImpl = nodeCrypto.webcrypto || {};
        if (typeof cryptoImpl.randomUUID === "function") {
            windowObject.crypto = cryptoImpl;
            return;
        }
        if (typeof nodeCrypto.randomUUID === "function") {
            windowObject.crypto = {
                randomUUID: nodeCrypto.randomUUID.bind(nodeCrypto),
            };
            return;
        }
    } catch (error) {
        // ignore and fallback to simple implementation
    }
    windowObject.crypto = {
        randomUUID: (() => {
            const template = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx";
            return template.replace(/[xy]/g, (char) => {
                const rand = (Math.random() * 16) | 0;
                const value = char === "x" ? rand : (rand & 0x3) | 0x8;
                return value.toString(16);
            });
        }),
    };
}

function ensureWindow(providedWindow) {
    if (providedWindow) {
        return providedWindow;
    }
    try {
        // eslint-disable-next-line global-require
        const { JSDOM } = require("jsdom");
        const dom = new JSDOM("<!DOCTYPE html><html><head></head><body></body></html>", {
            pretendToBeVisual: true,
            url: "https://marketplace.mock/",
        });
        return dom.window;
    } catch (error) {
        throw new Error(
            "renderWidget* requires a DOM-like environment. Install 'jsdom' or provide a custom window via options.window."
        );
    }
}

function runBundle(bundleSource, windowObject) {
    const context = vm.createContext({
        window: windowObject,
        document: windowObject.document,
        navigator: windowObject.navigator,
        console,
        MutationObserver: windowObject.MutationObserver,
        crypto: windowObject.crypto,
        globalThis: windowObject,
        global: windowObject,
        self: windowObject,
        setTimeout: windowObject.setTimeout.bind(windowObject),
        clearTimeout: windowObject.clearTimeout.bind(windowObject),
        setInterval: windowObject.setInterval.bind(windowObject),
        clearInterval: windowObject.clearInterval.bind(windowObject),
        requestAnimationFrame: windowObject.requestAnimationFrame.bind(windowObject),
        cancelAnimationFrame: windowObject.cancelAnimationFrame.bind(windowObject),
        performance: windowObject.performance,
        structuredClone: typeof structuredClone === "function" ? structuredClone : undefined,
    });
    ensureStructuredClone(context.window, context.structuredClone);
    vm.runInContext(bundleSource, context, { filename: "preview-bundle.js" });
    const preview = context.window.__MARKETPLACE_WIDGET_PREVIEW;
    if (!preview) {
        throw new Error("Failed to initialize preview bundle: __MARKETPLACE_WIDGET_PREVIEW is undefined.");
    }
    return { preview, window: context.window };
}

function normalizeBaseUrl(dirPath) {
    const withSlash = dirPath.endsWith(path.sep) ? dirPath : `${dirPath}${path.sep}`;
    const fileUrl = `file://${withSlash.replace(/\\/g, "/")}`;
    return fileUrl.endsWith("/") ? fileUrl : `${fileUrl}/`;
}

function buildBundleSource(options = {}) {
    const baseDir = options.bundleDir || path.join(__dirname, "bundle");
    const chunkFiles = options.chunkFiles || DEFAULT_CHUNK_FILES;
    const chunkPaths = chunkFiles.map((file) => (path.isAbsolute(file) ? file : path.join(baseDir, file)));
    const chunks = chunkPaths.map((chunkPath) => fs.readFileSync(chunkPath, "utf8"));
    const baseUrl = normalizeBaseUrl(options.bundleBaseDir || baseDir);

    let source = `const __MARKETPLACE_BUNDLE_BASE__ = ${JSON.stringify(baseUrl)};\n${chunks.join("\n")}`;
    source = source.replace(/import\(\s*(['"])(\.{1,2}\/[^'"]+?)\1\)/g, (_match, _quote, specifier) => {
        const normalized = specifier.replace(/\\/g, "/");
        return `import(new URL('${normalized}', __MARKETPLACE_BUNDLE_BASE__).href)`;
    });
    source = source.replace(/^\s*export\s*\{[^}]*\};?\s*$/gm, "");
    return source;
}

function ensurePreviewRuntime(options = {}) {
    if (cachedRuntime) {
        return cachedRuntime;
    }
    const windowObject = ensureWindow(options.window);
    ensureCreateRange(windowObject);
    ensureRequestAnimationFrame(windowObject);
    ensureStructuredClone(windowObject, typeof structuredClone === "function" ? structuredClone : undefined);
    ensureMutationObserver(windowObject);
    ensureCrypto(windowObject);

    const bundleSource = buildBundleSource(options);
    cachedRuntime = runBundle(bundleSource, windowObject);
    return cachedRuntime;
}

function createRendererElement(preview, viewSource, state, options = {}) {
    const element = preview.React.createElement(preview.Renderer, {
        view: typeof viewSource === "string" ? viewSource : String(viewSource ?? ""),
        state: state && typeof state === "object" ? state : {},
        inspect: options.inspect ?? false,
    });
    return element;
}

function waitForNextTick(windowObject, delay = 0) {
    return new Promise((resolve) => {
        windowObject.setTimeout(resolve, Math.max(delay, 0));
    });
}

async function renderWidgetToDom(viewSource, state = {}, options = {}) {
    const runtime = ensurePreviewRuntime(options);
    const { preview, window } = runtime;

    const container = window.document.createElement("div");
    window.document.body.appendChild(container);
    const root = preview.ReactDOM.createRoot(container);

    try {
        root.render(createRendererElement(preview, viewSource, state, options));
        await waitForNextTick(window, options.flushDelay ?? 0);
        const html = container.innerHTML;
        const element = container.firstElementChild instanceof window.HTMLElement ? container.firstElementChild : null;
        root.unmount();
        container.remove();
        return { html, element };
    } catch (error) {
        root.unmount();
        container.remove();
        throw error;
    }
}

async function renderWidgetToHtml(viewSource, state = {}, options = {}) {
    const { html } = await renderWidgetToDom(viewSource, state, options);
    return html;
}

function getPreviewApi(options = {}) {
    const runtime = ensurePreviewRuntime(options);
    return runtime.preview;
}

function resetPreviewRuntime() {
    if (cachedRuntime && typeof cachedRuntime.window?.close === "function") {
        cachedRuntime.window.close();
    }
    cachedRuntime = null;
}

module.exports = {
    ensurePreviewRuntime,
    getPreviewApi,
    renderWidgetToDom,
    renderWidgetToHtml,
    resetPreviewRuntime,
};
