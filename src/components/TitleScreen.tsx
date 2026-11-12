import React, { useState } from 'react';
import { CULTIVATION_PATHS, CultivationPathId } from '../game/rules';
import { usePWAInstall } from '../utils/usePWAInstall';

interface TitleScreenProps {
  selectedPath: CultivationPathId;
  onSelectPath: (path: CultivationPathId) => void;
  onStartGame: () => void;
}

const TITLE_BG_PATH = 'images/title_bg.jpg';
const AVATAR_PATH = 'images/cultivator_avatar.jpg';
const CAULDRON_PATH = 'images/alchemy_cauldron.jpg';

const PATH_SEALS: Record<CultivationPathId, string> = {
  kiem_tu: '劍',
  the_tu: '體',
  hon_nguyen: '道',
};

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedPath,
  onSelectPath,
  onStartGame,
}) => {
  const [imgError, setImgError] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const paths = Object.values(CULTIVATION_PATHS);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between px-3 py-2 sm:p-5 lg:p-10 pointer-events-auto overflow-y-auto">
      {/* Key Art Backdrop with Measured Scrim over live world canvas */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {!imgError && (
          <img
            src={TITLE_BG_PATH}
            alt="Bối cảnh tiên giới Nhất Niệm Vô Cực"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-65"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,10,13,0.95) 0%, rgba(6,10,13,0.82) 50%, rgba(6,10,13,0.32) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,10,13,0.58) 0%, rgba(6,10,13,0.12) 50%, rgba(6,10,13,0.94) 100%)',
          }}
        />
      </div>

      {/* Top Row: Cinnabar Seal Stamp & Install App CTA */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[10px] lg:text-xs tracking-wider text-[#d4af6a]">
          <span className="cinnabar-seal px-1.5 py-0.5 rounded text-[9px] lg:text-[10px] font-bold text-[#f4e4bc]">
            仙途
          </span>
          <span>THỦY MẶC TU TIÊN TRUYỀN KỲ</span>
          <span aria-hidden="true">·</span>
          <span>NHẤT NIỆM TIÊU DAO</span>
          <span aria-hidden="true">·</span>
          <span>VÔ CỰC TIÊN ĐỒ</span>
        </div>

        {!isInstalled && isInstallable && (
          <button
            type="button"
            onClick={install}
            className="jade-plaque min-h-[32px] px-3 py-1 rounded-full text-[11px] font-semibold text-[#2ec4b6] cursor-pointer whitespace-nowrap"
          >
            Cài Đặt App Mobile
          </button>
        )}
      </div>

      {/* Main Split Content: Left Title + Story Prologue + Path Plaques | Right Guofeng Scrolls */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-6 items-center py-1">
        <div className="lg:col-span-7 space-y-2 lg:space-y-4">
          <div className="space-y-1.5 lg:space-y-2">
            <svg
              viewBox="0 0 520 105"
              className="w-full max-w-[310px] lg:max-w-[460px] h-auto overflow-visible"
              role="img"
              aria-label="Nhất Niệm Vô Cực"
            >
              <defs>
                <linearGradient id="jadeGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#f4e4bc" />
                  <stop offset="55%" stopColor="#d4af6a" />
                  <stop offset="100%" stopColor="#2ec4b6" />
                </linearGradient>
              </defs>
              <g transform="translate(4, 10)">
                <rect
                  x="0"
                  y="0"
                  width="42"
                  height="42"
                  rx="4"
                  fill="#9b2226"
                  stroke="#e9c46a"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 12 H32 M21 12 V32 M12 22 H30 M14 32 H28"
                  stroke="#f4e4bc"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
              <path
                d="M60 68 L410 68 L435 64 L410 60 L60 68 Z"
                fill="url(#jadeGoldGrad)"
                opacity="0.75"
              />
              <circle cx="60" cy="66" r="4" fill="#2ec4b6" />
              <text
                x="60"
                y="50"
                fill="url(#jadeGoldGrad)"
                fontFamily="Cormorant Garamond, Georgia, serif"
                fontWeight="700"
                fontSize="52"
                letterSpacing="3"
              >
                NHẤT NIỆM VÔ CỰC
              </text>
              <text
                x="62"
                y="90"
                fill="#a8dadc"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="500"
                fontSize="13"
                letterSpacing="3.5"
              >
                NGỰ KIẾM TRẢM YÊU · ĐỘ KIẾP PHI THĂNG
              </text>
            </svg>

            {/* Storyline Prologue Scroll Banner */}
            <div className="jade-plaque rounded-xl px-2.5 py-1.5 lg:p-3 max-w-xl">
              <p className="text-[11px] lg:text-xs text-[#ece5d5] leading-snug line-clamp-2 lg:line-clamp-none">
                <strong className="text-[#e9c46a]">📜 Mạch Truyện 5 Chương: </strong>
                Thanh Vân Bí Cảnh bị Cửu U Yêu Vương phong ấn linh mạch. Hãy theo lời truyền âm của Sư Tôn trảm yêu, khai lô luyện đan, tế luyện cổ bảo và vượt Cửu Trọng Lôi Kiếp!
              </p>
            </div>
          </div>

          {/* Cultivation Path Selector: Carved Jade Plaques with Calligraphy Seals */}
          <div className="space-y-1">
            <div className="text-[10px] lg:text-xs font-semibold text-[#d4af6a]">
              CHỌN ĐẠO LỘ NHẬP MÔN (THẺ NGỌC CỔ PHONG)
            </div>
            <div className="grid grid-cols-3 gap-2 lg:gap-3">
              {paths.map((p) => {
                const isSelected = selectedPath === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPath(p.id)}
                    className={`jade-plaque text-left p-2 lg:p-3 rounded-xl cursor-pointer ${
                      isSelected
                        ? 'border-2 border-[#f4e4bc] bg-[#1a343e] shadow-xl'
                        : 'opacity-85 hover:opacity-100'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs lg:text-sm font-bold text-[#f4e4bc] whitespace-nowrap truncate">
                        {p.name.split(' · ')[0]}
                      </span>
                      <span className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#091419] border border-[#d4af6a]/60 font-display font-bold text-[11px] lg:text-xs text-[#e9c46a] flex items-center justify-center shrink-0">
                        {PATH_SEALS[p.id]}
                      </span>
                    </div>
                    <div className="text-[10px] lg:text-[11px] text-[#2ec4b6] whitespace-nowrap truncate">
                      {p.name.split(' · ')[1]}
                    </div>
                    <div className="hidden lg:block text-[11px] text-[#a39e93] mt-1 line-clamp-2 leading-snug">
                      {p.subtitle}
                    </div>
                    <div className="font-mono-num text-[9px] lg:text-[11px] text-[#e9c46a] mt-1 pt-0.5 border-t border-[#d4af6a]/20 whitespace-nowrap truncate">
                      Công {Math.round(p.attackMult * 100)}% · Thủ {Math.round(p.defenseMult * 100)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start Action: Imperial Cinnabar & Gold Talisman Plaque */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
              }}
              className="cinnabar-seal min-h-[42px] lg:min-h-[48px] px-5 lg:px-7 py-1.5 lg:py-2.5 rounded-full text-[#f4e4bc] font-bold text-xs sm:text-sm lg:text-base tracking-wide cursor-pointer whitespace-nowrap shrink-0 shadow-2xl flex items-center gap-2"
            >
              <span className="w-5 h-5 lg:w-6 lg:h-6 rounded-full bg-[#090d11]/40 border border-[#f4e4bc]/60 font-display text-xs lg:text-sm flex items-center justify-center">
                道
              </span>
              <span>Bước Vào Tiên Đồ</span>
            </button>
            <span className="text-[11px] lg:text-xs text-[#c5beb0]">
              Chạm hoặc nhấn Enter / Space để khai mở Bí Cảnh
            </span>
          </div>
        </div>

        {/* Right Showcase Cards: Highlighting the 2 Guofeng Artworks (Cultivator & Nine-Dragon Cauldron) */}
        <div className="hidden lg:grid lg:col-span-5 grid-cols-2 gap-4">
          <div className="jade-plaque rounded-2xl p-3 space-y-2.5">
            <div className="aspect-square rounded-xl overflow-hidden border border-[#d4af6a]/50 bg-[#091318]">
              <img
                src={AVATAR_PATH}
                alt="Kiếm Tiên Ngự Kiếm"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-display font-bold text-base text-[#f4e4bc]">
                Vạn Kiếm Quy Tông
              </div>
              <div className="text-xs text-[#a39e93]">
                Vòng Pháp Bảo Cổ Phong · Kiếm Khí Tàn Ảnh
              </div>
            </div>
          </div>

          <div className="jade-plaque rounded-2xl p-3 space-y-2.5">
            <div className="aspect-square rounded-xl overflow-hidden border border-[#d4af6a]/50 bg-[#091318]">
              <img
                src={CAULDRON_PATH}
                alt="Cửu Long Thần Hỏa Đan Lô"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <div className="font-display font-bold text-base text-[#f4e4bc]">
                Cửu Long Đan Đạo
              </div>
              <div className="text-xs text-[#a39e93]">
                5 Chương Cốt Truyện · Luyện Đan & Độ Kiếp
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Inline Control-Hint Line */}
      <div className="pt-2 border-t border-[#d4af6a]/20 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#a39e93]">
        <div>
          La Bàn Cảm Ứng / WASD Di Chuyển · Vòng Pháp Bảo Góc Phải (劍 Phi Kiếm · 鐘 Kim Chung · 雷 Thiên Lôi · 閃 Thân Pháp · 丹 Phục Đan)
        </div>
        <div className="font-mono-num text-[#e9c46a]">
          Tối Ưu Màn Hình Ngang · GitHub Actions APK & Web Ready
        </div>
      </div>
    </div>
  );
};
