import { signal } from '@preact/signals';
import type { BuildConsoleSnapshot } from '../../types';

export const buildConsole = signal<BuildConsoleSnapshot>({
    activeCategory: 'EXTRACTION',
    labels: {
        aria: '',
        categories: '',
        tools: '',
        toolInfo: '',
        selectedTool: '',
        more: '',
        commandSelect: '',
        commandRotate: '',
        commandRemove: ''
    },
    categories: [],
    items: [],
    selectedTool: {
        type: 'DATA_DOWNLOADER',
        name: '패킷 수집기',
        cost: '5 실리콘',
        hint: '1-9 선택 | R 회전 | 0 철거'
    }
});
