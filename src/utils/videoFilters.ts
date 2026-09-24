import { VisualFilterId, FaceEnhancementFilterId } from '../types';

export interface FilterItem<T> {
  id: T;
  name: string;
  category: 'visual' | 'enhancement';
  cssFilter: string;
  description: string;
  badgeColor: string;
}

export const VISUAL_FILTERS: FilterItem<VisualFilterId>[] = [
  {
    id: 'none',
    name: 'Normal',
    category: 'visual',
    cssFilter: 'none',
    description: 'Natural unfiltered camera feed',
    badgeColor: 'bg-slate-700'
  },
  {
    id: 'warm_sunset',
    name: 'Warm Sunset',
    category: 'visual',
    cssFilter: 'sepia(0.3) saturate(1.35) contrast(1.05) brightness(1.04)',
    description: 'Cozy amber tones and rich warm saturation',
    badgeColor: 'bg-amber-600'
  },
  {
    id: 'noir_film',
    name: 'Noir Film',
    category: 'visual',
    cssFilter: 'grayscale(1) contrast(1.35) brightness(0.95)',
    description: 'Classic cinematic black & white with deep shadows',
    badgeColor: 'bg-zinc-700'
  },
  {
    id: 'cyber_rose',
    name: 'Cyber Rose',
    category: 'visual',
    cssFilter: 'hue-rotate(320deg) saturate(1.4) contrast(1.1)',
    description: 'Vibrant romantic neon pink and magenta highlights',
    badgeColor: 'bg-rose-600'
  },
  {
    id: 'vintage_70s',
    name: 'Vintage 70s',
    category: 'visual',
    cssFilter: 'sepia(0.4) contrast(0.95) brightness(1.05) saturate(1.15)',
    description: 'Retro nostalgic film tones with faded grain aesthetic',
    badgeColor: 'bg-yellow-700'
  },
  {
    id: 'emerald_dream',
    name: 'Emerald Dream',
    category: 'visual',
    cssFilter: 'hue-rotate(65deg) saturate(1.15) contrast(1.05)',
    description: 'Moody film teal and forest ambient hues',
    badgeColor: 'bg-emerald-700'
  },
  {
    id: 'golden_hour',
    name: 'Golden Hour',
    category: 'visual',
    cssFilter: 'saturate(1.3) sepia(0.22) brightness(1.1) contrast(1.06)',
    description: 'Radiant late afternoon golden sunlight cast',
    badgeColor: 'bg-orange-600'
  },
  {
    id: 'moonlight',
    name: 'Moonlight',
    category: 'visual',
    cssFilter: 'hue-rotate(185deg) saturate(1.1) brightness(0.96) contrast(1.12)',
    description: 'Cool midnight indigo with deep atmospheric contrast',
    badgeColor: 'bg-blue-700'
  },
  {
    id: 'lavender_mist',
    name: 'Lavender Mist',
    category: 'visual',
    cssFilter: 'hue-rotate(270deg) saturate(1.25) brightness(1.06)',
    description: 'Soft dreamy purple-pink pastel atmosphere',
    badgeColor: 'bg-purple-600'
  },
  {
    id: 'cinematic_teal',
    name: 'Cinematic Teal',
    category: 'visual',
    cssFilter: 'contrast(1.2) hue-rotate(150deg) saturate(1.2) brightness(1.02)',
    description: 'Hollywood teal and warm skin separation',
    badgeColor: 'bg-cyan-700'
  }
];

export const ENHANCEMENT_FILTERS: FilterItem<FaceEnhancementFilterId>[] = [
  {
    id: 'none',
    name: 'Natural (Off)',
    category: 'enhancement',
    cssFilter: 'none',
    description: 'Camera as-is without facial touch-ups',
    badgeColor: 'bg-slate-700'
  },
  {
    id: 'natural_glow',
    name: 'Natural Glow',
    category: 'enhancement',
    cssFilter: 'brightness(1.07) contrast(1.03) blur(0.3px)',
    description: 'Gentle radiance and healthy complexion boost',
    badgeColor: 'bg-rose-500'
  },
  {
    id: 'soft_skin',
    name: 'Soft Skin',
    category: 'enhancement',
    cssFilter: 'blur(0.65px) brightness(1.08) contrast(0.98)',
    description: 'Smooths fine blemishes while keeping facial contours natural',
    badgeColor: 'bg-pink-500'
  },
  {
    id: 'bright_eyes',
    name: 'Eye Enhancement',
    category: 'enhancement',
    cssFilter: 'contrast(1.16) brightness(1.05) saturate(1.06)',
    description: 'Sharpens eye clarity and facial highlights',
    badgeColor: 'bg-sky-500'
  },
  {
    id: 'rosy_radiance',
    name: 'Rosy Radiance',
    category: 'enhancement',
    cssFilter: 'saturate(1.22) brightness(1.05) hue-rotate(352deg)',
    description: 'Warm healthy blush on lips and cheeks',
    badgeColor: 'bg-red-500'
  },
  {
    id: 'studio_light',
    name: 'Studio Light',
    category: 'enhancement',
    cssFilter: 'brightness(1.14) contrast(1.08) saturate(1.04)',
    description: 'Simulates balanced softbox studio front lighting',
    badgeColor: 'bg-amber-500'
  },
  {
    id: 'soft_portrait',
    name: 'Soft Portrait',
    category: 'enhancement',
    cssFilter: 'blur(0.45px) brightness(1.06) saturate(1.1)',
    description: 'Velvet portrait glow for romantic face-to-face video',
    badgeColor: 'bg-fuchsia-500'
  },
  {
    id: 'delicate_smooth',
    name: 'Dark-Spot Reduction',
    category: 'enhancement',
    cssFilter: 'blur(0.8px) brightness(1.06) contrast(0.96)',
    description: 'Diffuses dark eye circles and uneven skin tone',
    badgeColor: 'bg-teal-500'
  },
  {
    id: 'tone_balance',
    name: 'Tone Balance',
    category: 'enhancement',
    cssFilter: 'contrast(1.05) saturate(1.12) brightness(1.03)',
    description: 'Balances yellow/blue indoor ambient reflections',
    badgeColor: 'bg-emerald-500'
  },
  {
    id: 'natural_sharpen',
    name: 'Natural Sharpen',
    category: 'enhancement',
    cssFilter: 'contrast(1.18) brightness(1.02) saturate(1.05)',
    description: 'Defines facial features and eyelashes crisp and clear',
    badgeColor: 'bg-indigo-500'
  },
  {
    id: 'pearl_radiance',
    name: 'Pearl Radiance',
    category: 'enhancement',
    cssFilter: 'brightness(1.1) blur(0.35px) contrast(1.03) saturate(1.12)',
    description: 'Luminous pearlescent skin finish with soft contours',
    badgeColor: 'bg-violet-500'
  }
];

/**
 * Combines one Visual Filter and one Enhancement Filter into a single CSS filter string
 */
export function getCombinedFilterCSS(
  visualId: VisualFilterId,
  enhancementId: FaceEnhancementFilterId
): string {
  const visual = VISUAL_FILTERS.find((f) => f.id === visualId);
  const enhance = ENHANCEMENT_FILTERS.find((f) => f.id === enhancementId);

  const parts: string[] = [];
  if (visual && visual.cssFilter !== 'none') {
    parts.push(visual.cssFilter);
  }
  if (enhance && enhance.cssFilter !== 'none') {
    parts.push(enhance.cssFilter);
  }

  return parts.length > 0 ? parts.join(' ') : 'none';
}

const FAVORITES_STORAGE_KEY = 'mahal_kita_filter_favorites';
const AUTO_APPLY_KEY = 'mahal_kita_filter_auto_apply';

export function getFavoriteFilters(): { visual?: VisualFilterId; enhancement?: FaceEnhancementFilterId } {
  try {
    const raw = localStorage.getItem(FAVORITES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { visual: 'warm_sunset', enhancement: 'natural_glow' };
  } catch {
    return { visual: 'warm_sunset', enhancement: 'natural_glow' };
  }
}

export function saveFavoriteFilters(favorites: { visual?: VisualFilterId; enhancement?: FaceEnhancementFilterId }) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(favorites));
  } catch (e) {
    console.warn("Could not save filter favorites:", e);
  }
}

export function getAutoApplyPreference(): boolean {
  try {
    return localStorage.getItem(AUTO_APPLY_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setAutoApplyPreference(enabled: boolean) {
  try {
    localStorage.setItem(AUTO_APPLY_KEY, enabled ? 'true' : 'false');
  } catch (e) {
    console.warn("Could not save auto-apply preference:", e);
  }
}
