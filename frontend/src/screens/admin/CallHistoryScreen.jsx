import { useState } from 'react';
import { useGetCallHistoryQuery, useGetSupportOrderActionsQuery } from '../../features/api/helplineApiSlice';
import Loader from '../../components/Loader';
import Message from '../../components/Message';

const CallHistoryScreen = () => {
  const [activeTab, setActiveTab] = useState('calls');

  const { data: calls, isLoading: isCallsLoading, error: callsError } = useGetCallHistoryQuery();
  const { data: actions, isLoading: isActionsLoading, error: actionsError } = useGetSupportOrderActionsQuery();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 mb-1">Helpline & Support Logs</h1>
          <p className="text-sm text-slate-500">History of customer support calls, agent allocations, and order modifications.</p>
        </div>

        {/* Tab Controls */}
        <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200/60 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('calls')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'calls'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Helpline Calls
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
              activeTab === 'actions'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Order Modifications
          </button>
        </div>
      </div>

      {activeTab === 'calls' ? (
        <>
          {isCallsLoading ? (
            <Loader />
          ) : callsError ? (
            <Message variant="danger">{callsError?.data?.message || 'Failed to fetch call logs'}</Message>
          ) : calls.length === 0 ? (
            <Message variant="info">No helpline calls have been logged yet.</Message>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/70 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Customer</th>
                    <th className="px-5 py-4">Allocated Agent</th>
                    <th className="px-5 py-4">Call Notes / Details</th>
                    <th className="px-5 py-4">Logged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calls.map((call) => (
                    <tr key={call.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <p className="font-semibold text-slate-800 text-sm leading-snug">{call.customerName}</p>
                        <p className="text-xs text-slate-500 mt-0.5 font-medium">📞 {call.customerPhone}</p>
                        {call.customer && (
                          <span className="text-[9px] bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-bold mt-1.5 inline-block">
                            Linked: {call.customer.email}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <p className="font-semibold text-slate-700 text-sm">{call.agent.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{call.agent.email}</p>
                      </td>
                      <td className="px-5 py-4 align-middle max-w-md">
                        <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed break-words whitespace-pre-line">
                          {call.notes || <span className="italic text-slate-400">No notes provided</span>}
                        </p>
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap text-xs text-slate-500">
                        {new Date(call.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      ) : (
        <>
          {isActionsLoading ? (
            <Loader />
          ) : actionsError ? (
            <Message variant="danger">{actionsError?.data?.message || 'Failed to fetch action logs'}</Message>
          ) : actions.length === 0 ? (
            <Message variant="info">No support order modifications have been logged yet.</Message>
          ) : (
            <div className="overflow-x-auto rounded-3xl border border-slate-100 bg-white shadow-sm">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-slate-50/70 text-xs uppercase font-bold text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="px-5 py-4">Order ID</th>
                    <th className="px-5 py-4">Customer Account</th>
                    <th className="px-5 py-4">Support Agent</th>
                    <th className="px-5 py-4">Action Taken</th>
                    <th className="px-5 py-4">Modification Details</th>
                    <th className="px-5 py-4">Logged At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {actions.map((action) => (
                    <tr key={action.id} className="hover:bg-slate-50/30 transition">
                      <td className="px-5 py-4 align-middle font-mono text-xs text-slate-600 font-semibold whitespace-nowrap">
                        #{action.orderId.slice(-8)}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        {action.order?.user ? (
                          <>
                            <p className="font-semibold text-slate-800 text-sm leading-snug">{action.order.user.name}</p>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">{action.order.user.email}</p>
                          </>
                        ) : (
                          <span className="italic text-slate-400 text-xs">Unknown / Deleted Account</span>
                        )}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <p className="font-semibold text-slate-700 text-sm">{action.agent.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{action.agent.email}</p>
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${
                          action.action === 'Process Refund'
                            ? 'bg-rose-100 text-rose-700'
                            : action.action === 'Approve Return'
                              ? 'bg-amber-100 text-amber-700'
                              : 'bg-indigo-100 text-indigo-700'
                        }`}>
                          {action.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 align-middle max-w-sm text-xs font-semibold text-slate-600">
                        {action.details}
                      </td>
                      <td className="px-5 py-4 align-middle whitespace-nowrap text-xs text-slate-500">
                        {new Date(action.createdAt).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CallHistoryScreen;
