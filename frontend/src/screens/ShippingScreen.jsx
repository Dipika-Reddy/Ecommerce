import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { saveShippingAddress, saveDeliveryDetails } from '../features/cart/cartSlice';
import FormContainer from '../components/FormContainer';
import CheckoutSteps from '../components/CheckoutSteps';

const ShippingScreen = () => {
  const { shippingAddress, deliveryMethod: storedDeliveryMethod, shippingPrice: storedShippingPrice } = useSelector((state) => state.cart);
  const { locations } = useSelector((state) => state.deliveryLocation);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const [address, setAddress] = useState(shippingAddress?.address || '');
  const [city, setCity] = useState(shippingAddress?.city || '');
  const [postalCode, setPostalCode] = useState(shippingAddress?.postalCode || '');
  const [country, setCountry] = useState(shippingAddress?.country || '');
  const [deliveryMethod, setDeliveryMethod] = useState(storedDeliveryMethod || 'Standard Shipping');
  const [deliveryPrice, setDeliveryPrice] = useState(storedShippingPrice !== undefined ? storedShippingPrice : 0.0);

  useEffect(() => {
    if (shippingAddress) {
      setAddress(shippingAddress.address || '');
      setCity(shippingAddress.city || '');
      setPostalCode(shippingAddress.postalCode || '');
      setCountry(shippingAddress.country || '');
    }
  }, [shippingAddress]);

  const submitHandler = (e) => {
    e.preventDefault();
    dispatch(saveShippingAddress({ address, city, postalCode, country }));
    dispatch(saveDeliveryDetails({ deliveryMethod, shippingPrice: deliveryPrice }));
    navigate('/payment'); // checkout wizard step 2
  };

  return (
    <FormContainer>
      <CheckoutSteps step1 />
      <h1 className="mb-5 text-2xl font-bold text-gray-900">Shipping & Delivery</h1>
      <form onSubmit={submitHandler} className="space-y-4">
        {/* Quick Select Saved Address */}
        {locations && locations.length > 0 && (
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2.5">Select Saved Address</p>
            <div className="flex flex-wrap gap-2.5">
              {locations.map((loc) => {
                const isDefaultLoc = loc.isDefault && !loc.doorNo;
                const formattedAddr = isDefaultLoc 
                  ? loc.city 
                  : `${loc.doorNo ? loc.doorNo + ', ' : ''}${loc.street ? loc.street + ', ' : ''}${loc.area ? loc.area : ''}`;
                
                const formattedCity = loc.city;
                const formattedZip = loc.pinCode || '530004';
                
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => {
                      setAddress(formattedAddr);
                      setCity(formattedCity);
                      setPostalCode(formattedZip);
                      setCountry('India');
                      dispatch(saveShippingAddress({
                        address: formattedAddr,
                        city: formattedCity,
                        postalCode: formattedZip,
                        country: 'India'
                      }));
                    }}
                    className="flex flex-col items-start p-2.5 rounded-lg border border-slate-200 bg-white hover:border-orange-400 hover:bg-orange-50/20 text-left transition min-w-[7rem] max-w-[12rem] cursor-pointer"
                  >
                    <span className="text-xs font-bold text-orange-600 uppercase tracking-wider">{loc.label}</span>
                    <span className="text-[11px] text-slate-600 truncate w-full mt-0.5">{formattedAddr}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">{formattedCity} - {formattedZip}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            value={address}
            required
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
          <input
            type="text"
            value={city}
            required
            onChange={(e) => setCity(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            value={postalCode}
            required
            onChange={(e) => setPostalCode(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
          <input
            type="text"
            value={country}
            required
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>

        {/* Delivery Method Selection */}
        <div className="flex flex-col gap-3 pt-2">
          <label className="text-xs font-bold text-slate-500 border-t border-slate-100 pt-3">Delivery Options</label>
          <div className="grid grid-cols-1 gap-2.5 text-left">
            <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
              deliveryMethod === 'Standard Shipping' ? 'border-brand-500 bg-brand-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="delivery" 
                  value="Standard Shipping"
                  checked={deliveryMethod === 'Standard Shipping'}
                  onChange={() => { setDeliveryMethod('Standard Shipping'); setDeliveryPrice(0.0); }}
                  className="accent-brand-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Standard Shipping</div>
                  <div className="text-xs text-slate-500">5-7 business days delivery</div>
                </div>
              </div>
              <span className="text-sm font-bold text-emerald-600">FREE</span>
            </label>

            <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
              deliveryMethod === 'Express Shipping' ? 'border-brand-500 bg-brand-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="delivery" 
                  value="Express Shipping"
                  checked={deliveryMethod === 'Express Shipping'}
                  onChange={() => { setDeliveryMethod('Express Shipping'); setDeliveryPrice(10.0); }}
                  className="accent-brand-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Express Shipping</div>
                  <div className="text-xs text-slate-500">2-3 business days delivery</div>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800">₹10.00</span>
            </label>

            <label className={`flex items-center justify-between p-3.5 border rounded-xl cursor-pointer transition ${
              deliveryMethod === 'Next-Day Delivery' ? 'border-brand-500 bg-brand-50/20' : 'border-slate-200 bg-white hover:bg-slate-50'
            }`}>
              <div className="flex items-center gap-3">
                <input 
                  type="radio" 
                  name="delivery" 
                  value="Next-Day Delivery"
                  checked={deliveryMethod === 'Next-Day Delivery'}
                  onChange={() => { setDeliveryMethod('Next-Day Delivery'); setDeliveryPrice(25.0); }}
                  className="accent-brand-500"
                />
                <div>
                  <div className="text-sm font-bold text-slate-800">Next-Day Delivery</div>
                  <div className="text-xs text-slate-500">Delivered tomorrow morning</div>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-800">₹25.00</span>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-brand-600 py-2.5 font-semibold text-white hover:bg-brand-700"
        >
          Continue to Payment
        </button>
      </form>
    </FormContainer>
  );
};

export default ShippingScreen;
