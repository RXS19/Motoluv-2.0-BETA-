import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from '../hooks/use-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

// Helper to strictly ensure ONLY accessory store items can ever be in the cart (NO motorcycles)
const isStoreAccessory = (p) => {
  if (!p) return false;
  // If it's a motorcycle or has motorcycle attributes (km, engine, or moto_ prefix), reject it
  if (p.id?.startsWith('moto_') || p.km !== undefined || p.engine !== undefined || p.isMotorcycle) {
    return false;
  }
  // Store accessories have acc_ prefix or accessory categories
  if (p.id?.startsWith('acc_') || ['Cascos', 'Ropa', 'Guantes', 'Calzado', 'Escapes', 'Maletas', 'Lubricantes'].includes(p.category)) {
    return true;
  }
  // Safeguard: must not be a motorcycle
  return true;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const cartStorageKey = user ? `motoluv_cart_${user.id || user.email}` : 'motoluv_cart_guest';

  const loadSavedCart = (key) => {
    try {
      const saved = localStorage.getItem(key);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed.filter((item) => isStoreAccessory(item.product)) : [];
    } catch {
      return [];
    }
  };

  const [cart, setCart] = useState(() => loadSavedCart(cartStorageKey));
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  // Sync cart state when switching user profile
  useEffect(() => {
    setCart(loadSavedCart(cartStorageKey));
  }, [cartStorageKey]);

  // Persist user-specific cart to localStorage
  useEffect(() => {
    try {
      const cleanCart = cart.filter((item) => isStoreAccessory(item.product));
      localStorage.setItem(cartStorageKey, JSON.stringify(cleanCart));
    } catch (e) {
      console.error('Error saving cart:', e);
    }
  }, [cart, cartStorageKey]);

  const addToCart = (product, size = null, color = null, quantity = 1, autoOpenDrawer = false) => {
    // Strictly prevent motorcycles from entering the shopping cart
    if (!isStoreAccessory(product)) {
      toast({
        title: '⚠️ Elemento no permitido en carrito',
        description: 'Las motocicletas no forman parte del carrito de compras. Únicamente los artículos y accesorios de la tienda pueden ser añadidos.',
        variant: 'destructive',
      });
      return;
    }

    const defaultSize = size || (product.sizes ? product.sizes[0] : 'Única');
    const defaultColor = color || (product.colors ? product.colors[0] : 'Estándar');
    const cartItemId = `${product.id}_${defaultSize}_${defaultColor}`;

    setCart((prev) => {
      // Ensure existing cart is clean
      const sanitized = prev.filter((item) => isStoreAccessory(item.product));
      const existingIndex = sanitized.findIndex((item) => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...sanitized];
        updated[existingIndex].quantity += quantity;
        updated[existingIndex].selected = true; // Ensure selected on re-add
        return updated;
      }
      return [
        ...sanitized,
        {
          cartItemId,
          product,
          size: defaultSize,
          color: defaultColor,
          quantity,
          price: product.price,
          selected: true,
        },
      ];
    });

    toast({
      title: '🛒 Agregado al Carrito',
      description: `${quantity}x ${product.name} (${defaultSize} / ${defaultColor})`,
    });

    if (autoOpenDrawer) {
      setIsCartOpen(true);
    }
  };

  const removeFromCart = (cartItemId) => {
    setCart((prev) => prev.filter((item) => item.cartItemId !== cartItemId));
  };

  const toggleItemSelection = (cartItemId) => {
    setCart((prev) =>
      prev.map((item) =>
        item.cartItemId === cartItemId ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const selectAllItems = (select = true) => {
    setCart((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const updateQuantity = (cartItemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const clearCart = () => setCart([]);

  const clearSelectedCart = () => {
    setCart((prev) => prev.filter((item) => !item.selected));
  };

  // Filtered cart ensuring zero motorcycles
  const validCart = cart.filter((item) => isStoreAccessory(item.product));

  const cartCount = validCart.reduce((acc, curr) => acc + curr.quantity, 0);
  const cartSubtotal = validCart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  const selectedCart = validCart.filter((item) => item.selected !== false);
  const selectedCartCount = selectedCart.reduce((acc, curr) => acc + curr.quantity, 0);
  const selectedCartSubtotal = selectedCart.reduce((acc, curr) => acc + curr.price * curr.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart: validCart,
        selectedCart,
        addToCart,
        removeFromCart,
        toggleItemSelection,
        selectAllItems,
        updateQuantity,
        clearCart,
        clearSelectedCart,
        cartCount,
        cartSubtotal,
        selectedCartCount,
        selectedCartSubtotal,
        isCartOpen,
        setIsCartOpen,
        selectedProduct,
        setSelectedProduct,
        isCheckoutOpen,
        setIsCheckoutOpen,
        currentUserCartKey: cartStorageKey,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
