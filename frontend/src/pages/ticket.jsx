import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from "react-router-dom";
import CommentSection from '../components/CommentSection';

function TicketDetailsPage() {
  const { id } = useParams()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState(null)
  const navigate = useNavigate()
  const role = localStorage.getItem("userRole")
  const currentUserId = localStorage.getItem("userId")
  // UI permissions are role-driven.
  const isStaff = ["admin", "manager", "employee"].includes(role)
  const canReassign = ["admin", "manager"].includes(role)

  const [editStatus, setEditStatus] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [editAssignedTo, setEditAssignedTo] = useState("")
  const [employees, setEmployees] = useState([])
  const [showEdit, setShowEdit] = useState(false)

  const fetchTicket = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      })
      const data = await res.json()
      if (res.ok) {
        setTicket(data.ticket)
        setEditStatus(data.ticket.status || "TODO")
        setEditPriority(data.ticket.priority || "medium")
        setEditAssignedTo(data.ticket.assignedTo?._id || "")
      } else {
        alert(data.message || "Failed to fetch ticket")
        navigate("/")
      }
    } catch (error) {
      alert("Something went wrong")
      navigate("/")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTicket()
  }, [id])

  const fetchEmployees = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/department-employees`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setEmployees(data)
      }
    } catch (error) {
      console.error("Failed to fetch employees:", error)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setUpdateMsg(null)
    try {
      const token = localStorage.getItem("token")
      const body = {}

      // Send only changed fields to avoid unnecessary activity logs.
      if (editStatus !== ticket.status) body.status = editStatus
      if (editPriority !== ticket.priority) body.priority = editPriority
      if (canReassign && editAssignedTo && editAssignedTo !== (ticket.assignedTo?._id || "")) {
        body.assignedTo = editAssignedTo
      }

      if (Object.keys(body).length === 0) {
        setUpdateMsg({ type: "info", text: "No changes to save." })
        setUpdating(false)
        return
      }

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (res.ok) {
        setTicket(data.ticket)
        setUpdateMsg({ type: "success", text: "Ticket updated successfully." })
      } else {
        setUpdateMsg({ type: "error", text: data.message || "Update failed." })
      }
    } catch (error) {
      setUpdateMsg({ type: "error", text: "Something went wrong." })
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!ticket) return <div className="p-6">Ticket not found</div>

  const statusColor = {
    TODO: "bg-gray-100 text-gray-700 border-gray-300",
    IN_PROGRESS: "bg-blue-50 text-blue-700 border-blue-300",
    DONE: "bg-green-50 text-green-700 border-green-300",
    CLOSED: "bg-purple-50 text-purple-700 border-purple-300"
  }

  const priorityColor = {
    low: "bg-green-50 text-green-700 border-green-300",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-300",
    high: "bg-red-50 text-red-700 border-red-300",
    critical: "bg-purple-50 text-purple-700 border-purple-300"
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button onClick={() => navigate("/")} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
        ← Back to Tickets
      </button>

      <div className="bg-white shadow rounded-lg p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            {ticket.ticketNumber && <span className="text-blue-600 font-mono text-sm font-bold">TKT-{String(ticket.ticketNumber).padStart(3, '0')}</span>}
            <h1 className="text-3xl font-bold text-gray-900">{ticket.title}</h1>
          </div>
          <div className="flex gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${statusColor[ticket.status] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.status?.replace("_", " ")}
            </span>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${priorityColor[ticket.priority] || 'bg-gray-100 text-gray-700'}`}>
              {ticket.priority ? ticket.priority.toUpperCase() : 'NO PRIORITY'}
            </span>
          </div>
        </div>

        {/* Ticket Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 py-4 border-y border-gray-100">
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Department</p>
            <p className="font-medium text-gray-800">{ticket.department?.name || 'Uncategorized'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Assigned To</p>
            <p className="font-medium text-gray-800">{ticket.assignedTo?.email || 'Unassigned'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Created</p>
            <p className="font-medium text-gray-800">{new Date(ticket.createdAt).toLocaleDateString()}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs uppercase font-bold">Updated</p>
            <p className="font-medium text-gray-800">{ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'Never'}</p>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-lg font-semibold text-gray-800">Description</h2>
            {isStaff && !showEdit && (
              <button
                onClick={async () => {
                  // Reassignment options are needed only for admin/manager.
                  if (canReassign) await fetchEmployees()
                  setShowEdit(true)
                }}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 font-medium"
              >
                Edit Ticket
              </button>
            )}
          </div>
          <p className="text-gray-700 whitespace-pre-wrap">{ticket.description}</p>
        </div>

        {/* AI Helpful Notes (only visible to the assigned user) */}
        {ticket.helpfulNotes && ticket.assignedTo?._id === currentUserId && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-2 text-blue-800">AI Helpful Notes</h2>
            <p className="text-blue-900 whitespace-pre-wrap">{ticket.helpfulNotes}</p>
          </div>
        )}

        {/* Related Skills */}
        {ticket.relatedSkills && ticket.relatedSkills.length > 0 && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2 text-gray-800">Related Skills</h2>
            <div className="flex gap-2 flex-wrap">
              {ticket.relatedSkills.map((skill) => (
                <span key={skill._id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded text-sm">{skill.name}</span>
              ))}
            </div>
          </div>
        )}

        {/* ===== STAFF UPDATE MODAL ===== */}
        {isStaff && showEdit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Edit Ticket</h2>
                <button
                  onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              {/* Reassign is allowed only for admin and manager roles. */}
              {canReassign && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reassign To</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {employees.map((emp) => (
                      <option key={emp._id} value={emp._id}>
                        {emp.email} {emp.skills?.length > 0 ? `(${emp.skills.map(s => s.name).join(", ")})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Update feedback message */}
              {updateMsg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm font-medium ${
                  updateMsg.type === "success" ? "bg-green-100 text-green-800 border border-green-200" :
                  updateMsg.type === "error" ? "bg-red-100 text-red-800 border border-red-200" :
                  "bg-blue-100 text-blue-800 border border-blue-200"
                }`}>
                  {updateMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 font-medium"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Comments Section */}
        <div className="mt-8 border-t border-gray-200 pt-6">
          <CommentSection ticketId={id} />
        </div>
      </div>
    </div>
  );
}

export default TicketDetailsPage;