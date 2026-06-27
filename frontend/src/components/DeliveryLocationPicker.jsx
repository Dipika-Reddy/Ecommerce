import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setActiveLocation, addLocation, removeLocation } from '../features/location/deliveryLocationSlice';
import { saveShippingAddress } from '../features/cart/cartSlice';

const LocationPinIcon = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const DeliveryLocationPicker = ({ variant = 'desktop' }) => {
  const dispatch = useDispatch();
  const { locations, activeLocationId } = useSelector((state) => state.deliveryLocation);
  const { shippingAddress } = useSelector((state) => state.cart);
  const activeLocation = locations.find((loc) => loc.id === activeLocationId) ?? locations[0];

  const [open, setOpen] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // New detailed location fields
  const [newLabel, setNewLabel] = useState('');
  const [newDoorNo, setNewDoorNo] = useState('');
  const [newStreet, setNewStreet] = useState('');
  const [newArea, setNewArea] = useState('');
  const [newCity, setNewCity] = useState('');
  const [newDistrict, setNewDistrict] = useState('');
  const [newPinCode, setNewPinCode] = useState('');

  const pickerRef = useRef(null);
  const panelRef = useRef(null);

  const closePanel = () => {
    setOpen(false);
    setShowAddForm(false);
  };

  useEffect(() => {
    if (variant !== 'desktop' || !open) return undefined;

    const handleOutside = (e) => {
      const inTrigger = pickerRef.current?.contains(e.target);
      const inPanel = panelRef.current?.contains(e.target);
      if (!inTrigger && !inPanel) closePanel();
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open, variant]);

  useEffect(() => {
    if (variant !== 'mobile' || !open) return undefined;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open, variant]);

  const getFormattedAddress = (loc) => {
    if (!loc) return '';
    if (loc.isDefault && !loc.doorNo) {
      return loc.city;
    }
    const parts = [loc.doorNo, loc.street, loc.area].filter(Boolean);
    return parts.join(', ');
  };

  const getCity = (loc) => {
    if (!loc) return '';
    return loc.city || '';
  };

  const getPostalCode = (loc) => {
    if (!loc) return '';
    return loc.pinCode || '530004';
  };

  // Sync active delivery address to shipping address in cart
  useEffect(() => {
    if (activeLocation) {
      dispatch(
        saveShippingAddress({
          address: getFormattedAddress(activeLocation),
          city: getCity(activeLocation),
          postalCode: getPostalCode(activeLocation),
          country: 'India',
        })
      );
    }
  }, [activeLocation, dispatch]);

  const handleSelect = (id) => {
    dispatch(setActiveLocation(id));
    const loc = locations.find((l) => l.id === id);
    if (loc) {
      dispatch(
        saveShippingAddress({
          address: getFormattedAddress(loc),
          city: getCity(loc),
          postalCode: getPostalCode(loc),
          country: 'India',
        })
      );
    }
    closePanel();
  };

  const handleAddLocation = (e) => {
    e.preventDefault();
    if (!newLabel.trim() || !newCity.trim() || !newPinCode.trim()) return;
    dispatch(
      addLocation({
        label: newLabel,
        doorNo: newDoorNo,
        street: newStreet,
        area: newArea,
        city: newCity,
        district: newDistrict,
        pinCode: newPinCode,
      })
    );
    setNewLabel('');
    setNewDoorNo('');
    setNewStreet('');
    setNewArea('');
    setNewCity('');
    setNewDistrict('');
    setNewPinCode('');
    closePanel();
  };

  const displayCity = activeLocation?.city ?? 'India';
  const displayLabel = activeLocation?.label ?? 'Home';
  const triggerText = variant === 'mobile' ? displayLabel : displayCity;

  const panelContent = (
    <>
      <div className="px-4 py-3 border-b border-slate-100 shrink-0">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Choose delivery location</p>
      </div>

      <div className="overflow-y-auto py-1 max-h-60">
        {locations.map((loc) => (
          <div
            key={loc.id}
            onClick={() => handleSelect(loc.id)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer ${
              loc.id === activeLocationId ? 'bg-orange-50/70' : ''
            }`}
          >
            <LocationPinIcon className={`h-4 w-4 shrink-0 ${loc.id === activeLocationId ? 'text-orange-500' : 'text-slate-400'}`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800 break-words">{loc.label}</p>
              <p className="text-xs text-slate-500 break-words font-medium mt-0.5">
                {loc.isDefault && !loc.doorNo 
                  ? loc.city 
                  : `${loc.doorNo ? loc.doorNo + ', ' : ''}${loc.street ? loc.street + ', ' : ''}${loc.area ? loc.area + ', ' : ''}${loc.city}`}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {loc.id === activeLocationId && (
                <svg className="h-4 w-4 text-orange-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {!loc.isDefault && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    dispatch(removeLocation(loc.id));
                  }}
                  className="p-1 rounded text-red-500 hover:bg-red-100 shrink-0 hover:text-red-700 transition-colors"
                  title="Remove address"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showAddForm ? (
        <form onSubmit={handleAddLocation} className="border-t border-slate-100 p-4 space-y-2.5 max-h-80 overflow-y-auto shrink-0 bg-slate-50/50">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g. Home, Office"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Door No</label>
              <input
                type="text"
                value={newDoorNo}
                onChange={(e) => setNewDoorNo(e.target.value)}
                placeholder="31-30-46"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Street</label>
              <input
                type="text"
                value={newStreet}
                onChange={(e) => setNewStreet(e.target.value)}
                placeholder="Narayana St"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Area</label>
            <input
              type="text"
              value={newArea}
              onChange={(e) => setNewArea(e.target.value)}
              placeholder="Dabagardens"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">City</label>
              <input
                type="text"
                value={newCity}
                onChange={(e) => setNewCity(e.target.value)}
                placeholder="Visakhapatnam"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">District</label>
              <input
                type="text"
                value={newDistrict}
                onChange={(e) => setNewDistrict(e.target.value)}
                placeholder="Visakhapatnam"
                required
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1 block">Pin Code</label>
            <input
              type="text"
              value={newPinCode}
              onChange={(e) => setNewPinCode(e.target.value)}
              placeholder="530004"
              required
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:border-orange-400"
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 bg-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 rounded-lg bg-orange-500 text-white text-xs font-bold hover:bg-orange-600"
            >
              Save Location
            </button>
          </div>
        </form>
      ) : (
        <div className="border-t border-slate-100 p-3 shrink-0">
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="flex w-full items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add new location
          </button>
        </div>
      )}
    </>
  );

  const mobilePanel = open && variant === 'mobile' && createPortal(
    <>
      <div
        className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-[2px]"
        onClick={closePanel}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Delivery location"
        className="fixed inset-x-0 bottom-0 z-[310] bg-white border-t border-slate-200 rounded-t-2xl shadow-2xl max-h-[90vh] flex flex-col"
        style={{ animation: 'slideUp 0.25s ease-out', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-slate-100 shrink-0">
          <span className="text-base font-extrabold text-slate-800">Delivery Location</span>
          <button
            type="button"
            onClick={closePanel}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto flex-1 min-h-0">
          {panelContent}
        </div>
      </div>
    </>,
    document.body
  );

  return (
    <>
      <div className={`relative shrink-0 ${variant === 'mobile' ? 'min-w-0 max-w-[min(52vw,11rem)]' : ''}`} ref={pickerRef}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className={`flex items-center gap-1 rounded border border-transparent hover:bg-slate-50 transition-colors duration-150 cursor-pointer min-w-0 ${
            variant === 'mobile' ? 'px-1 py-1' : 'px-2.5 py-1 gap-1.5'
          }`}
          aria-label="Change delivery location"
          aria-expanded={open}
        >
          <LocationPinIcon className={`text-slate-500 shrink-0 ${variant === 'mobile' ? 'h-4 w-4' : 'h-5 w-5 mt-0.5'}`} />
          <div className="flex flex-col text-left min-w-0 overflow-hidden">
            <span className="text-[10px] leading-tight text-slate-500 truncate">Deliver to</span>
            <span className="font-bold leading-tight text-slate-700 truncate text-[11px] sm:text-xs">
              {triggerText}
            </span>
          </div>
          <span className="text-[8px] text-slate-400 shrink-0 leading-none">▼</span>
        </button>

        {open && variant === 'desktop' && (
          <div
            ref={panelRef}
            className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-1rem)] rounded-xl bg-white shadow-2xl z-[100] border border-slate-200 animate-scale-in overflow-hidden flex flex-col"
          >
            {panelContent}
          </div>
        )}
      </div>

      {mobilePanel}
    </>
  );
};

export default DeliveryLocationPicker;
