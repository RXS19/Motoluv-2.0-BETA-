import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { toast } from '../hooks/use-toast';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const FavoritesContext = createContext({
  favorites: [],
  favoriteIds: new Set(),
  isFavorite: () => false,
  toggleFavorite: () => {},
  removeFavorite: () => {},
  clearFavorites: () => {},
});

export const FavoritesProvider = ({ children }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState([]);

  const storageKey = `motoluv_favs_${user?.id || 'guest'}`;

  // Load favorites on mount / user change
  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const stored = localStorage.getItem(storageKey);
        let parsed = stored ? JSON.parse(stored) : [];

        // If user is authenticated and Supabase is configured, also try syncing
        if (user && isSupabaseConfigured && supabase) {
          try {
            const { data, error } = await supabase
              .from('favorites')
              .select('*, moto:motos(*)')
              .eq('user_id', user.id);
            if (!error && Array.isArray(data) && data.length > 0) {
              const supaFavs = data
                .map((f) => f.moto || f.moto_data || f)
                .filter(Boolean);
              if (supaFavs.length > 0) {
                // Merge unique by ID
                const merged = [...supaFavs];
                for (const p of parsed) {
                  if (!merged.some((m) => String(m.id) === String(p.id))) {
                    merged.push(p);
                  }
                }
                parsed = merged;
              }
            }
          } catch {}
        }

        setFavorites(parsed);
      } catch (err) {
        console.error('Error loading favorites:', err);
        setFavorites([]);
      }
    };

    loadFavorites();
  }, [user?.id, storageKey]);

  // Persist whenever favorites change
  const saveFavoritesState = (newFavs) => {
    setFavorites(newFavs);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newFavs));
    } catch (e) {
      console.warn('Could not persist favorites to localStorage:', e);
    }
  };

  const isFavorite = (motoId) => {
    if (!motoId) return false;
    return favorites.some((m) => String(m.id) === String(motoId));
  };

  const toggleFavorite = (moto) => {
    if (!moto || !moto.id) return;
    const exists = isFavorite(moto.id);

    if (exists) {
      const updated = favorites.filter((m) => String(m.id) !== String(moto.id));
      saveFavoritesState(updated);
      toast({
        title: 'Eliminada de favoritos',
        description: `${moto.brand || ''} ${moto.model || ''} se eliminó de tus motos guardadas.`,
      });

      // Background Supabase sync if table exists
      if (user && isSupabaseConfigured && supabase) {
        supabase
          .from('favorites')
          .delete()
          .match({ user_id: user.id, moto_id: moto.id })
          .then(() => {})
          .catch(() => {});
      }
    } else {
      const motoToSave = {
        id: moto.id,
        brand: moto.brand || 'Motocicleta',
        model: moto.model || '',
        year: moto.year || new Date().getFullYear(),
        price: Number(moto.price) || 0,
        km: Number(moto.km) || 0,
        city: moto.city || moto.location || 'México',
        image: moto.image || moto.images?.[0] || 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?w=600&q=80',
        score: moto.score,
        rating: moto.rating,
        status: moto.status || 'Activa',
        isFavorite: true,
        savedAt: new Date().toISOString(),
      };
      const updated = [motoToSave, ...favorites.filter((m) => String(m.id) !== String(moto.id))];
      saveFavoritesState(updated);
      toast({
        title: '❤️ Guardada en tus favoritos',
        description: `${moto.brand || ''} ${moto.model || ''} ahora está disponible en tu perfil en "Motos guardadas".`,
      });

      // Background Supabase sync if table exists
      if (user && isSupabaseConfigured && supabase) {
        supabase
          .from('favorites')
          .upsert({
            user_id: user.id,
            moto_id: moto.id,
            created_at: new Date().toISOString(),
          })
          .then(() => {})
          .catch(() => {});
      }
    }
  };

  const removeFavorite = (motoId) => {
    if (!motoId) return;
    const updated = favorites.filter((m) => String(m.id) !== String(motoId));
    saveFavoritesState(updated);
    toast({
      title: 'Eliminada de favoritos',
      description: 'La motocicleta se eliminó de tus motos guardadas.',
    });
  };

  const clearFavorites = () => {
    saveFavoritesState([]);
  };

  return (
    <FavoritesContext.Provider
      value={{
        favorites,
        favoriteIds: new Set(favorites.map((m) => String(m.id))),
        isFavorite,
        toggleFavorite,
        removeFavorite,
        clearFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
};

export const useFavorites = () => useContext(FavoritesContext);
export default FavoritesContext;
