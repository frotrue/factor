import type Phaser from 'phaser';
import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import styles from './HudApp.module.css';
import ActivityLog from './components/ActivityLog';
import BuildConsole from './components/BuildConsole';
import GameOverScreen from './components/GameOverScreen';
import MainMenu from './components/MainMenu';
import MobileActionBar from './components/MobileActionBar';
import MobileBuildSummary from './components/MobileBuildSummary';
import RightRail from './components/RightRail';
import ResearchPanel from './components/ResearchPanel';
import SettingsModal from './components/SettingsModal';
import TopBar from './components/TopBar';
import Tooltip from './components/Tooltip';
import TutorialPanel from './components/TutorialPanel';
import WaveResultCard from './components/WaveResultCard';
import { mainMenu } from './signals/menuState';
import {
    RENDER_RESOLUTION_CHANGED_EVENT,
    createHudStageSnapshot,
    type HudStageSnapshot
} from './renderResolution';

interface HudAppProps {
    game: Phaser.Game;
}

export default function HudApp({ game }: HudAppProps) {
    const sceneCount = game.scene?.getScenes(false).length ?? 0;
    const menuSnapshot = mainMenu.value;
    const showGameplayHud = !menuSnapshot.open && menuSnapshot.title.length > 0;

    return (
        <div class={styles.hudRoot} data-testid="preact-hud-root" data-scene-count={sceneCount}>
            <HudStage game={game}>
                <div class={styles.gameplayFrame} data-testid="preact-hud-gameplay-frame">
                    <MainMenu />
                    {showGameplayHud && (
                        <>
                            <TopBar />
                            <RightRail />
                            <BuildConsole />
                            <WaveResultCard />
                            <ActivityLog />
                            <TutorialPanel />
                            <MobileBuildSummary />
                            <MobileActionBar />
                        </>
                    )}
                </div>
            </HudStage>
            {showGameplayHud && (
                <>
                    <SettingsModal />
                    <ResearchPanel />
                    <GameOverScreen />
                    <Tooltip />
                </>
            )}
        </div>
    );
}

function HudStage({ children, game }: { children: ComponentChildren; game: Phaser.Game }) {
    const hudStage = useHudStage(game);

    return (
        <div
            class={styles.hudStage}
            data-hud-profile={hudStage.profile}
            data-render-preset={hudStage.preset}
            data-testid="preact-hud-stage"
            style={hudStage.style}
        >
            {children}
        </div>
    );
}

function useHudStage(game: Phaser.Game): HudStageSnapshot {
    const [snapshot, setSnapshot] = useState(() => createHudStageSnapshot(game));

    useEffect(() => {
        let frame = 0;
        const canvas = game.canvas;
        const update = () => {
            if (frame) window.cancelAnimationFrame(frame);
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                setSnapshot(createHudStageSnapshot(game));
            });
        };
        const observer = typeof ResizeObserver !== 'undefined'
            ? new ResizeObserver(update)
            : null;

        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        window.addEventListener(RENDER_RESOLUTION_CHANGED_EVENT, update);
        if (canvas && observer) observer.observe(canvas);

        return () => {
            if (frame) window.cancelAnimationFrame(frame);
            window.removeEventListener('resize', update);
            window.removeEventListener('orientationchange', update);
            window.removeEventListener(RENDER_RESOLUTION_CHANGED_EVENT, update);
            observer?.disconnect();
        };
    }, [game]);

    return snapshot;
}
