export type CultivationPathId = 'kiem_tu' | 'the_tu' | 'hon_nguyen';

export interface CultivationPath {
  id: CultivationPathId;
  name: string;
  subtitle: string;
  description: string;
  attackMult: number;
  defenseMult: number;
  hpMult: number;
  speedMult: number;
  primaryColor: string;
}

export interface RealmTier {
  index: number;
  name: string;
  stageLabel: string;
  maxQi: number;
  baseMaxHp: number;
  baseAttack: number;
  baseDefense: number;
  passiveQiPerSec: number;
  baseBreakthroughChance: number;
  tribulationBolts: number;
}

export interface PillRecipe {
  id: string;
  name: string;
  effectLabel: string;
  herbCost: number;
  coreCost: number;
  stoneCost: number;
  qiGain: number;
  hpHealRatio: number;
  breakthroughBonus: number;
  permAttackBonus: number;
}

export interface ImmortalManual {
  id: string;
  name: string;
  grade: string;
  level: number;
  maxLevel: number;
  description: string;
  attackPerLevel: number;
  defensePerLevel: number;
  qiPerSecPerLevel: number;
  baseStoneCost: number;
}

export interface ImmortalArtifact {
  id: string;
  name: string;
  category: 'phap_bao' | 'linh_thu';
  grade: string;
  level: number;
  maxLevel: number;
  description: string;
  attackBonus: number;
  defenseBonus: number;
  hpBonus: number;
  critChancePct: number;
  lifeStealPct: number;
  stoneCost: number;
  coreCost: number;
  color: string;
}

export interface CultivationQuest {
  id: string;
  title: string;
  description: string;
  targetValue: number;
  metric: 'kills' | 'pillsCrafted' | 'realmIndex' | 'artifactsUnlocked';
  rewardStones: number;
  rewardHerbs: number;
  rewardCores: number;
  rewardQi: number;
  claimed: boolean;
}

export type EnemyArchetypeId = 'huyet_lang' | 'huyen_xa' | 'hac_hung' | 'yeu_vuong';

export interface EnemyArchetypeConfig {
  id: EnemyArchetypeId;
  name: string;
  policy: 'swarmer' | 'kiter' | 'charger' | 'boss_orbiter';
  radius: number;
  baseHp: number;
  baseDamage: number;
  speed: number;
  windupDuration: number;
  preferredRange: number;
  color: string;
  accentColor: string;
  qiDrop: number;
  stoneDrop: number;
}

export const CULTIVATION_PATHS: Record<CultivationPathId, CultivationPath> = {
  kiem_tu: {
    id: 'kiem_tu',
    name: 'Pháp Tu · Thanh Liên Kiếm Đạo',
    subtitle: 'Nhất niệm hóa vạn kiếm · Sát phạt đệ nhất',
    description: 'Chuyên tu phi kiếm và cửu thiên lôi pháp, sát thương tầm xa áp đảo và tốc độ xuất chiêu cực nhanh.',
    attackMult: 1.28,
    defenseMult: 0.95,
    hpMult: 1.0,
    speedMult: 1.12,
    primaryColor: '#2ec4b6',
  },
  the_tu: {
    id: 'the_tu',
    name: 'Thể Tu · Bất Diệt Kim Thân',
    subtitle: 'Nhục thân thành thánh · Vạn kiếp bất hoại',
    description: 'Tôi luyện huyết khí và kim thân bất hoại, sinh mệnh dồi dào, giảm mạnh sát thương từ lôi kiếp và yêu thú.',
    attackMult: 1.05,
    defenseMult: 1.38,
    hpMult: 1.35,
    speedMult: 1.0,
    primaryColor: '#e09f3e',
  },
  hon_nguyen: {
    id: 'hon_nguyen',
    name: 'Song Tu · Hỗn Nguyên Đạo Quả',
    subtitle: 'Pháp thể đồng tu · Âm dương vạn tượng',
    description: 'Dung hợp cả kiếm đạo lẫn kim thân, cân bằng công thủ và tăng tốc độ hấp thu linh khí thiên địa.',
    attackMult: 1.16,
    defenseMult: 1.16,
    hpMult: 1.15,
    speedMult: 1.08,
    primaryColor: '#9b5de5',
  },
};

export const REALMS: RealmTier[] = [
  {
    index: 0,
    name: 'Luyện Khí · Sơ Kỳ',
    stageLabel: 'Phàm Thai Nhập Đạo',
    maxQi: 180,
    baseMaxHp: 240,
    baseAttack: 28,
    baseDefense: 10,
    passiveQiPerSec: 8,
    baseBreakthroughChance: 85,
    tribulationBolts: 4,
  },
  {
    index: 1,
    name: 'Luyện Khí · Viên Mãn',
    stageLabel: 'Khí Quán Chu Thiên',
    maxQi: 340,
    baseMaxHp: 350,
    baseAttack: 42,
    baseDefense: 16,
    passiveQiPerSec: 14,
    baseBreakthroughChance: 78,
    tribulationBolts: 5,
  },
  {
    index: 2,
    name: 'Trúc Cơ · Chân Nhân',
    stageLabel: 'Đạo Cơ Vững Chắc',
    maxQi: 620,
    baseMaxHp: 520,
    baseAttack: 64,
    baseDefense: 25,
    passiveQiPerSec: 22,
    baseBreakthroughChance: 70,
    tribulationBolts: 6,
  },
  {
    index: 3,
    name: 'Kim Đan · Đại Đạo',
    stageLabel: 'Long Hổ Kết Đan',
    maxQi: 1100,
    baseMaxHp: 780,
    baseAttack: 95,
    baseDefense: 38,
    passiveQiPerSec: 36,
    baseBreakthroughChance: 64,
    tribulationBolts: 7,
  },
  {
    index: 4,
    name: 'Nguyên Anh · Lão Tổ',
    stageLabel: 'Phá Đan Thành Anh',
    maxQi: 1850,
    baseMaxHp: 1150,
    baseAttack: 140,
    baseDefense: 56,
    passiveQiPerSec: 55,
    baseBreakthroughChance: 58,
    tribulationBolts: 8,
  },
  {
    index: 5,
    name: 'Hóa Thần · Chí Tôn',
    stageLabel: 'Nguyên Thần Xuất Khiếu',
    maxQi: 2900,
    baseMaxHp: 1680,
    baseAttack: 205,
    baseDefense: 82,
    passiveQiPerSec: 85,
    baseBreakthroughChance: 52,
    tribulationBolts: 9,
  },
  {
    index: 6,
    name: 'Độ Kiếp · Bán Tiên',
    stageLabel: 'Nghịch Thiên Cải Mệnh',
    maxQi: 4500,
    baseMaxHp: 2450,
    baseAttack: 290,
    baseDefense: 118,
    passiveQiPerSec: 130,
    baseBreakthroughChance: 48,
    tribulationBolts: 9,
  },
  {
    index: 7,
    name: 'Chân Tiên · Vô Cực',
    stageLabel: 'Tiêu Dao Thiên Địa',
    maxQi: 9999,
    baseMaxHp: 3800,
    baseAttack: 420,
    baseDefense: 175,
    passiveQiPerSec: 220,
    baseBreakthroughChance: 100,
    tribulationBolts: 9,
  },
];

export const PILL_RECIPES: PillRecipe[] = [
  {
    id: 'tu_khi_dan',
    name: 'Tụ Khí Linh Đan',
    effectLabel: '+110 Tu Vi Linh Khí · Hồi 25% Khí Huyết',
    herbCost: 2,
    coreCost: 0,
    stoneCost: 15,
    qiGain: 110,
    hpHealRatio: 0.25,
    breakthroughBonus: 0,
    permAttackBonus: 0,
  },
  {
    id: 'truc_co_dan',
    name: 'Cửu Chuyển Phá Kiếp Đan',
    effectLabel: '+15% Tỷ lệ Độ Kiếp · Hồi 40% Khí Huyết',
    herbCost: 3,
    coreCost: 1,
    stoneCost: 30,
    qiGain: 60,
    hpHealRatio: 0.4,
    breakthroughBonus: 15,
    permAttackBonus: 2,
  },
  {
    id: 'long_huyet_dan',
    name: 'Long Huyết Tôi Thể Đan',
    effectLabel: '+8 Công Kích Vĩnh Viễn · Hồi 65% Khí Huyết',
    herbCost: 4,
    coreCost: 2,
    stoneCost: 45,
    qiGain: 80,
    hpHealRatio: 0.65,
    breakthroughBonus: 5,
    permAttackBonus: 8,
  },
];

export const INITIAL_MANUALS: ImmortalManual[] = [
  {
    id: 'thai_thuong',
    name: 'Thái Thượng Cảm Ứng Thiên',
    grade: 'Huyền Phẩm',
    level: 1,
    maxLevel: 10,
    description: 'Tâm pháp nhập môn của Vô Cực Tiên Đồ, dẫn linh khí thiên địa tuần hoàn quanh đan điền.',
    attackPerLevel: 5,
    defensePerLevel: 3,
    qiPerSecPerLevel: 4,
    baseStoneCost: 20,
  },
  {
    id: 'thanh_lien',
    name: 'Thanh Liên Kiếm Điển',
    grade: 'Địa Phẩm',
    level: 1,
    maxLevel: 10,
    description: 'Kiếm ý như sen xanh nở rộ giữa hư không, tăng mạnh sát thương phi kiếm và kiếm trận.',
    attackPerLevel: 10,
    defensePerLevel: 2,
    qiPerSecPerLevel: 3,
    baseStoneCost: 35,
  },
  {
    id: 'bat_diet',
    name: 'Bất Diệt Kim Thân Quyết',
    grade: 'Địa Phẩm',
    level: 1,
    maxLevel: 10,
    description: 'Rèn luyện nhục thân cứng tựa thần thiết, giảm chấn động khi trúng đòn của yêu vương và lôi kiếp.',
    attackPerLevel: 4,
    defensePerLevel: 8,
    qiPerSecPerLevel: 3,
    baseStoneCost: 35,
  },
  {
    id: 'cuu_thien_loi',
    name: 'Cửu Thiên Lôi Đế Kinh',
    grade: 'Thiên Phẩm',
    level: 0,
    maxLevel: 10,
    description: 'Thần thông thượng cổ ngự trị thiên lôi, biến uy lực sấm sét thành nguồn tu vi vô tận.',
    attackPerLevel: 14,
    defensePerLevel: 6,
    qiPerSecPerLevel: 7,
    baseStoneCost: 60,
  },
];

export const INITIAL_ARTIFACTS: ImmortalArtifact[] = [
  {
    id: 'thanh_van_kiem',
    name: 'Thanh Vân Tử Điện Kiếm',
    category: 'phap_bao',
    grade: 'Địa Phẩm Linh Bảo',
    level: 1,
    maxLevel: 8,
    description: 'Bản mệnh phi kiếm ẩn chứa tử lôi thiên địa, tăng mạnh uy lực trảm kích và tỷ lệ bạo kích.',
    attackBonus: 14,
    defenseBonus: 3,
    hpBonus: 40,
    critChancePct: 8,
    lifeStealPct: 0,
    stoneCost: 30,
    coreCost: 1,
    color: '#2ec4b6',
  },
  {
    id: 'cuu_long_trao',
    name: 'Cửu Long Thần Hỏa Tráo',
    category: 'phap_bao',
    grade: 'Thiên Phẩm Linh Bảo',
    level: 0,
    maxLevel: 8,
    description: 'Chí bảo luyện hóa từ chín đạo long hồn, vừa hộ thể kiên cố vừa hấp thu huyết khí yêu thú.',
    attackBonus: 9,
    defenseBonus: 12,
    hpBonus: 110,
    critChancePct: 4,
    lifeStealPct: 5,
    stoneCost: 45,
    coreCost: 1,
    color: '#e9c46a',
  },
  {
    id: 'huyen_hoa_ky_lan',
    name: 'Linh Thú · Huyền Hỏa Kỳ Lân',
    category: 'linh_thu',
    grade: 'Thượng Cổ Thần Thú',
    level: 1,
    maxLevel: 8,
    description: 'Thần thú đồng hành lượn quanh tu sĩ, tự động phun Kỳ Lân Chân Hỏa thiêu đốt yêu thú mỗi 1.8 giây.',
    attackBonus: 18,
    defenseBonus: 6,
    hpBonus: 80,
    critChancePct: 6,
    lifeStealPct: 3,
    stoneCost: 40,
    coreCost: 1,
    color: '#f72585',
  },
  {
    id: 'thai_cuc_do',
    name: 'Hỗn Nguyên Thái Cực Đồ',
    category: 'phap_bao',
    grade: 'Tiên Thiên Chí Bảo',
    level: 0,
    maxLevel: 8,
    description: 'Trấn áp khí vận âm dương, hóa giải sát kiếp và gia tăng toàn diện công thủ lẫn bạo kích.',
    attackBonus: 22,
    defenseBonus: 16,
    hpBonus: 150,
    critChancePct: 10,
    lifeStealPct: 4,
    stoneCost: 65,
    coreCost: 2,
    color: '#c77dff',
  },
];

export const INITIAL_QUESTS: CultivationQuest[] = [
  {
    id: 'q_kill_5',
    title: 'Trừ Ma Vệ Đạo · Sơ Khởi',
    description: 'Tiêu diệt 5 Yêu Thú trong Bí Cảnh Thủy Mặc',
    targetValue: 5,
    metric: 'kills',
    rewardStones: 80,
    rewardHerbs: 3,
    rewardCores: 1,
    rewardQi: 90,
    claimed: false,
  },
  {
    id: 'q_pill_1',
    title: 'Đan Đạo Khởi Nguyên',
    description: 'Luyện chế thành công 1 viên Tiên Đan tại Đan Phòng',
    targetValue: 1,
    metric: 'pillsCrafted',
    rewardStones: 70,
    rewardHerbs: 2,
    rewardCores: 2,
    rewardQi: 110,
    claimed: false,
  },
  {
    id: 'q_artifact_2',
    title: 'Tế Luyện Bản Mệnh Bảo Vật',
    description: 'Đạt tổng cộng 3 cấp Pháp Bảo & Linh Thú trở lên',
    targetValue: 3,
    metric: 'artifactsUnlocked',
    rewardStones: 110,
    rewardHerbs: 4,
    rewardCores: 2,
    rewardQi: 150,
    claimed: false,
  },
  {
    id: 'q_realm_1',
    title: 'Nghịch Thiên Phá Kiếp',
    description: 'Độ Kiếp đột phá thành công lên Luyện Khí · Viên Mãn',
    targetValue: 1,
    metric: 'realmIndex',
    rewardStones: 160,
    rewardHerbs: 5,
    rewardCores: 3,
    rewardQi: 220,
    claimed: false,
  },
];

export const ENEMY_ARCHETYPES: Record<EnemyArchetypeId, EnemyArchetypeConfig> = {
  huyet_lang: {
    id: 'huyet_lang',
    name: 'Huyết Lang Yêu',
    policy: 'swarmer',
    radius: 17,
    baseHp: 75,
    baseDamage: 18,
    speed: 132,
    windupDuration: 0.42,
    preferredRange: 34,
    color: '#c1121f',
    accentColor: '#ffccd5',
    qiDrop: 24,
    stoneDrop: 8,
  },
  huyen_xa: {
    id: 'huyen_xa',
    name: 'Huyền Minh Độc Xà',
    policy: 'kiter',
    radius: 16,
    baseHp: 62,
    baseDamage: 22,
    speed: 112,
    windupDuration: 0.55,
    preferredRange: 230,
    color: '#2a9d8f',
    accentColor: '#a8dadc',
    qiDrop: 30,
    stoneDrop: 11,
  },
  hac_hung: {
    id: 'hac_hung',
    name: 'Thiết Giáp Hắc Hùng',
    policy: 'charger',
    radius: 23,
    baseHp: 145,
    baseDamage: 32,
    speed: 92,
    windupDuration: 0.68,
    preferredRange: 175,
    color: '#bc6c25',
    accentColor: '#dda15e',
    qiDrop: 45,
    stoneDrop: 16,
  },
  yeu_vuong: {
    id: 'yeu_vuong',
    name: 'Cửu U Yêu Vương',
    policy: 'boss_orbiter',
    radius: 34,
    baseHp: 560,
    baseDamage: 46,
    speed: 98,
    windupDuration: 0.75,
    preferredRange: 160,
    color: '#7209b7',
    accentColor: '#f72585',
    qiDrop: 190,
    stoneDrop: 65,
  },
};

export function computeCultivatorStats(
  realmIndex: number,
  pathId: CultivationPathId,
  manuals: ImmortalManual[],
  permAttackBonus: number,
  spiritualRootLevel: number,
  artifacts: ImmortalArtifact[] = []
): {
  maxHp: number;
  attack: number;
  defense: number;
  passiveQiPerSec: number;
  moveSpeed: number;
  critChancePct: number;
  lifeStealPct: number;
} {
  const safeIndex = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
  const realm = REALMS[safeIndex];
  const path = CULTIVATION_PATHS[pathId] ?? CULTIVATION_PATHS.kiem_tu;

  let manualAtk = 0;
  let manualDef = 0;
  let manualQi = 0;

  for (const m of manuals) {
    if (m.level > 0) {
      manualAtk += m.attackPerLevel * m.level;
      manualDef += m.defensePerLevel * m.level;
      manualQi += m.qiPerSecPerLevel * m.level;
    }
  }

  let artAtk = 0;
  let artDef = 0;
  let artHp = 0;
  let critChancePct = pathId === 'kiem_tu' ? 15 : 8;
  let lifeStealPct = pathId === 'the_tu' ? 4 : 0;

  for (const art of artifacts) {
    if (art.level > 0) {
      artAtk += art.attackBonus * art.level;
      artDef += art.defenseBonus * art.level;
      artHp += art.hpBonus * art.level;
      critChancePct += art.critChancePct + (art.level - 1) * 2;
      lifeStealPct += art.lifeStealPct + (art.level - 1);
    }
  }

  const rootMultiplier = 1 + Math.max(0, spiritualRootLevel - 1) * 0.12;

  const maxHp = Math.round((realm.baseMaxHp + manualDef * 8 + artHp) * path.hpMult);
  const attack = Math.round((realm.baseAttack + manualAtk + artAtk + permAttackBonus) * path.attackMult);
  const defense = Math.round((realm.baseDefense + manualDef + artDef) * path.defenseMult);
  const passiveQiPerSec = Math.round(
    (realm.passiveQiPerSec + manualQi) * rootMultiplier * (pathId === 'hon_nguyen' ? 1.2 : 1.0)
  );
  const moveSpeed = Math.round(235 * path.speedMult);

  return {
    maxHp,
    attack,
    defense,
    passiveQiPerSec,
    moveSpeed,
    critChancePct: Math.min(75, critChancePct),
    lifeStealPct: Math.min(35, lifeStealPct),
  };
}

export function calculateDamage(rawAttack: number, targetDefense: number, skillMultiplier = 1.0): number {
  const effectiveAtk = Math.max(1, rawAttack * skillMultiplier);
  const mitigation = 100 / (100 + Math.max(0, targetDefense));
  return Math.max(1, Math.round(effectiveAtk * mitigation));
}

export function calculateBreakthroughChance(realmIndex: number, pillBonus: number, defense: number): number {
  const safeIndex = Math.max(0, Math.min(REALMS.length - 1, realmIndex));
  const base = REALMS[safeIndex].baseBreakthroughChance;
  const defBonus = Math.min(15, Math.floor(defense / 12));
  return Math.max(15, Math.min(100, base + pillBonus + defBonus));
}

export function applyPassiveCultivation(
  currentQi: number,
  maxQi: number,
  passiveQiPerSec: number,
  dtSeconds: number
): number {
  if (dtSeconds <= 0 || passiveQiPerSec <= 0) return currentQi;
  const clampedDt = Math.min(dtSeconds, 0.05);
  return Math.min(maxQi, currentQi + passiveQiPerSec * clampedDt);
}

export function canCraftPill(
  recipe: PillRecipe,
  inventory: { herbs: number; beastCores: number; spiritStones: number }
): boolean {
  return (
    inventory.herbs >= recipe.herbCost &&
    inventory.beastCores >= recipe.coreCost &&
    inventory.spiritStones >= recipe.stoneCost
  );
}

export function getManualUpgradeCost(manual: ImmortalManual): number {
  return Math.round(manual.baseStoneCost * Math.pow(1.45, manual.level));
}

export function getArtifactUpgradeCost(artifact: ImmortalArtifact): {
  stoneCost: number;
  coreCost: number;
} {
  return {
    stoneCost: Math.round(artifact.stoneCost * Math.pow(1.4, artifact.level)),
    coreCost: Math.max(1, artifact.coreCost + Math.floor(artifact.level / 2)),
  };
}

export function screenToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
  cameraX: number,
  cameraY: number
): { worldX: number; worldY: number } {
  const safeWidth = rect.width > 0 ? rect.width : 1440;
  const safeHeight = rect.height > 0 ? rect.height : 900;
  const localX = clientX - rect.left - safeWidth * 0.5;
  const localY = clientY - rect.top - safeHeight * 0.5;
  return {
    worldX: cameraX + localX,
    worldY: cameraY + localY,
  };
}
