import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom"

function Incidents() {
    const [incidents, setIncidents] = useState([])
    const [loading, setLoading] = useState(true)
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
        investigating: "bg-red-100 text-red-800",
        identified: "bg-yellow-100 text-yellow-800",
        monitoring: "bg-blue-100 text-blue-800",
        resolved: "bg-green-100 text-green-800",
    }

    const priorityColors = {
        P1: "bg-red-600 text-white",
        P2: "bg-orange-500 text-white",
        P3: "bg-yellow-500 text-white",
        P4: "bg-blue-500 text-white",
    }

    const priorityBorders = {
        P1: "border-red-600",
        P2: "border-orange-500",
        P3: "border-yellow-500",
        P4: "border-blue-500",
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center py-20">
                <span className="text-gray-500 text-lg">Loading incidents...</span>
            </div>
        )
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Incidents</h2>
                <span className="text-sm text-gray-500">{incidents.length} incident{incidents.length !== 1 ? 's' : ''}</span>
            </div>

            {incidents.length === 0 ? (
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-500 text-lg">No incidents detected yet.</p>
                    <p className="text-gray-400 text-sm mt-2">Incidents are automatically created when multiple similar tickets are detected.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {incidents.map((incident) => (
                        <div
                            key={incident._id}
                            className={`bg-white rounded-lg shadow p-5 cursor-pointer hover:shadow-md transition-shadow border-l-4 ${priorityBorders[incident.priority] || 'border-yellow-500'}`}
                            onClick={() => navigate(`/incidents/${incident._id}`)}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-mono font-bold text-red-600">
                                        INC-{String(incident.incidentNumber).padStart(3, '0')}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${priorityColors[incident.priority] || priorityColors.P3}`}>
                                        {incident.priority || 'P3'}
                                    </span>
                                    <h3 className="text-lg font-semibold text-gray-900">{incident.title}</h3>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[incident.status]}`}>
                                    {incident.status}
                                </span>
                            </div>

                            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{incident.description}</p>

                            <div className="flex items-center gap-4 text-xs text-gray-500">
                                <span className="bg-gray-100 px-2 py-1 rounded font-medium">
                                    {incident.department?.name || 'Unknown'}
                                </span>
                                <span>Lead: {incident.incidentLead?.email || 'Unassigned'}</span>
                                <span>{incident.tickets?.length || 0} ticket{(incident.tickets?.length || 0) !== 1 ? 's' : ''}</span>
                                <span>{new Date(incident.createdAt).toLocaleDateString()}</span>
                                {incident.resolvedAt && (
                                    <span className="text-green-600">Resolved: {new Date(incident.resolvedAt).toLocaleDateString()}</span>
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
