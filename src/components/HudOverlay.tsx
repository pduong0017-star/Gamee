import React, { useRef, useState } from 'react';
import {
  CULTIVATION_PATHS,
  CultivationPathId,
  REALMS,
  StoryChapter,
  computeCombatPower,
  getChapterProgress,
} from '../game/rules';
import { LiveHudSnapshot } from './CanvasArena';

export type DrawerTabId =
  | 'dong_phu'
  | 'dan_phong'
  | 'phap_bao'
  | 'tang_kinh'
  | 'thien_co'
  | null;

interface HudOverlayProps {
  hud: LiveHudSnapshot;
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
  breakthroughChance: number;
  unclaimedQuestCount: number;
  currentChapter: StoryChapter;
  allChaptersDone: boolean;
  storyMetrics: {
    kills: number;
    pillsCrafted: number;
    realmIndex: number;
    artifactsUnlocked: number;
  };
  onClaimChapter: () => void;
  onSummonBoss: () => void;
  activeTab: DrawerTabId;
  onSelectTab: (tab: DrawerTabId) => void;
  onTriggerSkill: (skill: 'sword' | 'bell' | 'thunder' | 'dash') => void;
  onTriggerMeditation: () => void;
  onQuickHealHerb: () => void;
  onSetTouchMove: (nx: number, ny: number) => void;
  onStartTribulation: () => void;
  onToggleAutoSword: () => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onPause: () => void;
  onRestart: () => void;
}

const AVATAR_PATH = 'images/cultivator_avatar.jpg';

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  pathId,
  computedStats,
  breakthroughChance,
  unclaimedQuestCount,
  currentChapter,
  allChaptersDone,
  storyMetrics,
  onClaimChapter,
  onSummonBoss,
  activeTab,
  onSelectTab,
  onTriggerSkill,
  onTriggerMeditation,
  onQuickHealHerb,
  onSetTouchMove,
  onStartTribulation,
  onToggleAutoSword,
  isMuted,
  onToggleMute,
  onPause,
}) => {
  const [avatarErr, setAvatarErr] = useState(false);
  const [showTouchPad, setShowTouchPad] = useState(true);
  const [showStoryDialog, setShowStoryDialog] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const joyRef = useRef<HTMLDivElement | null>(null);
  const draggingJoyRef = useRef(false);

  const realm = REALMS[hud.realmIndex] ?? REALMS[0];
  const pathInfo = CULTIVATION_PATHS[pathId];

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostHpPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const qiPct = Math.max(0, Math.min(100, (hud.qi / Math.max(1, hud.maxQi)) * 100));
  const readyForBreakthrough = hud.qi >= hud.maxQi && !hud.tribulation.active;

  const combatPower = computeCombatPower({
    maxHp: computedStats.maxHp,
    attack: computedStats.attack,
    defense: computedStats.defense,
    passiveQiPerSec: computedStats.passiveQiPerSec,
    critChancePct: computedStats.critChancePct ?? 12,
    lifeStealPct: computedStats.lifeStealPct ?? 0,
  });

  const chapProg = getChapterProgress(currentChapter, storyMetrics);

  const updateJoystickFromPoint = (clientX: number, clientY: number) => {
    const el = joyRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const cy = rect.top + rect.height * 0.5;
    const maxR = rect.width * 0.36;
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(maxR, dist);
    const angle = Math.atan2(dy, dx);
    const kx = dist > 2 ? Math.cos(angle) * clampedDist : 0;
    const ky = dist > 2 ? Math.sin(angle) * clampedDist : 0;
    setKnobPos({ x: kx, y: ky });
    onSetTouchMove(kx / maxR, ky / maxR);
  };

  const resetJoystick = () => {
    draggingJoyRef.current = false;
    setKnobPos({ x: 0, y: 0 });
    onSetTouchMove(0, 0);
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3 overflow-hidden">
      {/* TOP PERIMETER ROW: Guofeng Cultivator Medallion + Storyline Scroll + Jade Resource Plaque */}
      <div className="flex items-start justify-between gap-1.5 lg:gap-2 w-full">
        {/* Top-Left: Circular Guofeng Cultivator Medallion + Sculpted Vital Bars */}
        <div className="jade-plaque rounded-2xl p-1.5 lg:p-2 pointer-events-auto flex items-center gap-2 w-[210px] lg:w-[310px] shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'dong_phu' ? null : 'dong_phu')}
            aria-label="Mở Động Phủ Tu Sĩ"
            className="relative w-11 h-11 lg:w-14 lg:h-14 rounded-full overflow-hidden border-2 border-[#e9c46a] shrink-0 bg-[#102229] flex items-center justify-center cursor-pointer shadow-lg"
          >
            {!avatarErr ? (
              <img
                src={AVATAR_PATH}
                alt="Chân dung Tu Sĩ"
                referrerPolicy="no-referrer"
                onError={() => setAvatarErr(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display font-bold text-lg text-[#e9c46a]">仙</span>
            )}
            <span className="absolute bottom-0 inset-x-0 bg-[#070d11]/90 text-[8px] font-mono-num text-center text-[#e9c46a] py-0.5">
              {pathInfo.name.split(' · ')[0]}
            </span>
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center justify-between gap-1">
              <div className="font-display font-bold text-[11px] lg:text-sm text-[#f4e4bc] truncate">
                {realm.name}
              </div>
              <div className="px-1 py-0.5 rounded bg-[#182c34] border border-[#d4af6a]/40 font-mono-num text-[8px] lg:text-[9px] text-[#e9c46a] whitespace-nowrap shrink-0">
                LC {combatPower}
              </div>
            </div>

            {/* Khí Huyết (HP) Bar */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span className="text-[#c5beb0]">HUYẾT</span>
                <span className="font-mono-num text-[#ece5d5]">
                  {hud.hp.toFixed(0)}/{hud.maxHp.toFixed(0)}
                </span>
              </div>
              <div className="relative h-1.5 lg:h-2 w-full rounded-full bg-[#060a0d] overflow-hidden border border-[#d4af6a]/35">
                <div
                  className="absolute inset-0 origin-left bg-[#e9c46a]/60"
                  style={{ transform: `scaleX(${ghostHpPct / 100})` }}
                />
                <div
                  className="absolute inset-0 origin-left bg-[#c1121f]"
                  style={{ transform: `scaleX(${hpPct / 100})` }}
                />
              </div>
            </div>

            {/* Tu Vi Linh Khí (Qi) Bar */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[9px]">
                <span className="text-[#c5beb0]">TU VI (+{Math.round(computedStats.passiveQiPerSec * (hud.inSpiritArray ? 1.5 : 1))}/s)</span>
                <span className="font-mono-num text-[#2ec4b6]">
                  {hud.qi.toFixed(0)}/{hud.maxQi.toFixed(0)}
                </span>
              </div>
              <div className="relative h-1.5 lg:h-2 w-full rounded-full bg-[#060a0d] overflow-hidden border border-[#2ec4b6]/40">
                <div
                  className="absolute inset-0 origin-left bg-[#2ec4b6]"
                  style={{ transform: `scaleX(${qiPct / 100})` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: Mạch Truyện Tiên Đồ (Storyline Chapter Scroll) + Breakthrough / Boss Alerts */}
        <div className="flex flex-col items-center gap-1 flex-1 min-w-[210px] max-w-[360px] lg:max-w-[430px]">
          <div className="jade-plaque rounded-xl px-2 py-1 pointer-events-auto flex items-center justify-between gap-1.5 w-full">
            <button
              type="button"
              onClick={() => setShowStoryDialog((v) => !v)}
              className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
              title="Nhấn để xem Cốt Truyện Truyền Âm"
            >
              <span className="cinnabar-seal px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold text-[#f4e4bc] whitespace-nowrap shrink-0">
                {allChaptersDone ? 'Viên Mãn' : currentChapter.chapterCode}
              </span>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] lg:text-xs font-bold text-[#f4e4bc] truncate">
                  {allChaptersDone
                    ? 'Truyện Ký Hoàn Tất'
                    : `${currentChapter.title} (${Math.min(chapProg.current, chapProg.target)}/${chapProg.target})`}
                </div>
                <div className="text-[9px] text-[#2ec4b6] truncate">
                  {allChaptersDone ? 'Tự do săn Yêu Vương' : currentChapter.objectiveLabel}
                </div>
              </div>
            </button>

            {!allChaptersDone && chapProg.completed ? (
              <button
                type="button"
                onClick={onClaimChapter}
                className="cinnabar-seal px-2 py-1 rounded-lg text-[9px] lg:text-[10px] font-bold text-[#f4e4bc] whitespace-nowrap shrink-0 cursor-pointer"
              >
                Qua Chương
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowStoryDialog((v) => !v)}
                className="px-1.5 py-0.5 rounded bg-[#152932] border border-[#d4af6a]/35 text-[9px] font-semibold text-[#e9c46a] whitespace-nowrap shrink-0 cursor-pointer"
              >
                {showStoryDialog ? 'Ẩn' : 'Truyện'}
              </button>
            )}
          </div>

          {/* Expandable Storyline NPC Dialogue Scroll (Truyền Âm Ngọc Giản) */}
          {showStoryDialog && (
            <div className="jade-plaque rounded-xl p-3 pointer-events-auto w-full space-y-2 border-2 border-[#e9c46a]">
              <div className="flex items-center justify-between border-b border-[#d4af6a]/25 pb-1">
                <div className="text-xs font-bold text-[#e9c46a]">
                  {currentChapter.npcName} · <span className="text-[#a8dadc] font-normal">{currentChapter.npcTitle}</span>
                </div>
                <span className="font-mono-num text-[10px] text-[#2ec4b6]">
                  {currentChapter.chapterCode} / V
                </span>
              </div>
              <p className="text-xs text-[#ece5d5] leading-relaxed italic">
                “{currentChapter.dialogue}”
              </p>
              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="font-mono-num text-[#e9c46a]">
                  Thưởng: +{currentChapter.rewardStones} Thạch · +{currentChapter.rewardHerbs} Thảo · +{currentChapter.rewardQi} Tu Vi
                </span>
                {!allChaptersDone && chapProg.completed && (
                  <button
                    type="button"
                    onClick={() => {
                      onClaimChapter();
                      setShowStoryDialog(false);
                    }}
                    className="cinnabar-seal px-2.5 py-1 rounded text-[10px] font-bold text-[#f4e4bc] cursor-pointer"
                  >
                    Hoàn Thành & Qua Chương
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Breakthrough / Boss / Tribulation Banners */}
          <div className="flex items-center gap-1.5">
            {readyForBreakthrough && (
              <button
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onStartTribulation();
                }}
                className="pointer-events-auto cinnabar-seal min-h-[36px] px-3 py-1 rounded-full text-[#f4e4bc] font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
              >
                ⚡ Độ Kiếp Đột Phá [B] ({breakthroughChance.toFixed(0)}%)
              </button>
            )}

            {hud.tribulation.active && (
              <div className="jade-plaque rounded-full px-3 py-1 border-[#c77dff] text-center">
                <span className="text-[10px] sm:text-xs font-semibold text-[#e0aaff] whitespace-nowrap">
                  LÔI KIẾP · CÒN {hud.tribulation.boltsRemaining.toFixed(0)}/{hud.tribulation.totalBolts.toFixed(0)} ĐẠO
                </span>
              </div>
            )}

            {hud.bossName && hud.bossHpRatio !== null && (
              <div className="jade-plaque rounded-lg px-2.5 py-1 w-[150px] lg:w-[210px]">
                <div className="flex justify-between text-[10px] font-semibold text-[#f72585] mb-0.5">
                  <span className="truncate">{hud.bossName}</span>
                  <span className="font-mono-num">{Math.round(hud.bossHpRatio * 100)}%</span>
                </div>
                <div className="h-1.5 w-full bg-[#060a0d] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#f72585]"
                    style={{ width: `${Math.max(0, Math.min(100, hud.bossHpRatio * 100))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Top-Right: Carved Resource Scroll & Circular Seal Controls */}
        <div className="flex items-start gap-1.5 pointer-events-auto shrink-0">
          <div className="jade-plaque rounded-xl px-2.5 py-1.5 flex items-center gap-2">
            <div>
              <div className="text-[9px] text-[#a39e93]">BÍ CẢNH</div>
              <div className="font-mono-num text-xs font-bold text-[#f4e4bc] whitespace-nowrap">
                Tầng {hud.wave.toFixed(0)} · {hud.kills.toFixed(0)} Trảm
              </div>
            </div>
            <div className="h-5 w-px bg-[#d4af6a]/25" />
            <div>
              <div className="text-[9px] text-[#a39e93]">LINH THẠCH</div>
              <div className="font-mono-num text-xs font-bold text-[#e9c46a]">
                {hud.spiritStones.toFixed(0)}
              </div>
            </div>
            <div className="h-5 w-px bg-[#d4af6a]/25 hidden sm:block" />
            <div className="hidden sm:block">
              <div className="text-[9px] text-[#a39e93]">THẢO · ĐAN</div>
              <div className="font-mono-num text-xs font-semibold text-[#52b788] whitespace-nowrap">
                {hud.herbs.toFixed(0)} · {hud.beastCores.toFixed(0)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              tabIndex={-1}
              title="Khiêu chiến Cửu U Yêu Vương"
              aria-label="Khiêu chiến Yêu Vương"
              onClick={(e) => {
                e.currentTarget.blur();
                onSummonBoss();
              }}
              className="talisman-orb w-10 h-10 flex flex-col items-center justify-center text-[#f72585] cursor-pointer"
            >
              <span className="font-display font-bold text-xs leading-none">魔</span>
              <span className="text-[8px] font-bold text-[#f4e4bc] leading-none mt-0.5">Boss</span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Toàn màn hình ngang"
              onClick={(e) => {
                e.currentTarget.blur();
                handleToggleFullscreen();
              }}
              className="talisman-orb w-10 h-10 flex items-center justify-center text-[#d4af6a] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label={isMuted ? 'Bật âm thanh [M]' : 'Tắt âm thanh [M]'}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              className="talisman-orb w-10 h-10 flex items-center justify-center text-[#ece5d5] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                {isMuted ? (
                  <path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6" />
                ) : (
                  <path d="M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
                )}
              </svg>
            </button>

            <button
              type="button"
              tabIndex={-1}
              aria-label="Tạm dừng trò chơi [P]"
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              className="talisman-orb w-10 h-10 flex items-center justify-center text-[#ece5d5] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: Left Bagua Joystick + Center Hanging Jade Scrolls + Right Circular Talisman Skill Cluster */}
      <div className="flex items-end justify-between gap-2 w-full">
        {/* Bottom-Left: Bagua Compass Virtual Joystick + Circular Auto-Sword Seal */}
        <div className="flex items-end gap-2 pointer-events-auto shrink-0">
          {showTouchPad && (
            <div
              ref={joyRef}
              onPointerDown={(e) => {
                e.currentTarget.setPointerCapture(e.pointerId);
                draggingJoyRef.current = true;
                updateJoystickFromPoint(e.clientX, e.clientY);
              }}
              onPointerMove={(e) => {
                if (!draggingJoyRef.current) return;
                updateJoystickFromPoint(e.clientX, e.clientY);
              }}
              onPointerUp={resetJoystick}
              onPointerCancel={resetJoystick}
              aria-label="Cần điều khiển Bát Quái"
              className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#081318]/90 border-2 border-[#d4af6a]/60 flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing shadow-2xl"
            >
              <div className="absolute inset-2.5 rounded-full border border-[#2ec4b6]/35 pointer-events-none" />
              <div
                className="w-9 h-9 rounded-full bg-gradient-to-b from-[#f4e4bc] to-[#c89d4c] border-2 border-[#090d11] shadow-lg pointer-events-none flex items-center justify-center"
                style={{
                  transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
                }}
              >
                <span className="font-display font-bold text-xs text-[#090d11]">道</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleAutoSword();
              }}
              className={`talisman-orb w-12 h-12 flex flex-col items-center justify-center cursor-pointer ${
                hud.autoSword ? 'border-[#2ec4b6]' : 'border-[#d4af6a]/40 opacity-75'
              }`}
              title="Bật/Tắt Tự Động Ngự Kiếm [F]"
            >
              <span className="font-display font-bold text-xs text-[#2ec4b6] leading-none">御</span>
              <span className="text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.autoSword ? 'Tự Động' : 'Thủ Công'}
              </span>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowTouchPad((v) => !v);
              }}
              className="jade-plaque px-2 py-1 rounded-full text-[9px] font-semibold text-[#c5beb0] cursor-pointer whitespace-nowrap"
            >
              La Bàn: {showTouchPad ? 'Hiện' : 'Ẩn'}
            </button>
          </div>
        </div>

        {/* Bottom-Center: 5 Traditional Hanging Jade Scroll Plaques (Thẻ Ngọc Giản Cổ Phong) */}
        <div className="flex items-end gap-1 lg:gap-1.5 pointer-events-auto">
          {(
            [
              { id: 'dong_phu', seal: '洞', label: 'Động Phủ', badge: unclaimedQuestCount > 0 },
              { id: 'dan_phong', seal: '丹', label: 'Đan Phòng', badge: false },
              { id: 'phap_bao', seal: '寶', label: 'Pháp Bảo', badge: false },
              { id: 'tang_kinh', seal: '經', label: 'Tàng Kinh', badge: false },
              { id: 'thien_co', seal: '機', label: 'Thiên Cơ', badge: false },
            ] as const
          ).map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onSelectTab(isActive ? null : item.id);
                }}
                className={`jade-plaque relative min-w-[54px] lg:min-w-[68px] px-2 lg:px-2.5 py-1.5 rounded-t-xl rounded-b-md flex flex-col items-center justify-center cursor-pointer ${
                  isActive
                    ? 'border-2 border-[#f4e4bc] bg-[#1e3a44]'
                    : 'border-[#d4af6a]/60'
                }`}
              >
                {item.badge && (
                  <span className="cinnabar-seal absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold text-[#f4e4bc] flex items-center justify-center">
                    {unclaimedQuestCount}
                  </span>
                )}
                <span className="font-display font-bold text-sm lg:text-base text-[#e9c46a] leading-none">
                  {item.seal}
                </span>
                <span className="text-[10px] lg:text-[11px] font-semibold text-[#f4e4bc] whitespace-nowrap mt-0.5">
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Bottom-Right: Authentic Circular Action RPG Talisman Skill Cluster (Vòng Pháp Bảo Cổ Phong) */}
        <div className="flex items-end gap-1.5 lg:gap-2 pointer-events-auto shrink-0">
          {/* 5 Satellite Circular Immortal Talisman Orbs */}
          <div className="grid grid-cols-3 sm:flex items-end gap-1.5">
            {/* Tụ Khí Orb */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerMeditation();
              }}
              className="talisman-orb w-11 h-11 lg:w-12 lg:h-12 flex flex-col items-center justify-center cursor-pointer border-[#2ec4b6]"
              title="Tụ Khí Định Thần [G]"
            >
              <span className="font-display font-bold text-sm text-[#2ec4b6] leading-none">氣</span>
              <span className="font-mono-num text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.cooldowns.meditate > 0 ? `${hud.cooldowns.meditate.toFixed(0)}s` : 'Tụ Khí'}
              </span>
            </button>

            {/* Phục Đan Orb */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onQuickHealHerb();
              }}
              className="talisman-orb w-11 h-11 lg:w-12 lg:h-12 flex flex-col items-center justify-center cursor-pointer border-[#52b788]"
              title="Phục Dụng Linh Thảo [H]"
            >
              <span className="font-display font-bold text-sm text-[#52b788] leading-none">丹</span>
              <span className="font-mono-num text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.herbs.toFixed(0)} Thảo
              </span>
            </button>

            {/* Thân Pháp Orb */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('dash');
              }}
              className="talisman-orb w-11 h-11 lg:w-12 lg:h-12 flex flex-col items-center justify-center cursor-pointer border-[#a8dadc]"
              title="Súc Địa Thân Pháp [Space]"
            >
              <span className="font-display font-bold text-sm text-[#a8dadc] leading-none">閃</span>
              <span className="font-mono-num text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash.toFixed(1)}s` : 'Thân'}
              </span>
            </button>

            {/* Kim Chung Shield Orb */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('bell');
              }}
              className="talisman-orb w-11 h-11 lg:w-12 lg:h-12 flex flex-col items-center justify-center cursor-pointer border-[#e9c46a]"
              title="Kim Chung Hộ Thể [K]"
            >
              <span className="font-display font-bold text-sm text-[#e9c46a] leading-none">鐘</span>
              <span className="font-mono-num text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.cooldowns.bell > 0 ? `${hud.cooldowns.bell.toFixed(1)}s` : 'Chung'}
              </span>
            </button>

            {/* Cửu Thiên Thần Lôi Orb */}
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('thunder');
              }}
              className="talisman-orb w-11 h-11 lg:w-12 lg:h-12 flex flex-col items-center justify-center cursor-pointer border-[#4cc9f0]"
              title="Cửu Thiên Thần Lôi [L]"
            >
              <span className="font-display font-bold text-sm text-[#4cc9f0] leading-none">雷</span>
              <span className="font-mono-num text-[8px] font-bold text-[#f4e4bc] mt-0.5">
                {hud.cooldowns.thunder > 0 ? `${hud.cooldowns.thunder.toFixed(1)}s` : 'Lôi'}
              </span>
            </button>
          </div>

          {/* Primary Right-Thumb Natal Sword Medallion (60x60px / 64x64px) */}
          <button
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.currentTarget.blur();
              onTriggerSkill('sword');
            }}
            aria-label="Xuất Bản Mệnh Phi Kiếm [J]"
            className="talisman-orb w-15 h-15 lg:w-16 lg:h-16 flex flex-col items-center justify-center cursor-pointer border-2 border-[#e9c46a] shadow-2xl"
          >
            <div className="absolute inset-1 rounded-full border border-[#2ec4b6]/50 pointer-events-none" />
            <span className="font-display font-bold text-xl lg:text-2xl text-[#2ec4b6] leading-none">
              劍
            </span>
            <span className="text-[9px] font-bold text-[#f4e4bc] mt-0.5">
              Phi Kiếm
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
