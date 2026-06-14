import type Phaser from 'phaser';
import styles from './HudApp.module.css';
import ActivityLog from './components/ActivityLog';
import BuildConsole from './components/BuildConsole';
import GameOverScreen from './components/GameOverScreen';
import MainMenu from './components/MainMenu';
import MobileActionBar from './components/MobileActionBar';
import MobileBuildSummary from './components/MobileBuildSummary';
import RightRail from './components/RightRail';
import SettingsModal from './components/SettingsModal';
import TopBar from './components/TopBar';
import Tooltip from './components/Tooltip';
import TrainingLabModal from './components/TrainingLabModal';
import TutorialPanel from './components/TutorialPanel';
import WaveResultCard from './components/WaveResultCard';
import { mainMenu } from './signals/menuState';

interface HudAppProps {
    game: Phaser.Game;
}

export default function HudApp({ game }: HudAppProps) {
    const sceneCount = game.scene?.getScenes(false).length ?? 0;
    const menuSnapshot = mainMenu.value;
    const showGameplayHud = !menuSnapshot.open && menuSnapshot.title.length > 0;

    return (
        <div class={styles.hudRoot} data-testid="preact-hud-root" data-scene-count={sceneCount}>
            <MainMenu />
            {showGameplayHud && (
                <>
                    <TopBar />
                    <RightRail />
                    <BuildConsole />
                    <SettingsModal />
                    <TrainingLabModal />
                    <GameOverScreen />
                    <WaveResultCard />
                    <ActivityLog />
                    <Tooltip />
                    <TutorialPanel />
                    <MobileBuildSummary />
                    <MobileActionBar />
                </>
            )}
        </div>
    );
}
