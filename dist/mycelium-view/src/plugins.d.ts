declare global {
    interface Window {
        katex?: {
            render(tex: string, el: Element, opts: {
                displayMode: boolean;
                throwOnError: boolean;
            }): void;
        };
        mermaid?: {
            initialize(opts: {
                startOnLoad: boolean;
                theme: string;
            }): void;
            run(opts: {
                nodes: NodeListOf<Element> | Element[];
            }): void;
        };
    }
}
export declare function runKaTeX(root: HTMLElement): void;
export declare function runMermaid(root: HTMLElement): void;
export declare function installCopyButtons(root: HTMLElement): () => void;
export declare function enableMathCopyAsTex(rootEl: HTMLElement): () => void;
