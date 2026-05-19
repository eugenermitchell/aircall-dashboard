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
    averageWaitSeconds: 0
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
  }, 30000);

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

    return substatus
      .replace('doing_', '')
      .replaceAll('_', ' ')
      .replace(/\b\w/g, char => char.toUpperCase());
  };

  return (
    <div className="dashboard">
      <h1>Aircall Dashboard</h1>

      <div className="stats-grid">
        <div className="card"><h2>Total Calls</h2><p>{stats.totalCalls}</p></div>
        <div className="card"><h2>Inbound</h2><p>{stats.inboundCalls}</p></div>
        <div className="card"><h2>Outbound</h2><p>{stats.outboundCalls}</p></div>
        <div className="card"><h2>Answered</h2><p>{stats.inboundAnswered}</p></div>
       <div className="card"><h2>Avg Wait</h2><p>{stats.averageWaitSeconds}s</p></div>
      </div>

      <div className="agents-section">
        <h2>Agents</h2>

        <div className="agents-grid">
         {[...users]
  .sort((a, b) => {

    const order = {
      always_opened: 1,
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
                {formatSubstatus(user.substatus)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;