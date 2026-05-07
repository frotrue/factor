import Phaser from 'phaser';

// 전역 이벤트 버스 - Manager 간 느슨한 결합을 위한 싱글턴
const EventBus = new Phaser.Events.EventEmitter();

export default EventBus;
