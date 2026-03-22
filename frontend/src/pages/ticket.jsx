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
  const isStaff = ["admin", "manager", "employee"].includes(role)
  const canReassign = ["admin", "manager"].includes(role)
  const canReviewCollab = ["admin", "manager"].includes(role)

  const [editStatus, setEditStatus] = useState("")
  const [editPriority, setEditPriority] = useState("")
  const [editAssignedTo, setEditAssignedTo] = useState("")
  const [employees, setEmployees] = useState([])
  const [showEdit, setShowEdit] = useState(false)

  // Collaboration state
  const [showCollabModal, setShowCollabModal] = useState(false)
  const [collabCandidates, setCollabCandidates] = useState([])
  const [selectedCollaborators, setSelectedCollaborators] = useState([])
  const [collabReason, setCollabReason] = useState("")
  const [collabLoading, setCollabLoading] = useState(false)
  const [collabMsg, setCollabMsg] = useState(null)
  const [reviewLoading, setReviewLoading] = useState({})

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

  const fetchCollabCandidates = async () => {
    try {
      const excludeIds = [
        ticket.assignedTo?._id,
        ...(ticket.collaborators || []).map(c => c._id),
        ...(ticket.collaborationRequests || []).filter(r => r.status === "pending").map(r => r.user?._id)
      ].filter(Boolean)

      const queryParams = excludeIds.map(id => `excludeIds=${id}`).join('&')
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/collaborator-candidates?${queryParams}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        }
      })
      if (res.ok) {
        const data = await res.json()
        setCollabCandidates(data)
      }
    } catch (error) {
      console.error("Failed to fetch collaborator candidates:", error)
    }
  }

  const handleUpdate = async () => {
    setUpdating(true)
    setUpdateMsg(null)
    try {
      const token = localStorage.getItem("token")
      const body = {}

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

  const handleRequestCollaboration = async () => {
    if (selectedCollaborators.length === 0) {
      setCollabMsg({ type: "error", text: "Select at least one collaborator" })
      return
    }
    if (!collabReason.trim()) {
      setCollabMsg({ type: "error", text: "Please provide a reason" })
      return
    }

    setCollabLoading(true)
    setCollabMsg(null)
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}/collaboration/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          reason: collabReason,
          collaboratorIds: selectedCollaborators
        })
      })
      const data = await res.json()
      if (res.ok) {
        setTicket(data.ticket)
        setShowCollabModal(false)
        setSelectedCollaborators([])
        setCollabReason("")
      } else {
        setCollabMsg({ type: "error", text: data.message || "Request failed" })
      }
    } catch (error) {
      setCollabMsg({ type: "error", text: "Something went wrong" })
    } finally {
      setCollabLoading(false)
    }
  }

  const handleReviewCollaboration = async (requestId, decision, comment = "") => {
    setReviewLoading(prev => ({ ...prev, [requestId]: true }))
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets/${id}/collaboration/review`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          decision,
          requestIds: [requestId],
          comment
        })
      })
      const data = await res.json()
      if (res.ok) {
        setTicket(data.ticket)
      } else {
        alert(data.message || "Review failed")
      }
    } catch (error) {
      alert("Something went wrong")
    } finally {
      setReviewLoading(prev => ({ ...prev, [requestId]: false }))
    }
  }

  if (loading) return <div className="p-6">Loading...</div>
  if (!ticket) return <div className="p-6">Ticket not found</div>

  const isAssignee = ticket.assignedTo?._id === currentUserId
  const isCollaborator = (ticket.collaborators || []).some(c => c._id === currentUserId)
  const canRequestCollab = isStaff && isAssignee && ticket.status !== "CLOSED"

  const pendingRequests = (ticket.collaborationRequests || []).filter(r => r.status === "pending")
  const myDeptId = localStorage.getItem("userDepartment")
  const pendingForMyDept = canReviewCollab ? pendingRequests.filter(r => {
    if (role === "admin") return true
    return r.user?.department?._id === myDeptId
  }) : []

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

        {/* Incident Link Banner */}
        {ticket.incident && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-red-800">Part of an Incident</h2>
              <p className="text-red-700 text-sm mt-1">This ticket is linked to an active incident. The incident lead is managing resolution.</p>
            </div>
            <button
              onClick={() => navigate(`/incidents/${typeof ticket.incident === 'object' ? ticket.incident._id : ticket.incident}`)}
              className="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium whitespace-nowrap"
            >
              View Incident
            </button>
          </div>
        )}

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

        {/* Collaboration Section */}
        <div className="mb-6 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Collaboration</h2>
            {canRequestCollab && (
              <button
                onClick={async () => {
                  await fetchCollabCandidates()
                  setShowCollabModal(true)
                }}
                className="px-4 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
              >
                Request Collaborator
              </button>
            )}
          </div>

          {/* Current Collaborators */}
          {ticket.collaborators && ticket.collaborators.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Active Collaborators</p>
              <div className="flex gap-2 flex-wrap">
                {ticket.collaborators.map((collab) => (
                  <span key={collab._id} className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm">
                    {collab.email} {collab.department?.name ? `(${collab.department.name})` : ''}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests - visible to assignee only */}
          {pendingRequests.length > 0 && isAssignee && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Your Pending Requests</p>
              <div className="space-y-2">
                {pendingRequests.map((req) => (
                  <div key={req._id} className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm">
                    <span className="font-medium">{req.user?.email}</span>
                    <span className="text-gray-500 ml-2">({req.user?.department?.name || 'No dept'})</span>
                    <span className="text-yellow-700 ml-2">- Pending approval</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Requests for Manager to Review */}
          {pendingForMyDept.length > 0 && (
            <div className="mb-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Requests Awaiting Your Review</p>
              <div className="space-y-2">
                {pendingForMyDept.map((req) => (
                  <div key={req._id} className="bg-orange-50 border border-orange-200 rounded p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{req.user?.email}</p>
                        <p className="text-xs text-gray-500">Requested by: {req.requestedBy?.email}</p>
                        <p className="text-xs text-gray-600 mt-1">Reason: {req.reason}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewCollaboration(req._id, "approve")}
                          disabled={reviewLoading[req._id]}
                          className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:bg-gray-400"
                        >
                          {reviewLoading[req._id] ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => {
                            const comment = prompt("Rejection reason:")
                            if (comment) handleReviewCollaboration(req._id, "reject", comment)
                          }}
                          disabled={reviewLoading[req._id]}
                          className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:bg-gray-400"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {(!ticket.collaborators || ticket.collaborators.length === 0) && pendingRequests.length === 0 && (
            <p className="text-gray-500 text-sm">No collaborators yet.</p>
          )}
        </div>

        {/* Request Collaboration Modal */}
        {showCollabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} />
            <div className="relative bg-white rounded-lg shadow-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-800">Request Collaboration</h2>
                <button onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Collaborators</label>
                <div className="border border-gray-300 rounded max-h-48 overflow-y-auto">
                  {collabCandidates.length === 0 ? (
                    <p className="p-3 text-gray-500 text-sm">No available candidates</p>
                  ) : (
                    collabCandidates.map((emp) => (
                      <label key={emp._id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0">
                        <input
                          type="checkbox"
                          checked={selectedCollaborators.includes(emp._id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCollaborators([...selectedCollaborators, emp._id])
                            } else {
                              setSelectedCollaborators(selectedCollaborators.filter(id => id !== emp._id))
                            }
                          }}
                          className="mr-3"
                        />
                        <div>
                          <span className="text-sm font-medium">{emp.email}</span>
                          <span className="text-xs text-gray-500 ml-2">({emp.department?.name || 'No dept'})</span>
                          {emp.skills?.length > 0 && (
                            <div className="text-xs text-gray-400">{emp.skills.map(s => s.name).join(', ')}</div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason for Collaboration</label>
                <textarea
                  value={collabReason}
                  onChange={(e) => setCollabReason(e.target.value)}
                  placeholder="Why do you need help with this ticket?"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              {collabMsg && (
                <div className={`mb-4 px-4 py-2 rounded text-sm font-medium ${collabMsg.type === "error" ? "bg-red-100 text-red-800" : "bg-green-100 text-green-800"}`}>
                  {collabMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-medium">Cancel</button>
                <button
                  onClick={handleRequestCollaboration}
                  disabled={collabLoading}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 font-medium"
                >
                  {collabLoading ? "Submitting..." : "Submit Request"}
                </button>
              </div>
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