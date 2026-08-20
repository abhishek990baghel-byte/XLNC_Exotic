import { useEffect, useState } from 'react';
import { Search, Upload as Export, Shield } from 'lucide-react';
import ExportModal from '../components/ExportModal';

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

import { parseResponseJson } from '../utils/safeFetch';

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  useEffect(() => {
    fetch('/api/audit-logs')
      .then(r => parseResponseJson(r, []))
      .then(data => setLogs(Array.isArray(data) ? data : []))
      .catch(() => setLogs([]));
  }, []);

  const safeLogs = Array.isArray(logs) ? logs : [];
  const users = Array.from(new Set(safeLogs.map(l => l.user_name).filter(Boolean)));
  const actions = Array.from(new Set(safeLogs.map(l => l.action).filter(Boolean)));

  const filtered = safeLogs.filter(l => {
    const matchSearch = 
      l.user_name.toLowerCase().includes(search.toLowerCase()) || 
      l.action.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase());
    
    const matchUser = filterUser ? l.user_name === filterUser : true;
    const matchAction = filterAction ? l.action === filterAction : true;
    
    let matchDate = true;
    const logDate = new Date(l.timestamp);
    if (startDate) {
      matchDate = matchDate && logDate >= new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      matchDate = matchDate && logDate <= end;
    }

    return matchSearch && matchUser && matchAction && matchDate;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
          <Shield className="w-8 h-8 text-gray-400" />
          Audit Log
        </h1>
        <button
          onClick={() => setIsExportModalOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm shadow-2xs cursor-pointer"
        >
          <Export className="w-4 h-4" /> Export
        </button>
      </div>
      
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50/50 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by user, action, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-black outline-none transition-all"
            />
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">User</label>
              <select
                value={filterUser}
                onChange={(e) => setFilterUser(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm"
              >
                <option value="">All Users</option>
                {users.map((u, idx) => <option key={`user-${u}-${idx}`} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Action Type</label>
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm"
              >
                <option value="">All Actions</option>
                {actions.map((a, idx) => <option key={`action-${a}-${idx}`} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-black focus:border-black text-sm"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4 whitespace-nowrap">Timestamp</th>
                <th className="p-4 whitespace-nowrap">User</th>
                <th className="p-4 whitespace-nowrap">Action</th>
                <th className="p-4 whitespace-nowrap">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(l => (
                <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-4 text-sm text-gray-600">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="p-4 text-sm font-medium text-gray-900">
                    {l.user_name}
                  </td>
                  <td className="p-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {l.action}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-600">
                    {l.details}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500">
                    No audit logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        data={logs}
        type="ledger" // Reuse ledger export type for generic date filtering
        filename="audit_logs"
      />
    </div>
  );
}
