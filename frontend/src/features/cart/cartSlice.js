import { createSlice } from '@reduxjs/toolkit';
import { setCredentials, logout } from '../auth/authSlice';

// Helper to check if user is admin, superadmin, or seller
const isNonBuyer = (user) => {
  if (!user) return false;
  return user.sellerStatus === 'APPROVED' || user.isAdmin || user.isSuperAdmin;
};

const getInitialUser = () => {
  try {
    return localStorage.getItem('userInfo')
      ? JSON.parse(localStorage.getItem('userInfo'))
      : null;
  } catch (e) {
    return null;
  }
};

const getCartKey = (user) => {
  return user ? `cart_${user._id || user.id}` : 'cart_guest';
};

const getCartFromStorage = () => {
  const user = getInitialUser();
  const key = getCartKey(user);
  try {
    const cart = localStorage.getItem(key)
      ? JSON.parse(localStorage.getItem(key))
      : {
          cartItems: [],
          shippingAddress: {},
          paymentMethod: 'Mock Stripe',
          deliveryMethod: 'Standard Shipping',
          shippingPrice: 0,
        };
    
    if (isNonBuyer(user)) {
      cart.cartItems = [];
    }
    return cart;
  } catch (e) {
    return {
      cartItems: [],
      shippingAddress: {},
      paymentMethod: 'Mock Stripe',
      deliveryMethod: 'Standard Shipping',
      shippingPrice: 0,
    };
  }
};

const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Recomputes price breakdown whenever the cart contents change
const updateCartPrices = (state, user) => {
  const currentUser = user !== undefined ? user : getInitialUser();

  if (isNonBuyer(currentUser)) {
    state.cartItems = [];
  }

  state.itemsPrice = round2(
    state.cartItems.reduce((acc, item) => acc + item.price * item.qty, 0)
  );
  
  if (state.shippingPrice === undefined) {
    state.shippingPrice = round2(state.itemsPrice > 100 ? 0 : 10);
  }
  if (!state.deliveryMethod) {
    state.deliveryMethod = state.shippingPrice === 0 ? 'Standard Shipping' : 'Standard Shipping';
  }

  state.taxPrice = round2(0.08 * state.itemsPrice);
  state.totalPrice = round2(state.itemsPrice + state.shippingPrice + state.taxPrice);

  const key = getCartKey(currentUser);
  localStorage.setItem(key, JSON.stringify(state));
};

const initialState = {
  ...getCartFromStorage(),
  itemsPrice: 0,
  shippingPrice: getCartFromStorage().shippingPrice ?? 0,
  taxPrice: 0,
  totalPrice: 0,
};
updateCartPrices(initialState);

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const user = getInitialUser();
      if (isNonBuyer(user)) return; // Do not allow adding items for non-buyers

      const item = action.payload;
      const existingItem = state.cartItems.find(
        (x) => x._id === item._id && x.size === item.size && x.color === item.color
      );

      if (existingItem) {
        existingItem.qty = item.qty;
      } else {
        state.cartItems.push(item);
      }
      updateCartPrices(state, user);
    },

    removeFromCart: (state, action) => {
      const user = getInitialUser();
      const { id, size, color } = action.payload;
      state.cartItems = state.cartItems.filter(
        (x) => !(x._id === id && x.size === size && x.color === color)
      );
      updateCartPrices(state, user);
    },

    updateQty: (state, action) => {
      const user = getInitialUser();
      const { id, size, color, qty } = action.payload;
      const item = state.cartItems.find((x) => x._id === id && x.size === size && x.color === color);
      if (item) item.qty = qty;
      updateCartPrices(state, user);
    },

    saveShippingAddress: (state, action) => {
      const user = getInitialUser();
      state.shippingAddress = action.payload;
      const key = getCartKey(user);
      localStorage.setItem(key, JSON.stringify(state));
    },

    savePaymentMethod: (state, action) => {
      const user = getInitialUser();
      state.paymentMethod = action.payload;
      const key = getCartKey(user);
      localStorage.setItem(key, JSON.stringify(state));
    },

    saveDeliveryDetails: (state, action) => {
      const user = getInitialUser();
      state.deliveryMethod = action.payload.deliveryMethod;
      state.shippingPrice = action.payload.shippingPrice;
      state.totalPrice = round2(state.itemsPrice + state.shippingPrice + state.taxPrice);
      const key = getCartKey(user);
      localStorage.setItem(key, JSON.stringify(state));
    },

    clearCartItems: (state) => {
      const user = getInitialUser();
      state.cartItems = [];
      updateCartPrices(state, user);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(setCredentials, (state, action) => {
        const user = action.payload;
        const key = getCartKey(user);
        const userCart = localStorage.getItem(key)
          ? JSON.parse(localStorage.getItem(key))
          : {
              cartItems: [],
              shippingAddress: {},
              paymentMethod: 'Mock Stripe',
              deliveryMethod: 'Standard Shipping',
              shippingPrice: 0,
            };

        state.cartItems = userCart.cartItems || [];
        state.shippingAddress = userCart.shippingAddress || {};
        state.paymentMethod = userCart.paymentMethod || 'Mock Stripe';
        state.deliveryMethod = userCart.deliveryMethod || 'Standard Shipping';
        state.shippingPrice = userCart.shippingPrice ?? 0;
        updateCartPrices(state, user);
      })
      .addCase(logout, (state) => {
        const key = 'cart_guest';
        const guestCart = localStorage.getItem(key)
          ? JSON.parse(localStorage.getItem(key))
          : {
              cartItems: [],
              shippingAddress: {},
              paymentMethod: 'Mock Stripe',
              deliveryMethod: 'Standard Shipping',
              shippingPrice: 0,
            };

        state.cartItems = guestCart.cartItems || [];
        state.shippingAddress = guestCart.shippingAddress || {};
        state.paymentMethod = guestCart.paymentMethod || 'Mock Stripe';
        state.deliveryMethod = guestCart.deliveryMethod || 'Standard Shipping';
        state.shippingPrice = guestCart.shippingPrice ?? 0;
        updateCartPrices(state, null);
      });
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQty,
  saveShippingAddress,
  savePaymentMethod,
  saveDeliveryDetails,
  clearCartItems,
} = cartSlice.actions;

export default cartSlice.reducer;
