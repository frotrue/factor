import AbstractProcessor from './AbstractProcessor';
export default class Processor extends AbstractProcessor {
    constructor(scene, x, y, config = {}) {
        super(scene, x, y, 'PROCESSOR', 'LABELLING', config);
    }
}
//# sourceMappingURL=Processor.js.map