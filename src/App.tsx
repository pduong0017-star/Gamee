import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CultivationPathId,
  CultivationQuest,
  INITIAL_ARTIFACTS,
  INITIAL_MANUALS,
  INITIAL_QUESTS,
  ImmortalArtifact,
  ImmortalManual,
  PillRecipe,
  REALMS,
  calculateBreakthroughChance,
  canCraftPill,
  computeCultivatorStats,
  getArtifactUpgradeCost,
  getManualUpgradeCost,
} from './game/rules';
import { audio } from './game/audio';
import {
  ArenaCommandRef,
  CanvasArena,
  EndOfRunSnapshot,
  GameStateMode,
  LiveHudSnapshot,
} from './components/CanvasArena';
import { TitleScreen } from './components/TitleScreen';
import { DrawerTabId, HudOverlay } from './components/HudOverlay';
import { CultivationDrawer } from './components/CultivationDrawer';
import { StatusModal } from './components/StatusModal';

export default function App() {
  const initialMode: GameStateMode = useMemo(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1') {
        return 'playing';
      }
    }
    return 'title';
  }, []);

  const [gameState, setGameState] = useState<GameStateMode>(initialMode);
  const [pathId, setPathId] = useState<CultivationPathId>('kiem_tu');
  const [realmIndex, setRealmIndex] = useState<number>(0);
  const [spiritualRootLevel, setSpiritualRootLevel] = useState<number>(1);
  const [permAttackBonus, setPermAttackBonus] = useState<number>(0);
  const [pillBreakthroughBonus, setPillBreakthroughBonus] = useState<number>(0);
  const [manuals, setManuals] = useState<ImmortalManual[]>(INITIAL_MANUALS);
  const [artifacts, setArtifacts] = useState<ImmortalArtifact[]>(INITIAL_ARTIFACTS);
  const [quests, setQuests] = useState<CultivationQuest[]>(INITIAL_QUESTS);
  const [pillsCraftedCount, setPillsCraftedCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<DrawerTabId>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [endSummary, setEndSummary] = useState<EndOfRunSnapshot | null>(null);
  const [bestKills, setBestKills] = useState<number>(0);

  const arenaCommandRef = useRef<ArenaCommandRef | null>(null);

  const computedStats = useMemo(
    () =>
      computeCultivatorStats(
        realmIndex,
        pathId,
        manuals,
        permAttackBonus,
        spiritualRootLevel,
        artifacts
      ),
    [realmIndex, pathId, manuals, permAttackBonus, spiritualRootLevel, artifacts]
  );

  const hasSpiritBeast = useMemo(
    () => artifacts.some((a) => a.category === 'linh_thu' && a.level > 0),
    [artifacts]
  );

  const breakthroughChance = useMemo(
    () =>
      calculateBreakthroughChance(
        realmIndex,
        pillBreakthroughBonus,
        computedStats.defense
      ),
    [realmIndex, pillBreakthroughBonus, computedStats.defense]
  );

  const [hud, setHud] = useState<LiveHudSnapshot>(() => ({
    hp: computedStats.maxHp,
    ghostHp: computedStats.maxHp,
    maxHp: computedStats.maxHp,
    qi: 45,
    maxQi: REALMS[0].maxQi,
    realmIndex: 0,
    wave: 1,
    kills: 0,
    spiritStones: 60,
    herbs: 5,
    beastCores: 2,
    cooldowns: { sword: 0, bell: 0, thunder: 0, dash: 0, meditate: 0 },
    shieldTimer: 0,
    tribulation: { active: false, boltsRemaining: 0, totalBolts: 0 },
    autoSword: true,
    inSpiritArray: true,
    bossHpRatio: null,
    bossName: null,
  }));

  const unclaimedQuestCount = useMemo(() => {
    const totalArtLevels = artifacts.reduce((acc, a) => acc + a.level, 0);
    return quests.filter((q) => {
      if (q.claimed) return false;
      if (q.metric === 'kills') return hud.kills >= q.targetValue;
      if (q.metric === 'pillsCrafted') return pillsCraftedCount >= q.targetValue;
      if (q.metric === 'realmIndex') return realmIndex >= q.targetValue;
      if (q.metric === 'artifactsUnlocked') return totalArtLevels >= q.targetValue;
      return false;
    }).length;
  }, [quests, hud.kills, pillsCraftedCount, realmIndex, artifacts]);

  useEffect(() => {
    document.body.dataset.state = gameState;
  }, [gameState]);

  const startGameplay = useCallback(() => {
    document.body.dataset.state = 'playing';
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setEndSummary(null);
    setActiveTab(null);
    setGameState('playing');
    arenaCommandRef.current?.resetRun();
    const canvasEl = document.querySelector('canvas');
    if (canvasEl instanceof HTMLElement) {
      canvasEl.focus();
    }
  }, []);

  const handleToggleMute = useCallback(() => {
    audio.isMuted = !audio.isMuted;
    setIsMuted(audio.isMuted);
  }, []);

  const handleRestart = useCallback(() => {
    document.body.dataset.state = 'playing';
    setEndSummary(null);
    setGameState('playing');
    arenaCommandRef.current?.resetRun();
  }, []);

  const handleGameOver = useCallback((summary: EndOfRunSnapshot) => {
    document.body.dataset.state = 'gameover';
    setBestKills((prev) => Math.max(prev, summary.enemiesSlain));
    setEndSummary(summary);
    setActiveTab(null);
    setGameState('gameover');
  }, []);

  const handleRealmAdvance = useCallback((newIdx: number) => {
    setRealmIndex(newIdx);
    setPillBreakthroughBonus(0);
  }, []);

  useEffect(() => {
    const onWindowKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        if (e.code === 'Escape') {
          (document.activeElement as HTMLElement).blur();
        }
        return;
      }

      if (gameState === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGameplay();
        }
        return;
      }

      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        if (activeTab) {
          setActiveTab(null);
          return;
        }
        setGameState((prev) => {
          const next = prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev;
          document.body.dataset.state = next;
          return next;
        });
      } else if (e.code === 'KeyM') {
        e.preventDefault();
        handleToggleMute();
      } else if (e.code === 'KeyR' && (gameState === 'playing' || gameState === 'paused')) {
        e.preventDefault();
        handleRestart();
      } else if (gameState === 'playing') {
        if (e.code === 'Digit1') {
          setActiveTab((prev) => (prev === 'dong_phu' ? null : 'dong_phu'));
        } else if (e.code === 'Digit2') {
          setActiveTab((prev) => (prev === 'dan_phong' ? null : 'dan_phong'));
        } else if (e.code === 'Digit3') {
          setActiveTab((prev) => (prev === 'phap_bao' ? null : 'phap_bao'));
        } else if (e.code === 'Digit4') {
          setActiveTab((prev) => (prev === 'tang_kinh' ? null : 'tang_kinh'));
        } else if (e.code === 'Digit5') {
          setActiveTab((prev) => (prev === 'thien_co' ? null : 'thien_co'));
        }
      }
    };

    window.addEventListener('keydown', onWindowKeyDown);
    return () => window.removeEventListener('keydown', onWindowKeyDown);
  }, [gameState, activeTab, startGameplay, handleToggleMute, handleRestart]);

  const handleUpgradeRoot = useCallback(() => {
    const cost = Math.round(35 * Math.pow(1.5, spiritualRootLevel - 1));
    if (hud.spiritStones < cost) return;
    arenaCommandRef.current?.addResources(-cost, 0, 0, 20);
    setSpiritualRootLevel((lvl) => lvl + 1);
    audio.playQiPickup();
  }, [spiritualRootLevel, hud.spiritStones]);

  const handleCraftPill = useCallback(
    (recipe: PillRecipe) => {
      if (
        !canCraftPill(recipe, {
          herbs: hud.herbs,
          beastCores: hud.beastCores,
          spiritStones: hud.spiritStones,
        })
      ) {
        return;
      }
      arenaCommandRef.current?.addResources(
        -recipe.stoneCost,
        -recipe.herbCost,
        -recipe.coreCost,
        0
      );
      arenaCommandRef.current?.consumeHealPill(recipe.hpHealRatio, recipe.qiGain);
      setPillsCraftedCount((c) => c + 1);
      if (recipe.breakthroughBonus > 0) {
        setPillBreakthroughBonus((prev) => prev + recipe.breakthroughBonus);
      }
      if (recipe.permAttackBonus > 0) {
        setPermAttackBonus((prev) => prev + recipe.permAttackBonus);
      }
    },
    [hud.herbs, hud.beastCores, hud.spiritStones]
  );

  const handleUpgradeArtifact = useCallback(
    (artifactId: string) => {
      const target = artifacts.find((a) => a.id === artifactId);
      if (!target || target.level >= target.maxLevel) return;
      const cost = getArtifactUpgradeCost(target);
      if (hud.spiritStones < cost.stoneCost || hud.beastCores < cost.coreCost) return;

      arenaCommandRef.current?.addResources(-cost.stoneCost, 0, -cost.coreCost, 25);
      setArtifacts((prev) =>
        prev.map((a) => (a.id === artifactId ? { ...a, level: a.level + 1 } : a))
      );
      audio.playBreakthroughFanfare();
    },
    [artifacts, hud.spiritStones, hud.beastCores]
  );

  const handleUpgradeManual = useCallback(
    (manualId: string) => {
      const target = manuals.find((m) => m.id === manualId);
      if (!target || target.level >= target.maxLevel) return;
      const cost = getManualUpgradeCost(target);
      if (hud.spiritStones < cost) return;

      arenaCommandRef.current?.addResources(-cost, 0, 0, 15);
      setManuals((prev) =>
        prev.map((m) => (m.id === manualId ? { ...m, level: m.level + 1 } : m))
      );
      audio.playBreakthroughFanfare();
    },
    [manuals, hud.spiritStones]
  );

  const handleAddCustomManual = useCallback((newManual: ImmortalManual) => {
    setManuals((prev) => [newManual, ...prev]);
    audio.playBreakthroughFanfare();
  }, []);

  const handleClaimQuest = useCallback(
    (questId: string) => {
      const q = quests.find((item) => item.id === questId);
      if (!q || q.claimed) return;
      arenaCommandRef.current?.addResources(
        q.rewardStones,
        q.rewardHerbs,
        q.rewardCores,
        q.rewardQi
      );
      setQuests((prev) =>
        prev.map((item) => (item.id === questId ? { ...item, claimed: true } : item))
      );
      audio.playBreakthroughFanfare();
    },
    [quests]
  );

  const handleApplyGeminiReward = useCallback(
    (stones: number, herbs: number, qi: number, breakthroughAdd: number) => {
      arenaCommandRef.current?.addResources(stones, herbs, 0, qi);
      if (breakthroughAdd > 0) {
        setPillBreakthroughBonus((prev) => prev + breakthroughAdd);
      }
      audio.playQiPickup();
    },
    []
  );

  return (
    <main className="relative w-screen h-screen overflow-hidden select-none bg-[#060a0d]">
      <CanvasArena
        gameState={gameState}
        pathId={pathId}
        computedStats={computedStats}
        hasSpiritBeast={hasSpiritBeast}
        realmIndex={realmIndex}
        breakthroughChance={breakthroughChance}
        onRealmAdvance={handleRealmAdvance}
        onHudUpdate={setHud}
        onGameOver={handleGameOver}
        commandRef={arenaCommandRef}
      />

      {gameState === 'title' && (
        <TitleScreen
          selectedPath={pathId}
          onSelectPath={setPathId}
          onStartGame={startGameplay}
        />
      )}

      {gameState !== 'title' && (
        <>
          <HudOverlay
            hud={hud}
            pathId={pathId}
            computedStats={computedStats}
            breakthroughChance={breakthroughChance}
            unclaimedQuestCount={unclaimedQuestCount}
            activeTab={activeTab}
            onSelectTab={setActiveTab}
            onTriggerSkill={(skill) => arenaCommandRef.current?.triggerSkill(skill)}
            onTriggerMeditation={() => arenaCommandRef.current?.triggerMeditationBurst()}
            onQuickHealHerb={() => arenaCommandRef.current?.quickHealHerb()}
            onSetTouchMove={(nx, ny) => arenaCommandRef.current?.setTouchMoveVector(nx, ny)}
            onStartTribulation={() => arenaCommandRef.current?.startTribulation()}
            onToggleAutoSword={() => arenaCommandRef.current?.toggleAutoSword()}
            isMuted={isMuted}
            onToggleMute={handleToggleMute}
            onPause={() => {
              document.body.dataset.state = 'paused';
              setGameState('paused');
            }}
            onRestart={handleRestart}
          />

          <CultivationDrawer
            activeTab={activeTab}
            onClose={() => setActiveTab(null)}
            hud={hud}
            pathId={pathId}
            computedStats={computedStats}
            spiritualRootLevel={spiritualRootLevel}
            breakthroughChance={breakthroughChance}
            manuals={manuals}
            artifacts={artifacts}
            quests={quests}
            pillsCraftedCount={pillsCraftedCount}
            onUpgradeRoot={handleUpgradeRoot}
            onStartTribulation={() => arenaCommandRef.current?.startTribulation()}
            onCraftPill={handleCraftPill}
            onUpgradeArtifact={handleUpgradeArtifact}
            onUpgradeManual={handleUpgradeManual}
            onAddCustomManual={handleAddCustomManual}
            onClaimQuest={handleClaimQuest}
            onApplyGeminiReward={handleApplyGeminiReward}
          />
        </>
      )}

      <StatusModal
        gameState={gameState}
        endSummary={endSummary}
        bestKills={bestKills}
        onResume={() => {
          document.body.dataset.state = 'playing';
          setGameState('playing');
        }}
        onRestart={handleRestart}
        onReturnTitle={() => {
          document.body.dataset.state = 'title';
          setActiveTab(null);
          setGameState('title');
        }}
      />
    </main>
  );
}
