import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart3, Ticket, CheckCircle2, AlertTriangle, Clock, TrendingUp,
  Users, Building2, ArrowUpRight, ArrowDownRight, Activity, Zap,
  CircleDot, Layers
} from 'lucide-react';
import Loader from '../components/Loader';

// Animated counter hook
function useAnimatedCount(target, duration = 800) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (target === 0) { setCount(0); return; }
    let start = 0;
    const startTime = performance.now();
    const step = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) ref.current = requestAnimationFrame(step);
    };
    ref.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(ref.current);
  }, [target, duration]);

  return count;
}

function AnimatedNumber({ value, className }) {
  const display = useAnimatedCount(value);
  return <span className={className}>{display}</span>;
}

// Mini bar component for charts
function Bar({ value, maxValue, color, label, count, delay = 0 }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <span className="text-xs font-semibold text-slate-500 w-24 text-right truncate uppercase tracking-wide">{label}</span>
      <div className="flex-1 h-8 bg-slate-100 rounded-lg overflow-hidden relative">
        <motion.div
          className={`h-full rounded-lg ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, delay: delay + 0.2, ease: "easeOut" }}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600">
          {count}
        </span>
      </div>
    </motion.div>
  );
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
  })
};

const sectionVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const userRole = localStorage.getItem('userRole');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/dashboard/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch dashboard stats');
      const data = await res.json();
      setStats(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader text="Loading Dashboard..." />;
  if (error) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="glass-panel p-8 text-center max-w-md">
        <AlertTriangle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Failed to Load Dashboard</h2>
        <p className="text-slate-500 mb-4">{error}</p>
        <button onClick={fetchStats} className="glass-button-primary">Retry</button>
      </div>
    </div>
  );

  if (!stats) return null;

  const { summary, statusCounts, priorityCounts, typeCounts, trend, incidents, workload, departmentName, role } = stats;
  const maxTrend = Math.max(...trend.map(t => t.count), 1);
  const maxStatus = Math.max(...Object.values(statusCounts), 1);
  const maxPriority = Math.max(...Object.values(priorityCounts), 1);

  const statusColors = {
    TODO: 'bg-slate-400',
    IN_PROGRESS: 'bg-blue-500',
    DONE: 'bg-emerald-500',
    CLOSED: 'bg-violet-500'
  };
  const statusLabels = {
    TODO: 'To Do',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done',
    CLOSED: 'Closed'
  };

  const priorityColors = {
    low: 'bg-emerald-500',
    medium: 'bg-blue-500',
    high: 'bg-amber-500',
    critical: 'bg-rose-500'
  };

  const summaryCards = [
    {
      title: 'Total Tickets',
      value: summary.totalTickets,
      icon: Layers,
      color: 'from-indigo-500 to-indigo-600',
      iconBg: 'bg-indigo-50 text-indigo-600',
      borderColor: 'border-indigo-100'
    },
    {
      title: 'Open Tickets',
      value: summary.openTickets,
      icon: CircleDot,
      color: 'from-amber-500 to-orange-500',
      iconBg: 'bg-amber-50 text-amber-600',
      borderColor: 'border-amber-100',
      subtitle: summary.totalTickets > 0 ? `${Math.round((summary.openTickets / summary.totalTickets) * 100)}% of total` : '0%'
    },
    {
      title: 'Resolved',
      value: summary.resolvedTickets,
      icon: CheckCircle2,
      color: 'from-emerald-500 to-emerald-600',
      iconBg: 'bg-emerald-50 text-emerald-600',
      borderColor: 'border-emerald-100',
      subtitle: summary.totalTickets > 0 ? `${Math.round((summary.resolvedTickets / summary.totalTickets) * 100)}% resolution rate` : '0%'
    },
    {
      title: 'Active Incidents',
      value: summary.activeIncidents,
      icon: AlertTriangle,
      color: 'from-rose-500 to-rose-600',
      iconBg: 'bg-rose-50 text-rose-600',
      borderColor: 'border-rose-100',
      alert: summary.activeIncidents > 0
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <motion.div
        className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm p-6 sm:p-8 rounded-2xl border border-slate-100 relative overflow-hidden"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Decorative gradient blob */}
        <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-indigo-100/40 to-violet-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-500" />
            {role === 'admin' ? 'System Dashboard' : 'Department Dashboard'}
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            {role === 'admin'
              ? 'System-wide analytics and operational overview.'
              : `Analytics for ${departmentName || 'your department'}.`}
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-2">
          <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider ${
            role === 'admin'
              ? 'bg-indigo-50 text-indigo-600 border border-indigo-200'
              : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
          }`}>
            {role === 'admin' ? '🛡️ Admin View' : '📊 Manager View'}
          </span>
        </div>
      </motion.div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.title}
              className={`bg-white rounded-2xl border ${card.borderColor} p-5 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300`}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              custom={i}
            >
              {/* Top gradient accent */}
              <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${card.color}`} />

              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                  <Icon className="w-5 h-5" />
                </div>
                {card.alert && (
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                  </span>
                )}
              </div>

              <AnimatedNumber
                value={card.value}
                className="text-3xl font-bold text-slate-800 block mb-1"
              />
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{card.title}</p>
              {card.subtitle && (
                <p className="text-[11px] text-slate-400 mt-1 font-medium">{card.subtitle}</p>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Charts Row 1: Status + Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Breakdown */}
        <motion.div
          className="glass-panel p-6"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Activity className="w-5 h-5 text-indigo-500" />
            <h2 className="text-lg font-bold text-slate-800">Status Breakdown</h2>
          </div>

          {/* Status ring visual */}
          <div className="flex items-center gap-8 mb-6">
            <div className="relative w-32 h-32 shrink-0">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                {(() => {
                  const total = summary.totalTickets || 1;
                  const segments = [
                    { key: 'TODO', color: '#94a3b8' },
                    { key: 'IN_PROGRESS', color: '#3b82f6' },
                    { key: 'DONE', color: '#10b981' },
                    { key: 'CLOSED', color: '#8b5cf6' }
                  ];
                  let offset = 0;
                  return segments.map(seg => {
                    const pct = (statusCounts[seg.key] / total) * 100;
                    const el = (
                      <circle
                        key={seg.key}
                        cx="18" cy="18" r="15.5"
                        fill="none"
                        stroke={seg.color}
                        strokeWidth="5"
                        strokeDasharray={`${pct} ${100 - pct}`}
                        strokeDashoffset={-offset}
                        strokeLinecap="round"
                        className="transition-all duration-1000"
                      />
                    );
                    offset += pct;
                    return el;
                  });
                })()}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-slate-800">{summary.totalTickets}</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total</span>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-2 gap-3">
              {Object.entries(statusLabels).map(([key, label]) => (
                <div key={key} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${statusColors[key]}`} />
                  <div>
                    <p className="text-xs font-medium text-slate-500">{label}</p>
                    <p className="text-sm font-bold text-slate-800">{statusCounts[key]}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status bars */}
          <div className="space-y-2.5">
            {Object.entries(statusLabels).map(([key, label], i) => (
              <Bar
                key={key}
                value={statusCounts[key]}
                maxValue={maxStatus}
                color={statusColors[key]}
                label={label}
                count={statusCounts[key]}
                delay={i * 0.1}
              />
            ))}
          </div>
        </motion.div>

        {/* Priority Distribution */}
        <motion.div
          className="glass-panel p-6"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.4 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <Zap className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-slate-800">Priority Distribution</h2>
          </div>

          <div className="space-y-3">
            {['critical', 'high', 'medium', 'low'].map((p, i) => (
              <Bar
                key={p}
                value={priorityCounts[p]}
                maxValue={maxPriority}
                color={priorityColors[p]}
                label={p}
                count={priorityCounts[p]}
                delay={i * 0.1}
              />
            ))}
          </div>


        </motion.div>
      </div>

      {/* Charts Row 2: Trend + Incidents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 7-Day Trend */}
        <motion.div
          className="glass-panel p-6"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-bold text-slate-800">Ticket Trend (7 Days)</h2>
          </div>

          <div className="flex items-end gap-2 h-48">
            {trend.map((day, i) => {
              const pct = maxTrend > 0 ? (day.count / maxTrend) * 100 : 0;
              const isToday = i === trend.length - 1;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <span className="text-xs font-bold text-slate-600">{day.count}</span>
                  <motion.div
                    className={`w-full rounded-t-lg ${isToday ? 'bg-gradient-to-t from-indigo-600 to-indigo-400' : 'bg-indigo-200 hover:bg-indigo-300'} transition-colors min-h-[4px]`}
                    initial={{ height: 0 }}
                    animate={{ height: `${Math.max(pct, 3)}%` }}
                    transition={{ duration: 0.6, delay: 0.5 + i * 0.08, ease: "easeOut" }}
                  />
                  <span className={`text-[11px] font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>
                    {day.day}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Incident Overview */}
        <motion.div
          className="glass-panel p-6"
          variants={sectionVariants}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="w-5 h-5 text-rose-500" />
            <h2 className="text-lg font-bold text-slate-800">Incident Overview</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-slate-800">{incidents.total}</p>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-1">Total Incidents</p>
            </div>
            <div className={`border rounded-xl p-4 text-center ${incidents.active > 0 ? 'bg-rose-50/50 border-rose-100' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <p className={`text-3xl font-bold ${incidents.active > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{incidents.active}</p>
              <p className={`text-[10px] font-semibold uppercase tracking-wider mt-1 ${incidents.active > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>Active</p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { key: 'investigating', label: 'Investigating', color: 'bg-rose-500', textColor: 'text-rose-600' },
              { key: 'identified', label: 'Identified', color: 'bg-amber-500', textColor: 'text-amber-600' },
              { key: 'monitoring', label: 'Monitoring', color: 'bg-blue-500', textColor: 'text-blue-600' },
              { key: 'resolved', label: 'Resolved', color: 'bg-emerald-500', textColor: 'text-emerald-600' }
            ].map((item, i) => {
              const count = incidents.statusCounts[item.key] || 0;
              const maxInc = Math.max(...Object.values(incidents.statusCounts), 1);
              return (
                <Bar
                  key={item.key}
                  value={count}
                  maxValue={maxInc}
                  color={item.color}
                  label={item.label}
                  count={count}
                  delay={i * 0.1}
                />
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Workload / Department Breakdown */}
      <motion.div
        className="glass-panel p-6"
        variants={sectionVariants}
        initial="hidden"
        animate="visible"
        transition={{ delay: 0.7 }}
      >
        <div className="flex items-center gap-2 mb-6">
          {role === 'admin' ? (
            <Building2 className="w-5 h-5 text-indigo-500" />
          ) : (
            <Users className="w-5 h-5 text-indigo-500" />
          )}
          <h2 className="text-lg font-bold text-slate-800">
            {role === 'admin' ? 'Department Breakdown' : 'Team Workload'}
          </h2>
        </div>

        {workload.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-400 font-medium">
              {role === 'admin' ? 'No departments found.' : 'No team members found.'}
            </p>
          </div>
        ) : role === 'admin' ? (
          /* Admin: Department table */
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">Department</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Total</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">To Do</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">In Progress</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Done</th>
                  <th className="text-center py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Closed</th>
                  <th className="text-left py-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {workload.map((dept, i) => {
                  const deptTotal = dept.total || 1;
                  return (
                    <motion.tr
                      key={dept.id}
                      className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.8 + i * 0.05 }}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          <span className="font-bold text-slate-800">{dept.name}</span>
                        </div>
                      </td>
                      <td className="text-center py-3 px-3 font-bold text-slate-700">{dept.total}</td>
                      <td className="text-center py-3 px-3 text-slate-500">{dept.TODO}</td>
                      <td className="text-center py-3 px-3 text-blue-600 font-semibold">{dept.IN_PROGRESS}</td>
                      <td className="text-center py-3 px-3 text-emerald-600 font-semibold">{dept.DONE}</td>
                      <td className="text-center py-3 px-3 text-violet-600 font-semibold">{dept.CLOSED}</td>
                      <td className="py-3 px-3 w-48">
                        <div className="flex rounded-full overflow-hidden h-3 bg-slate-100">
                          <div className="bg-slate-400 h-full transition-all" style={{ width: `${(dept.TODO / deptTotal) * 100}%` }} title="To Do" />
                          <div className="bg-blue-500 h-full transition-all" style={{ width: `${(dept.IN_PROGRESS / deptTotal) * 100}%` }} title="In Progress" />
                          <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(dept.DONE / deptTotal) * 100}%` }} title="Done" />
                          <div className="bg-violet-500 h-full transition-all" style={{ width: `${(dept.CLOSED / deptTotal) * 100}%` }} title="Closed" />
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Manager: Team workload cards */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {workload.map((member, i) => {
              const totalMember = member.openTickets + member.resolvedTickets;
              const pctResolved = totalMember > 0 ? Math.round((member.resolvedTickets / totalMember) * 100) : 0;
              return (
                <motion.div
                  key={member.id}
                  className="bg-white border border-slate-100 rounded-xl p-4 hover:shadow-md transition-all hover:border-indigo-100"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-sm uppercase">{member.name.charAt(0)}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 text-sm truncate">{member.name}</p>
                      <p className="text-[11px] text-slate-400 truncate">{member.email}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="bg-amber-50/50 border border-amber-100 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-amber-600">{member.openTickets}</p>
                      <p className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Open</p>
                    </div>
                    <div className="bg-emerald-50/50 border border-emerald-100 rounded-lg p-2.5 text-center">
                      <p className="text-lg font-bold text-emerald-600">{member.resolvedTickets}</p>
                      <p className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Resolved</p>
                    </div>
                  </div>

                  {/* Resolution progress */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${pctResolved}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{pctResolved}%</span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Dashboard;
