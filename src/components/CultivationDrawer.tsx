import React, { useState } from 'react';
import {
  CULTIVATION_PATHS,
  CultivationPathId,
  CultivationQuest,
  ImmortalArtifact,
  ImmortalManual,
  PILL_RECIPES,
  PillRecipe,
  REALMS,
  canCraftPill,
  getArtifactUpgradeCost,
  getManualUpgradeCost,
} from '../game/rules';
import { LiveHudSnapshot } from './CanvasArena';
import { DrawerTabId } from './HudOverlay';
import { usePWAInstall } from '../utils/usePWAInstall';

interface CultivationDrawerProps {
  activeTab: DrawerTabId;
  onClose: () => void;
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
  spiritualRootLevel: number;
  breakthroughChance: number;
  manuals: ImmortalManual[];
  artifacts: ImmortalArtifact[];
  quests: CultivationQuest[];
  pillsCraftedCount: number;
  onUpgradeRoot: () => void;
  onStartTribulation: () => void;
  onCraftPill: (recipe: PillRecipe) => void;
  onUpgradeArtifact: (artifactId: string) => void;
  onUpgradeManual: (manualId: string) => void;
  onAddCustomManual: (manual: ImmortalManual) => void;
  onClaimQuest: (questId: string) => void;
  onApplyGeminiReward: (stones: number, herbs: number, qi: number, breakthroughAdd: number) => void;
}

const AVATAR_PATH = '/src/assets/images/cultivator_avatar_1794497143525.jpg';
const CAULDRON_PATH = '/src/assets/images/alchemy_cauldron_1794497144248.jpg';

export const CultivationDrawer: React.FC<CultivationDrawerProps> = ({
  activeTab,
  onClose,
  hud,
  pathId,
  computedStats,
  spiritualRootLevel,
  breakthroughChance,
  manuals,
  artifacts,
  quests,
  pillsCraftedCount,
  onUpgradeRoot,
  onStartTribulation,
  onCraftPill,
  onUpgradeArtifact,
  onUpgradeManual,
  onAddCustomManual,
  onClaimQuest,
  onApplyGeminiReward,
}) => {
  const [avatarImgErr, setAvatarImgErr] = useState(false);
  const [cauldronImgErr, setCauldronImgErr] = useState(false);
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copiedCmd, setCopiedCmd] = useState(false);

  const [encounterLoading, setEncounterLoading] = useState(false);
  const [encounterText, setEncounterText] = useState<string | null>(null);
  const [encounterError, setEncounterError] = useState<string | null>(null);

  const [manualConcept, setManualConcept] = useState('');
  const [manualConceptError, setManualConceptError] = useState<string | null>(null);
  const [forgingManual, setForgingManual] = useState(false);
  const [forgedSuccessMsg, setForgedSuccessMsg] = useState<string | null>(null);

  const [deduceQuestion, setDeduceQuestion] = useState(
    'Làm sao để vượt Cửu Trọng Lôi Kiếp và tối ưu hóa Pháp Bảo ở cảnh giới hiện tại?'
  );
  const [deduceError, setDeduceError] = useState<string | null>(null);
  const [deducing, setDeducing] = useState(false);
  const [deductionResult, setDeductionResult] = useState<{
    modelUsed: string;
    deduction: string;
  } | null>(null);

  if (!activeTab) return null;

  const currentRealm = REALMS[hud.realmIndex] ?? REALMS[0];
  const nextRealm = REALMS[Math.min(REALMS.length - 1, hud.realmIndex + 1)];
  const pathInfo = CULTIVATION_PATHS[pathId];
  const rootUpgradeCost = Math.round(35 * Math.pow(1.5, spiritualRootLevel - 1));
  const totalArtifactLevels = artifacts.reduce((acc, a) => acc + a.level, 0);

  const getQuestProgress = (q: CultivationQuest): number => {
    if (q.metric === 'kills') return hud.kills;
    if (q.metric === 'pillsCrafted') return pillsCraftedCount;
    if (q.metric === 'realmIndex') return hud.realmIndex;
    if (q.metric === 'artifactsUnlocked') return totalArtifactLevels;
    return 0;
  };

  const handleTriggerEncounter = async () => {
    setEncounterLoading(true);
    setEncounterError(null);
    try {
      const res = await fetch('/api/gemini/encounter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmName: currentRealm.name,
          wave: hud.wave,
        }),
      });
      if (!res.ok) throw new Error('Không thể kết nối Linh Thư');
      const data = await res.json();
      setEncounterText(data.eventText);
      if (data.reward) {
        onApplyGeminiReward(
          data.reward.spiritStones ?? 25,
          data.reward.herbs ?? 2,
          data.reward.qi ?? 50,
          0
        );
      }
    } catch (_err) {
      setEncounterError('Linh khí thiên địa đang nhiễu động, vui lòng thử lại sau.');
    } finally {
      setEncounterLoading(false);
    }
  };

  const handleForgeManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualConcept.trim();
    if (!trimmed || trimmed.length < 4) {
      setManualConceptError('Vui lòng nhập ý niệm đạo pháp (ít nhất 4 ký tự).');
      return;
    }
    setManualConceptError(null);
    setForgingManual(true);
    setForgedSuccessMsg(null);

    try {
      const res = await fetch('/api/gemini/forge-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept: trimmed,
          pathName: pathInfo.name,
          realmName: currentRealm.name,
        }),
      });
      if (!res.ok) throw new Error('Lỗi sáng tạo công pháp');
      const data = await res.json();
      const m = data.manual;
      const newManual: ImmortalManual = {
        id: `custom_${Date.now()}`,
        name: m.name,
        grade: m.grade,
        level: 1,
        maxLevel: 10,
        description: m.description,
        attackPerLevel: m.attackBonus,
        defensePerLevel: m.defenseBonus,
        qiPerSecPerLevel: m.qiRateBonus,
        baseStoneCost: 45,
      };
      onAddCustomManual(newManual);
      setManualConcept('');
      setForgedSuccessMsg(`Đã lĩnh ngộ "${newManual.name}" (${data.modelUsed})!`);
    } catch (_err) {
      setManualConceptError('Không thể lĩnh ngộ công pháp lúc này, hãy thử lại.');
    } finally {
      setForgingManual(false);
    }
  };

  const handleRunDeduction = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = deduceQuestion.trim();
    if (!trimmed) {
      setDeduceError('Vui lòng nhập câu hỏi thỉnh giáo Thiên Cơ Lão Nhân.');
      return;
    }
    setDeduceError(null);
    setDeducing(true);

    try {
      const res = await fetch('/api/gemini/deduce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          realmName: currentRealm.name,
          pathName: pathInfo.name,
          question: trimmed,
          stats: {
            attack: computedStats.attack,
            defense: computedStats.defense,
            maxHp: computedStats.maxHp,
            breakthroughBonus: breakthroughChance,
          },
        }),
      });
      if (!res.ok) throw new Error('Thiên cơ bất khả lộ');
      const data = await res.json();
      setDeductionResult({
        modelUsed: data.modelUsed,
        deduction: data.deduction,
      });
      if (data.blessingBonus) {
        onApplyGeminiReward(0, 0, data.blessingBonus.qiGain ?? 45, data.blessingBonus.breakthroughBonus ?? 5);
      }
    } catch (_err) {
      setDeduceError('Không thể kết nối Thiên Cơ Các lúc này.');
    } finally {
      setDeducing(false);
    }
  };

  return (
    <aside
      aria-label="Bảng điều khiển Tu Tiên Vô Cực"
      className="fixed top-2 sm:top-16 right-2 sm:right-4 bottom-2 sm:bottom-20 z-30 w-[94vw] max-w-[460px] jade-surface rounded-2xl p-4 sm:p-5 flex flex-col justify-between overflow-y-auto pointer-events-auto"
    >
      <div className="space-y-4">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-[#d4af6a]/20 pb-2.5">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-[#f4e4bc]">
              {activeTab === 'dong_phu' && '01. Động Phủ · Căn Cơ & Nhiệm Vụ'}
              {activeTab === 'dan_phong' && '02. Đan Phòng · Cửu Long Đan Lô'}
              {activeTab === 'phap_bao' && '03. Pháp Bảo & Thần Thú Đồng Hành'}
              {activeTab === 'tang_kinh' && '04. Tàng Kinh Các · Cổ Kinh & AI'}
              {activeTab === 'thien_co' && '05. Thiên Cơ Các & Build App GitHub'}
            </h2>
            <p className="text-xs text-[#a39e93]">
              {currentRealm.name} · {currentRealm.stageLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng bảng tu luyện"
            className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-semibold text-[#ece5d5] bg-[#14262e] hover:bg-[#1c3540] border border-[#d4af6a]/30 cursor-pointer"
          >
            Đóng
          </button>
        </div>

        {/* TAB 1: ĐỘNG PHỦ, CHÂN DUNG TU SĨ & NHIỆM VỤ TIÊN ĐỒ */}
        {activeTab === 'dong_phu' && (
          <div className="space-y-3.5">
            {/* Showcase Cultivator Guofeng Portrait & Core Stats */}
            <div className="flex items-center gap-3.5 bg-[#070e12] p-3 rounded-xl border border-[#d4af6a]/25">
              <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-[#d4af6a] shrink-0 bg-[#102027]">
                {!avatarImgErr && (
                  <img
                    src={AVATAR_PATH}
                    alt="Chân dung Tu Sĩ"
                    referrerPolicy="no-referrer"
                    onError={() => setAvatarImgErr(true)}
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                <div>
                  <span className="text-[#a39e93]">Công Kích: </span>
                  <span className="font-mono-num font-bold text-[#ece5d5]">{computedStats.attack}</span>
                </div>
                <div>
                  <span className="text-[#a39e93]">Phòng Ngự: </span>
                  <span className="font-mono-num font-bold text-[#ece5d5]">{computedStats.defense}</span>
                </div>
                <div>
                  <span className="text-[#a39e93]">Bạo Kích: </span>
                  <span className="font-mono-num font-bold text-[#e9c46a]">{computedStats.critChancePct ?? 15}%</span>
                </div>
                <div>
                  <span className="text-[#a39e93]">Hút Huyết: </span>
                  <span className="font-mono-num font-bold text-[#52b788]">{computedStats.lifeStealPct ?? 0}%</span>
                </div>
                <div>
                  <span className="text-[#a39e93]">Tụ Khí: </span>
                  <span className="font-mono-num font-bold text-[#2ec4b6]">+{computedStats.passiveQiPerSec}/s</span>
                </div>
                <div>
                  <span className="text-[#a39e93]">Độ Kiếp: </span>
                  <span className="font-mono-num font-bold text-[#f4e4bc]">{breakthroughChance}%</span>
                </div>
              </div>
            </div>

            {/* Upgrade Spiritual Root & Breakthrough */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="p-3 rounded-xl bg-[#0d1920] border border-[#2ec4b6]/25 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#ece5d5]">Linh Căn Bậc {spiritualRootLevel}</span>
                  <span className="font-mono-num text-[11px] text-[#e9c46a]">{rootUpgradeCost} Thạch</span>
                </div>
                <button
                  type="button"
                  disabled={hud.spiritStones < rootUpgradeCost}
                  onClick={onUpgradeRoot}
                  className="w-full min-h-[40px] py-1.5 px-3 rounded-lg text-xs font-bold bg-[#2ec4b6] text-[#060a0d] disabled:opacity-40 cursor-pointer"
                >
                  Tẩy Tủy (+12% Tụ Khí)
                </button>
              </div>

              <div className="p-3 rounded-xl bg-[#141c24] border border-[#d4af6a]/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#f4e4bc] truncate">Lên: {nextRealm.name}</span>
                  <span className="font-mono-num text-[11px] text-[#2ec4b6]">{Math.floor((hud.qi / currentRealm.maxQi) * 100)}%</span>
                </div>
                <button
                  type="button"
                  disabled={hud.qi < currentRealm.maxQi || hud.tribulation.active}
                  onClick={() => {
                    onStartTribulation();
                    onClose();
                  }}
                  className="w-full min-h-[40px] py-1.5 px-3 rounded-lg text-xs font-bold bg-[#d4af6a] text-[#090d11] disabled:opacity-40 cursor-pointer"
                >
                  {hud.qi >= currentRealm.maxQi ? 'Khởi Động Độ Kiếp' : `Cần ${currentRealm.maxQi} Tu Vi`}
                </button>
              </div>
            </div>

            {/* Nhiệm Vụ Tiên Đồ (Sect Quests) */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#d4af6a]">
                NHIỆM VỤ TIÊN ĐỒ · THƯỞNG LINH THẠCH & TU VI
              </div>
              {quests.map((q) => {
                const prog = getQuestProgress(q);
                const ready = prog >= q.targetValue && !q.claimed;
                return (
                  <div
                    key={q.id}
                    className="p-2.5 rounded-xl bg-[#0b151b] border border-[#d4af6a]/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-[#ece5d5] truncate">
                        {q.title} ({Math.min(prog, q.targetValue)}/{q.targetValue})
                      </div>
                      <div className="text-[11px] text-[#a39e93] truncate">{q.description}</div>
                      <div className="font-mono-num text-[10px] text-[#2ec4b6]">
                        Thưởng: +{q.rewardStones} Thạch · +{q.rewardHerbs} Thảo · +{q.rewardQi} Tu Vi
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimQuest(q.id)}
                      className={`min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                        q.claimed
                          ? 'bg-[#111e24] text-[#a39e93]'
                          : ready
                            ? 'bg-[#e9c46a] text-[#090d11]'
                            : 'bg-[#111e24] text-[#a39e93] opacity-50'
                      }`}
                    >
                      {q.claimed ? 'Đã Nhận' : 'Nhận Thưởng'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Fast Gemini 3.1 Flash-Lite Secret Realm Encounter */}
            <div className="p-3 rounded-xl bg-[#0a1318] border border-[#d4af6a]/20 space-y-2">
              <div className="text-xs font-semibold text-[#d4af6a]">
                DU NGOẠN KỲ NGỘ · GEMINI 3.1 FLASH-LITE
              </div>
              {encounterText && (
                <p className="text-xs text-[#ece5d5] leading-relaxed bg-[#112028] p-2.5 rounded-lg">
                  {encounterText}
                </p>
              )}
              {encounterError && <p className="text-xs text-[#e63946]">{encounterError}</p>}
              <button
                type="button"
                disabled={encounterLoading}
                onClick={handleTriggerEncounter}
                className="w-full min-h-[40px] py-2 px-4 rounded-lg text-xs font-semibold border border-[#d4af6a]/50 text-[#f4e4bc] hover:bg-[#162730] cursor-pointer"
              >
                {encounterLoading ? 'Đang Cảm Ứng Thiên Địa...' : 'Tìm Kiếm Tiên Duyên (+Linh Thạch & Tu Vi)'}
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ĐAN PHÒNG LUYỆN ĐAN */}
        {activeTab === 'dan_phong' && (
          <div className="space-y-3.5">
            <div className="relative h-40 rounded-xl overflow-hidden border-2 border-[#d4af6a]/40 bg-[#081014] flex items-center justify-center">
              {!cauldronImgErr ? (
                <img
                  src={CAULDRON_PATH}
                  alt="Cửu Long Luyện Đan Lô"
                  referrerPolicy="no-referrer"
                  onError={() => setCauldronImgErr(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="text-xs text-[#d4af6a]">Cửu Long Thần Hỏa Đan Lô</div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#090d11] via-[#090d11]/20 to-transparent" />
              <div className="absolute bottom-2.5 left-3 right-3 flex justify-between text-xs font-mono-num font-semibold text-[#f4e4bc]">
                <span>Linh Thảo: {hud.herbs.toFixed(0)}</span>
                <span>Yêu Đan: {hud.beastCores.toFixed(0)}</span>
                <span>Linh Thạch: {hud.spiritStones.toFixed(0)}</span>
              </div>
            </div>

            <div className="space-y-2.5">
              {PILL_RECIPES.map((recipe) => {
                const craftable = canCraftPill(recipe, {
                  herbs: hud.herbs,
                  beastCores: hud.beastCores,
                  spiritStones: hud.spiritStones,
                });
                return (
                  <div
                    key={recipe.id}
                    className="p-3 rounded-xl bg-[#0d181e] border border-[#d4af6a]/20 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-[#f4e4bc]">{recipe.name}</div>
                      <div className="font-mono-num text-[11px] text-[#a39e93]">
                        {recipe.herbCost} Thảo · {recipe.coreCost} Đan · {recipe.stoneCost} Thạch
                      </div>
                    </div>
                    <div className="text-xs text-[#2ec4b6]">{recipe.effectLabel}</div>
                    <button
                      type="button"
                      disabled={!craftable}
                      onClick={() => onCraftPill(recipe)}
                      className="w-full min-h-[42px] py-2 px-3 rounded-lg text-xs font-bold bg-[#d4af6a] text-[#090d11] disabled:opacity-40 cursor-pointer"
                    >
                      Khai Lô Luyện Đan
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: PHÁP BẢO & LINH THÚ ĐỒNG HÀNH */}
        {activeTab === 'phap_bao' && (
          <div className="space-y-3">
            <div className="p-2.5 rounded-xl bg-[#091318] border border-[#d4af6a]/20 flex justify-between text-xs font-mono-num">
              <span className="text-[#e9c46a]">Linh Thạch: {hud.spiritStones.toFixed(0)}</span>
              <span className="text-[#f72585]">Yêu Đan: {hud.beastCores.toFixed(0)}</span>
            </div>

            {artifacts.map((art) => {
              const cost = getArtifactUpgradeCost(art);
              const canUp =
                hud.spiritStones >= cost.stoneCost &&
                hud.beastCores >= cost.coreCost &&
                art.level < art.maxLevel;
              return (
                <div
                  key={art.id}
                  className="p-3 rounded-xl bg-[#0d181e] border border-[#d4af6a]/25 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-[#f4e4bc]">
                      {art.name} · Bậc {art.level}/{art.maxLevel}
                    </span>
                    <span className="text-[11px] text-[#e9c46a]">{art.grade}</span>
                  </div>
                  <p className="text-xs text-[#a39e93] leading-snug">{art.description}</p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono-num text-[11px] text-[#2ec4b6]">
                      +{art.attackBonus} Công · +{art.defenseBonus} Thủ · +{art.critChancePct}% Bạo
                    </span>
                    <button
                      type="button"
                      disabled={!canUp}
                      onClick={() => onUpgradeArtifact(art.id)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[#d4af6a] text-[#090d11] disabled:opacity-40 cursor-pointer whitespace-nowrap"
                    >
                      {art.level === 0 ? 'Khai Mở' : 'Tế Luyện'} ({cost.stoneCost} Thạch · {cost.coreCost} Đan)
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 4: TÀNG KINH CÁC (CÔNG PHÁP & GEMINI 4 ARGON) */}
        {activeTab === 'tang_kinh' && (
          <div className="space-y-3.5">
            <div className="space-y-2">
              {manuals.map((m) => {
                const cost = getManualUpgradeCost(m);
                const canUp = hud.spiritStones >= cost && m.level < m.maxLevel;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-[#0d181e] border border-[#d4af6a]/20 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-[#f4e4bc]">
                        {m.name} · Tầng {m.level}/{m.maxLevel}
                      </span>
                      <span className="text-[11px] text-[#d4af6a]">{m.grade}</span>
                    </div>
                    <p className="text-xs text-[#a39e93] leading-snug">{m.description}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="font-mono-num text-[11px] text-[#2ec4b6]">
                        +{m.attackPerLevel} Công · +{m.defensePerLevel} Thủ · +{m.qiPerSecPerLevel} Khí/s
                      </span>
                      <button
                        type="button"
                        disabled={!canUp}
                        onClick={() => onUpgradeManual(m.id)}
                        className="min-h-[38px] px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2ec4b6] text-[#060a0d] disabled:opacity-40 cursor-pointer"
                      >
                        Lĩnh Ngộ ({cost} Thạch)
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <form
              onSubmit={handleForgeManual}
              className="p-3.5 rounded-xl bg-[#081116] border border-[#2ec4b6]/30 space-y-2.5"
            >
              <div className="text-xs font-semibold text-[#2ec4b6]">
                SÁNG TẠO CÔNG PHÁP · GEMINI 4 ARGON
              </div>
              <label htmlFor="manual-concept-input" className="block text-xs text-[#a39e93]">
                Nhập ý niệm đạo pháp để Gemini 4 Argon diễn hóa thành bí tịch mới:
              </label>
              <input
                id="manual-concept-input"
                type="text"
                value={manualConcept}
                onChange={(e) => setManualConcept(e.target.value)}
                placeholder="Ví dụ: Kiếm khí băng hà đóng băng vạn dặm..."
                className="w-full px-3 py-2 rounded-lg bg-[#0e1b22] border border-[#d4af6a]/30 text-xs text-[#ece5d5] focus:outline-none focus:border-[#2ec4b6]"
              />
              {manualConceptError && <div className="text-xs text-[#e63946]">{manualConceptError}</div>}
              {forgedSuccessMsg && <div className="text-xs text-[#52b788]">{forgedSuccessMsg}</div>}
              <button
                type="submit"
                disabled={forgingManual}
                className="w-full min-h-[40px] py-2 px-4 rounded-lg text-xs font-bold bg-[#d4af6a] text-[#090d11] cursor-pointer"
              >
                {forgingManual ? 'Đang Diễn Hóa Đạo Văn...' : 'Khai Sáng Bí Tịch Mới'}
              </button>
            </form>
          </div>
        )}

        {/* TAB 5: THIÊN CƠ CÁC (GEMINI 4 CARBON) & CÀI ĐẶT APP / GITHUB BUILD */}
        {activeTab === 'thien_co' && (
          <div className="space-y-4">
            {/* In-App Mobile PWA Install & GitHub Actions APK Build Section */}
            <div className="p-3.5 rounded-xl bg-[#0e1d24] border border-[#2ec4b6]/40 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-[#2ec4b6]">
                  CÀI ĐẶT APP MOBILE & BUILD APK TRÊN GITHUB
                </div>
                <span className="text-[11px] text-[#e9c46a]">Màn Hình Ngang</span>
              </div>
              <p className="text-xs text-[#c5beb0] leading-relaxed">
                Trò chơi đã tích hợp chuẩn **PWA Fullscreen Landscape** và cấu hình **GitHub Actions CI/CD** (`.github/workflows/build-app.yml` + `capacitor.config.json`) tự động đóng gói **Android APK** và **Web App** khi đẩy lên GitHub.
              </p>

              <div className="flex flex-wrap gap-2">
                {!isInstalled && isInstallable && (
                  <button
                    type="button"
                    onClick={install}
                    className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-[#2ec4b6] text-[#060a0d] font-bold text-xs cursor-pointer"
                  >
                    Cài Đặt App Ngay (PWA)
                  </button>
                )}
                {isIOS && !isInstalled && (
                  <div className="w-full text-[11px] text-[#e9c46a] bg-[#081116] p-2 rounded">
                    Trên iPhone/iPad: Nhấn nút <strong>Chia sẻ (Share)</strong> trên Safari · chọn <strong>Thêm vào Màn hình chính</strong>.
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      'git add . && git commit -m "Release Nhat Niem Vo Cuc Mobile App" && git push origin main'
                    );
                    setCopiedCmd(true);
                    setTimeout(() => setCopiedCmd(false), 2500);
                  }}
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-lg bg-[#162b34] border border-[#d4af6a]/40 text-[#f4e4bc] font-semibold text-xs cursor-pointer"
                >
                  {copiedCmd ? 'Đã Sao Chép Lệnh GitHub!' : 'Sao Chép Lệnh Push GitHub Build APK'}
                </button>
              </div>
            </div>

            {/* Thiên Cơ Thôi Diễn (gemini-4-carbon + ThinkingLevel.HIGH) */}
            <div className="p-3 rounded-xl bg-[#0d181e] border border-[#d4af6a]/25 space-y-2">
              <div className="text-xs font-semibold text-[#e9c46a]">
                THIÊN CƠ THÔI DIỄN · GEMINI 4 CARBON (HIGH THINKING)
              </div>
              <form onSubmit={handleRunDeduction} className="space-y-2">
                <label htmlFor="deduce-question-input" className="block text-xs text-[#a39e93]">
                  Thỉnh giáo Thiên Cơ Lão Nhân (+45 Tu Vi · +5% Độ Kiếp):
                </label>
                <textarea
                  id="deduce-question-input"
                  rows={2}
                  value={deduceQuestion}
                  onChange={(e) => setDeduceQuestion(e.target.value)}
                  className="w-full p-2.5 rounded-lg bg-[#081116] border border-[#d4af6a]/30 text-xs text-[#ece5d5] focus:outline-none focus:border-[#d4af6a]"
                />
                {deduceError && <div className="text-xs text-[#e63946]">{deduceError}</div>}
                <button
                  type="submit"
                  disabled={deducing}
                  className="w-full min-h-[42px] py-2 px-4 rounded-lg text-xs font-bold bg-[#d4af6a] hover:bg-[#e9c46a] text-[#090d11] cursor-pointer"
                >
                  {deducing ? 'Thiên Cơ Lão Nhân Đang Suy Luận Sâu...' : 'Khởi Động Thiên Cơ Thôi Diễn'}
                </button>
              </form>

              {deductionResult && (
                <div className="p-3 rounded-lg bg-[#081116] border border-[#2ec4b6]/35 space-y-1.5 mt-2">
                  <div className="text-[11px] text-[#2ec4b6] font-mono-num">
                    Pháp Trận: {deductionResult.modelUsed}
                  </div>
                  <div className="text-xs text-[#ece5d5] whitespace-pre-line leading-relaxed">
                    {deductionResult.deduction}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
