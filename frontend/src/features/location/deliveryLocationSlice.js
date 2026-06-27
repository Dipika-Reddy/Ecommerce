import { createSlice } from '@reduxjs/toolkit';

const DEFAULT_LOCATION = {
  id: 'default',
  label: 'Home',
  doorNo: '31-30-46',
  street: 'Narayana St',
  area: 'Dabagardens',
  city: 'Visakhapatnam',
  district: 'Visakhapatnam',
  pinCode: '530004',
  isDefault: true,
};

const loadFromStorage = () => {
  try {
    const stored = localStorage.getItem('deliveryLocations');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.locations?.length && parsed.activeLocationId) return parsed;
    }
  } catch (_) {}
  return {
    locations: [DEFAULT_LOCATION],
    activeLocationId: DEFAULT_LOCATION.id,
  };
};

const saveToStorage = (state) => {
  localStorage.setItem(
    'deliveryLocations',
    JSON.stringify({
      locations: state.locations,
      activeLocationId: state.activeLocationId,
    })
  );
};

const initialState = loadFromStorage();

const deliveryLocationSlice = createSlice({
  name: 'deliveryLocation',
  initialState,
  reducers: {
    setActiveLocation: (state, action) => {
      const exists = state.locations.some((loc) => loc.id === action.payload);
      if (exists) {
        state.activeLocationId = action.payload;
        saveToStorage(state);
      }
    },
    addLocation: (state, action) => {
      const { label, doorNo, street, area, city, district, pinCode } = action.payload;
      const id = `loc-${Date.now()}`;
      state.locations.push({
        id,
        label: label.trim(),
        doorNo: doorNo.trim(),
        street: street.trim(),
        area: area.trim(),
        city: city.trim(),
        district: district.trim(),
        pinCode: pinCode.trim(),
        isDefault: false
      });
      state.activeLocationId = id;
      saveToStorage(state);
    },
    removeLocation: (state, action) => {
      const id = action.payload;
      const target = state.locations.find((loc) => loc.id === id);
      if (!target || target.isDefault) return;
      state.locations = state.locations.filter((loc) => loc.id !== id);
      if (state.activeLocationId === id) {
        state.activeLocationId = state.locations[0]?.id ?? DEFAULT_LOCATION.id;
      }
      saveToStorage(state);
    },
  },
});

export const { setActiveLocation, addLocation, removeLocation } = deliveryLocationSlice.actions;
export default deliveryLocationSlice.reducer;
