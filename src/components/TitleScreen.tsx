import React, { useState } from 'react';
import { CULTIVATION_PATHS, CultivationPathId } from '../game/rules';
import { usePWAInstall } from '../utils/usePWAInstall';

interface TitleScreenProps {
  selectedPath: CultivationPathId;
  onSelectPath: (path: CultivationPathId) => void;
  onStartGame: () => void;
}

const TITLE_BG_PATH = '/src/assets/images/title_bg_1794497140801.jpg';
const AVATAR_PATH = '/src/assets/images/cultivator_avatar_1794497143525.jpg';
const CAULDRON_PATH = '/src/assets/images/alchemy_cauldron_1794497144248.jpg';

export const TitleScreen: React.FC<TitleScreenProps> = ({
  selectedPath,
  onSelectPath,
  onStartGame,
}) => {
  const [imgError, setImgError] = useState(false);
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const paths = Object.values(CULTIVATION_PATHS);

  return (
    <div className="fixed inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 lg:p-12 pointer-events-auto overflow-y-auto">
      {/* Key Art Backdrop with Measured Scrim over live world canvas */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        {!imgError && (
          <img
            src={TITLE_BG_PATH}
            alt="Bối cảnh tiên giới Nhất Niệm Vô Cực"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover opacity-60"
          />
        )}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, rgba(6,10,13,0.96) 0%, rgba(6,10,13,0.85) 48%, rgba(6,10,13,0.35) 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(6,10,13,0.6) 0%, rgba(6,10,13,0.12) 50%, rgba(6,10,13,0.94) 100%)',
          }}
        />
      </div>

      {/* Top Row: Subtle Seal Stamp & Install App CTA */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-[11px] sm:text-xs tracking-wider text-[#d4af6a]">
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
            className="min-h-[40px] px-4 py-1.5 rounded-lg bg-[#142b33] border border-[#2ec4b6] text-xs font-semibold text-[#2ec4b6] cursor-pointer whitespace-nowrap"
          >
            Cài Đặt App Mobile
          </button>
        )}
      </div>

      {/* Main Split Content: Left Title + Path Selection | Right Guofeng Artwork Cards on Desktop */}
      <div className="my-auto grid grid-cols-1 lg:grid-cols-12 gap-6 items-center py-2">
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          <div className="space-y-2">
            <svg
              viewBox="0 0 520 110"
              className="w-full max-w-[440px] sm:max-w-[480px] h-auto overflow-visible"
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
              <g transform="translate(4, 12)">
                <rect
                  x="0"
                  y="0"
                  width="44"
                  height="44"
                  rx="4"
                  fill="#9b2226"
                  stroke="#e9c46a"
                  strokeWidth="1.5"
                />
                <path
                  d="M10 12 H34 M22 12 V34 M12 24 H32 M14 34 H30"
                  stroke="#f4e4bc"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                />
              </g>
              <path
                d="M62 72 L410 72 L435 68 L410 64 L62 72 Z"
                fill="url(#jadeGoldGrad)"
                opacity="0.75"
              />
              <circle cx="62" cy="70" r="4" fill="#2ec4b6" />
              <text
                x="62"
                y="54"
                fill="url(#jadeGoldGrad)"
                fontFamily="Cormorant Garamond, Georgia, serif"
                fontWeight="700"
                fontSize="52"
                letterSpacing="3"
              >
                NHẤT NIỆM VÔ CỰC
              </text>
              <text
                x="64"
                y="96"
                fill="#a8dadc"
                fontFamily="Plus Jakarta Sans, sans-serif"
                fontWeight="500"
                fontSize="13"
                letterSpacing="3.5"
              >
                NGỰ KIẾM TRẢM YÊU · ĐỘ KIẾP PHI THĂNG
              </text>
            </svg>

            <p className="text-xs sm:text-sm text-[#c5beb0] leading-relaxed max-w-xl">
              Tự do ngự kiếm trừ yêu trong Bí Cảnh Thủy Mặc, tế luyện Bản Mệnh Pháp Bảo & Thần Thú Kỳ Lân, khai lô luyện chế Cửu Chuyển Tiên Đan và thỉnh giáo Thiên Cơ Các.
            </p>
          </div>

          {/* Cultivation Path Selector */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-[#d4af6a]">
              CHỌN ĐẠO LỘ NHẬP MÔN
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {paths.map((p) => {
                const isSelected = selectedPath === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectPath(p.id)}
                    className={`text-left p-2.5 sm:p-3.5 rounded-xl transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#142830] border-2 border-[#e9c46a] shadow-lg'
                        : 'bg-[#0c161b]/90 border border-[#d4af6a]/25 hover:border-[#d4af6a]/60'
                    }`}
                  >
                    <div className="text-xs sm:text-sm font-bold text-[#ece5d5] whitespace-nowrap truncate">
                      {p.name.split(' · ')[0]}
                    </div>
                    <div className="text-[11px] text-[#2ec4b6] mt-0.5 whitespace-nowrap truncate">
                      {p.name.split(' · ')[1]}
                    </div>
                    <div className="hidden sm:block text-[11px] text-[#a39e93] mt-1 line-clamp-2 leading-snug">
                      {p.subtitle}
                    </div>
                    <div className="font-mono-num text-[10px] sm:text-[11px] text-[#d4af6a] mt-1.5 pt-1 border-t border-[#d4af6a]/15 whitespace-nowrap truncate">
                      Công {Math.round(p.attackMult * 100)}% · Thủ {Math.round(p.defenseMult * 100)}%
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Start Action */}
          <div className="pt-1 flex flex-wrap items-center gap-3">
            <button
              type="button"
              data-start="true"
              onClick={(e) => {
                e.currentTarget.blur();
                onStartGame();
              }}
              className="min-h-[48px] px-7 py-3 rounded-xl bg-[#d4af6a] hover:bg-[#e9c46a] text-[#090d11] font-bold text-sm sm:text-base tracking-wide transition-transform active:scale-98 cursor-pointer whitespace-nowrap shrink-0 shadow-xl"
            >
              Bước Vào Tiên Đồ
            </button>
            <span className="text-xs text-[#a39e93]">
              Chạm hoặc nhấn Enter / Space để khai mở Bí Cảnh
            </span>
          </div>
        </div>

        {/* Right Showcase Cards: Highlighting the 2 Guofeng Artworks (Cultivator & Nine-Dragon Cauldron) */}
        <div className="hidden lg:grid lg:col-span-5 grid-cols-2 gap-4">
          <div className="jade-surface rounded-2xl p-3 space-y-2.5">
            <div className="aspect-square rounded-xl overflow-hidden border border-[#d4af6a]/40 bg-[#091318]">
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
                Ngự phi kiếm hộ thể · Triệu hồi Cửu Thiên Thần Lôi
              </div>
            </div>
          </div>

          <div className="jade-surface rounded-2xl p-3 space-y-2.5">
            <div className="aspect-square rounded-xl overflow-hidden border border-[#d4af6a]/40 bg-[#091318]">
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
                Luyện chế tiên đan · Tế luyện Pháp Bảo & Thần Thú
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Safe Margin: Single Flat Inline Control-Hint Line */}
      <div className="pt-2 border-t border-[#d4af6a]/15 flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs text-[#a39e93]">
        <div>
          Joystick Cảm Ứng / WASD Di Chuyển · J Phi Kiếm · K Kim Chung · L Thiên Lôi · Space Thân Pháp · H Phục Đan · Esc Tạm Dừng
        </div>
        <div className="font-mono-num text-[#d4af6a]">
          Tối Ưu Màn Hình Ngang · PWA & Android APK Ready
        </div>
      </div>
    </div>
  );
};
