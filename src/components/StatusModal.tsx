import React from 'react';
import { EndOfRunSnapshot, GameStateMode } from './CanvasArena';

interface StatusModalProps {
  gameState: GameStateMode;
  endSummary: EndOfRunSnapshot | null;
  bestKills: number;
  onResume: () => void;
  onRestart: () => void;
  onReturnTitle: () => void;
}

export const StatusModal: React.FC<StatusModalProps> = ({
  gameState,
  endSummary,
  bestKills,
  onResume,
  onRestart,
  onReturnTitle,
}) => {
  if (gameState !== 'paused' && gameState !== 'gameover') return null;

  const isPaused = gameState === 'paused';
  const isVictory = endSummary?.outcome === 'victory';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="status-modal-title"
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-[#060a0d]/85 pointer-events-auto"
    >
      <div className="jade-surface rounded-xl p-7 w-full max-w-md space-y-6 border-2 border-[#d4af6a]/45">
        <div className="text-center space-y-1.5">
          <div className="text-xs text-[#d4af6a] tracking-wider">
            {isPaused
              ? 'NHẬP ĐỊNH TẠM DỪNG'
              : isVictory
                ? 'TRẢM YÊU ĐẮC ĐẠO · BÍ CẢNH VIÊN MÃN'
                : 'ĐẠO CƠ DAO ĐỘNG · TẨU HỎA NHẬP MA'}
          </div>
          <h2
            id="status-modal-title"
            className="font-display font-bold text-3xl text-[#f4e4bc]"
          >
            {isPaused
              ? 'Tạm Dừng Tu Luyện'
              : isVictory
                ? 'Đại Thắng Yêu Vương'
                : 'Thân Tử Đạo Tiêu'}
          </h2>
        </div>

        {/* 3 Tabular-Nums Stat Tiles */}
        {!isPaused && endSummary && (
          <div className="grid grid-cols-3 gap-2.5 bg-[#081015] p-3.5 rounded-lg border border-[#d4af6a]/20 text-center">
            <div>
              <div className="text-[10px] text-[#a39e93]">TẦNG BÍ CẢNH</div>
              <div className="font-mono-num text-lg font-bold text-[#f4e4bc]">
                Tầng {endSummary.waveReached}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#a39e93]">TRẢM YÊU / KỶ LỤC</div>
              <div className="font-mono-num text-lg font-bold text-[#2ec4b6]">
                {endSummary.enemiesSlain} / {Math.max(bestKills, endSummary.enemiesSlain)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#a39e93]">
                {isVictory ? 'THỜI GIAN' : 'LINH THẠCH'}
              </div>
              <div className="font-mono-num text-lg font-bold text-[#e9c46a]">
                {isVictory ? `${endSummary.clearTimeSec}s` : endSummary.spiritStonesEarned}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2.5">
          {isPaused ? (
            <>
              <button
                type="button"
                onClick={onResume}
                className="w-full py-3 px-5 rounded-lg bg-[#d4af6a] hover:bg-[#e9c46a] text-[#090d11] font-bold text-sm cursor-pointer"
              >
                Tiếp Tục Tu Luyện
              </button>
              <button
                type="button"
                onClick={onRestart}
                className="w-full py-2.5 px-5 rounded-lg bg-[#122229] hover:bg-[#192f38] text-[#ece5d5] border border-[#d4af6a]/30 font-semibold text-sm cursor-pointer"
              >
                Tái Nhập Bí Cảnh
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="w-full py-2.5 px-5 rounded-lg bg-transparent hover:bg-[#122229] text-[#a39e93] text-xs cursor-pointer"
              >
                Về Màn Hình Chính
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                data-start="true"
                onClick={onRestart}
                className="w-full py-3 px-5 rounded-lg bg-[#d4af6a] hover:bg-[#e9c46a] text-[#090d11] font-bold text-sm cursor-pointer"
              >
                {isVictory ? 'Tiếp Tục Chinh Phục Bí Cảnh' : 'Nghịch Thiên Phục Sinh'}
              </button>
              <button
                type="button"
                onClick={onReturnTitle}
                className="w-full py-2.5 px-5 rounded-lg bg-[#122229] hover:bg-[#192f38] text-[#ece5d5] border border-[#d4af6a]/30 font-semibold text-xs cursor-pointer"
              >
                Về Màn Hình Chính
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
