const widgetsDeclarationSource = require("./widgets-declaration");

/**
 * Resolve the TypeScript runtime. Consumers can inject their own instance via options.
 */
function resolveTypeScript(tsOverride) {
    if (tsOverride) {
        return tsOverride;
    }
    try {
        // eslint-disable-next-line global-require
        return require("typescript");
    } catch (error) {
        throw new Error(
            "parseWidget requires the 'typescript' package. Install it or provide an instance through options.ts."
        );
    }
}

const DEFAULT_COMPILER_OPTIONS = Object.freeze({
    jsxFactory: "__jsx",
    jsxFragmentFactory: "__Fragment",
    noLib: true,
});

/**
 * Extract component names declared in widgets.d.ts so the runtime knows which factories to expose.
 */
function extractComponentNames(declarationSource) {
    const names = new Set();
    const pattern = /declare\s+const\s+(\w+)\s*:\s*Widgets\./g;
    let match = pattern.exec(declarationSource);
    while (match) {
        names.add(match[1]);
        match = pattern.exec(declarationSource);
    }
    return Array.from(names);
}

function flattenNodes(nodes) {
    return nodes.reduce((acc, item) => {
        if (Array.isArray(item)) {
            acc.push(...flattenNodes(item));
        } else {
            acc.push(item);
        }
        return acc;
    }, []);
}

function createRuntime(componentNames) {
    let capturedRender = null;
    const componentNameSet = new Set(componentNames);

    const collectChildren = (children) => {
        const flattened = flattenNodes(children);
        return flattened.filter(
            (child) => child && typeof child === "object" && "type" in child && componentNameSet.has(child.type)
        );
    };

    const fragment = ({ children = [] }) => collectChildren(children);

    const factories = {};
    componentNames.forEach((componentName) => {
        factories[componentName] = (props = {}, ...children) => {
            const widgetChildren = collectChildren(children);
            const node = { type: componentName, ...props };
            if (widgetChildren.length > 0) {
                node.children =
                    componentName === "Transition" && widgetChildren.length === 1 ? widgetChildren[0] : widgetChildren;
            }
            return node;
        };
    });

    return {
        render(fn) {
            capturedRender = fn;
        },
        __jsx(type, props, ...children) {
            if (type === fragment) {
                return fragment({ children });
            }
            if (typeof type === "function") {
                return type(props || {}, ...children);
            }
            const widgetChildren = collectChildren(children);
            const node = { type: String(type), ...(props || {}) };
            if (widgetChildren.length > 0) {
                node.children = widgetChildren;
            }
            return node;
        },
        __Fragment: fragment,
        invokeRender(state) {
            if (!capturedRender) {
                throw new Error("No render() call found in view");
            }
            return capturedRender(state);
        },
        ...factories,
    };
}

function transpileViewToFunction(ts, viewSource, compilerOptions) {
    const source = `render((state) => { with (state) { return ${viewSource} } })`;
    const result = ts.transpileModule(source, {
        compilerOptions,
        reportDiagnostics: false,
    });
    return result.outputText;
}

function parseWidget(viewSource, state = {}, options = {}) {
    if (typeof viewSource !== "string" || !viewSource.trim()) {
        throw new Error("viewSource must be a non-empty string.");
    }
    const ts = resolveTypeScript(options.ts);
    const compilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.React,
        ...DEFAULT_COMPILER_OPTIONS,
        ...(options.compilerOptions || {}),
    };
    const declarations = options.declarations || widgetsDeclarationSource;
    const componentNames = extractComponentNames(declarations);
    const runtime = createRuntime(componentNames);
    const compiled = transpileViewToFunction(ts, viewSource, compilerOptions);
    const argNames = ["render", "__jsx", "__Fragment", ...componentNames];
    const argValues = [
        runtime.render.bind(runtime),
        runtime.__jsx.bind(runtime),
        runtime.__Fragment,
        ...componentNames.map((name) => runtime[name]),
    ];
    const factory = new Function(...argNames, compiled);
    factory(...argValues);
    const widgetTree = runtime.invokeRender(state);
    return {
        widgetTree,
        componentNames,
    };
}

module.exports = {
    DEFAULT_COMPILER_OPTIONS,
    extractComponentNames,
    createRuntime,
    parseWidget,
};
