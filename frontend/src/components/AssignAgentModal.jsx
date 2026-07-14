import { useState, useEffect } from 'react';
import { useGetDeliveryAgentsQuery } from '../features/api/usersApiSlice';
import { useAssignDeliveryAgentMutation } from '../features/api/ordersApiSlice';
import { toast } from 'react-toastify';
import Loader from './Loader';

const AssignAgentModal = ({ isOpen, onClose, orderId, currentAgentId, shippingAddress }) => {
  const [selectedAgentId, setSelectedAgentId] = useState(currentAgentId || '');
  
  const { data: agents, isLoading: isLoadingAgents } = useGetDeliveryAgentsQuery(undefined, {
    skip: !isOpen
  });
  
  const [assignAgent, { isLoading: isAssigning }] = useAssignDeliveryAgentMutation();

  useEffect(() => {
    if (isOpen) {
      setSelectedAgentId(currentAgentId || '');
    }
  }, [isOpen, currentAgentId]);

  if (!isOpen) return null;

  const handleAssign = async () => {
    if (!selectedAgentId) {
      toast.error('Please select a delivery agent');
      return;
    }
    
    try {
      await assignAgent({ orderId, deliveryAgentId: selectedAgentId }).unwrap();
      toast.success('Agent assigned successfully');
      onClose();
    } catch (err) {
      toast.error(err?.data?.message || err.error);
    }
  };

  const selectedAgent = agents?.find(a => a.id === selectedAgentId);
  
  const getMapUrl = () => {
    if (!shippingAddress) return '';
    // Format address for map
    let query = '';
    if (typeof shippingAddress === 'string') {
      query = shippingAddress;
    } else {
      const parts = [
        shippingAddress.address || shippingAddress.doorNo,
        shippingAddress.street,
        shippingAddress.area,
        shippingAddress.city,
        shippingAddress.postalCode || shippingAddress.pinCode,
        shippingAddress.country
      ].filter(Boolean);
      query = parts.join(', ');
    }
    return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&t=&z=13&ie=UTF8&iwloc=&output=embed`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-lg font-bold text-slate-800">Assign Delivery Agent</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-5 flex-1 overflow-y-auto space-y-5">
          {isLoadingAgents ? (
            <Loader />
          ) : agents?.length === 0 ? (
            <p className="text-sm text-slate-500">No delivery agents found.</p>
          ) : (
            <div>
              <div className="flex justify-between items-end mb-2">
                <label className="block text-sm font-semibold text-slate-700">Select Agent</label>
                <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">{agents?.length} {agents?.length === 1 ? 'agent' : 'agents'} available</span>
              </div>
              <select
                value={selectedAgentId}
                onChange={(e) => setSelectedAgentId(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500"
              >
                <option value="">-- Choose an Agent --</option>
                {agents?.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name} {agent.phoneNumber ? `- ${agent.phoneNumber}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedAgent && (
            <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
              <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wide mb-2">Agent Details</h3>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Phone</p>
                  <p className="font-medium text-slate-800">{selectedAgent.phoneNumber || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs mb-0.5">Email</p>
                  <p className="font-medium text-slate-800">{selectedAgent.email}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Delivery Location Map</h3>
            <div className="bg-slate-100 rounded-lg overflow-hidden border border-slate-200 h-48 relative">
              {shippingAddress ? (
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  marginHeight="0"
                  marginWidth="0"
                  src={getMapUrl()}
                  title="Delivery Location Map"
                  className="absolute inset-0"
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full text-sm text-slate-400">
                  Address not available
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 flex gap-3 justify-end bg-slate-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={isAssigning || !selectedAgentId || selectedAgentId === currentAgentId}
            className="px-4 py-2 rounded-lg bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors disabled:bg-orange-300 flex items-center justify-center min-w-[100px]"
          >
            {isAssigning ? (
              <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Assign Agent'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AssignAgentModal;
