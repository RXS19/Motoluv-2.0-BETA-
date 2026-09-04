import { motoApi } from '../services/api';

// Cache for deduplicating clicks and tracking optimistic/latest views
const recentClicks = new Map();
const latestViewsCache = new Map();

/**
 * Gets the latest known views count from memory cache if available.
 * @param {string|number} motoId
 * @returns {number|null}
 */
export function getCachedMotoViews(motoId) {
  if (!motoId) return null;
  return latestViewsCache.get(String(motoId)) ?? null;
}

/**
 * Sets the latest known views count in memory cache.
 * @param {string|number} motoId
 * @param {number} count
 */
export function setCachedMotoViews(motoId, count) {
  if (!motoId || typeof count !== 'number') return;
  latestViewsCache.set(String(motoId), count);
}

/**
 * Records a motorcycle card/link click, atomically incrementing +2 views in Supabase via RPC.
 * Deduplicates multiple rapid clicks on the same item to prevent double counting.
 * 
 * @param {string|number} motoId - ID of the motorcycle
 * @returns {Promise<number|null>} - Returns the new view count or null
 */
export async function trackMotoClick(motoId) {
  if (!motoId) return null;
  const idStr = String(motoId).trim();
  if (!idStr) return null;

  const now = Date.now();
  const lastClickTime = recentClicks.get(idStr);

  // Prevent double counting from rapid double-clicks (1 second throttle per moto ID)
  if (lastClickTime && now - lastClickTime < 1000) {
    return latestViewsCache.get(idStr) ?? null;
  }

  recentClicks.set(idStr, now);

  try {
    const newViews = await motoApi.incrementViews(idStr);
    if (typeof newViews === 'number') {
      latestViewsCache.set(idStr, newViews);
      return newViews;
    }
  } catch (err) {
    console.warn('Error al registrar click e incrementar vistas de moto:', err);
  }

  return null;
}

/**
 * Universal click handler for motorcycle cards and detail links.
 * 
 * @param {MouseEvent} [e] - Optional click event
 * @param {string|number} motoId - ID of the motorcycle
 */
export function handleMotoLinkClick(e, motoId) {
  // If target is an interactive child like a button, don't trigger
  if (e && e.target && typeof e.target.closest === 'function') {
    const isInteractive = e.target.closest('button, [data-prevent-nav]');
    if (isInteractive) return;
  }

  if (motoId) {
    trackMotoClick(motoId);
  }
}
