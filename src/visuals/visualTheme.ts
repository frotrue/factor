export const VISUAL_THEME = {
    world: {
        background: 0x050811,
        fog: 0x09111f,
        gridMinor: 0x1f3147,
        gridMajor: 0x2f7ba3,
        gridAxis: 0x69e7ff,
        resourceSilicon: 0x93c5fd,
        resourceEnergy: 0xf8e27d,
        blockerBase: 0x162235,
        blockerEdge: 0x55d7ff,
        blockerCorruption: 0xff4fd8
    },
    categories: {
        EXTRACTION: 0x59e0ff,
        PRODUCTION: 0xb789ff,
        LOGISTICS: 0x74a7ff,
        POWER: 0xffdf6e,
        DEFENSE: 0xff6888,
        NONE: 0x7cffb2
    },
    buildings: {
        panelDark: 0x07111f,
        panelMid: 0x10233a,
        bevel: 0x7dd3fc,
        shadow: 0x000000,
        online: 0x63ffb1,
        warning: 0xffd166,
        danger: 0xff4d6d
    },
    items: {
        RAW_DATA: 0x52f7ff,
        LABELED_DATA: 0x6fb8ff,
        WEIGHT_UPDATE: 0xff78cb,
        SILICON: 0xb9c7d8,
        ENERGY: 0xffe873,
        PROJECTILE: 0xffffff,
        TRAINED_MODEL: 0xb98cff,
        INFERENCE_UNIT: 0xff5ebc
    },
    enemies: {
        NOISE: 0xff5d68,
        MALWARE: 0xff2a8b,
        ADVERSARIAL: 0xa970ff,
        OVERFITTED_MODEL: 0x6d35ff,
        DDOS_BOT: 0x46ff9a
    },
    cables: {
        basic: 0x5aa9ff,
        fiber: 0x50f4ff,
        throttled: 0xffd166,
        wireless: 0xb789ff
    },
    overlays: {
        defense: 0xff5573,
        power: 0xffdf6e,
        valid: 0x64ff9f,
        invalid: 0xff4d6d,
        remove: 0xff4d6d
    }
} as const;

export function getCategoryColor(category?: string): number {
    return VISUAL_THEME.categories[category as keyof typeof VISUAL_THEME.categories] ?? VISUAL_THEME.categories.NONE;
}

export function getItemColor(type?: string): number {
    return VISUAL_THEME.items[type as keyof typeof VISUAL_THEME.items] ?? VISUAL_THEME.items.RAW_DATA;
}

export function getEnemyColor(type?: string): number {
    return VISUAL_THEME.enemies[type as keyof typeof VISUAL_THEME.enemies] ?? VISUAL_THEME.enemies.NOISE;
}
