import { useState } from 'react';
import { useSelector } from 'react-redux';
import { toast } from 'react-toastify';
import { useCreateCallLogMutation, useLazySearchCustomerByPhoneQuery } from '../../features/api/helplineApiSlice';
import Loader from '../../components/Loader';

const HelplineScreen = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [customerFound, setCustomerFound] = useState(null);

  const [searchCustomer, { isLoading: isSearching }] = useLazySearchCustomerByPhoneQuery();
  const [createCallLog, { isLoading: isLogging }] = useCreateCallLogMutation();

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }
    try {
      const customer = await searchCustomer(phone).unwrap();
      if (customer) {
        setCustomerFound(customer);
        setName(customer.name);
        toast.success(`Customer found: ${customer.name}`);
      } else {
        setCustomerFound(null);
        setName('');
        toast.info('No registered customer found for this phone number. You can log it as an unregistered guest call.');
      }
    } catch (err) {
      toast.error(err?.data?.message || 'Error searching customer');
    }
  };

  const handleLogCall = async (e) => {
    e.preventDefault();
    if (!phone) {
      toast.error('Please enter a phone number');
      return;
    }
    try {
      await createCallLog({
        customerPhone: phone,
        customerName: name || 'Guest Customer',
        notes,
      }).unwrap();
      toast.success('Call log logged successfully');
      setPhone('');
      setName('');
      setNotes('');
      setCustomerFound(null);
    } catch (err) {
      toast.error(err?.data?.message || 'Failed to log call');
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Helpline Agent Workspace</h1>
        <p className="text-sm text-slate-500 mb-6">Allocate and log helpline support conversations here.</p>

        <form onSubmit={handleSearch} className="mb-6">
          <label className="block text-sm font-semibold text-slate-700 mb-2">
            Search Registered Customer
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Enter customer phone number..."
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <button
              type="submit"
              disabled={isSearching}
              className="rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-5 py-2.5 text-sm font-semibold shadow-sm transition disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {customerFound && (
          <div className="bg-blue-50 border border-blue-150 rounded-2xl p-4 mb-6">
            <h3 className="text-sm font-bold text-blue-800 mb-1">Registered Account Linked</h3>
            <p className="text-xs text-blue-700 font-semibold">{customerFound.name} ({customerFound.email})</p>
          </div>
        )}

        <form onSubmit={handleLogCall} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Caller Name
            </label>
            <input
              type="text"
              placeholder="Confirm or edit caller name..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Conversation Summary / Notes
            </label>
            <textarea
              rows="5"
              placeholder="What did the customer discuss? What resolution was provided?"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 focus:outline-none"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Allocated Agent: <span className="font-bold text-slate-700">{userInfo?.name}</span>
            </div>
            <button
              type="submit"
              disabled={isLogging}
              className="rounded-xl bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 text-sm font-semibold shadow-md transition disabled:opacity-50"
            >
              {isLogging ? 'Logging Call...' : 'Log & End Call'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HelplineScreen;
