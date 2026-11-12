import test from 'node:test';
import assert from 'node:assert/strict';
import {
  REALMS,
  PILL_RECIPES,
  INITIAL_MANUALS,
  INITIAL_ARTIFACTS,
  computeCultivatorStats,
  calculateDamage,
  calculateBreakthroughChance,
  applyPassiveCultivation,
  canCraftPill,
  getManualUpgradeCost,
  getArtifactUpgradeCost,
  STORY_CHAPTERS,
  getChapterProgress,
  computeCombatPower,
  screenToWorld,
} from './rules';

test('computeCultivatorStats scales by cultivation path, manuals, and artifacts', () => {
  const kiemStats = computeCultivatorStats(0, 'kiem_tu', INITIAL_MANUALS, 0, 1, INITIAL_ARTIFACTS);
  const theStats = computeCultivatorStats(0, 'the_tu', INITIAL_MANUALS, 0, 1, INITIAL_ARTIFACTS);

  assert.equal(kiemStats.attack > theStats.attack, true, 'Sword cultivator should have higher attack');
  assert.equal(theStats.maxHp > kiemStats.maxHp, true, 'Body cultivator should have higher max HP');
  assert.equal(theStats.defense > kiemStats.defense, true, 'Body cultivator should have higher defense');
  assert.equal(kiemStats.critChancePct >= 20, true, 'Artifacts should increase crit chance');
});

test('calculateDamage applies defense mitigation and never returns less than 1', () => {
  const normalHit = calculateDamage(100, 100, 1.0);
  assert.equal(normalHit, 50);

  const heavySkillHit = calculateDamage(100, 0, 2.5);
  assert.equal(heavySkillHit, 250);

  const minimumHit = calculateDamage(1, 9999, 0.5);
  assert.equal(minimumHit, 1);
});

test('applyPassiveCultivation clamps frame delta to 0.05s and respects maxQi cap', () => {
  const maxQi = REALMS[0].maxQi;
  const updated = applyPassiveCultivation(100, maxQi, 20, 0.05);
  assert.equal(updated, 101);

  const clamped = applyPassiveCultivation(100, maxQi, 20, 5.0);
  assert.equal(clamped, 101);

  const capped = applyPassiveCultivation(maxQi - 0.2, maxQi, 50, 0.05);
  assert.equal(capped, maxQi);
});

test('canCraftPill validates herbs, beast cores, and spirit stones', () => {
  const recipe = PILL_RECIPES[1];
  assert.equal(canCraftPill(recipe, { herbs: 3, beastCores: 1, spiritStones: 30 }), true);
  assert.equal(canCraftPill(recipe, { herbs: 2, beastCores: 1, spiritStones: 30 }), false);
  assert.equal(canCraftPill(recipe, { herbs: 5, beastCores: 0, spiritStones: 100 }), false);
});

test('calculateBreakthroughChance, getManualUpgradeCost, and getArtifactUpgradeCost compute expected bounds', () => {
  const chance = calculateBreakthroughChance(0, 20, 36);
  assert.equal(chance, 100);

  const highTierChance = calculateBreakthroughChance(6, 0, 0);
  assert.equal(highTierChance, REALMS[6].baseBreakthroughChance);

  const costLvl1 = getManualUpgradeCost(INITIAL_MANUALS[0]);
  assert.equal(costLvl1 > INITIAL_MANUALS[0].baseStoneCost, true);

  const artCost = getArtifactUpgradeCost(INITIAL_ARTIFACTS[0]);
  assert.equal(artCost.stoneCost > INITIAL_ARTIFACTS[0].stoneCost, true);
  assert.equal(artCost.coreCost >= 1, true);
});

test('getChapterProgress and computeCombatPower evaluate story chapters and cultivation rating', () => {
  const ch1 = STORY_CHAPTERS[0];
  const partial = getChapterProgress(ch1, { kills: 1, pillsCrafted: 0, realmIndex: 0, artifactsUnlocked: 2 });
  assert.equal(partial.completed, false);
  assert.equal(partial.pct, 33);

  const done = getChapterProgress(ch1, { kills: 5, pillsCrafted: 0, realmIndex: 0, artifactsUnlocked: 2 });
  assert.equal(done.completed, true);
  assert.equal(done.pct, 100);

  const stats = computeCultivatorStats(0, 'kiem_tu', INITIAL_MANUALS, 0, 1, INITIAL_ARTIFACTS);
  const cp = computeCombatPower(stats);
  assert.equal(cp > 1000, true);
});

test('screenToWorld projects viewport coordinates relative to canvas center and camera', () => {
  const rect = { left: 0, top: 0, width: 1440, height: 900 };
  const centerProj = screenToWorld(720, 450, rect, 100, -50);
  assert.equal(centerProj.worldX, 100);
  assert.equal(centerProj.worldY, -50);
});

