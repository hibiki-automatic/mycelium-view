import type { ScrollSyncOpts } from './scroll.js';
export interface MountOpts {
    html?: string;
    theme?: 'light' | 'dark' | 'auto';
    onScrollRatio?: ScrollSyncOpts['onScrollRatio'];
}
export interface ViewHandle {
    update(html: string): void;
    scrollToLine(n: number): number;
    destroy(): void;
}
export declare function mountView(targetEl: HTMLElement, opts?: MountOpts): ViewHandle;
