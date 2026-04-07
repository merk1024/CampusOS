const AVATAR_PALETTES = {
  student: [
    { bg: 'linear-gradient(135deg, #38bdf8 0%, #2563eb 100%)', ring: 'rgba(147, 197, 253, 0.7)', shadow: 'rgba(37, 99, 235, 0.28)' },
    { bg: 'linear-gradient(135deg, #22c55e 0%, #0f766e 100%)', ring: 'rgba(110, 231, 183, 0.7)', shadow: 'rgba(15, 118, 110, 0.28)' },
    { bg: 'linear-gradient(135deg, #f59e0b 0%, #ea580c 100%)', ring: 'rgba(253, 230, 138, 0.76)', shadow: 'rgba(234, 88, 12, 0.28)' }
  ],
  teacher: [
    { bg: 'linear-gradient(135deg, #818cf8 0%, #6d28d9 100%)', ring: 'rgba(196, 181, 253, 0.72)', shadow: 'rgba(109, 40, 217, 0.28)' },
    { bg: 'linear-gradient(135deg, #06b6d4 0%, #0f766e 100%)', ring: 'rgba(153, 246, 228, 0.76)', shadow: 'rgba(15, 118, 110, 0.28)' },
    { bg: 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)', ring: 'rgba(251, 207, 232, 0.76)', shadow: 'rgba(190, 24, 93, 0.28)' }
  ],
  admin: [
    { bg: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)', ring: 'rgba(147, 197, 253, 0.74)', shadow: 'rgba(37, 99, 235, 0.32)' },
    { bg: 'linear-gradient(135deg, #111827 0%, #7c3aed 100%)', ring: 'rgba(221, 214, 254, 0.76)', shadow: 'rgba(124, 58, 237, 0.28)' },
    { bg: 'linear-gradient(135deg, #164e63 0%, #0ea5e9 100%)', ring: 'rgba(165, 243, 252, 0.76)', shadow: 'rgba(14, 165, 233, 0.28)' }
  ],
  default: [
    { bg: 'linear-gradient(135deg, #334155 0%, #2563eb 100%)', ring: 'rgba(191, 219, 254, 0.74)', shadow: 'rgba(37, 99, 235, 0.28)' },
    { bg: 'linear-gradient(135deg, #14532d 0%, #059669 100%)', ring: 'rgba(167, 243, 208, 0.76)', shadow: 'rgba(5, 150, 105, 0.28)' },
    { bg: 'linear-gradient(135deg, #7c2d12 0%, #f97316 100%)', ring: 'rgba(254, 215, 170, 0.76)', shadow: 'rgba(249, 115, 22, 0.28)' }
  ]
};

const hashSeed = (seed) => {
  let hash = 0;
  String(seed || 'CampusOS').split('').forEach((char) => {
    hash = ((hash << 5) - hash) + char.charCodeAt(0);
    hash |= 0;
  });
  return Math.abs(hash);
};

const looksLikeImageSource = (value) => /^(https?:\/\/|data:image\/|blob:|\/)/i.test(String(value || '').trim());

const buildInitials = (value) => {
  const source = String(value || '').trim();
  if (!source) return 'CO';

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length > 1) {
    return words
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

const getAvatarLabel = (user) => {
  const rawAvatar = String(user?.avatar || '').trim();
  if (rawAvatar && !looksLikeImageSource(rawAvatar) && rawAvatar.length <= 3) {
    return rawAvatar.toUpperCase();
  }

  return buildInitials(user?.name || user?.email || 'CampusOS');
};

const getAvatarSource = (user) => {
  const rawAvatar = String(user?.avatar || '').trim();
  return rawAvatar && looksLikeImageSource(rawAvatar) ? rawAvatar : '';
};

const getAvatarStyle = (user) => {
  const role = String(user?.role || '').toLowerCase();
  const family = AVATAR_PALETTES[role] || AVATAR_PALETTES.default;
  const swatch = family[hashSeed(`${user?.email || ''}|${user?.name || ''}|${user?.role || ''}`) % family.length];

  return {
    '--avatar-bg': swatch.bg,
    '--avatar-ring': swatch.ring,
    '--avatar-shadow': swatch.shadow
  };
};

function AvatarBadge({ user, className = '', title = '' }) {
  const imageSrc = getAvatarSource(user);
  const label = getAvatarLabel(user);
  const classNames = ['avatar-badge', className].filter(Boolean).join(' ');

  return (
    <div className={classNames} style={getAvatarStyle(user)} aria-hidden="true" title={title || label}>
      {imageSrc ? <img src={imageSrc} alt="" /> : <span>{label}</span>}
    </div>
  );
}

export default AvatarBadge;
