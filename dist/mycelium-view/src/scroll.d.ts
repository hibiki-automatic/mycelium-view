export interface ScrollSyncOpts {
    onScrollRatio?: (ratio: number) => void;
}
export declare function scrollToLine(root: HTMLElement, line: number): void;
export declare function createScrollSync(root: HTMLElement, opts: ScrollSyncOpts): () => void;
