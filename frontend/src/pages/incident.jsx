import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from "react-router-dom"
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { AlertTriangle } from 'lucide-react';

function IncidentDetailsPage() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [incident, setIncident] = useState(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [updateMsg, setUpdateMsg] = useState(null)
    const [newUpdate, setNewUpdate] = useState('')
    const [showAddTicket, setShowAddTicket] = useState(false)
    const [availableTickets, setAvailableTickets] = useState([])
    const [loadingTickets, setLoadingTickets] = useState(false)
    const role = localStorage.getItem("userRole")
    const userId = localStorage.getItem("userId")

    useEffect(() => {
        fetchIncident()
    }, [id])

    const fetchIncident = async () => {
        setLoading(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (res.ok) setIncident(data.incident)
        } catch (error) {
            console.error("Failed to fetch incident:", error)
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (newStatus) => {
        if (newStatus === "resolved") {
            const confirmed = window.confirm(
                `Are you sure you want to resolve this incident? This will:\n\n• Mark all ${incident.tickets?.length || 0} linked tickets as DONE\n• Add a system comment to each ticket\n• Notify all ticket raisers via email`
            )
            if (!confirmed) return
        }

        setUpdating(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/status`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ status: newStatus })
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                toast.success(data.message)
            } else {
                toast.error(data.error || "Failed to update status")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setUpdating(false)
        }
    }

    const handlePriorityUpdate = async (newPriority) => {
        setUpdating(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/priority`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ priority: newPriority })
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                toast.success(data.message)
            } else {
                toast.error(data.error || "Failed to update priority")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setUpdating(false)
        }
    }

    const handleAddUpdate = async (e) => {
        e.preventDefault()
        if (!newUpdate.trim()) return

        setUpdating(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/updates`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ content: newUpdate })
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                setNewUpdate('')
                toast.success("Update added successfully")
            } else {
                toast.error(data.error || "Failed to add update")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setUpdating(false)
        }
    }

    const fetchAvailableTickets = async () => {
        setLoadingTickets(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/available-tickets`, {
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (res.ok) setAvailableTickets(data)
        } catch (error) {
            console.error("Failed to fetch available tickets:", error)
        } finally {
            setLoadingTickets(false)
        }
    }

    const handleAddTicket = async (ticketId) => {
        setUpdating(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/tickets`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`
                },
                body: JSON.stringify({ ticketId })
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                setAvailableTickets(prev => prev.filter(t => t._id !== ticketId))
                toast.success(data.message)
            } else {
                toast.error(data.error || "Failed to add ticket")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setUpdating(false)
        }
    }

    const handleRemoveTicket = async (ticketId, ticketNumber) => {
        const confirmed = window.confirm(`Remove TKT-${String(ticketNumber).padStart(3, '0')} from this incident?`)
        if (!confirmed) return

        setUpdating(true)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/tickets/${ticketId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                toast.success(data.message)
            } else {
                toast.error(data.error || "Failed to remove ticket")
            }
        } catch (error) {
            toast.error("Something went wrong")
        } finally {
            setUpdating(false)
        }
    }

    const openAddTicketModal = () => {
        setShowAddTicket(true)
        fetchAvailableTickets()
    }

    const statusColors = {
        investigating: "bg-rose-50 text-rose-700 border border-rose-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        identified: "bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        monitoring: "bg-indigo-50 text-indigo-700 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        resolved: "bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
    }

    const ticketStatusColors = {
        TODO: "bg-slate-100 text-slate-600 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        IN_PROGRESS: "bg-indigo-50 text-indigo-600 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        DONE: "bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
        CLOSED: "bg-purple-50 text-purple-600 border border-purple-200 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
    }

    const priorityColors = {
        low: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        medium: "bg-amber-50 text-amber-700 border border-amber-200",
        high: "bg-orange-50 text-orange-700 border border-orange-200",
        critical: "bg-rose-50 text-rose-700 border border-rose-200",
    }

    const incidentPriorityColors = {
        P1: "bg-rose-100 text-rose-800 border border-rose-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        P2: "bg-orange-100 text-orange-800 border border-orange-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        P3: "bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
        P4: "bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
    }

    const priorityLabels = {
        P1: "P1 - Critical",
        P2: "P2 - High",
        P3: "P3 - Medium",
        P4: "P4 - Low",
    }

    // Determine if user can manage this incident (full control)
    const canManage = role === 'admin' || (role === 'manager' && String(incident?.incidentLead?._id) === String(userId))

    // Determine if user can add updates (managers, admin, OR assigned to a linked ticket)
    const isAssignedToTicket = incident?.tickets?.some(ticket => 
        String(ticket.assignedTo?._id) === String(userId)
    )
    const canAddUpdates = canManage || isAssignedToTicket

    // Status flow — what's the next possible status
    const statusFlow = {
        investigating: ["identified", "monitoring", "resolved"],
        identified: ["monitoring", "resolved"],
        monitoring: ["resolved"],
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <span className="text-gray-500 text-lg">Loading incident...</span>
            </div>
        )
    }

    if (!incident) {
        return (
            <div className="text-center py-20">
                <p className="text-gray-500 text-lg">Incident not found.</p>
                <button onClick={() => navigate('/incidents')} className="mt-4 text-blue-600 hover:underline">
                    Back to Incidents
                </button>
            </div>
        )
    }

    const incNumber = `INC-${String(incident.incidentNumber).padStart(3, '0')}`
    const nextStatuses = statusFlow[incident.status] || []

    return (
        <div className="p-4 sm:p-6 lg:max-w-[1600px] w-full mx-auto space-y-6 pb-12 relative overflow-hidden">
            <div className="fixed -right-20 -top-20 pointer-events-none opacity-[0.03] z-0">
               <AlertTriangle className="w-[800px] h-[800px] text-rose-900" />
            </div>
            <div className="relative z-10">
                <button onClick={() => navigate("/incidents")} className="glass-button-secondary mb-2 w-fit px-4 py-2 text-sm">
                    ← Back to Incidents
                </button>

            {/* Incident Header (Full width) */}
            <div className="glass-panel p-6 sm:p-8 relative overflow-hidden">
                <div className="absolute -right-10 -top-10 text-slate-100/50 pointer-events-none">
                     <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
                </div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start gap-6">
                    <div>
                        <div className="flex flex-wrap items-center gap-3 mb-3">
                            <span className="text-sm font-mono font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100">{incNumber}</span>
                            <span className={incidentPriorityColors[incident.priority || 'P3']}>
                                {incident.priority || 'P3'}
                            </span>
                            <span className={statusColors[incident.status]}>
                                {incident.status?.replace("_", " ")}
                            </span>
                        </div>
                        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{incident.title}</h1>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* LEFT COLUMN: Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Linked Tickets */}
                    <div className="glass-panel p-6 sm:p-8">
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 border-b border-slate-100 pb-5">
                            <h3 className="text-[14px] font-bold text-slate-800 uppercase tracking-wider flex items-center gap-3">
                                LINKED TICKETS <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-md text-[12px] font-bold shadow-sm border border-slate-200/60">{incident.tickets?.length || 0}</span>
                            </h3>
                            {canManage && incident.status !== "resolved" && (
                                <button
                                    onClick={openAddTicketModal}
                                    className="text-indigo-600 border-2 border-indigo-200 hover:bg-indigo-50 px-5 py-2 text-xs font-bold uppercase tracking-wider rounded-full transition-colors bg-white shadow-sm flex items-center gap-1 active:scale-95"
                                >
                                    + ADD TICKET
                                </button>
                            )}
                        </div>

                        {!incident.tickets || incident.tickets.length === 0 ? (
                            <p className="text-slate-400 text-sm font-medium italic p-6 bg-slate-50/50 rounded-xl text-center border border-dashed border-slate-200">No tickets actively linked to this incident.</p>
                        ) : (
                            <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                                {incident.tickets.map((ticket) => (
                                    <div
                                        key={ticket._id}
                                        className="group border border-slate-200 bg-white rounded-2xl p-5 shadow-sm relative hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer flex flex-col sm:flex-row justify-between sm:items-center gap-4"
                                        onClick={() => navigate(`/tickets/${ticket._id}`)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start gap-3 mb-3 pr-8">
                                                <span className="text-[11px] shrink-0 font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shadow-sm">
                                                    TKT-{String(ticket.ticketNumber).padStart(3, '0')}
                                                </span>
                                                <span className="font-bold text-[15px] text-slate-800 leading-snug group-hover:text-indigo-600 transition-colors truncate">{ticket.title}</span>
                                            </div>
                                            
                                            <div className="flex flex-wrap items-center gap-2">
                                                {ticket.priority && (
                                                    <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider shadow-sm ${
                                                        ticket.priority === 'high' || ticket.priority === 'P2' ? 'border-amber-200 text-amber-600 bg-amber-50/50' : 
                                                        ticket.priority === 'critical' || ticket.priority === 'P1' ? 'border-rose-200 text-rose-600 bg-rose-50/50' : 
                                                        'border-amber-200 text-amber-600 bg-amber-50/50'
                                                    }`}>
                                                        {ticket.priority === 'medium' || ticket.priority === 'P3' ? 'MEDIUM' : ticket.priority}
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-md border text-[10px] font-bold uppercase tracking-wider border-indigo-200 text-indigo-600 bg-indigo-50/50 shadow-sm`}>
                                                    {ticket.status?.replace("_", " ")}
                                                </span>
                                            </div>
                                        </div>
                                        
                                        <div className="text-xs font-bold text-slate-500 bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex flex-col gap-1 min-w-[200px] shrink-0">
                                            <span className="text-slate-400 uppercase tracking-widest text-[10px]">OWNER</span>
                                            <span className="truncate text-slate-700">{ticket.assignedTo?.email || 'Unassigned'}</span>
                                        </div>
                                        
                                        {canManage && incident.status !== "resolved" && incident.tickets.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRemoveTicket(ticket._id, ticket.ticketNumber)
                                                }}
                                                disabled={updating}
                                                className="absolute top-4 right-4 text-slate-300 hover:text-rose-600 text-2xl p-1 transition-colors leading-none hover:bg-rose-50 rounded-full w-8 h-8 flex items-center justify-center"
                                                title="Remove from incident"
                                            >
                                                &times;
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Incident Updates/Notes */}
                    <div className="glass-panel p-6 sm:p-8">
                        <h3 className="text-lg font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Updates & Notes</h3>
                        
                        {canAddUpdates && incident.status !== "resolved" && (
                            <form onSubmit={handleAddUpdate} className="mb-8 relative">
                                <textarea
                                    value={newUpdate}
                                    onChange={(e) => setNewUpdate(e.target.value)}
                                    placeholder="Add an update or investigation note..."
                                    className="glass-input resize-y min-h-[100px]"
                                    rows={3}
                                />
                                <div className="flex justify-end mt-3">
                                    <button
                                        type="submit"
                                        disabled={updating || !newUpdate.trim()}
                                        className="glass-button-primary px-5"
                                    >
                                        {updating ? "Adding..." : "Add Update"}
                                    </button>
                                </div>
                            </form>
                        )}

                        {!incident.updates || incident.updates.length === 0 ? (
                            <p className="text-slate-400 text-sm font-medium italic p-4 bg-slate-50/50 rounded-xl text-center border border-dashed border-slate-200">No updates logged yet.</p>
                        ) : (
                            <div className="space-y-4">
                                {[...incident.updates].reverse().map((update, idx) => (
                                    <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm">
                                        <p className="text-slate-700 font-medium whitespace-pre-wrap">{update.content}</p>
                                        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400 mt-3 border-t border-slate-200/60 pt-3">
                                            <span className="text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{update.userId?.email || 'Unknown'}</span>
                                            <span>•</span>
                                            <span>{new Date(update.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN: Metadata and Context */}
                <div className="lg:col-span-1 space-y-6 sticky top-6 z-10">
                    
                    {/* Properties & Actions */}
                    <div className="glass-panel p-6">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider border-b border-slate-100 pb-3">Properties</h3>
                        
                        <div className="space-y-4 mb-6">
                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 block">Department</span>
                                <span className="font-semibold text-slate-800 block break-words" title={incident.department?.name}>{incident.department?.name || 'Unknown'}</span>
                            </div>
                            <div>
                                <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 block">Incident Lead</span>
                                <span className="font-semibold text-slate-800 block break-words" title={incident.incidentLead?.email}>{incident.incidentLead?.email || <span className="text-rose-400 italic font-medium">Unassigned</span>}</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1 min-w-0">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 block">Created</span>
                                    <span className="font-semibold text-slate-800 block text-xs">{new Date(incident.createdAt).toLocaleDateString()}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <span className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1 block">{incident.resolvedAt ? 'Resolved' : 'Updated'}</span>
                                    <span className="font-semibold text-slate-800 block text-xs">
                                        {incident.resolvedAt
                                            ? new Date(incident.resolvedAt).toLocaleDateString()
                                            : new Date(incident.updatedAt).toLocaleDateString()
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        {canManage && incident.status !== "resolved" && (
                            <div className="border-t border-slate-100 pt-5 space-y-4">
                                <div>
                                    <label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2 block">Change Priority</label>
                                    <select
                                        value={incident.priority || 'P3'}
                                        onChange={(e) => handlePriorityUpdate(e.target.value)}
                                        disabled={updating}
                                        className="glass-input px-3 py-2 pr-8 text-sm font-bold w-full"
                                    >
                                        <option value="P1">P1 - Critical</option>
                                        <option value="P2">P2 - High</option>
                                        <option value="P3">P3 - Medium</option>
                                        <option value="P4">P4 - Low</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-2 block">Update Status Phase</label>
                                    <div className="flex flex-col gap-2">
                                        {nextStatuses.map((status) => (
                                            <button
                                                key={status}
                                                onClick={() => handleStatusUpdate(status)}
                                                disabled={updating}
                                                className={status === "resolved" ? "glass-button-primary !bg-emerald-600 hover:!bg-emerald-500 uppercase tracking-widest text-[10px] py-2 w-full" : "glass-button-secondary uppercase tracking-widest text-[10px] py-2 w-full"}
                                            >
                                                {updating ? "..." : `Mark as ${status}`}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="glass-panel p-6">
                        <h3 className="text-[13px] font-bold text-slate-800 mb-4 uppercase tracking-wider border-b border-slate-100 pb-3">Description</h3>
                        <div className="text-slate-700 font-medium leading-relaxed whitespace-pre-wrap text-[14px]">
                            {incident.description}
                        </div>
                    </div>

                </div>
            </div>

            {/* Add Ticket Modal */}
            <AnimatePresence>
                {showAddTicket && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowAddTicket(false)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
                        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden border border-slate-100 flex flex-col">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-white">
                                <h3 className="text-xl font-bold text-slate-800">Add Ticket to Incident</h3>
                                <button
                                    onClick={() => setShowAddTicket(false)}
                                    className="text-slate-400 hover:text-slate-600 text-2xl font-light"
                                >
                                    &times;
                                </button>
                            </div>
                            <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
                                {loadingTickets ? (
                                    <p className="text-slate-500 font-medium text-center py-8">Loading available tickets...</p>
                                ) : availableTickets.length === 0 ? (
                                    <p className="text-slate-500 font-medium text-center py-8">No available tickets to add.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {availableTickets.map((ticket) => (
                                            <div
                                                key={ticket._id}
                                                className="bg-white border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm"
                                            >
                                                <div>
                                                    <span className="text-slate-500 text-[10px] font-bold font-mono bg-slate-100 px-2 py-0.5 rounded mr-2">
                                                        TKT-{String(ticket.ticketNumber).padStart(3, '0')}
                                                    </span>
                                                    <span className="font-bold text-slate-700 text-sm">{ticket.title}</span>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-1">{ticket.description}</p>
                                                </div>
                                                <button
                                                    onClick={() => handleAddTicket(ticket._id)}
                                                    className="glass-button-primary px-4 py-1.5 text-[11px] whitespace-nowrap"
                                                >
                                                    Add
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-slate-100 bg-white flex justify-end">
                                <button onClick={() => setShowAddTicket(false)} className="glass-button-secondary">Close</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
      </div>
    )
}

export default IncidentDetailsPage
