import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { isSupportUser } from '../utils/userRoles';

const SupportCallPanel = () => {
  const { userInfo } = useSelector((state) => state.auth);
  const [activeCall, setActiveCall] = useState(null);
  const [inputText, setInputText] = useState('');
  const [timer, setTimer] = useState(0);

  useEffect(() => {
    if (!userInfo || !isSupportUser(userInfo)) return;

    const checkCall = () => {
      const callData = localStorage.getItem('buybee_active_call');
      if (callData) {
        setActiveCall(JSON.parse(callData));
      } else {
        setActiveCall(null);
        setTimer(0);
      }
    };

    checkCall();

    // Listen for storage events (changes in other tabs) and poll locally for same tab
    window.addEventListener('storage', checkCall);
    const interval = setInterval(checkCall, 1000);

    return () => {
      window.removeEventListener('storage', checkCall);
      clearInterval(interval);
    };
  }, [userInfo]);

  useEffect(() => {
    if (activeCall?.status === 'connected') {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [activeCall?.status]);

  const handleAcceptCall = () => {
    if (!activeCall) return;

    const updatedCall = {
      ...activeCall,
      status: 'connected',
      agentName: userInfo.name,
      messages: [
        ...activeCall.messages,
        { sender: 'System', text: `Connected with Support Agent: ${userInfo.name}` },
        { sender: userInfo.name, text: 'Hello! Thanks for calling BuyBee Support. How can I help you today?' },
      ],
    };

    localStorage.setItem('buybee_active_call', JSON.stringify(updatedCall));
    setActiveCall(updatedCall);
    window.dispatchEvent(new Event('storage'));
  };

  const handleDeclineCall = () => {
    localStorage.removeItem('buybee_active_call');
    window.dispatchEvent(new Event('storage'));
    setActiveCall(null);
  };

  const handleSendResponse = (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeCall) return;

    const updatedCall = {
      ...activeCall,
      messages: [
        ...activeCall.messages,
        { sender: userInfo.name, text: inputText },
      ],
    };

    localStorage.setItem('buybee_active_call', JSON.stringify(updatedCall));
    setActiveCall(updatedCall);
    window.dispatchEvent(new Event('storage'));
    setInputText('');
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  if (!activeCall) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm overflow-hidden bg-slate-900 border border-slate-700 text-white rounded-2xl shadow-2xl animate-bounce-short">
      {activeCall.status === 'ringing' ? (
        <div className="p-5 flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/30 animate-pulse text-amber-500 mb-3">
            <svg className="w-6 h-6 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
          </div>
          <h4 className="text-sm font-bold text-amber-400">Incoming Help Desk Call!</h4>
          <p className="text-xs mt-1 font-bold text-slate-300">{activeCall.callerName} ({activeCall.callerRole})</p>
          <p className="text-[10px] text-slate-500 mt-2">Connecting from user profile helpline click</p>

          <div className="flex gap-3 mt-4 w-full">
            <button
              onClick={handleDeclineCall}
              className="flex-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-bold py-2 rounded-xl text-xs transition"
            >
              Decline
            </button>
            <button
              onClick={handleAcceptCall}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-xl text-xs transition shadow-sm"
            >
              Accept Call
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-[400px]">
          {/* Active Call Header */}
          <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
              <div>
                <h4 className="text-xs font-black">Connected Call</h4>
                <p className="text-[10px] text-slate-400 font-bold">{activeCall.callerName} ({activeCall.callerRole})</p>
              </div>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              {formatTime(timer)}
            </span>
          </div>

          {/* Active Call Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/40">
            {activeCall.messages.map((msg, idx) => (
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
                <span className="text-[9px] text-slate-500 font-semibold mb-0.5">
                  {msg.sender}
                </span>
                <div
                  className={`rounded-xl px-3 py-1.5 max-w-[85%] text-xs font-medium ${
                    msg.sender === 'System'
                      ? 'bg-slate-800/40 text-slate-500 text-[10px] text-center border border-slate-800/60'
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

          {/* Active Call Input & End button */}
          <div className="p-3 bg-slate-950 border-t border-slate-800 flex flex-col gap-2">
            <form onSubmit={handleSendResponse} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type helper response..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-brand-500"
              />
              <button
                type="submit"
                className="bg-brand-600 hover:bg-brand-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition"
              >
                Send
              </button>
            </form>
            <button
              onClick={handleDeclineCall}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-1.5 rounded-xl text-xs transition mt-1"
            >
              End Call
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupportCallPanel;
