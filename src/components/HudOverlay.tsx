import React, { useRef, useState } from 'react';
import { CULTIVATION_PATHS, CultivationPathId, REALMS } from '../game/rules';
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

const AVATAR_PATH = '/src/assets/images/cultivator_avatar_1794497143525.jpg';

export const HudOverlay: React.FC<HudOverlayProps> = ({
  hud,
  pathId,
  computedStats,
  breakthroughChance,
  unclaimedQuestCount,
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
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const joyRef = useRef<HTMLDivElement | null>(null);
  const draggingJoyRef = useRef(false);

  const realm = REALMS[hud.realmIndex] ?? REALMS[0];
  const pathInfo = CULTIVATION_PATHS[pathId];

  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const ghostHpPct = Math.max(hpPct, Math.min(100, (hud.ghostHp / Math.max(1, hud.maxHp)) * 100));
  const qiPct = Math.max(0, Math.min(100, (hud.qi / Math.max(1, hud.maxQi)) * 100));
  const readyForBreakthrough = hud.qi >= hud.maxQi && !hud.tribulation.active;

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
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2 sm:p-3.5 overflow-hidden">
      {/* TOP PERIMETER ROW: Fitted for 844x390 Mobile Landscape & 1440x900 Desktop */}
      <div className="flex items-start justify-between gap-2 w-full">
        {/* Top-Left: Cultivator Avatar, Realm, HP & Qi Bars */}
        <div className="jade-surface rounded-xl p-2 sm:p-2.5 pointer-events-auto flex items-center gap-2.5 w-[240px] lg:w-[330px] shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'dong_phu' ? null : 'dong_phu')}
            aria-label="Mở Động Phủ Tu Sĩ"
            className="relative w-11 h-11 lg:w-13 lg:h-13 rounded-lg overflow-hidden border-2 border-[#d4af6a] shrink-0 bg-[#12232b] flex items-center justify-center cursor-pointer"
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
              <svg viewBox="0 0 24 24" className="w-6 h-6 text-[#2ec4b6]" fill="currentColor">
                <path d="M12 2L15 8L21 9L16.5 14L18 20L12 17L6 20L7.5 14L3 9L9 8L12 2Z" />
              </svg>
            )}
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-baseline justify-between gap-1">
              <div className="font-display font-bold text-xs lg:text-sm text-[#f4e4bc] truncate">
                {realm.name}
              </div>
              <div className="text-[10px] text-[#2ec4b6] whitespace-nowrap shrink-0">
                {pathInfo.name.split(' · ')[0]} · +{Math.round(computedStats.passiveQiPerSec * (hud.inSpiritArray ? 1.5 : 1))}/s
              </div>
            </div>

            {/* Khí Huyết (HP) Bar */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[10px]">
                <span className="text-[#a39e93]">HUYẾT</span>
                <span className="font-mono-num text-[#ece5d5]">
                  {hud.hp.toFixed(0)}/{hud.maxHp.toFixed(0)}
                </span>
              </div>
              <div className="relative h-2 w-full rounded bg-[#060a0d] overflow-hidden border border-[#d4af6a]/25">
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
              <div className="flex justify-between text-[10px]">
                <span className="text-[#a39e93]">TU VI</span>
                <span className="font-mono-num text-[#2ec4b6]">
                  {hud.qi.toFixed(0)}/{hud.maxQi.toFixed(0)} ({Math.floor(qiPct)}%)
                </span>
              </div>
              <div className="relative h-2 w-full rounded bg-[#060a0d] overflow-hidden border border-[#2ec4b6]/35">
                <div
                  className="absolute inset-0 origin-left bg-[#2ec4b6]"
                  style={{ transform: `scaleX(${qiPct / 100})` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Top-Center: Breakthrough Button, Boss Bar, or Tribulation Alert */}
        <div className="flex flex-col items-center gap-1 min-w-0">
          {hud.tribulation.active && (
            <div className="jade-surface rounded-lg px-3 py-1 border-[#c77dff] text-center">
              <div className="text-[10px] sm:text-xs font-semibold text-[#e0aaff] whitespace-nowrap">
                LÔI KIẾP · CÒN {hud.tribulation.boltsRemaining.toFixed(0)}/{hud.tribulation.totalBolts.toFixed(0)} ĐẠO
              </div>
            </div>
          )}

          {hud.bossName && hud.bossHpRatio !== null && (
            <div className="jade-surface rounded-lg px-3 py-1 w-[160px] lg:w-[240px]">
              <div className="flex justify-between text-[10px] font-semibold text-[#f72585] mb-0.5">
                <span className="truncate">{hud.bossName}</span>
                <span className="font-mono-num">{Math.round(hud.bossHpRatio * 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-[#060a0d] rounded overflow-hidden">
                <div
                  className="h-full bg-[#f72585]"
                  style={{ width: `${Math.max(0, Math.min(100, hud.bossHpRatio * 100))}%` }}
                />
              </div>
            </div>
          )}

          {readyForBreakthrough && (
            <button
              type="button"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartTribulation();
              }}
              className="pointer-events-auto min-h-[40px] px-3.5 py-1.5 rounded-lg bg-[#d4af6a] hover:bg-[#e9c46a] text-[#090d11] font-bold text-xs shadow-lg cursor-pointer whitespace-nowrap"
            >
              Độ Kiếp [B] · {breakthroughChance.toFixed(0)}%
            </button>
          )}
        </div>

        {/* Top-Right: Resources & Utility Icon Controls (>= 44x44px hitboxes) */}
        <div className="flex items-start gap-1.5 pointer-events-auto shrink-0">
          <div className="jade-surface rounded-xl px-2.5 py-1.5 flex items-center gap-2.5">
            <div>
              <div className="text-[9px] text-[#a39e93]">BÍ CẢNH</div>
              <div className="font-mono-num text-xs font-bold text-[#f4e4bc] whitespace-nowrap">
                Tầng {hud.wave.toFixed(0)} · {hud.kills.toFixed(0)} Trảm
              </div>
            </div>
            <div className="h-5 w-px bg-[#d4af6a]/20" />
            <div>
              <div className="text-[9px] text-[#a39e93]">LINH THẠCH</div>
              <div className="font-mono-num text-xs font-bold text-[#e9c46a]">
                {hud.spiritStones.toFixed(0)}
              </div>
            </div>
            <div className="h-5 w-px bg-[#d4af6a]/20" />
            <div>
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
              aria-label="Toàn màn hình ngang"
              onClick={(e) => {
                e.currentTarget.blur();
                handleToggleFullscreen();
              }}
              className="jade-surface-interactive min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-[#d4af6a] cursor-pointer"
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
              className="jade-surface-interactive min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-[#ece5d5] cursor-pointer"
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
              className="jade-surface-interactive min-w-[44px] min-h-[44px] rounded-lg flex items-center justify-center text-[#ece5d5] cursor-pointer"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* BOTTOM PERIMETER: Centered Virtual Thumb Joystick on Left + Compact Skill & Drawer Bars on Right */}
      <div className="flex items-end justify-between gap-2 w-full">
        {/* Left-Thumb Virtual Joystick (Properly Centered Knob) */}
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
              aria-label="Cần điều khiển di chuyển"
              className="relative w-20 h-20 lg:w-24 lg:h-24 rounded-full bg-[#091318]/85 border-2 border-[#d4af6a]/45 flex items-center justify-center touch-none select-none cursor-grab active:cursor-grabbing shadow-xl"
            >
              {/* Absolute Decorative Bagua Ring so Knob stays dead-center */}
              <div className="absolute inset-3 rounded-full border border-[#2ec4b6]/35 pointer-events-none" />
              {/* Centered Thumb Stick Knob */}
              <div
                className="w-9 h-9 rounded-full bg-[#d4af6a] border-2 border-[#f4e4bc] shadow-md pointer-events-none flex items-center justify-center"
                style={{
                  transform: `translate3d(${knobPos.x}px, ${knobPos.y}px, 0)`,
                }}
              >
                <div className="w-2.5 h-2.5 rounded-full bg-[#090d11]" />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleAutoSword();
              }}
              className={`min-h-[38px] px-2.5 py-1 rounded-lg text-[11px] font-semibold cursor-pointer whitespace-nowrap border ${
                hud.autoSword
                  ? 'bg-[#17363a] border-[#2ec4b6] text-[#2ec4b6]'
                  : 'bg-[#0c161b] border-[#d4af6a]/25 text-[#a39e93]'
              }`}
            >
              Ngự Kiếm: {hud.autoSword ? 'Tự Động' : 'Thủ Công'}
            </button>
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                setShowTouchPad((v) => !v);
              }}
              className="min-h-[34px] px-2.5 py-1 rounded-lg text-[10px] font-medium bg-[#0c161b]/90 border border-[#d4af6a]/25 text-[#a39e93] hover:text-[#ece5d5] cursor-pointer whitespace-nowrap"
            >
              Joystick: {showTouchPad ? 'Hiện' : 'Ẩn'}
            </button>
          </div>
        </div>

        {/* Right-Side Ergonomic Skill Bar + Vô Cực Tiên Đồ System Tabs */}
        <div className="flex flex-col items-end gap-1.5 pointer-events-auto min-w-0">
          {/* System Drawer Navigation Bar (5 Clear Tabs) */}
          <div className="jade-surface rounded-xl p-1 flex items-center justify-end gap-1">
            {(
              [
                { id: 'dong_phu', label: 'Động Phủ', key: '1', badge: unclaimedQuestCount > 0 },
                { id: 'dan_phong', label: 'Đan Phòng', key: '2', badge: false },
                { id: 'phap_bao', label: 'Pháp Bảo', key: '3', badge: false },
                { id: 'tang_kinh', label: 'Tàng Kinh', key: '4', badge: false },
                { id: 'thien_co', label: 'Thiên Cơ & App', key: '5', badge: false },
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
                  className={`min-h-[38px] px-2.5 lg:px-3 py-1 rounded-lg text-[11px] lg:text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#d4af6a] text-[#090d11]'
                      : 'text-[#ece5d5] hover:bg-[#162730]'
                  }`}
                >
                  {item.label}
                  <span className="hidden xl:inline"> [{item.key}]</span>
                  {item.badge ? ` (${unclaimedQuestCount})` : ''}
                </button>
              );
            })}
          </div>

          {/* Active Combat & Cultivation Action Buttons (>= 44px touch targets) */}
          <div className="jade-surface rounded-xl p-1 flex items-center gap-1">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('sword');
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center gap-1.5 cursor-pointer border-[#2ec4b6]/50"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#2ec4b6] shrink-0" fill="currentColor">
                <path d="M19 3L13 9L15 11L21 5V3H19ZM3 21L9 15L7 13L1 19V21H3ZM14.5 7.5L6 16L8 18L16.5 9.5L14.5 7.5Z" />
              </svg>
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#ece5d5] whitespace-nowrap">
                  Phi Kiếm<span className="hidden xl:inline"> [J]</span>
                </div>
                <div className="text-[9px] text-[#2ec4b6] whitespace-nowrap">
                  Công Kích
                </div>
              </div>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('bell');
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center cursor-pointer"
            >
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#ece5d5] whitespace-nowrap">
                  Kim Chung<span className="hidden xl:inline"> [K]</span>
                </div>
                <div className="font-mono-num text-[9px] text-[#e9c46a] whitespace-nowrap">
                  {hud.cooldowns.bell > 0 ? `${hud.cooldowns.bell.toFixed(1)}s` : 'Hộ Thể'}
                </div>
              </div>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('thunder');
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center cursor-pointer"
            >
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#ece5d5] whitespace-nowrap">
                  Thiên Lôi<span className="hidden xl:inline"> [L]</span>
                </div>
                <div className="font-mono-num text-[9px] text-[#4cc9f0] whitespace-nowrap">
                  {hud.cooldowns.thunder > 0 ? `${hud.cooldowns.thunder.toFixed(1)}s` : 'Ngũ Lôi'}
                </div>
              </div>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerSkill('dash');
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center cursor-pointer"
            >
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#ece5d5] whitespace-nowrap">
                  Thân Pháp<span className="hidden xl:inline"> [Space]</span>
                </div>
                <div className="font-mono-num text-[9px] text-[#a39e93] whitespace-nowrap">
                  {hud.cooldowns.dash > 0 ? `${hud.cooldowns.dash.toFixed(1)}s` : 'Súc Địa'}
                </div>
              </div>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onQuickHealHerb();
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center cursor-pointer"
            >
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#52b788] whitespace-nowrap">
                  Phục Đan<span className="hidden xl:inline"> [H]</span>
                </div>
                <div className="font-mono-num text-[9px] text-[#ece5d5] whitespace-nowrap">
                  {hud.herbs.toFixed(0)} Thảo
                </div>
              </div>
            </button>

            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onTriggerMeditation();
              }}
              className="jade-surface-interactive min-h-[44px] px-2.5 lg:px-3 py-1 rounded-lg flex items-center cursor-pointer"
            >
              <div className="text-left">
                <div className="text-[11px] lg:text-xs font-bold text-[#2ec4b6] whitespace-nowrap">
                  Tụ Khí<span className="hidden xl:inline"> [G]</span>
                </div>
                <div className="font-mono-num text-[9px] text-[#a39e93] whitespace-nowrap">
                  {hud.cooldowns.meditate > 0 ? `${hud.cooldowns.meditate.toFixed(1)}s` : '+32% Khí'}
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
