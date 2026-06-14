import { signal } from '@preact/signals';
import type { MobileActionSnapshot } from '../../types';

export const mobileActions = signal<MobileActionSnapshot>({
    open: false,
    labels: {
        aria: '',
        toolbar: '',
        cableMenu: ''
    },
    summaryTitle: '',
    summaryDetail: '',
    cableMenuOpen: false,
    cableOptions: [],
    actions: []
});
