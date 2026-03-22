import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from "react-router-dom"

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
        setUpdateMsg(null)
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
                setUpdateMsg({ type: "success", text: data.message })
            } else {
                setUpdateMsg({ type: "error", text: data.error || "Failed to update status" })
            }
        } catch (error) {
            setUpdateMsg({ type: "error", text: "Something went wrong" })
        } finally {
            setUpdating(false)
        }
    }

    const handlePriorityUpdate = async (newPriority) => {
        setUpdating(true)
        setUpdateMsg(null)
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
                setUpdateMsg({ type: "success", text: data.message })
            } else {
                setUpdateMsg({ type: "error", text: data.error || "Failed to update priority" })
            }
        } catch (error) {
            setUpdateMsg({ type: "error", text: "Something went wrong" })
        } finally {
            setUpdating(false)
        }
    }

    const handleAddUpdate = async (e) => {
        e.preventDefault()
        if (!newUpdate.trim()) return

        setUpdating(true)
        setUpdateMsg(null)
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
                setUpdateMsg({ type: "success", text: "Update added successfully" })
            } else {
                setUpdateMsg({ type: "error", text: data.error || "Failed to add update" })
            }
        } catch (error) {
            setUpdateMsg({ type: "error", text: "Something went wrong" })
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
        setUpdateMsg(null)
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
                setUpdateMsg({ type: "success", text: data.message })
            } else {
                setUpdateMsg({ type: "error", text: data.error || "Failed to add ticket" })
            }
        } catch (error) {
            setUpdateMsg({ type: "error", text: "Something went wrong" })
        } finally {
            setUpdating(false)
        }
    }

    const handleRemoveTicket = async (ticketId, ticketNumber) => {
        const confirmed = window.confirm(`Remove TKT-${String(ticketNumber).padStart(3, '0')} from this incident?`)
        if (!confirmed) return

        setUpdating(true)
        setUpdateMsg(null)
        try {
            const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/incidents/${id}/tickets/${ticketId}`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
            })
            const data = await res.json()
            if (res.ok) {
                setIncident(data.incident)
                setUpdateMsg({ type: "success", text: data.message })
            } else {
                setUpdateMsg({ type: "error", text: data.error || "Failed to remove ticket" })
            }
        } catch (error) {
            setUpdateMsg({ type: "error", text: "Something went wrong" })
        } finally {
            setUpdating(false)
        }
    }

    const openAddTicketModal = () => {
        setShowAddTicket(true)
        fetchAvailableTickets()
    }

    const statusColors = {
        investigating: "bg-red-100 text-red-800",
        identified: "bg-yellow-100 text-yellow-800",
        monitoring: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
    }

    const ticketStatusColors = {
        TODO: "bg-gray-100 text-gray-800",
        IN_PROGRESS: "bg-blue-100 text-blue-800",
        DONE: "bg-green-100 text-green-800",
        CLOSED: "bg-red-100 text-red-800",
    }

    const priorityColors = {
        low: "bg-gray-100 text-gray-700",
        medium: "bg-yellow-100 text-yellow-700",
        high: "bg-orange-100 text-orange-700",
        critical: "bg-red-100 text-red-700",
    }

    const incidentPriorityColors = {
        P1: "bg-red-600 text-white",
        P2: "bg-orange-500 text-white",
        P3: "bg-yellow-500 text-white",
        P4: "bg-blue-500 text-white",
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
        <div>
            <button
                onClick={() => navigate('/incidents')}
                className="mb-4 text-blue-600 hover:underline text-sm"
            >
                &larr; Back to Incidents
            </button>

            {/* Incident Header */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-lg font-mono font-bold text-red-600">{incNumber}</span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${incidentPriorityColors[incident.priority || 'P3']}`}>
                                {incident.priority || 'P3'}
                            </span>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[incident.status]}`}>
                                {incident.status}
                            </span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">{incident.title}</h1>
                    </div>
                    {canManage && incident.status !== "resolved" && (
                        <select
                            value={incident.priority || 'P3'}
                            onChange={(e) => handlePriorityUpdate(e.target.value)}
                            disabled={updating}
                            className="border rounded px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="P1">P1 - Critical</option>
                            <option value="P2">P2 - High</option>
                            <option value="P3">P3 - Medium</option>
                            <option value="P4">P4 - Low</option>
                        </select>
                    )}
                </div>

                <p className="text-gray-700 mb-4 whitespace-pre-wrap">{incident.description}</p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                        <span className="text-gray-500 block">Department</span>
                        <span className="font-medium">{incident.department?.name || 'Unknown'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Incident Lead</span>
                        <span className="font-medium">{incident.incidentLead?.email || 'Unassigned'}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">Created</span>
                        <span className="font-medium">{new Date(incident.createdAt).toLocaleString()}</span>
                    </div>
                    <div>
                        <span className="text-gray-500 block">{incident.resolvedAt ? 'Resolved' : 'Last Updated'}</span>
                        <span className="font-medium">
                            {incident.resolvedAt
                                ? new Date(incident.resolvedAt).toLocaleString()
                                : new Date(incident.updatedAt).toLocaleString()
                            }
                        </span>
                    </div>
                </div>
            </div>

            {/* Status Update Message */}
            {updateMsg && (
                <div className={`mb-4 p-3 rounded ${updateMsg.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    {updateMsg.text}
                </div>
            )}

            {/* Status Update Actions */}
            {canManage && incident.status !== "resolved" && (
                <div className="bg-white rounded-lg shadow p-5 mb-6">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Update Incident Status</h3>
                    <div className="flex gap-3 flex-wrap">
                        {nextStatuses.map((status) => (
                            <button
                                key={status}
                                onClick={() => handleStatusUpdate(status)}
                                disabled={updating}
                                className={`px-4 py-2 rounded font-medium text-sm transition-colors capitalize ${
                                    status === "resolved"
                                        ? "bg-green-600 text-white hover:bg-green-700"
                                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                                } ${updating ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {updating ? "Updating..." : `Mark as ${status}`}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Linked Tickets */}
            <div className="bg-white rounded-lg shadow p-5 mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">
                        Linked Tickets ({incident.tickets?.length || 0})
                    </h3>
                    {canManage && incident.status !== "resolved" && (
                        <button
                            onClick={openAddTicketModal}
                            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                        >
                            + Add Ticket
                        </button>
                    )}
                </div>

                {!incident.tickets || incident.tickets.length === 0 ? (
                    <p className="text-gray-500">No tickets linked to this incident.</p>
                ) : (
                    <div className="space-y-3">
                        {incident.tickets.map((ticket) => (
                            <div
                                key={ticket._id}
                                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex justify-between items-center">
                                    <div 
                                        className="flex items-center gap-3 cursor-pointer flex-1"
                                        onClick={() => navigate(`/tickets/${ticket._id}`)}
                                    >
                                        <span className="text-sm font-mono font-bold text-blue-600">
                                            TKT-{String(ticket.ticketNumber).padStart(3, '0')}
                                        </span>
                                        <span className="font-medium text-gray-900">{ticket.title}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {ticket.priority && (
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${priorityColors[ticket.priority]}`}>
                                                {ticket.priority}
                                            </span>
                                        )}
                                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${ticketStatusColors[ticket.status]}`}>
                                            {ticket.status}
                                        </span>
                                        {canManage && incident.status !== "resolved" && incident.tickets.length > 1 && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    handleRemoveTicket(ticket._id, ticket.ticketNumber)
                                                }}
                                                disabled={updating}
                                                className="ml-2 text-red-500 hover:text-red-700 text-sm"
                                                title="Remove from incident"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                                    <span>Raised by: {ticket.createdBy?.email || 'Unknown'}</span>
                                    {ticket.assignedTo && <span>Assigned to: {ticket.assignedTo.email}</span>}
                                    <span>{ticket.department?.name || ''}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Incident Updates/Notes */}
            <div className="bg-white rounded-lg shadow p-5 mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Updates & Notes</h3>
                
                {canAddUpdates && incident.status !== "resolved" && (
                    <form onSubmit={handleAddUpdate} className="mb-4">
                        <textarea
                            value={newUpdate}
                            onChange={(e) => setNewUpdate(e.target.value)}
                            placeholder="Add an update or investigation note..."
                            className="w-full border rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={3}
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="submit"
                                disabled={updating || !newUpdate.trim()}
                                className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {updating ? "Adding..." : "Add Update"}
                            </button>
                        </div>
                    </form>
                )}

                {!incident.updates || incident.updates.length === 0 ? (
                    <p className="text-gray-500 text-sm">No updates yet.</p>
                ) : (
                    <div className="space-y-3">
                        {[...incident.updates].reverse().map((update, idx) => (
                            <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2">
                                <p className="text-gray-800 whitespace-pre-wrap">{update.content}</p>
                                <div className="text-xs text-gray-500 mt-1">
                                    {update.userId?.email || 'Unknown'} • {new Date(update.createdAt).toLocaleString()}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Ticket Modal */}
            {showAddTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="flex justify-between items-center p-4 border-b">
                            <h3 className="text-lg font-semibold">Add Ticket to Incident</h3>
                            <button
                                onClick={() => setShowAddTicket(false)}
                                className="text-gray-500 hover:text-gray-700 text-xl"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="p-4 overflow-y-auto max-h-[60vh]">
                            {loadingTickets ? (
                                <p className="text-gray-500 text-center py-4">Loading available tickets...</p>
                            ) : availableTickets.length === 0 ? (
                                <p className="text-gray-500 text-center py-4">No available tickets to add.</p>
                            ) : (
                                <div className="space-y-2">
                                    {availableTickets.map((ticket) => (
                                        <div
                                            key={ticket._id}
                                            className="border rounded-lg p-3 flex justify-between items-center hover:bg-gray-50"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-mono font-bold text-blue-600">
                                                        TKT-{String(ticket.ticketNumber).padStart(3, '0')}
                                                    </span>
                                                    <span className="font-medium text-gray-900">{ticket.title}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {ticket.department?.name} • {ticket.createdBy?.email}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleAddTicket(ticket._id)}
                                                disabled={updating}
                                                className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default IncidentDetailsPage
