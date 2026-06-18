import EventBus from '../managers/EventBus';
import type MainScene from '../scenes/MainScene';
import { restoreGameCanvasFocus } from './domEnvironment';

const OWNER = 'ResearchPanelController';

export default class ResearchPanelController {
    private open = false;
    private selectedId: string | null = null;

    constructor(private scene: MainScene) {}

    setup(): void {
        EventBus.offAll(OWNER);
        this.scene.events.once('shutdown', () => EventBus.offAll(OWNER));
        EventBus.on('RESEARCH_OPEN_REQUESTED', () => {
            this.open = true;
            this.render();
        }, OWNER);
        EventBus.on('RESEARCH_CLOSE_REQUESTED', () => {
            this.open = false;
            EventBus.emit('RESEARCH_PANEL_OPEN_CHANGED', { open: false });
            restoreGameCanvasFocus();
        }, OWNER);
        EventBus.on('RESEARCH_SELECT_REQUESTED', ({ id }) => {
            this.selectedId = id;
            this.scene.researchManager.assignResearch(id);
            this.render();
        }, OWNER);
        EventBus.on('RESEARCH_SLOT_ASSIGN_REQUESTED', ({ id }) => {
            this.selectedId = id;
            this.scene.researchManager.assignResearch(id);
            this.render();
        }, OWNER);
        EventBus.on('RESEARCH_STATE_CHANGED', () => {
            this.render();
        }, OWNER);
    }

    private render(): void {
        EventBus.emit('RESEARCH_PANEL_UPDATED', this.scene.researchManager.createPanelSnapshot(this.open, this.selectedId));
    }
}
