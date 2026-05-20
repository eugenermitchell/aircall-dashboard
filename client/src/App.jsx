import { useEffect, useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [stats, setStats] = useState({
    totalCalls: 0,
    inboundCalls: 0,
    outboundCalls: 0,
    inboundAnswered: 0,
    inboundMissed: 0,
    averageWaitSeconds: 0,
    activeCalls: 0,
    callbackRequests: 0,
    currentCalls: []
  });

  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers();

    const usersInterval = setInterval(() => {
      fetchUsers();
    }, 3000);

    return () => clearInterval(usersInterval);
  }, []);

  useEffect(() => {
    fetchStats();

    const statsInterval = setInterval(() => {
      fetchStats();
    }, 3000);

    return () => clearInterval(statsInterval);
  }, []);

  const fetchStats = async () => {
    const response = await axios.get('https://aircall-dashboard-api.onrender.com/calls-today');
    setStats(response.data);
  };

  const fetchUsers = async () => {
    const response = await axios.get('https://aircall-dashboard-api.onrender.com/users');
    setUsers(response.data.users);
  };

  const formatSubstatus = (substatus) => {
    if (substatus === 'always_opened') return 'Available';
    if (substatus === 'always_closed') return 'Unavailable';
    if (substatus === 'doing_back_office') return 'Help Desk';
    if (substatus === 'in_call') return 'In Call';

    return substatus
      .replace('doing_', '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div className="dashboard">
      <h1>CCI Support Dashboard</h1>

      <div className="stats-grid">
        <div className="card"><h2>Total Calls</h2><p>{stats.totalCalls}</p></div>
        <div className="card"><h2>Inbound</h2><p>{stats.inboundCalls}</p></div>
        <div className="card"><h2>Outbound</h2><p>{stats.outboundCalls}</p></div>
        <div className="card"><h2>Active Calls</h2><p>{stats.activeCalls}</p></div>
        <div className="card"><h2>Callbacks</h2><p>{stats.callbackRequests}</p></div>
        <div className="card"><h2>Avg Wait</h2><p>{Math.floor(stats.averageWaitSeconds / 60)}:{String(stats.averageWaitSeconds % 60).padStart(2, '0')}</p></div>
      </div>

      <div className="bottom-grid">
        <div className="current-calls-section">
          <h2>Current Calls</h2>

          {stats.currentCalls?.length === 0 ? (
            <p>No active calls</p>
          ) : (
            stats.currentCalls.map(call => (
              <div className="current-call-card" key={call.id}>
                <div>
                  <strong>{call.label}</strong>
                  <div className="call-number">{call.raw_digits}</div>
                </div>

                <span className="call-timer">
                  {Math.floor(call.seconds / 60)}:{String(call.seconds % 60).padStart(2, '0')}
                </span>
              </div>
            ))
          )}
        </div>

        <div className="agents-section">
          <h2>Agents</h2>

          <div className="agents-grid">
            {[...users]
              .sort((a, b) => {
                const order = {
                  always_opened: 1,
                  in_call: 1,
                  out_for_lunch: 2,
                  on_a_break: 2,
                  doing_back_office: 2,
                  in_training: 2,
                  always_closed: 3
                };

                const aOrder = order[a.substatus] || 99;
                const bOrder = order[b.substatus] || 99;

                if (aOrder !== bOrder) {
                  return aOrder - bOrder;
                }

                return a.name.localeCompare(b.name);
              })
              .map(user => (
                <div className="agent-card" key={user.id}>
                  <div className="agent-name">{user.name}</div>
                  <div className={`status ${user.substatus}`}>
                  <div className="status-time">
                    {Math.floor(user.statusSeconds / 60)}:
                    {String(user.statusSeconds % 60).padStart(2, '0')}
                  </div>
                    {formatSubstatus(user.substatus)}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;