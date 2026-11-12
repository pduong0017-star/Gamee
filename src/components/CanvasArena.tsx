import React, { useEffect, useRef } from 'react';
import {
  CultivationPathId,
  EnemyArchetypeId,
  ENEMY_ARCHETYPES,
  REALMS,
  applyPassiveCultivation,
  calculateDamage,
  screenToWorld,
} from '../game/rules';
import { audio } from '../game/audio';

export type GameStateMode = 'title' | 'playing' | 'paused' | 'gameover';

export interface LiveHudSnapshot {
  hp: number;
  ghostHp: number;
  maxHp: number;
  qi: number;
  maxQi: number;
  realmIndex: number;
  wave: number;
  kills: number;
  spiritStones: number;
  herbs: number;
  beastCores: number;
  cooldowns: {
    sword: number;
    bell: number;
    thunder: number;
    dash: number;
    meditate: number;
  };
  shieldTimer: number;
  tribulation: {
    active: boolean;
    boltsRemaining: number;
    totalBolts: number;
  };
  autoSword: boolean;
  inSpiritArray: boolean;
  bossHpRatio: number | null;
  bossName: string | null;
}

export interface EndOfRunSnapshot {
  outcome: 'victory' | 'defeat';
  realmReached: string;
  waveReached: number;
  enemiesSlain: number;
  clearTimeSec: number;
  spiritStonesEarned: number;
  bossHpRemainingPct: number;
}

export interface ArenaCommandRef {
  triggerSkill: (skill: 'sword' | 'bell' | 'thunder' | 'dash') => void;
  triggerMeditationBurst: () => void;
  setTouchMoveVector: (nx: number, ny: number) => void;
  startTribulation: () => void;
  consumeHealPill: (healRatio: number, qiAdd: number) => void;
  quickHealHerb: () => void;
  addResources: (stones: number, herbs: number, cores: number, qi: number) => void;
  toggleAutoSword: () => void;
  resetRun: () => void;
}

interface CanvasArenaProps {
  gameState: GameStateMode;
  pathId: CultivationPathId;
  computedStats: {
    maxHp: number;
    attack: number;
    defense: number;
    passiveQiPerSec: number;
    moveSpeed: number;
    critChancePct?: number;
    lifeStealPct?: number;
  };
  hasSpiritBeast: boolean;
  realmIndex: number;
  breakthroughChance: number;
  onRealmAdvance: (newRealmIndex: number) => void;
  onHudUpdate: (snapshot: LiveHudSnapshot) => void;
  onGameOver: (summary: EndOfRunSnapshot) => void;
  commandRef: React.MutableRefObject<ArenaCommandRef | null>;
}

interface PooledParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

interface FloatingCombatText {
  active: boolean;
  x: number;
  y: number;
  vy: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
  scale: number;
}

interface EnemyActor {
  id: number;
  archetype: EnemyArchetypeId;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
  maxHp: number;
  state: 'seek' | 'windup' | 'attack' | 'recover' | 'ko';
  stateTimer: number;
  targetX: number;
  targetY: number;
  hitFlashTimer: number;
  koTimer: number;
  orbitAngle: number;
}

interface Projectile {
  active: boolean;
  fromPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  color: string;
}

interface PickupOrb {
  active: boolean;
  kind: 'qi' | 'stone' | 'herb' | 'core';
  x: number;
  y: number;
  value: number;
  bobPhase: number;
}

interface LightningWarning {
  active: boolean;
  x: number;
  y: number;
  radius: number;
  timer: number;
  maxTimer: number;
  damage: number;
  fromTribulation: boolean;
}

const MAX_PARTICLES = 180;
const MAX_FLOATING_TEXTS = 36;
const MAX_PROJECTILES = 85;
const MAX_ORBS = 60;
const MAX_LIGHTNING = 16;
const ARENA_RADIUS = 920;

export const CanvasArena: React.FC<CanvasArenaProps> = ({
  gameState,
  pathId,
  computedStats,
  hasSpiritBeast,
  realmIndex,
  breakthroughChance,
  onRealmAdvance,
  onHudUpdate,
  onGameOver,
  commandRef,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef({
    gameState,
    pathId,
    computedStats,
    hasSpiritBeast,
    realmIndex,
    breakthroughChance,
    onRealmAdvance,
    onHudUpdate,
    onGameOver,
  });

  useEffect(() => {
    propsRef.current = {
      gameState,
      pathId,
      computedStats,
      hasSpiritBeast,
      realmIndex,
      breakthroughChance,
      onRealmAdvance,
      onHudUpdate,
      onGameOver,
    };
  }, [
    gameState,
    pathId,
    computedStats,
    hasSpiritBeast,
    realmIndex,
    breakthroughChance,
    onRealmAdvance,
    onHudUpdate,
    onGameOver,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let canvasRect = canvas.getBoundingClientRect();
    const updateSize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvasRect = canvas.getBoundingClientRect();
      const w = Math.max(320, Math.floor(canvasRect.width));
      const h = Math.max(240, Math.floor(canvasRect.height));
      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }
    };
    updateSize();
    const resizeObserver = new ResizeObserver(() => updateSize());
    resizeObserver.observe(canvas);

    // Pre-allocated Zero-GC Particle Ring Buffer
    const particles: PooledParticle[] = Array.from({ length: MAX_PARTICLES }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      size: 3,
      color: '#2ec4b6',
    }));
    let particleCursor = 0;

    const spawnParticles = (
      x: number,
      y: number,
      count: number,
      color: string,
      speedMin = 40,
      speedMax = 190,
      size = 3.5,
      life = 0.45
    ) => {
      for (let i = 0; i < count; i++) {
        const p = particles[particleCursor];
        particleCursor = (particleCursor + 1) % MAX_PARTICLES;
        const angle = Math.random() * Math.PI * 2;
        const spd = speedMin + Math.random() * (speedMax - speedMin);
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = Math.cos(angle) * spd;
        p.vy = Math.sin(angle) * spd;
        p.life = life * (0.7 + Math.random() * 0.5);
        p.maxLife = p.life;
        p.size = size;
        p.color = color;
      }
    };

    // Pre-allocated Floating Combat Numbers Pool
    const floatingTexts: FloatingCombatText[] = Array.from({ length: MAX_FLOATING_TEXTS }, () => ({
      active: false,
      x: 0,
      y: 0,
      vy: -42,
      text: '',
      color: '#ece5d5',
      life: 0,
      maxLife: 0.75,
      scale: 1,
    }));
    let floatCursor = 0;

    const spawnFloatingText = (x: number, y: number, text: string, color: string, scale = 1) => {
      const ft = floatingTexts[floatCursor];
      floatCursor = (floatCursor + 1) % MAX_FLOATING_TEXTS;
      ft.active = true;
      ft.x = x + (Math.random() * 16 - 8);
      ft.y = y - 16;
      ft.vy = -46;
      ft.text = text;
      ft.color = color;
      ft.life = 0.75;
      ft.maxLife = 0.75;
      ft.scale = scale;
    };

    const projectiles: Projectile[] = Array.from({ length: MAX_PROJECTILES }, () => ({
      active: false,
      fromPlayer: true,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: 6,
      damage: 20,
      life: 0,
      color: '#2ec4b6',
    }));
    let projCursor = 0;

    const spawnProjectile = (
      fromPlayer: boolean,
      x: number,
      y: number,
      vx: number,
      vy: number,
      damage: number,
      radius: number,
      color: string,
      life = 1.6
    ) => {
      const pr = projectiles[projCursor];
      projCursor = (projCursor + 1) % MAX_PROJECTILES;
      pr.active = true;
      pr.fromPlayer = fromPlayer;
      pr.x = x;
      pr.y = y;
      pr.vx = vx;
      pr.vy = vy;
      pr.damage = damage;
      pr.radius = radius;
      pr.color = color;
      pr.life = life;
    };

    const orbs: PickupOrb[] = Array.from({ length: MAX_ORBS }, () => ({
      active: false,
      kind: 'qi',
      x: 0,
      y: 0,
      value: 15,
      bobPhase: 0,
    }));
    let orbCursor = 0;

    const spawnOrb = (kind: PickupOrb['kind'], x: number, y: number, value: number) => {
      const o = orbs[orbCursor];
      orbCursor = (orbCursor + 1) % MAX_ORBS;
      o.active = true;
      o.kind = kind;
      o.x = x + (Math.random() * 24 - 12);
      o.y = y + (Math.random() * 24 - 12);
      o.value = value;
      o.bobPhase = Math.random() * Math.PI * 2;
    };

    const lightnings: LightningWarning[] = Array.from({ length: MAX_LIGHTNING }, () => ({
      active: false,
      x: 0,
      y: 0,
      radius: 56,
      timer: 0,
      maxTimer: 0.65,
      damage: 40,
      fromTribulation: false,
    }));
    let lightningCursor = 0;

    const spawnLightning = (
      x: number,
      y: number,
      radius: number,
      delay: number,
      damage: number,
      fromTribulation: boolean
    ) => {
      const l = lightnings[lightningCursor];
      lightningCursor = (lightningCursor + 1) % MAX_LIGHTNING;
      l.active = true;
      l.x = x;
      l.y = y;
      l.radius = radius;
      l.timer = delay;
      l.maxTimer = delay;
      l.damage = damage;
      l.fromTribulation = fromTribulation;
    };

    const player = {
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      touchNx: 0,
      touchNy: 0,
      facingAngle: 0,
      hp: propsRef.current.computedStats.maxHp,
      ghostHp: propsRef.current.computedStats.maxHp,
      qi: 45,
      scaleX: 1,
      scaleY: 1,
      gaitDist: 0,
      hitFlash: 0,
      invulnTimer: 0,
      shieldTimer: 0,
      autoSword: true,
      autoFireTimer: 0,
      spiritBeastTimer: 1.2,
      cooldowns: {
        sword: 0,
        bell: 0,
        thunder: 0,
        dash: 0,
        meditate: 0,
      },
      dashBuffer: 0,
      swordBuffer: 0,
    };

    const runState = {
      wave: 1,
      kills: 0,
      spiritStones: 60,
      herbs: 5,
      beastCores: 2,
      elapsedTime: 0,
      spawnTimer: 1.5,
      waveKillsTarget: 6,
      waveKillsCurrent: 0,
      hitstopTimer: 0,
      cameraX: 0,
      cameraY: 0,
      cameraTrauma: 0,
      titlePanAngle: 0,
      defeatDelayTimer: 0,
      isDefeatPending: false,
      tribulation: {
        active: false,
        boltsRemaining: 0,
        totalBolts: 0,
        boltIntervalTimer: 0,
      },
    };

    let enemies: EnemyActor[] = [];
    let nextEnemyId = 1;

    const landmarks = Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2 + (i % 3) * 0.2;
      const dist = 250 + (i % 4) * 165;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        kind: i % 3 === 0 ? 'stone_pillar' : i % 3 === 1 ? 'jade_rock' : 'spirit_pine',
        size: 26 + (i % 3) * 10,
      };
    });

    const spawnEnemyWaveActor = (forceBoss = false) => {
      const angle = Math.random() * Math.PI * 2;
      const spawnDist = 360 + Math.random() * 160;
      const ex = Math.max(-ARENA_RADIUS + 60, Math.min(ARENA_RADIUS - 60, player.x + Math.cos(angle) * spawnDist));
      const ey = Math.max(-ARENA_RADIUS + 60, Math.min(ARENA_RADIUS - 60, player.y + Math.sin(angle) * spawnDist));

      let archId: EnemyArchetypeId = 'huyet_lang';
      if (forceBoss) {
        archId = 'yeu_vuong';
      } else {
        const roll = Math.random();
        if (runState.wave >= 2 && roll > 0.68) {
          archId = 'hac_hung';
        } else if (roll > 0.36) {
          archId = 'huyen_xa';
        }
      }

      const cfg = ENEMY_ARCHETYPES[archId];
      const waveScale = 1 + (runState.wave - 1) * 0.22 + propsRef.current.realmIndex * 0.25;

      enemies.push({
        id: nextEnemyId++,
        archetype: archId,
        x: ex,
        y: ey,
        vx: 0,
        vy: 0,
        hp: Math.round(cfg.baseHp * waveScale),
        maxHp: Math.round(cfg.baseHp * waveScale),
        state: 'seek',
        stateTimer: 0,
        targetX: player.x,
        targetY: player.y,
        hitFlashTimer: 0,
        koTimer: 0,
        orbitAngle: Math.random() * Math.PI * 2,
      });
    };

    const resetSimulation = () => {
      const stats = propsRef.current.computedStats;
      player.x = 0;
      player.y = 0;
      player.vx = 0;
      player.vy = 0;
      player.touchNx = 0;
      player.touchNy = 0;
      player.hp = stats.maxHp;
      player.ghostHp = stats.maxHp;
      player.qi = Math.min(player.qi, REALMS[propsRef.current.realmIndex].maxQi);
      player.invulnTimer = 1.2;
      player.shieldTimer = 0;
      player.hitFlash = 0;
      player.cooldowns = { sword: 0, bell: 0, thunder: 0, dash: 0, meditate: 0 };

      runState.wave = 1;
      runState.kills = 0;
      runState.elapsedTime = 0;
      runState.spawnTimer = 1.2;
      runState.waveKillsCurrent = 0;
      runState.waveKillsTarget = 6;
      runState.cameraX = 0;
      runState.cameraY = 0;
      runState.cameraTrauma = 0;
      runState.isDefeatPending = false;
      runState.defeatDelayTimer = 0;
      runState.tribulation = { active: false, boltsRemaining: 0, totalBolts: 0, boltIntervalTimer: 0 };

      enemies = [];
      for (const p of projectiles) p.active = false;
      for (const o of orbs) o.active = false;
      for (const l of lightnings) l.active = false;
      for (const ft of floatingTexts) ft.active = false;

      spawnOrb('qi', 95, -55, 35);
      spawnOrb('qi', -95, 65, 35);
      spawnOrb('herb', 130, 80, 1);
      spawnEnemyWaveActor(false);
      spawnEnemyWaveActor(false);
    };

    const keysHeld = new Set<string>();
    const keysJustPressed = new Set<string>();
    let mouseWorldX = 120;
    let mouseWorldY = 0;
    let mouseHeld = false;

    const clearAllInputs = () => {
      keysHeld.clear();
      keysJustPressed.clear();
      mouseHeld = false;
      player.touchNx = 0;
      player.touchNy = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement &&
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)
      ) {
        return;
      }
      const code = e.code;
      if (!keysHeld.has(code)) {
        keysJustPressed.add(code);
      }
      keysHeld.add(code);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.delete(e.code);
    };

    const onMouseMove = (e: MouseEvent) => {
      const proj = screenToWorld(
        e.clientX,
        e.clientY,
        canvasRect,
        runState.cameraX,
        runState.cameraY
      );
      mouseWorldX = proj.worldX;
      mouseWorldY = proj.worldY;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (propsRef.current.gameState !== 'playing') return;
      const proj = screenToWorld(
        e.clientX,
        e.clientY,
        canvasRect,
        runState.cameraX,
        runState.cameraY
      );
      mouseWorldX = proj.worldX;
      mouseWorldY = proj.worldY;
      mouseHeld = true;
      player.swordBuffer = 0.12;
    };

    const onMouseUp = () => {
      mouseHeld = false;
    };

    const onVisibilityChange = () => {
      if (document.hidden) clearAllInputs();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearAllInputs);
    document.addEventListener('visibilitychange', onVisibilityChange);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);

    const applyDamageToEnemy = (en: EnemyActor, baseDamage: number) => {
      const stats = propsRef.current.computedStats;
      const critChance = stats.critChancePct ?? 12;
      const isCrit = Math.random() * 100 < critChance;
      const raw = calculateDamage(baseDamage, 8, isCrit ? 1.75 : 1.0);
      en.hp -= raw;
      en.hitFlashTimer = 0.07;

      spawnFloatingText(
        en.x,
        en.y - 12,
        isCrit ? `BẠO KÍCH -${raw}` : `-${raw}`,
        isCrit ? '#e9c46a' : '#ece5d5',
        isCrit ? 1.22 : 1.0
      );

      // Life steal recovery
      const lifeSteal = stats.lifeStealPct ?? 0;
      if (lifeSteal > 0 && player.hp < stats.maxHp) {
        const heal = Math.max(1, Math.round((raw * lifeSteal) / 100));
        player.hp = Math.min(stats.maxHp, player.hp + heal);
      }

      if (en.hp <= 0 && en.state !== 'ko') {
        en.state = 'ko';
        en.koTimer = 0.34;
      }
    };

    const fireSwordQi = (aimAngle?: number) => {
      const stats = propsRef.current.computedStats;
      let targetAngle = aimAngle;
      if (targetAngle === undefined) {
        let nearestDist = 480;
        let nearestEnemy: EnemyActor | null = null;
        for (const en of enemies) {
          if (en.state === 'ko') continue;
          const d = Math.hypot(en.x - player.x, en.y - player.y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestEnemy = en;
          }
        }
        if (nearestEnemy) {
          targetAngle = Math.atan2(nearestEnemy.y - player.y, nearestEnemy.x - player.x);
        } else {
          targetAngle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);
        }
      }

      player.facingAngle = targetAngle;
      player.cooldowns.sword = 0.28;
      player.scaleX = 1.15;
      player.scaleY = 0.87;
      audio.playSwordSlash();

      const speed = 590;
      const spreads = [-0.14, 0, 0.14];
      for (const sp of spreads) {
        const ang = targetAngle + sp;
        spawnProjectile(
          true,
          player.x + Math.cos(ang) * 20,
          player.y + Math.sin(ang) * 20,
          Math.cos(ang) * speed,
          Math.sin(ang) * speed,
          Math.round(stats.attack * (sp === 0 ? 1.15 : 0.78)),
          sp === 0 ? 8.5 : 6.5,
          '#2ec4b6',
          1.2
        );
      }
      spawnParticles(
        player.x + Math.cos(targetAngle) * 22,
        player.y + Math.sin(targetAngle) * 22,
        6,
        '#a8dadc',
        50,
        160,
        3,
        0.28
      );
    };

    const castSacredBell = () => {
      if (player.cooldowns.bell > 0) return;
      const stats = propsRef.current.computedStats;
      player.cooldowns.bell = 5.5;
      player.shieldTimer = 3.8;
      runState.cameraTrauma = Math.min(1, runState.cameraTrauma + 0.35);
      runState.hitstopTimer = 0.045;
      audio.playHeavyBell();
      spawnFloatingText(player.x, player.y - 24, 'KIM CHUNG HỘ THỂ!', '#e9c46a', 1.15);
      spawnParticles(player.x, player.y, 24, '#e9c46a', 90, 280, 4.5, 0.55);

      for (const en of enemies) {
        if (en.state === 'ko') continue;
        const dx = en.x - player.x;
        const dy = en.y - player.y;
        const dist = Math.hypot(dx, dy);
        if (dist <= 220) {
          applyDamageToEnemy(en, Math.round(stats.attack * 1.85));
          const pushAngle = Math.atan2(dy, dx);
          en.vx += Math.cos(pushAngle) * 320;
          en.vy += Math.sin(pushAngle) * 320;
        }
      }
    };

    const castNineHeavensThunder = () => {
      if (player.cooldowns.thunder > 0) return;
      const stats = propsRef.current.computedStats;
      player.cooldowns.thunder = 7.0;
      audio.playThunderStrike();
      runState.cameraTrauma = Math.min(1, runState.cameraTrauma + 0.45);
      spawnFloatingText(player.x, player.y - 26, 'CỬU THIÊN THẦN LÔI!', '#4cc9f0', 1.2);

      const liveEnemies = enemies.filter((e) => e.state !== 'ko');
      for (let i = 0; i < 5; i++) {
        let tx = player.x + (Math.random() * 340 - 170);
        let ty = player.y + (Math.random() * 340 - 170);
        if (liveEnemies[i % liveEnemies.length]) {
          const target = liveEnemies[i % liveEnemies.length];
          tx = target.x;
          ty = target.y;
        }
        spawnLightning(tx, ty, 82, 0.18 + i * 0.09, Math.round(stats.attack * 2.2), false);
      }
    };

    const castSpiritDash = () => {
      if (player.cooldowns.dash > 0) return;
      player.cooldowns.dash = 1.35;
      player.invulnTimer = Math.max(player.invulnTimer, 0.4);
      player.scaleX = 0.82;
      player.scaleY = 1.22;

      let moveX = player.touchNx;
      let moveY = player.touchNy;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) moveY -= 1;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) moveY += 1;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) moveX -= 1;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) moveX += 1;

      const dashAngle =
        Math.hypot(moveX, moveY) > 0.1
          ? Math.atan2(moveY, moveX)
          : Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);

      spawnParticles(player.x, player.y, 14, '#2ec4b6', 40, 140, 4, 0.35);
      player.x = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, player.x + Math.cos(dashAngle) * 150));
      player.y = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, player.y + Math.sin(dashAngle) * 150));
      spawnParticles(player.x, player.y, 14, '#e9c46a', 60, 180, 4, 0.35);
      audio.playSwordSlash();
    };

    const castMeditationBurst = () => {
      if (player.cooldowns.meditate > 0) return;
      const realm = REALMS[propsRef.current.realmIndex];
      const stats = propsRef.current.computedStats;
      player.cooldowns.meditate = 8.0;
      const qiGain = Math.round(realm.maxQi * 0.32);
      const hpHeal = Math.round(stats.maxHp * 0.25);
      player.qi = Math.min(realm.maxQi, player.qi + qiGain);
      player.hp = Math.min(stats.maxHp, player.hp + hpHeal);
      audio.playQiPickup();
      spawnFloatingText(player.x, player.y - 24, `TỤ KHÍ +${qiGain} TU VI`, '#2ec4b6', 1.18);
      spawnParticles(player.x, player.y, 22, '#2ec4b6', 60, 220, 4, 0.55);
    };

    const castQuickHerbHeal = () => {
      if (runState.herbs < 1) {
        spawnFloatingText(player.x, player.y - 20, 'HẾT LINH THẢO!', '#e63946', 1.0);
        return;
      }
      const stats = propsRef.current.computedStats;
      const realm = REALMS[propsRef.current.realmIndex];
      runState.herbs -= 1;
      const healAmt = Math.round(stats.maxHp * 0.35);
      player.hp = Math.min(stats.maxHp, player.hp + healAmt);
      player.qi = Math.min(realm.maxQi, player.qi + 40);
      audio.playQiPickup();
      spawnFloatingText(player.x, player.y - 22, `PHỤC ĐAN +${healAmt} HUYẾT`, '#52b788', 1.15);
      spawnParticles(player.x, player.y, 16, '#52b788', 50, 160, 4, 0.45);
    };

    const triggerTribulation = () => {
      const currentRealm = REALMS[propsRef.current.realmIndex];
      if (!currentRealm) return;
      if (runState.tribulation.active) return;
      if (player.qi < currentRealm.maxQi) return;

      runState.tribulation.active = true;
      runState.tribulation.totalBolts = currentRealm.tribulationBolts;
      runState.tribulation.boltsRemaining = currentRealm.tribulationBolts;
      runState.tribulation.boltIntervalTimer = 0.35;
      audio.playThunderStrike();
      spawnFloatingText(player.x, player.y - 30, 'CỬU TRỌNG LÔI KIẾP GIÁNG LÂM!', '#e0aaff', 1.25);
      spawnParticles(player.x, player.y, 28, '#e9c46a', 80, 260, 4.5, 0.65);
    };

    commandRef.current = {
      triggerSkill: (skill) => {
        if (skill === 'sword') player.swordBuffer = 0.14;
        if (skill === 'bell') castSacredBell();
        if (skill === 'thunder') castNineHeavensThunder();
        if (skill === 'dash') player.dashBuffer = 0.14;
      },
      triggerMeditationBurst: () => {
        castMeditationBurst();
      },
      setTouchMoveVector: (nx, ny) => {
        player.touchNx = nx;
        player.touchNy = ny;
      },
      startTribulation: () => {
        triggerTribulation();
      },
      consumeHealPill: (healRatio, qiAdd) => {
        const stats = propsRef.current.computedStats;
        const realm = REALMS[propsRef.current.realmIndex];
        const healAmt = Math.round(stats.maxHp * healRatio);
        player.hp = Math.min(stats.maxHp, player.hp + healAmt);
        player.qi = Math.min(realm.maxQi, player.qi + qiAdd);
        audio.playQiPickup();
        spawnFloatingText(player.x, player.y - 24, `LINH ĐAN +${qiAdd} TU VI`, '#52b788', 1.15);
        spawnParticles(player.x, player.y, 18, '#52b788', 50, 170, 4, 0.5);
      },
      quickHealHerb: () => {
        castQuickHerbHeal();
      },
      addResources: (stones, herbs, cores, qi) => {
        const realm = REALMS[propsRef.current.realmIndex];
        runState.spiritStones += stones;
        runState.herbs += herbs;
        runState.beastCores += cores;
        player.qi = Math.min(realm.maxQi, player.qi + qi);
        spawnParticles(player.x, player.y, 20, '#e9c46a', 60, 200, 4, 0.55);
      },
      toggleAutoSword: () => {
        player.autoSword = !player.autoSword;
      },
      resetRun: () => {
        clearAllInputs();
        resetSimulation();
      },
    };

    resetSimulation();

    let lastTime = performance.now();
    let hudSyncTimer = 0;
    let rafId = 0;

    const handleEnemyDefeated = (en: EnemyActor) => {
      const cfg = ENEMY_ARCHETYPES[en.archetype];
      runState.kills += 1;
      runState.waveKillsCurrent += 1;
      runState.hitstopTimer = en.archetype === 'yeu_vuong' ? 0.075 : 0.035;
      runState.cameraTrauma = Math.min(1, runState.cameraTrauma + (en.archetype === 'yeu_vuong' ? 0.55 : 0.2));

      spawnParticles(en.x, en.y, en.archetype === 'yeu_vuong' ? 28 : 16, cfg.accentColor, 70, 240, 4.2, 0.55);
      spawnOrb('qi', en.x, en.y, cfg.qiDrop);
      spawnOrb('stone', en.x, en.y, cfg.stoneDrop);
      if (Math.random() < 0.45) {
        spawnOrb('herb', en.x, en.y, 1);
      }
      if (en.archetype === 'yeu_vuong' || Math.random() < 0.28) {
        spawnOrb('core', en.x, en.y, en.archetype === 'yeu_vuong' ? 3 : 1);
      }

      if (en.archetype === 'yeu_vuong' && runState.wave >= 3) {
        audio.playBreakthroughFanfare();
        propsRef.current.onGameOver({
          outcome: 'victory',
          realmReached: REALMS[propsRef.current.realmIndex].name,
          waveReached: runState.wave,
          enemiesSlain: runState.kills,
          clearTimeSec: Math.max(1, Math.round(runState.elapsedTime)),
          spiritStonesEarned: runState.spiritStones,
          bossHpRemainingPct: 0,
        });
      }
    };

    const stepSimulation = (rawDt: number) => {
      const dt = Math.min(rawDt, 0.05);
      const mode = propsRef.current.gameState;
      const stats = propsRef.current.computedStats;
      const currentRealm = REALMS[propsRef.current.realmIndex];

      runState.cameraTrauma = Math.max(0, runState.cameraTrauma - dt * 1.85);
      player.hitFlash = Math.max(0, player.hitFlash - dt);
      player.ghostHp += (player.hp - player.ghostHp) * Math.min(1, dt * 4.5);

      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.94;
        p.vy *= 0.94;
      }

      for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
        const ft = floatingTexts[i];
        if (!ft.active) continue;
        ft.life -= dt;
        if (ft.life <= 0) {
          ft.active = false;
          continue;
        }
        ft.y += ft.vy * dt;
      }

      if (mode === 'title') {
        runState.titlePanAngle += dt * 0.28;
        runState.cameraX = Math.cos(runState.titlePanAngle) * 140;
        runState.cameraY = Math.sin(runState.titlePanAngle * 0.7) * 90;
        keysJustPressed.clear();
        return;
      }

      if (mode !== 'playing') {
        keysJustPressed.clear();
        return;
      }

      if (runState.isDefeatPending) {
        runState.defeatDelayTimer -= dt;
        if (runState.defeatDelayTimer <= 0) {
          runState.isDefeatPending = false;
          const boss = enemies.find((e) => e.archetype === 'yeu_vuong' && e.state !== 'ko');
          const bossPct = boss ? Math.max(1, Math.round((boss.hp / boss.maxHp) * 100)) : 0;
          propsRef.current.onGameOver({
            outcome: 'defeat',
            realmReached: currentRealm.name,
            waveReached: runState.wave,
            enemiesSlain: runState.kills,
            clearTimeSec: Math.max(1, Math.round(runState.elapsedTime)),
            spiritStonesEarned: runState.spiritStones,
            bossHpRemainingPct: bossPct,
          });
        }
        return;
      }

      if (runState.hitstopTimer > 0) {
        runState.hitstopTimer -= dt;
        return;
      }

      const simDt = dt;
      runState.elapsedTime += simDt;

      player.cooldowns.sword = Math.max(0, player.cooldowns.sword - simDt);
      player.cooldowns.bell = Math.max(0, player.cooldowns.bell - simDt);
      player.cooldowns.thunder = Math.max(0, player.cooldowns.thunder - simDt);
      player.cooldowns.dash = Math.max(0, player.cooldowns.dash - simDt);
      player.cooldowns.meditate = Math.max(0, player.cooldowns.meditate - simDt);
      player.invulnTimer = Math.max(0, player.invulnTimer - simDt);
      player.shieldTimer = Math.max(0, player.shieldTimer - simDt);
      player.dashBuffer = Math.max(0, player.dashBuffer - simDt);
      player.swordBuffer = Math.max(0, player.swordBuffer - simDt);

      player.scaleX += (1 - player.scaleX) * Math.min(1, simDt * 12);
      player.scaleY += (1 - player.scaleY) * Math.min(1, simDt * 12);

      if (keysJustPressed.has('Space')) player.dashBuffer = 0.14;
      if (keysJustPressed.has('KeyJ')) player.swordBuffer = 0.14;
      if (keysJustPressed.has('KeyK')) castSacredBell();
      if (keysJustPressed.has('KeyL')) castNineHeavensThunder();
      if (keysJustPressed.has('KeyB')) triggerTribulation();
      if (keysJustPressed.has('KeyH')) castQuickHerbHeal();
      if (keysJustPressed.has('KeyG')) castMeditationBurst();
      if (keysJustPressed.has('KeyF')) player.autoSword = !player.autoSword;
      keysJustPressed.clear();

      if (player.dashBuffer > 0 && player.cooldowns.dash <= 0) {
        player.dashBuffer = 0;
        castSpiritDash();
      }

      if ((player.swordBuffer > 0 || mouseHeld) && player.cooldowns.sword <= 0) {
        player.swordBuffer = 0;
        const aimAng = mouseHeld
          ? Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x)
          : undefined;
        fireSwordQi(aimAng);
      }

      player.autoFireTimer -= simDt;
      if (player.autoSword && player.autoFireTimer <= 0 && player.cooldowns.sword <= 0) {
        const hasNearby = enemies.some(
          (en) => en.state !== 'ko' && Math.hypot(en.x - player.x, en.y - player.y) < 400
        );
        if (hasNearby) {
          player.autoFireTimer = 0.52;
          fireSwordQi(undefined);
        }
      }

      // Spirit Beast (Huyền Hỏa Kỳ Lân) autonomous True Flame attack
      if (propsRef.current.hasSpiritBeast) {
        player.spiritBeastTimer -= simDt;
        if (player.spiritBeastTimer <= 0) {
          const target = enemies.find(
            (en) => en.state !== 'ko' && Math.hypot(en.x - player.x, en.y - player.y) < 420
          );
          if (target) {
            player.spiritBeastTimer = 1.65;
            const beastX = player.x + Math.cos(runState.elapsedTime * 2.1) * 46;
            const beastY = player.y + Math.sin(runState.elapsedTime * 2.1) * 46;
            const ang = Math.atan2(target.y - beastY, target.x - beastX);
            spawnProjectile(
              true,
              beastX,
              beastY,
              Math.cos(ang) * 480,
              Math.sin(ang) * 480,
              Math.round(stats.attack * 1.35),
              9,
              '#f72585',
              1.4
            );
          }
        }
      }

      // Combine Keyboard WASD + Mobile Landscape Virtual Joystick
      let ix = player.touchNx;
      let iy = player.touchNy;
      if (keysHeld.has('KeyW') || keysHeld.has('ArrowUp')) iy -= 1;
      if (keysHeld.has('KeyS') || keysHeld.has('ArrowDown')) iy += 1;
      if (keysHeld.has('KeyA') || keysHeld.has('ArrowLeft')) ix -= 1;
      if (keysHeld.has('KeyD') || keysHeld.has('ArrowRight')) ix += 1;

      if (Math.hypot(ix, iy) > 0.05) {
        const len = Math.max(1, Math.hypot(ix, iy));
        ix /= len;
        iy /= len;
        player.vx = ix * stats.moveSpeed;
        player.vy = iy * stats.moveSpeed;
        player.facingAngle = Math.atan2(iy, ix);
      } else {
        player.vx *= 0.8;
        player.vy *= 0.8;
      }

      player.x = Math.max(-ARENA_RADIUS + 36, Math.min(ARENA_RADIUS - 36, player.x + player.vx * simDt));
      player.y = Math.max(-ARENA_RADIUS + 36, Math.min(ARENA_RADIUS - 36, player.y + player.vy * simDt));
      player.gaitDist += Math.hypot(player.vx, player.vy) * simDt * 0.045;

      runState.cameraX += (player.x - runState.cameraX) * Math.min(1, simDt * 8.5);
      runState.cameraY += (player.y - runState.cameraY) * Math.min(1, simDt * 8.5);

      const inSpiritArray = Math.hypot(player.x, player.y) <= 155;
      const effectiveQiRate = stats.passiveQiPerSec * (inSpiritArray ? 1.5 : 1.0);
      player.qi = applyPassiveCultivation(player.qi, currentRealm.maxQi, effectiveQiRate, simDt);

      // Heavenly Lightning Tribulation (Độ Kiếp)
      if (runState.tribulation.active) {
        runState.tribulation.boltIntervalTimer -= simDt;
        if (runState.tribulation.boltIntervalTimer <= 0 && runState.tribulation.boltsRemaining > 0) {
          runState.tribulation.boltsRemaining -= 1;
          runState.tribulation.boltIntervalTimer = 0.92;
          const offsetAng = Math.random() * Math.PI * 2;
          const offsetDist = Math.random() * 55;
          spawnLightning(
            player.x + Math.cos(offsetAng) * offsetDist,
            player.y + Math.sin(offsetAng) * offsetDist,
            68,
            0.65,
            Math.round(stats.maxHp * 0.2),
            true
          );
        } else if (
          runState.tribulation.boltsRemaining === 0 &&
          !lightnings.some((l) => l.active && l.fromTribulation)
        ) {
          runState.tribulation.active = false;
          const nextIdx = Math.min(REALMS.length - 1, propsRef.current.realmIndex + 1);
          player.qi = 0;
          propsRef.current.onRealmAdvance(nextIdx);
          player.hp = REALMS[nextIdx].baseMaxHp;
          player.ghostHp = player.hp;
          audio.playBreakthroughFanfare();
          spawnFloatingText(
            player.x,
            player.y - 34,
            `ĐỘT PHÁ: ${REALMS[nextIdx].name.toUpperCase()}!`,
            '#e9c46a',
            1.35
          );
          spawnParticles(player.x, player.y, 38, '#e9c46a', 90, 310, 5, 0.85);
        }
      }

      for (let i = 0; i < MAX_LIGHTNING; i++) {
        const l = lightnings[i];
        if (!l.active) continue;
        l.timer -= simDt;
        if (l.timer <= 0) {
          l.active = false;
          audio.playThunderStrike();
          runState.cameraTrauma = Math.min(1, runState.cameraTrauma + 0.32);
          spawnParticles(l.x, l.y, 20, l.fromTribulation ? '#c77dff' : '#4cc9f0', 80, 260, 4.5, 0.45);

          if (l.fromTribulation) {
            const pDist = Math.hypot(player.x - l.x, player.y - l.y);
            if (pDist <= l.radius && player.invulnTimer <= 0) {
              const mitigated = player.shieldTimer > 0 ? Math.round(l.damage * 0.35) : l.damage;
              player.hp = Math.max(0, player.hp - mitigated);
              player.hitFlash = 0.12;
              player.invulnTimer = 0.45;
              audio.playHurt();
              spawnFloatingText(player.x, player.y - 18, `LÔI KIẾP -${mitigated}`, '#e0aaff', 1.15);
            }
          } else {
            for (const en of enemies) {
              if (en.state === 'ko') continue;
              const enRadius = ENEMY_ARCHETYPES[en.archetype].radius;
              if (Math.hypot(en.x - l.x, en.y - l.y) <= l.radius + enRadius) {
                applyDamageToEnemy(en, l.damage);
              }
            }
          }
        }
      }

      for (let i = 0; i < MAX_PROJECTILES; i++) {
        const pr = projectiles[i];
        if (!pr.active) continue;
        pr.life -= simDt;
        if (pr.life <= 0) {
          pr.active = false;
          continue;
        }
        pr.x += pr.vx * simDt;
        pr.y += pr.vy * simDt;

        if (pr.fromPlayer) {
          for (const en of enemies) {
            if (en.state === 'ko') continue;
            const cfg = ENEMY_ARCHETYPES[en.archetype];
            if (Math.hypot(en.x - pr.x, en.y - pr.y) <= cfg.radius + pr.radius) {
              pr.active = false;
              applyDamageToEnemy(en, pr.damage);
              const knockAng = Math.atan2(pr.vy, pr.vx);
              en.vx += Math.cos(knockAng) * 85;
              en.vy += Math.sin(knockAng) * 85;
              spawnParticles(pr.x, pr.y, 5, pr.color, 40, 140, 3, 0.25);
              break;
            }
          }
        } else {
          if (Math.hypot(player.x - pr.x, player.y - pr.y) <= 18 + pr.radius) {
            pr.active = false;
            if (player.invulnTimer <= 0) {
              const rawDmg = calculateDamage(pr.damage, stats.defense, player.shieldTimer > 0 ? 0.35 : 1.0);
              player.hp = Math.max(0, player.hp - rawDmg);
              player.hitFlash = 0.1;
              player.invulnTimer = 0.4;
              runState.cameraTrauma = Math.min(1, runState.cameraTrauma + 0.22);
              audio.playHurt();
              spawnFloatingText(player.x, player.y - 16, `-${rawDmg}`, '#e63946', 1.05);
              spawnParticles(player.x, player.y, 10, '#e63946', 50, 160, 3.5, 0.35);
            }
          }
        }
      }

      runState.spawnTimer -= simDt;
      const activeEnemyCount = enemies.filter((e) => e.state !== 'ko').length;
      const maxConcurrentEnemies = Math.min(9, 3 + runState.wave * 2);
      if (runState.spawnTimer <= 0 && activeEnemyCount < maxConcurrentEnemies) {
        runState.spawnTimer = Math.max(1.6, 3.5 - runState.wave * 0.25);
        spawnEnemyWaveActor(false);
      }

      if (runState.waveKillsCurrent >= runState.waveKillsTarget) {
        runState.wave += 1;
        runState.waveKillsCurrent = 0;
        runState.waveKillsTarget = 6 + runState.wave * 2;
        spawnFloatingText(player.x, player.y - 32, `BÍ CẢNH TẦNG ${runState.wave}`, '#d4af6a', 1.25);
        if (runState.wave % 2 === 0 && !enemies.some((e) => e.archetype === 'yeu_vuong' && e.state !== 'ko')) {
          spawnEnemyWaveActor(true);
        }
      }

      let activeAttackers = enemies.filter((e) => e.state === 'windup' || e.state === 'attack').length;
      const MAX_ATTACK_TOKENS = 3;

      for (let i = enemies.length - 1; i >= 0; i--) {
        const en = enemies[i];
        const cfg = ENEMY_ARCHETYPES[en.archetype];
        en.hitFlashTimer = Math.max(0, en.hitFlashTimer - simDt);

        if (en.state === 'ko') {
          en.koTimer -= simDt;
          en.x += en.vx * simDt;
          en.y += en.vy * simDt;
          en.vx *= 0.88;
          en.vy *= 0.88;
          if (en.koTimer <= 0) {
            handleEnemyDefeated(en);
            enemies.splice(i, 1);
          }
          continue;
        }

        const dx = player.x - en.x;
        const dy = player.y - en.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const dirX = dx / dist;
        const dirY = dy / dist;

        if (en.state === 'seek') {
          if (cfg.policy === 'swarmer') {
            en.vx = dirX * cfg.speed;
            en.vy = dirY * cfg.speed;
          } else if (cfg.policy === 'kiter') {
            if (dist < cfg.preferredRange - 40) {
              en.vx = -dirX * cfg.speed * 0.85;
              en.vy = -dirY * cfg.speed * 0.85;
            } else if (dist > cfg.preferredRange + 40) {
              en.vx = dirX * cfg.speed;
              en.vy = dirY * cfg.speed;
            } else {
              en.vx = -dirY * cfg.speed * 0.75;
              en.vy = dirX * cfg.speed * 0.75;
            }
          } else if (cfg.policy === 'charger') {
            en.vx = dirX * cfg.speed;
            en.vy = dirY * cfg.speed;
          } else if (cfg.policy === 'boss_orbiter') {
            en.orbitAngle += simDt * 1.15;
            const desiredX = player.x + Math.cos(en.orbitAngle) * cfg.preferredRange;
            const desiredY = player.y + Math.sin(en.orbitAngle) * cfg.preferredRange;
            const bdx = desiredX - en.x;
            const bdy = desiredY - en.y;
            const bLen = Math.max(1, Math.hypot(bdx, bdy));
            en.vx = (bdx / bLen) * cfg.speed;
            en.vy = (bdy / bLen) * cfg.speed;
          }

          en.x = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, en.x + en.vx * simDt));
          en.y = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, en.y + en.vy * simDt));

          if (dist <= cfg.preferredRange + 28 && activeAttackers < MAX_ATTACK_TOKENS) {
            en.state = 'windup';
            en.stateTimer = cfg.windupDuration;
            en.targetX = player.x;
            en.targetY = player.y;
            activeAttackers += 1;
          }
        } else if (en.state === 'windup') {
          en.vx *= 0.75;
          en.vy *= 0.75;
          en.stateTimer -= simDt;
          if (cfg.policy === 'kiter' || cfg.policy === 'boss_orbiter') {
            if (en.stateTimer > cfg.windupDuration * 0.35) {
              en.targetX = player.x;
              en.targetY = player.y;
            }
          }
          if (en.stateTimer <= 0) {
            en.state = 'attack';
            en.stateTimer = 0.25;
            const atkAng = Math.atan2(en.targetY - en.y, en.targetX - en.x);

            if (cfg.policy === 'swarmer') {
              en.vx = Math.cos(atkAng) * 310;
              en.vy = Math.sin(atkAng) * 310;
            } else if (cfg.policy === 'charger') {
              en.vx = Math.cos(atkAng) * 440;
              en.vy = Math.sin(atkAng) * 440;
            } else if (cfg.policy === 'kiter') {
              spawnProjectile(
                false,
                en.x,
                en.y,
                Math.cos(atkAng) * 340,
                Math.sin(atkAng) * 340,
                cfg.baseDamage,
                7,
                '#52b788',
                1.8
              );
            } else if (cfg.policy === 'boss_orbiter') {
              for (let k = -2; k <= 2; k++) {
                const bAng = atkAng + k * 0.24;
                spawnProjectile(
                  false,
                  en.x,
                  en.y,
                  Math.cos(bAng) * 320,
                  Math.sin(bAng) * 320,
                  cfg.baseDamage,
                  9,
                  '#f72585',
                  2.0
                );
              }
              spawnLightning(player.x, player.y, 64, 0.65, cfg.baseDamage, true);
            }
          }
        } else if (en.state === 'attack') {
          en.x = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, en.x + en.vx * simDt));
          en.y = Math.max(-ARENA_RADIUS + 40, Math.min(ARENA_RADIUS - 40, en.y + en.vy * simDt));
          en.stateTimer -= simDt;

          if (
            (cfg.policy === 'swarmer' || cfg.policy === 'charger') &&
            Math.hypot(player.x - en.x, player.y - en.y) <= cfg.radius + 18 &&
            player.invulnTimer <= 0
          ) {
            const dmg = calculateDamage(cfg.baseDamage, stats.defense, player.shieldTimer > 0 ? 0.35 : 1.0);
            player.hp = Math.max(0, player.hp - dmg);
            player.hitFlash = 0.12;
            player.invulnTimer = 0.5;
            runState.hitstopTimer = 0.04;
            runState.cameraTrauma = Math.min(1, runState.cameraTrauma + 0.28);
            audio.playHurt();
            spawnFloatingText(player.x, player.y - 18, `-${dmg}`, '#e63946', 1.1);
            spawnParticles(player.x, player.y, 12, '#e63946', 60, 190, 4, 0.4);
          }

          if (en.stateTimer <= 0) {
            en.state = 'recover';
            en.stateTimer = 0.55;
            en.vx = 0;
            en.vy = 0;
          }
        } else if (en.state === 'recover') {
          en.stateTimer -= simDt;
          if (en.stateTimer <= 0) {
            en.state = 'seek';
          }
        }
      }

      for (let i = 0; i < MAX_ORBS; i++) {
        const o = orbs[i];
        if (!o.active) continue;
        o.bobPhase += simDt * 4;
        const dx = player.x - o.x;
        const dy = player.y - o.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 185) {
          const pullSpeed = 340;
          o.x += (dx / Math.max(1, dist)) * pullSpeed * simDt;
          o.y += (dy / Math.max(1, dist)) * pullSpeed * simDt;
        }
        if (dist < 26) {
          o.active = false;
          audio.playQiPickup();
          if (o.kind === 'qi') {
            player.qi = Math.min(currentRealm.maxQi, player.qi + o.value);
            spawnFloatingText(player.x, player.y - 18, `+${o.value} Linh Khí`, '#2ec4b6', 0.92);
          } else if (o.kind === 'stone') {
            runState.spiritStones += o.value;
            spawnFloatingText(player.x, player.y - 18, `+${o.value} Linh Thạch`, '#e9c46a', 0.92);
          } else if (o.kind === 'herb') {
            runState.herbs += o.value;
            spawnFloatingText(player.x, player.y - 18, `+${o.value} Linh Thảo`, '#52b788', 0.95);
          } else if (o.kind === 'core') {
            runState.beastCores += o.value;
            spawnFloatingText(player.x, player.y - 20, `+${o.value} Yêu Đan`, '#f72585', 1.05);
          }
          spawnParticles(player.x, player.y, 5, '#e9c46a', 30, 90, 2.8, 0.25);
        }
      }

      if (player.hp <= 0 && !runState.isDefeatPending) {
        runState.isDefeatPending = true;
        runState.defeatDelayTimer = 0.5;
        runState.cameraTrauma = 0.65;
        audio.playDefeatSting();
        spawnParticles(player.x, player.y, 28, '#e63946', 80, 260, 4.5, 0.6);
      }

      hudSyncTimer -= simDt;
      if (hudSyncTimer <= 0) {
        hudSyncTimer = 0.18;
        const activeBoss = enemies.find((e) => e.archetype === 'yeu_vuong' && e.state !== 'ko');
        propsRef.current.onHudUpdate({
          hp: Math.max(0, Math.round(player.hp)),
          ghostHp: Math.max(0, Math.round(player.ghostHp)),
          maxHp: stats.maxHp,
          qi: Math.min(currentRealm.maxQi, Math.round(player.qi)),
          maxQi: currentRealm.maxQi,
          realmIndex: propsRef.current.realmIndex,
          wave: runState.wave,
          kills: runState.kills,
          spiritStones: runState.spiritStones,
          herbs: runState.herbs,
          beastCores: runState.beastCores,
          cooldowns: { ...player.cooldowns },
          shieldTimer: player.shieldTimer,
          tribulation: {
            active: runState.tribulation.active,
            boltsRemaining: runState.tribulation.boltsRemaining,
            totalBolts: runState.tribulation.totalBolts,
          },
          autoSword: player.autoSword,
          inSpiritArray,
          bossHpRatio: activeBoss ? Math.max(0, activeBoss.hp / activeBoss.maxHp) : null,
          bossName: activeBoss ? ENEMY_ARCHETYPES.yeu_vuong.name : null,
        });
      }
    };

    const renderScene = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;

      ctx.save();
      ctx.scale(dpr, dpr);

      // Deep Ink-Wash Xuanhuan Background
      const bgGrad = ctx.createRadialGradient(
        width * 0.5,
        height * 0.5,
        40,
        width * 0.5,
        height * 0.5,
        Math.max(width, height) * 0.78
      );
      bgGrad.addColorStop(0, '#162932');
      bgGrad.addColorStop(0.55, '#0b151b');
      bgGrad.addColorStop(1, '#060a0d');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      const shakeMag = runState.cameraTrauma * runState.cameraTrauma * 14;
      const shakeX = (Math.random() * 2 - 1) * shakeMag;
      const shakeY = (Math.random() * 2 - 1) * shakeMag;

      ctx.save();
      ctx.translate(width * 0.5 - runState.cameraX + shakeX, height * 0.5 - runState.cameraY + shakeY);

      // Sacred Geometric Grid
      ctx.strokeStyle = 'rgba(212, 175, 106, 0.055)';
      ctx.lineWidth = 1;
      const step = 120;
      for (let gx = -ARENA_RADIUS; gx <= ARENA_RADIUS; gx += step) {
        ctx.beginPath();
        ctx.moveTo(gx, -ARENA_RADIUS);
        ctx.lineTo(gx, ARENA_RADIUS);
        ctx.stroke();
      }
      for (let gy = -ARENA_RADIUS; gy <= ARENA_RADIUS; gy += step) {
        ctx.beginPath();
        ctx.moveTo(-ARENA_RADIUS, gy);
        ctx.lineTo(ARENA_RADIUS, gy);
        ctx.stroke();
      }

      // Outer Bí Cảnh Barrier
      ctx.strokeStyle = 'rgba(46, 196, 182, 0.28)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, ARENA_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // Ornate Central Tụ Linh Bát Quái Trận (Bagua Spirit Array at 0,0)
      const inArray = Math.hypot(player.x, player.y) <= 155;
      ctx.save();
      ctx.strokeStyle = inArray ? 'rgba(233, 196, 106, 0.65)' : 'rgba(46, 196, 182, 0.28)';
      ctx.fillStyle = inArray ? 'rgba(233, 196, 106, 0.08)' : 'rgba(46, 196, 182, 0.045)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.arc(0, 0, 155, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 118, 0, Math.PI * 2);
      ctx.stroke();

      // Rotating Bagua Trigram Symbols
      const trigrams = ['☰', '☱', '☲', '☳', '☴', '☵', '☶', '☷'];
      ctx.font = '16px serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = inArray ? '#e9c46a' : 'rgba(46, 196, 182, 0.55)';
      for (let i = 0; i < 8; i++) {
        const ang = (i / 8) * Math.PI * 2 + runState.elapsedTime * 0.16;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 65, Math.sin(ang) * 65);
        ctx.lineTo(Math.cos(ang) * 150, Math.sin(ang) * 150);
        ctx.stroke();
        ctx.fillText(trigrams[i], Math.cos(ang + 0.39) * 136, Math.sin(ang + 0.39) * 136);
      }

      // Label at bottom of Bagua Array
      ctx.font = '600 11px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = inArray ? '#f4e4bc' : 'rgba(168, 218, 220, 0.65)';
      ctx.fillText('TỤ LINH BÁT QUÁI TRẬN · +50% TU VI/S', 0, 174);
      ctx.restore();

      // Render Landmarks
      for (const lm of landmarks) {
        ctx.save();
        ctx.translate(lm.x, lm.y);
        ctx.fillStyle = 'rgba(6, 10, 13, 0.58)';
        ctx.beginPath();
        ctx.ellipse(0, lm.size * 0.5, lm.size * 0.9, lm.size * 0.45, 0, 0, Math.PI * 2);
        ctx.fill();

        if (lm.kind === 'stone_pillar') {
          ctx.fillStyle = '#1b2c35';
          ctx.strokeStyle = '#d4af6a';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.roundRect(-13, -lm.size, 26, lm.size * 1.45, 4);
          ctx.fill();
          ctx.stroke();
          // Glowing rune line on pillar
          ctx.strokeStyle = '#2ec4b6';
          ctx.beginPath();
          ctx.moveTo(0, -lm.size + 8);
          ctx.lineTo(0, lm.size * 0.3);
          ctx.stroke();
        } else if (lm.kind === 'jade_rock') {
          ctx.fillStyle = '#183a37';
          ctx.strokeStyle = '#2ec4b6';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(0, -lm.size * 0.75);
          ctx.lineTo(lm.size * 0.65, 0);
          ctx.lineTo(lm.size * 0.35, lm.size * 0.55);
          ctx.lineTo(-lm.size * 0.45, lm.size * 0.55);
          ctx.lineTo(-lm.size * 0.65, -lm.size * 0.1);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        } else {
          ctx.fillStyle = '#1b3b32';
          ctx.strokeStyle = '#52b788';
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(0, -8, lm.size * 0.75, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
        }
        ctx.restore();
      }

      // Render Telegraphed Lightning Warning Rings
      for (let i = 0; i < MAX_LIGHTNING; i++) {
        const l = lightnings[i];
        if (!l.active) continue;
        const progress = 1 - Math.max(0, l.timer / l.maxTimer);
        ctx.save();
        ctx.translate(l.x, l.y);
        ctx.fillStyle = l.fromTribulation
          ? `rgba(199, 125, 255, ${0.14 + progress * 0.26})`
          : `rgba(76, 201, 240, ${0.14 + progress * 0.26})`;
        ctx.strokeStyle = l.fromTribulation ? '#e0aaff' : '#4cc9f0';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, l.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(0, 0, l.radius * (1 - progress), 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Render Pickup Orbs
      for (let i = 0; i < MAX_ORBS; i++) {
        const o = orbs[i];
        if (!o.active) continue;
        const bobY = Math.sin(o.bobPhase) * 4;
        ctx.save();
        ctx.translate(o.x, o.y + bobY);
        ctx.fillStyle =
          o.kind === 'qi'
            ? '#2ec4b6'
            : o.kind === 'stone'
              ? '#e9c46a'
              : o.kind === 'herb'
                ? '#52b788'
                : '#f72585';
        ctx.beginPath();
        ctx.arc(0, 0, o.kind === 'core' ? 8.5 : 6.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.restore();
      }

      // Render Detailed Enemy Actors & Windup Telegraphs
      for (const en of enemies) {
        const cfg = ENEMY_ARCHETYPES[en.archetype];
        ctx.save();
        ctx.translate(en.x, en.y);

        if (en.state === 'ko') {
          ctx.globalAlpha = Math.max(0, en.koTimer / 0.35);
          ctx.scale(1.18, 0.82);
        }

        if (en.state === 'windup') {
          const pct = 1 - Math.max(0, en.stateTimer / cfg.windupDuration);
          ctx.save();
          ctx.strokeStyle = 'rgba(230, 57, 70, 0.88)';
          ctx.fillStyle = 'rgba(230, 57, 70, 0.18)';
          ctx.lineWidth = 2;
          if (cfg.policy === 'charger' || cfg.policy === 'kiter') {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(en.targetX - en.x, en.targetY - en.y);
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(0, 0, cfg.radius + 8 + pct * 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        // Boss Demonic Hexagram Ring
        if (en.archetype === 'yeu_vuong') {
          ctx.save();
          ctx.rotate(runState.elapsedTime * 0.9);
          ctx.strokeStyle = 'rgba(247, 37, 133, 0.65)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, cfg.radius + 14, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }

        // Ground Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.58)';
        ctx.beginPath();
        ctx.ellipse(0, cfg.radius * 0.78, cfg.radius * 0.9, cfg.radius * 0.42, 0, 0, Math.PI * 2);
        ctx.fill();

        // Detailed Beast Silhouette
        ctx.fillStyle = en.hitFlashTimer > 0 ? '#ffffff' : cfg.color;
        ctx.strokeStyle = '#070b0e';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        if (en.archetype === 'huyet_lang') {
          // Wolf silhouette with pointed ears
          ctx.moveTo(0, -cfg.radius * 1.15);
          ctx.lineTo(cfg.radius * 0.55, -cfg.radius * 1.35);
          ctx.lineTo(cfg.radius * 1.05, 0);
          ctx.lineTo(0, cfg.radius * 1.05);
          ctx.lineTo(-cfg.radius * 1.05, 0);
          ctx.lineTo(-cfg.radius * 0.55, -cfg.radius * 1.35);
          ctx.closePath();
        } else if (en.archetype === 'hac_hung') {
          for (let s = 0; s < 6; s++) {
            const a = (s / 6) * Math.PI * 2;
            const px = Math.cos(a) * cfg.radius;
            const py = Math.sin(a) * cfg.radius;
            if (s === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
        } else {
          ctx.arc(0, 0, cfg.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();

        // Glowing Eyes & Core Detail
        ctx.fillStyle = cfg.accentColor;
        ctx.beginPath();
        ctx.arc(-cfg.radius * 0.28, -4, 3.2, 0, Math.PI * 2);
        ctx.arc(cfg.radius * 0.28, -4, 3.2, 0, Math.PI * 2);
        ctx.fill();

        // Enemy HP Bar & Boss Nameplate
        if (en.state !== 'ko') {
          const bw = Math.max(36, cfg.radius * 2.1);
          ctx.fillStyle = 'rgba(6, 10, 13, 0.88)';
          ctx.fillRect(-bw * 0.5, -cfg.radius - 14, bw, 5.5);
          ctx.fillStyle = en.archetype === 'yeu_vuong' ? '#f72585' : '#e63946';
          ctx.fillRect(-bw * 0.5, -cfg.radius - 14, bw * Math.max(0, en.hp / en.maxHp), 5.5);

          if (en.archetype === 'yeu_vuong') {
            ctx.font = '700 11px "Plus Jakarta Sans", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillStyle = '#f4e4bc';
            ctx.fillText(cfg.name, 0, -cfg.radius - 21);
          }
        }
        ctx.restore();
      }

      // Render Detailed Cultivator (Player)
      ctx.save();
      const bobOffset = Math.sin(player.gaitDist) * 3;
      ctx.translate(player.x, player.y + bobOffset);
      ctx.scale(player.scaleX, player.scaleY);

      if (player.shieldTimer > 0) {
        ctx.save();
        ctx.strokeStyle = '#e9c46a';
        ctx.fillStyle = 'rgba(233, 196, 106, 0.18)';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.arc(0, 0, 36, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Orbiting Flying Swords (Phi Kiếm Hộ Thể)
      for (let s = 0; s < 3; s++) {
        const swordAng = runState.elapsedTime * 3.3 + (s * Math.PI * 2) / 3;
        const sx = Math.cos(swordAng) * 34;
        const sy = Math.sin(swordAng) * 34;
        ctx.save();
        ctx.translate(sx, sy);
        ctx.rotate(swordAng + Math.PI * 0.5);
        ctx.fillStyle = '#2ec4b6';
        ctx.strokeStyle = '#f4e4bc';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -12);
        ctx.lineTo(4, 6);
        ctx.lineTo(0, 10);
        ctx.lineTo(-4, 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Spirit Beast Companion (Huyền Hỏa Kỳ Lân)
      if (propsRef.current.hasSpiritBeast) {
        const beastAng = runState.elapsedTime * 2.1;
        const bx = Math.cos(beastAng) * 48;
        const by = Math.sin(beastAng) * 48;
        ctx.save();
        ctx.translate(bx, by);
        ctx.fillStyle = '#f72585';
        ctx.strokeStyle = '#e9c46a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Immortal Golden Halo behind head
      ctx.strokeStyle = '#e9c46a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, -9, 17, 0, Math.PI * 2);
      ctx.stroke();

      // Flowing Guofeng Robe Body
      ctx.fillStyle = player.hitFlash > 0 ? '#ffffff' : '#15343d';
      ctx.strokeStyle = '#f4e4bc';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-15, 14);
      ctx.quadraticCurveTo(-18, -4, 0, -14);
      ctx.quadraticCurveTo(18, -4, 15, 14);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      // Cultivator Head & Jade Crown
      ctx.fillStyle = '#f4e4bc';
      ctx.beginPath();
      ctx.arc(0, -6, 8.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2ec4b6';
      ctx.beginPath();
      ctx.roundRect(-5, -17, 10, 5, 2);
      ctx.fill();
      ctx.restore();

      // Render Projectiles
      for (let i = 0; i < MAX_PROJECTILES; i++) {
        const pr = projectiles[i];
        if (!pr.active) continue;
        ctx.save();
        ctx.translate(pr.x, pr.y);
        ctx.rotate(Math.atan2(pr.vy, pr.vx));
        ctx.fillStyle = pr.color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        if (pr.fromPlayer) {
          ctx.moveTo(pr.radius * 2.0, 0);
          ctx.lineTo(-pr.radius, pr.radius * 0.8);
          ctx.lineTo(-pr.radius * 0.45, 0);
          ctx.lineTo(-pr.radius, -pr.radius * 0.8);
          ctx.closePath();
        } else {
          ctx.arc(0, 0, pr.radius, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }

      // Render Pooled Particles
      for (let i = 0; i < MAX_PARTICLES; i++) {
        const p = particles[i];
        if (!p.active) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Render Floating Combat Damage & Qi Numbers
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let i = 0; i < MAX_FLOATING_TEXTS; i++) {
        const ft = floatingTexts[i];
        if (!ft.active) continue;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (ft.life / ft.maxLife) * 1.4));
        ctx.font = `700 ${Math.round(13 * ft.scale)}px "JetBrains Mono", monospace`;
        ctx.strokeStyle = '#05080b';
        ctx.lineWidth = 3.2;
        ctx.strokeText(ft.text, ft.x, ft.y);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x, ft.y);
        ctx.restore();
      }

      ctx.restore();

      // Low-HP Peripheral Crimson Vignette
      if (player.hp > 0 && player.hp / propsRef.current.computedStats.maxHp < 0.32) {
        const vig = ctx.createRadialGradient(
          width * 0.5,
          height * 0.5,
          width * 0.28,
          width * 0.5,
          height * 0.5,
          width * 0.65
        );
        vig.addColorStop(0, 'rgba(193, 18, 31, 0)');
        vig.addColorStop(1, 'rgba(193, 18, 31, 0.36)');
        ctx.fillStyle = vig;
        ctx.fillRect(0, 0, width, height);
      }

      ctx.restore();
    };

    let timerId = 0;
    const loop = (now: number) => {
      const rawDt = Math.max(0, (now - lastTime) / 1000);
      lastTime = now;
      stepSimulation(rawDt);
      renderScene();
      timerId = window.setTimeout(() => {
        rafId = requestAnimationFrame(loop);
      }, 4);
    };

    rafId = requestAnimationFrame(loop);

    return () => {
      window.clearTimeout(timerId);
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearAllInputs);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [commandRef]);

  return (
    <div className="fixed inset-0 w-full h-full overflow-hidden bg-[#060a0d]">
      <canvas
        ref={canvasRef}
        data-testid="cultivation-canvas"
        tabIndex={0}
        aria-label="Sân chơi Bí Cảnh Nhất Niệm Vô Cực"
        className="w-full h-full block cursor-crosshair focus:outline-none"
      />
    </div>
  );
};
