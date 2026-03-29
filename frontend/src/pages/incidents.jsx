import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom"
import { AlertTriangle, Siren, CheckCircle2, Clock, ShieldCheck } from "lucide-react"

function Incidents() {
    const [incidents, setIncidents] = useState([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState('active')
    const navigate = useNavigate()

    useEffect(() => {
        fetchIncidents()
    }, [])

    const fetchIncidents = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (res.ok) setIncidents(Array.isArray(data) ? data : [])
        } catch (error) {
            console.error("Failed to fetch incidents:", error)
        } finally {
            setLoading(false)
        }
    }

    const statusColors = {
        investigating: "bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
        identified: "bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
        monitoring: "bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
        resolved: "bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest",
    }

    const priorityColors = {
        P1: "bg-rose-100 text-rose-800 border border-rose-200",
        P2: "bg-orange-100 text-orange-800 border border-orange-200",
        P3: "bg-amber-100 text-amber-800 border border-amber-200",
        P4: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    }

    const priorityBorders = {
        P1: "border-l-rose-500",
        P2: "border-l-orange-500",
        P3: "border-l-amber-500",
        P4: "border-l-indigo-500",
    }

    const ongoingIncidents = incidents.filter(i => i.status !== 'resolved')
    const resolvedIncidents = incidents.filter(i => i.status === 'resolved')

    const displayedIncidents = activeTab === 'active' ? ongoingIncidents : resolvedIncidents

    // Helper: how long it took to resolve
    const getResolutionDuration = (incident) => {
        if (!incident.resolvedAt || !incident.createdAt) return null
        const diffMs = new Date(incident.resolvedAt) - new Date(incident.createdAt)
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
        const diffDays = Math.floor(diffHours / 24)
        if (diffDays > 0) return `${diffDays}d ${diffHours % 24}h`
        if (diffHours > 0) return `${diffHours}h`
        const diffMins = Math.floor(diffMs / (1000 * 60))
        return `${diffMins}m`
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-rose-100 text-rose-600 rounded-xl">
                        <Siren className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Incidents</h1>
                        <p className="text-sm text-slate-500 font-medium mt-1">
                            Major platform issues and coordinated responses.
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <div className="px-4 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
                        <span className="text-sm font-bold text-slate-700">{ongoingIncidents.length} <span className="text-slate-500 font-medium">Active</span></span>
                    </div>
                    <div className="px-4 py-1.5 bg-white border border-slate-200 shadow-sm rounded-lg flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        <span className="text-sm font-bold text-slate-700">{resolvedIncidents.length} <span className="text-slate-500 font-medium">Resolved</span></span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl w-fit border border-slate-200/60">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 ${
                        activeTab === 'active'
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                    <Siren className="w-4 h-4" />
                    Active
                    {ongoingIncidents.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            activeTab === 'active'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-200 text-slate-600'
                        }`}>
                            {ongoingIncidents.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('resolved')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold tracking-wide transition-all duration-200 ${
                        activeTab === 'resolved'
                            ? 'bg-white text-slate-800 shadow-sm border border-slate-200/80'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                    }`}
                >
                    <CheckCircle2 className="w-4 h-4" />
                    Resolved
                    {resolvedIncidents.length > 0 && (
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            activeTab === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-slate-200 text-slate-600'
                        }`}>
                            {resolvedIncidents.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Content */}
            {displayedIncidents.length === 0 ? (
                <div className="glass-panel flex flex-col items-center justify-center py-24 px-4 text-center">
                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6">
                        {activeTab === 'active' ? (
                            <ShieldCheck className="w-10 h-10 text-emerald-500" />
                        ) : (
                            <Clock className="w-10 h-10 text-slate-400" />
                        )}
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">
                        {activeTab === 'active' ? 'All Systems Operational' : 'No Past Incidents'}
                    </h3>
                    <p className="text-slate-500 max-w-sm">
                        {activeTab === 'active'
                            ? 'No active incidents detected. Incidents are automatically created when multiple related tickets are identified.'
                            : 'No resolved incidents to display. Once active incidents are resolved, they will appear here for reference.'
                        }
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayedIncidents.map((incident) => (
                        <div
                            key={incident._id}
                            className={`glass-panel p-6 cursor-pointer transition-all duration-200 border-l-4 border-r-transparent border-t-transparent border-b-transparent relative overflow-hidden group ${
                                activeTab === 'resolved'
                                    ? 'border-l-emerald-400 hover:bg-emerald-50/30 hover:border-l-emerald-500'
                                    : `${priorityBorders[incident.priority] || 'border-l-amber-500'} hover:bg-slate-50`
                            }`}
                            onClick={() => navigate(`/incidents/${incident._id}`)}
                        >
                            {/* Watermark icon */}
                            <div className="absolute -right-6 -top-6 pointer-events-none opacity-[0.04] group-hover:opacity-[0.07] transition-opacity">
                                {activeTab === 'resolved' ? (
                                    <CheckCircle2 className="w-32 h-32 text-emerald-600" />
                                ) : (
                                    <Siren className="w-32 h-32 text-slate-900" />
                                )}
                            </div>
                            
                            <div className="relative z-10 flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
                                <div className="flex flex-wrap items-center gap-3">
                                    <span className={`text-sm font-mono font-bold px-2 py-0.5 rounded border ${
                                        activeTab === 'resolved'
                                            ? 'text-emerald-600 bg-emerald-50 border-emerald-100'
                                            : 'text-rose-600 bg-rose-50 border-rose-100'
                                    }`}>
                                        INC-{String(incident.incidentNumber).padStart(3, '0')}
                                    </span>
                                    <span className={`px-2 py-1 rounded-md text-[10px] uppercase tracking-wider font-bold ${priorityColors[incident.priority] || priorityColors.P3}`}>
                                        {incident.priority || 'P3'}
                                    </span>
                                    <h3 className="text-lg font-bold text-slate-800 py-0.5 group-hover:text-indigo-700 transition-colors">{incident.title}</h3>
                                </div>
                                <span className={statusColors[incident.status] || statusColors.investigating}>
                                    {incident.status?.replace("_", " ")}
                                </span>
                            </div>

                            <p className="relative z-10 text-slate-600 font-medium text-sm mb-5 line-clamp-2 max-w-4xl">{incident.description}</p>

                            <div className="relative z-10 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500">
                                <span className="bg-slate-100/80 px-3 py-1.5 rounded-lg">
                                    Dept: <span className="text-slate-700">{incident.department?.name || 'Unknown'}</span>
                                </span>
                                <span className="bg-slate-100/80 px-3 py-1.5 rounded-lg">
                                    Lead: <span className="text-slate-700">{incident.incidentLead?.email || 'Unassigned'}</span>
                                </span>
                                <span className="bg-slate-100/80 px-3 py-1.5 rounded-lg">
                                    <span className="text-slate-700">{incident.tickets?.length || 0}</span> Linked Tickets
                                </span>
                                <span className="px-1 text-slate-400">
                                    Created {new Date(incident.createdAt).toLocaleDateString()}
                                </span>

                                {/* Resolved-specific metadata */}
                                {incident.resolvedAt && (
                                    <div className="flex items-center gap-3 ml-auto">
                                        {getResolutionDuration(incident) && (
                                            <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100/80 px-3 py-1.5 rounded-lg">
                                                <Clock className="w-3.5 h-3.5" />
                                                TTR: <span className="text-slate-700">{getResolutionDuration(incident)}</span>
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5 text-emerald-600 font-bold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                            {new Date(incident.resolvedAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default Incidents
