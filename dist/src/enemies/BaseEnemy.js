import Phaser from 'phaser';
import { CONFIG } from '../config';
import EventBus from '../managers/EventBus';
export default class BaseEnemy {
    constructor(scene, type, x, y, hpMultiplier = 1, id, buildingManager) {
        this.scene = scene;
        this.type = type;
        this.x = x;
        this.y = y;
        this.id = id;
        this.buildingManager = buildingManager;
        const config = CONFIG.ENEMIES[type];
        this.maxHp = config.BASE_HP * hpMultiplier;
        this.hp = this.maxHp;
        this.speed = config.SPEED;
        this.damage = config.DAMAGE;
        this.active = true;
        this.sprite = scene.add.circle(x, y, config.RADIUS, config.COLOR);
        this.sprite.setStrokeStyle(1, 0xffffff);
        this.sprite.setDepth(30);
        this.hpBar = scene.add.graphics();
        this.hpBar.setDepth(31);
        this.drawHpBar();
    }
    takeDamage(amount) {
        if (!this.active)
            return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
        }
        else {
            this.drawHpBar();
        }
    }
    die() {
        if (!this.active)
            return;
        this.active = false;
        if (this.sprite && this.sprite.active)
            this.sprite.destroy();
        if (this.hpBar && this.hpBar.active)
            this.hpBar.destroy();
        EventBus.emit('ENEMY_KILLED', { id: this.id });
    }
    drawHpBar() {
        this.hpBar.clear();
        if (!this.active)
            return;
        const width = 16;
        const height = 3;
        const percent = Math.max(0, this.hp / this.maxHp);
        this.hpBar.fillStyle(0xff0000, 1);
        this.hpBar.fillRect(this.x - width / 2, this.y - 12, width, height);
        this.hpBar.fillStyle(0x00ff00, 1);
        this.hpBar.fillRect(this.x - width / 2, this.y - 12, width * percent, height);
    }
    update(deltaMs, targetX, targetY) {
        if (!this.active)
            return;
        const delta = deltaMs / 1000;
        // 현재 위치 그리드
        const snappedX = Math.floor(this.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const snappedY = Math.floor(this.y / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const building = this.buildingManager.get(`${snappedX},${snappedY}`);
        let currentSpeed = this.speed;
        // 방화벽(FIREWALL)과 겹치면 이동 불가, 방화벽이 지속 데미지를 줌
        if (building && building.type === 'FIREWALL') {
            currentSpeed = 0; // 이동 중지 (방화벽이 길을 막음)
            // 방화벽 데미지는 DefenseTower 쪽에서 onTick으로 처리
        }
        if (currentSpeed > 0) {
            const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
            this.x += Math.cos(angle) * currentSpeed * delta;
            this.y += Math.sin(angle) * currentSpeed * delta;
        }
        this.sprite.setPosition(this.x, this.y);
        this.drawHpBar();
        const dist = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
        if (dist < CONFIG.GRID_SIZE) {
            EventBus.emit('CORE_DAMAGED', { amount: this.damage });
            this.die();
        }
    }
}
//# sourceMappingURL=BaseEnemy.js.map