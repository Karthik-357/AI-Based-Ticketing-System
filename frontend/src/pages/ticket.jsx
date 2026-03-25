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
    TODO: "bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
    IN_PROGRESS: "bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
    DONE: "bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest",
    CLOSED: "bg-purple-50 text-purple-600 border border-purple-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest"
  }

  const priorityColor = {
    low: "badge-low",
    medium: "badge-medium",
    high: "badge-high",
    critical: "badge-critical"
  }

  return (
    <div className="p-4 sm:p-6 lg:max-w-[1600px] w-full mx-auto space-y-6 pb-12">
      <button onClick={() => navigate("/")} className="glass-button-secondary mb-2 w-fit px-4 py-2 text-sm">
        ← Back to Tickets
      </button>

      {/* Header Panel */}
      <div className="glass-panel p-6 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            {ticket.ticketNumber && <span className="text-indigo-600 font-mono text-sm font-bold bg-indigo-50 px-2 py-1 rounded border border-indigo-100 mb-2 inline-block">TKT-{String(ticket.ticketNumber).padStart(3, '0')}</span>}
            <h1 className="text-3xl font-bold text-slate-800 tracking-tight">{ticket.title}</h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <span className={statusColor[ticket.status] || 'bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest'}>
              {ticket.status?.replace("_", " ")}
            </span>
            <span className={priorityColor[ticket.priority] || 'bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest'}>
              {ticket.priority ? ticket.priority.toUpperCase() : 'NO PRIORITY'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LEFT COLUMN: Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-6 sm:p-8">
            {/* Incident Link Banner */}
            {ticket.incident && (
              <div className="mb-8 bg-rose-50 border border-rose-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-bold text-rose-800">Part of an Incident</h2>
                  <p className="text-rose-600/80 text-sm mt-1 font-medium">This ticket is linked to an active incident. The incident lead is managing resolution.</p>
                </div>
                <button
                  onClick={() => navigate(`/incidents/${typeof ticket.incident === 'object' ? ticket.incident._id : ticket.incident}`)}
                  className="glass-button-primary !bg-rose-600 hover:!bg-rose-500 whitespace-nowrap px-4 py-2 text-sm"
                >
                  View Incident
                </button>
              </div>
            )}

            {/* Description */}
            <div className="mb-8">
              <h2 className="text-lg font-bold text-slate-800 mb-3">Description</h2>
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 text-slate-700 font-medium leading-relaxed whitespace-pre-wrap">
                  {ticket.description}
              </div>
            </div>

            {/* AI Helpful Notes */}
            {ticket.helpfulNotes && ticket.assignedTo?._id === currentUserId && (
              <div className="mb-8 bg-indigo-50/50 border border-indigo-100 rounded-xl p-6">
                <h2 className="text-[13px] font-bold uppercase tracking-wider mb-3 text-indigo-800 flex items-center gap-2">AI Helpful Notes</h2>
                <p className="text-indigo-900/80 font-medium whitespace-pre-wrap text-[15px]">{ticket.helpfulNotes}</p>
              </div>
            )}

            {/* Comments Section */}
            <div className="pt-2">
              <CommentSection ticketId={id} ticketStatus={ticket.status} />
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Metadata Context */}
        <div className="lg:col-span-1 space-y-6 sticky top-6">
          
          {/* Properties Panel */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Properties</h3>
              {isStaff && !showEdit && (
                <button
                  onClick={async () => {
                    if (canReassign) await fetchEmployees()
                    setShowEdit(true)
                  }}
                  className="glass-button-secondary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-indigo-600 border-indigo-200 bg-indigo-50/50"
                >
                  Edit Options
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Department</p>
                <p className="font-semibold text-slate-800 break-words">{ticket.department?.name || 'Uncategorized'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Assigned To</p>
                <p className="font-semibold text-slate-800 break-words">{ticket.assignedTo?.email || <span className="text-rose-400 italic font-medium">Unassigned</span>}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Raised By</p>
                <p className="font-semibold text-slate-800 break-words">{ticket.createdBy?.email || <span className="text-slate-400 italic font-medium">Unknown</span>}</p>
              </div>
              <div className="flex gap-4">
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Created</p>
                  <p className="font-semibold text-slate-800 text-sm">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex-1">
                  <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mb-1">Updated</p>
                  <p className="font-semibold text-slate-800 text-sm">{ticket.updatedAt && ticket.updatedAt !== ticket.createdAt ? new Date(ticket.updatedAt).toLocaleDateString() : 'Never'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Related Skills */}
          {ticket.relatedSkills && ticket.relatedSkills.length > 0 && (
            <div className="glass-panel p-6">
              <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider border-b border-slate-100 pb-3">Related Skills</h3>
              <div className="flex gap-2 flex-wrap">
                {ticket.relatedSkills.map((skill) => (
                  <span key={skill._id} className="bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold">{skill.name}</span>
                ))}
              </div>
            </div>
          )}

          {/* Collaboration Section */}
          <div className="glass-panel p-6">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collaboration</h3>
              {canRequestCollab && (
                <button
                  onClick={async () => {
                    await fetchCollabCandidates()
                    setShowCollabModal(true)
                  }}
                  className="glass-button-secondary text-emerald-600 border-emerald-200 hover:bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wider"
                >
                  Request Help
                </button>
              )}
            </div>

            {/* Current Collaborators */}
            {ticket.collaborators && ticket.collaborators.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Active</p>
                <div className="flex gap-2 flex-wrap">
                  {ticket.collaborators.map((collab) => (
                    <span key={collab._id} className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg text-[11px] font-bold shadow-sm break-all">
                      {collab.email} {collab.department?.name ? `(${collab.department.name})` : ''}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests - visible to assignee only */}
            {pendingRequests.length > 0 && isAssignee && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Pending Your Requests</p>
                <div className="space-y-2">
                  {pendingRequests.map((req) => (
                    <div key={req._id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs flex flex-col gap-1">
                      <span className="font-bold text-amber-900 break-all">{req.user?.email}</span>
                      <div className="flex justify-between items-center">
                        <span className="text-amber-700/70 text-[10px]">({req.user?.department?.name || 'No dept'})</span>
                        <span className="text-amber-600 font-medium text-[10px] border border-amber-200 px-1.5 py-0.5 rounded bg-white/50">Pending</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pending Requests for Manager to Review */}
            {pendingForMyDept.length > 0 && (
              <div className="mb-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Awaiting Review</p>
                <div className="space-y-3">
                  {pendingForMyDept.map((req) => (
                    <div key={req._id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-sm">
                      <p className="font-bold text-slate-800 text-xs break-all">{req.user?.email}</p>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mt-0.5 mb-2 break-all">Req by: {req.requestedBy?.email}</p>
                      <p className="text-xs font-medium text-slate-600 mb-3 bg-white px-2 py-1.5 rounded border border-slate-100">{req.reason}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleReviewCollaboration(req._id, "approve")}
                          disabled={reviewLoading[req._id]}
                          className="glass-button-primary !bg-emerald-600 hover:!bg-emerald-500 text-[10px] px-3 py-1 flex-1"
                        >
                          {reviewLoading[req._id] ? "..." : "Approve"}
                        </button>
                        <button
                          onClick={() => {
                            const comment = prompt("Rejection reason:")
                            if (comment) handleReviewCollaboration(req._id, "reject", comment)
                          }}
                          disabled={reviewLoading[req._id]}
                          className="glass-button-secondary !text-rose-600 hover:!bg-rose-50 text-[10px] px-3 py-1 flex-1"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {(!ticket.collaborators || ticket.collaborators.length === 0) && pendingRequests.length === 0 && (
              <p className="text-slate-400 text-xs font-medium italic p-3 bg-slate-50/50 rounded-lg text-center border border-dashed border-slate-200">No active collaborators.</p>
            )}
          </div>
        </div>
      </div>

        {/* Request Collaboration Modal */}
        {showCollabModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} />
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg mx-4 max-h-[85vh] overflow-y-auto border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Request Collaboration</h2>
                <button onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} className="text-slate-400 hover:text-slate-600 text-2xl font-light">&times;</button>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Select Candidates</label>
                <div className="border border-slate-200 rounded-xl max-h-56 overflow-y-auto bg-slate-50 shadow-inner">
                  {collabCandidates.length === 0 ? (
                    <p className="p-5 text-slate-500 text-sm text-center font-medium">No available candidates</p>
                  ) : (
                    collabCandidates.map((emp) => (
                      <label key={emp._id} className="flex items-center p-3 hover:bg-white cursor-pointer border-b border-slate-100 last:border-b-0 transition-colors">
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
                          className="mr-4 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                        />
                        <div>
                          <span className="text-sm font-bold text-slate-700">{emp.email}</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider ml-2">({emp.department?.name || 'No dept'})</span>
                          {emp.skills?.length > 0 && (
                            <div className="text-[11px] font-medium text-slate-500 mt-1">{emp.skills.map(s => s.name).join(', ')}</div>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Reason for Collaboration</label>
                <textarea
                  value={collabReason}
                  onChange={(e) => setCollabReason(e.target.value)}
                  placeholder="Why do you need help with this ticket?"
                  className="glass-input resize-y min-h-[100px]"
                  rows={3}
                />
              </div>

              {collabMsg && (
                <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-bold border ${collabMsg.type === "error" ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}>
                  {collabMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => { setShowCollabModal(false); setCollabMsg(null) }} className="glass-button-secondary">Cancel</button>
                <button
                  onClick={handleRequestCollaboration}
                  disabled={collabLoading}
                  className="glass-button-primary px-6"
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
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
            />
            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-lg mx-4 border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-slate-800">Reconfigure Ticket</h2>
                <button
                  onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
                  className="text-slate-400 hover:text-slate-600 text-2xl font-light"
                >
                  &times;
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Status */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="glass-input pr-8"
                  >
                    <option value="TODO">TODO</option>
                    <option value="IN_PROGRESS">IN PROGRESS</option>
                    <option value="DONE">DONE</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="glass-input pr-8"
                  >
                    <option value="low">Low Priority</option>
                    <option value="medium">Medium Priority</option>
                    <option value="high">High Priority</option>
                    <option value="critical">Critical / Blocker</option>
                  </select>
                </div>
              </div>

              {/* Reassign is allowed only for admin and manager roles. */}
              {canReassign && (
                <div className="mb-6">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-2 ml-1">Reassign To</label>
                  <select
                    value={editAssignedTo}
                    onChange={(e) => setEditAssignedTo(e.target.value)}
                    className="glass-input pr-8"
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
                <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-bold border ${
                  updateMsg.type === "success" ? "bg-emerald-50 text-emerald-800 border-emerald-200" :
                  updateMsg.type === "error" ? "bg-rose-50 text-rose-800 border-rose-200" :
                  "bg-indigo-50 text-indigo-800 border-indigo-200"
                }`}>
                  {updateMsg.text}
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => { setShowEdit(false); setUpdateMsg(null) }}
                  className="glass-button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdate}
                  disabled={updating}
                  className="glass-button-primary px-6"
                >
                  {updating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export default TicketDetailsPage;