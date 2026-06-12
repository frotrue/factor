const MOBILE_LAYOUT_QUERY = '(pointer: coarse), (max-width: 768px), (max-height: 480px)';

export function createMobileLayoutMediaQuery(): MediaQueryList {
    return window.matchMedia(MOBILE_LAYOUT_QUERY);
}

export function isMobileLayoutActive(): boolean {
    return document.body.classList.contains('mobile-layout');
}

export function isMobileLayoutMatched(mediaQuery?: MediaQueryList | null): boolean {
    return Boolean(mediaQuery?.matches || window.innerWidth <= 768 || window.innerHeight <= 480);
}

export function setMobileLayoutClass(active: boolean): void {
    document.body.classList.toggle('mobile-layout', active);
}

export function clearMobileLayoutClass(): void {
    document.body.classList.remove('mobile-layout');
}

export function isShortLandscapeLayout(): boolean {
    return window.matchMedia('(max-height: 480px) and (orientation: landscape)').matches;
}

export function restoreGameCanvasFocus(): void {
    const canvas = document.querySelector<HTMLCanvasElement>('#game-container canvas');
    if (!canvas) return;
    if (canvas.tabIndex < 0) canvas.tabIndex = 0;
    requestAnimationFrame(() => canvas.focus({ preventScroll: true }));
}
