import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';

const CallSimulationModal = ({ isOpen, onClose }) => {
  const { userInfo } = useSelector((state) => state.auth);
  const [callState, setCallState] = useState(null);
  const [timer, setTimer] = useState(0);
  const [inputText, setInputText] = useState('');

  // Start call
  useEffect(() => {
    if (!isOpen) {
      setCallState(null);
      setTimer(0);
      return;
    }

    const newCall = {
      id: Date.now(),
      callerId: userInfo._id,
      callerName: userInfo.name,
      callerRole: userInfo.isDeliveryAgent ? 'Delivery Agent' : 'Buyer',
      status: 'ringing',
      agentName: '',
      messages: [
        { sender: 'System', text: 'Dialing Customer Helpline...' },
      ],
    };

    localStorage.setItem('buybee_active_call', JSON.stringify(newCall));
    setCallState(newCall);

    // Broadcast change
    window.dispatchEvent(new Event('storage'));

    // Check for agent response
    const interval = setInterval(() => {
      const activeCall = localStorage.getItem('buybee_active_call');
      if (activeCall) {
        const parsed = JSON.parse(activeCall);
        if (parsed.id === newCall.id) {
          setCallState(parsed);
        } else {
          // Call hijacked or ended
          handleEndCall();
        }
      } else {
        handleEndCall();
      }
    }, 1000);

    return () => {
      clearInterval(interval);
      localStorage.removeItem('buybee_active_call');
      window.dispatchEvent(new Event('storage'));
    };
  }, [isOpen]);

  // Call duration timer
  useEffect(() => {
    if (callState?.status === 'connected') {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [callState?.status]);

  const handleEndCall = () => {
    localStorage.removeItem('buybee_active_call');
    window.dispatchEvent(new Event('storage'));
    setCallState(null);
    onClose();
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !callState) return;

    const updatedCall = {
      ...callState,
      messages: [
        ...callState.messages,
        { sender: userInfo.name, text: inputText },
      ],
    };

    localStorage.setItem('buybee_active_call', JSON.stringify(updatedCall));
    setCallState(updatedCall);
    window.dispatchEvent(new Event('storage'));
    setInputText('');
  };

  if (!isOpen || !callState) return null;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md">
      <div className="bg-slate-950 text-white rounded-3xl w-full max-w-md overflow-hidden border border-slate-800 shadow-2xl flex flex-col h-[600px]">
        {/* Call Status Header */}
        <div className="p-6 bg-gradient-to-b from-brand-900/30 to-transparent flex flex-col items-center shrink-0">
          <div className="relative">
            <div className="w-20 h-20 bg-brand-500/20 rounded-full flex items-center justify-center border border-brand-500/40 animate-pulse">
              <svg className="w-10 h-10 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            {callState.status === 'connected' && (
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
            )}
          </div>

          <h3 className="mt-4 text-lg font-black tracking-wide">BuyBee Call Support</h3>
          <p className="text-xs text-brand-300 font-bold uppercase tracking-widest mt-1">
            {callState.status === 'connected' ? `Connected with ${callState.agentName}` : 'Ringing Help Desk...'}
          </p>

          {callState.status === 'connected' && (
            <span className="mt-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs px-2.5 py-0.5 rounded-full font-mono font-bold">
              {formatTime(timer)}
            </span>
          )}
        </div>

        {/* Call Transcript / Live Chat */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-900/30">
          {callState.messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex flex-col ${
                msg.sender === 'System'
                  ? 'items-center'
                  : msg.sender === userInfo.name
                    ? 'items-end'
                    : 'items-start'
              }`}
            >
              <span className="text-[10px] text-slate-500 font-semibold mb-1">
                {msg.sender}
              </span>
              <div
                className={`rounded-2xl px-4 py-2.5 max-w-[85%] text-sm font-medium ${
                  msg.sender === 'System'
                    ? 'bg-slate-800/40 text-slate-400 text-xs text-center border border-slate-800'
                    : msg.sender === userInfo.name
                      ? 'bg-brand-600 text-white rounded-tr-none'
                      : 'bg-slate-800 text-slate-100 rounded-tl-none border border-slate-700'
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
        </div>

        {/* Chat input if connected */}
        {callState.status === 'connected' && (
          <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 shrink-0 flex gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type message to support..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition"
            >
              Send
            </button>
          </form>
        )}

        {/* End Call Button Section */}
        <div className="p-6 bg-slate-950 border-t border-slate-900 flex justify-center shrink-0">
          <button
            onClick={handleEndCall}
            className="flex items-center justify-center w-14 h-14 bg-red-600 hover:bg-red-700 rounded-full transition-transform hover:scale-105 shadow-lg shadow-red-600/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" className="origin-center rotate-[135deg]" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CallSimulationModal;
