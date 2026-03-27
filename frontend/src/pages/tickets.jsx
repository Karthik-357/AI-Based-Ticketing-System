import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";
import { Ticket, PlusCircle, XCircle, Calendar, User, Tag, AlertCircle, Sparkles, Settings2 } from 'lucide-react';

function Tickets() {
  const [tickets, setTickets] = useState([])
  const [departments, setDepartments] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [isAdvancedMode, setIsAdvancedMode] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "", assignedTo: "" })
  const [activeTab, setActiveTab] = useState("raised")
  const navigate = useNavigate()
  const userRole = localStorage.getItem("userRole")

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    fetchTickets()
  }, [activeTab])

  // Fetch employees when department changes in advanced mode
  useEffect(() => {
    if (isAdvancedMode && form.category) {
      fetchEmployeesByDepartment(form.category)
    } else {
      setEmployees([])
      setForm(prev => ({ ...prev, assignedTo: "" }))
    }
  }, [form.category, isAdvancedMode])

  const fetchDepartments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/departments`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      })
      const data = await res.json()
      if (res.ok) setDepartments(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error("Error fetching departments:", error)
    }
  }

  const fetchEmployeesByDepartment = async (departmentName) => {
    try {
      const dept = departments.find(d => d.name === departmentName)
      if (!dept) {
        setEmployees([])
        return
      }
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/employees-by-department?departmentId=${dept._id}`, {
        headers: { "Authorization": `Bearer ${localStorage.getItem("token")}` }
      })
      const data = await res.json()
      if (res.ok) {
        setEmployees(Array.isArray(data) ? data : [])
      } else {
        setEmployees([])
      }
    } catch (error) {
      console.error("Error fetching employees:", error)
      setEmployees([])
    }
  }

  const fetchTickets = async () => {
    setLoading(true)
    try {
      const viewParam = `?view=${activeTab}`
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets${viewParam}`,
        {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          }
        }
      )
      const data = await res.json()
      if (res.ok) {
        setTickets(Array.isArray(data) ? data : [])
      } else {
        console.error("Failed to fetch tickets:", data.message)
        alert(data.message || "Failed to fetch tickets")
        setTickets([])
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
      setTickets([])
    }
    finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      // Build payload based on mode
      const payload = {
        title: form.title,
        description: form.description,
        category: form.category
      }

      // In advanced mode, include priority and assignedTo
      if (isAdvancedMode) {
        if (form.priority) payload.priority = form.priority
        if (form.assignedTo) payload.assignedTo = form.assignedTo
      }
      // In simple mode, don't send priority - let AI determine it

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(payload)
        }
      )
      const data = await res.json()
      if (res.ok) {
        setForm({ title: "", description: "", category: "", priority: "", assignedTo: "" })
        setShowForm(false)
        setIsAdvancedMode(false)
        setEmployees([])
        fetchTickets()
      } else {
        alert(data.message || "Failed to create ticket")
      }
    } catch (error) {
      alert("Error creating ticket")
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center h-64">
       <div className="text-slate-500 flex items-center gap-2"><div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div> Loading Tickets...</div>
    </div>
  )

  const getPriorityBadge = (priority) => {
    switch(priority) {
      case 'critical': return 'badge-critical';
      case 'high': return 'badge-high';
      case 'medium': return 'badge-medium';
      case 'low': return 'badge-low';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest';
    }
  }

  const getStatusBadge = (status) => {
    switch(status) {
      case 'TODO': return 'bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest';
      case 'IN_PROGRESS': return 'bg-indigo-50 text-indigo-600 border border-indigo-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest';
      case 'RESOLVED': return 'bg-emerald-50 text-emerald-600 border border-emerald-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest';
      default: return 'bg-slate-100 text-slate-600 border border-slate-200 px-3 py-1 rounded-full text-xs font-bold tracking-widest';
    }
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm p-6 sm:p-8 rounded-2xl border border-slate-100 relative overflow-hidden">
        <div className="relative z-10 flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-slate-900">
            <Ticket className="w-8 h-8 text-indigo-500" />
            Tickets
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Manage, track, and resolve IT support tickets.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="glass-button-primary relative z-10 whitespace-nowrap"
        >
          {showForm ? <><XCircle className="w-4 h-4"/> Cancel</> : <><PlusCircle className="w-4 h-4"/> Create Ticket</>}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-white border border-slate-200 rounded-xl shadow-sm w-fit">
        {[
          { id: 'raised', label: 'Tickets Raised' },
          { id: 'assigned', label: 'Tickets Assigned' },
          { id: 'collaborating', label: 'Collaborating' },
          ...(userRole === "manager" ? [{ id: 'department', label: 'Department Tickets' }] : []),
          ...(userRole === "manager" || userRole === "admin" ? [{ id: 'collab_pending', label: 'Pending Approvals' }] : []),
          ...(userRole === "admin" ? [{ id: 'all', label: 'All Tickets' }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-2 rounded-lg font-medium text-sm transition-none ${activeTab === tab.id
                ? "bg-indigo-600 text-white shadow-md"
                : "text-slate-500 hover:text-indigo-600 hover:bg-slate-50"
              }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {showForm && (
        <div className="glass-panel p-6 sm:p-8 border-t-4 border-t-indigo-500">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <span className="p-1.5 bg-indigo-50 rounded-md text-indigo-600 border border-indigo-100"><Ticket className="w-5 h-5" /></span>
              Open New Ticket
            </h2>

            {/* Mode Toggle */}
            <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setIsAdvancedMode(false)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  !isAdvancedMode
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Sparkles className="w-4 h-4" />
                Simple
              </button>
              <button
                type="button"
                onClick={() => setIsAdvancedMode(true)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  isAdvancedMode
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Advanced
              </button>
            </div>
          </div>

          {/* Mode Description */}
          <div className={`mb-6 p-3 rounded-lg text-sm ${
            isAdvancedMode
              ? "bg-amber-50 border border-amber-200 text-amber-700"
              : "bg-indigo-50 border border-indigo-200 text-indigo-700"
          }`}>
            {isAdvancedMode ? (
              <div className="flex items-start gap-2">
                <Settings2 className="w-4 h-4 mt-0.5 shrink-0" />
                <span><strong>Advanced Mode:</strong> Manually specify priority and assignee. AI will still provide helpful notes for the ticket.</span>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <Sparkles className="w-4 h-4 mt-0.5 shrink-0" />
                <span><strong>Simple Mode:</strong> AI will automatically analyze your ticket, determine priority, and assign to the best available expert.</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Title <span className="text-rose-500">*</span></label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="glass-input"
                placeholder="Brief summary of the issue..."
                required
              />
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Department <span className="text-rose-500">*</span></label>
              <select
                name="category"
                value={form.category}
                onChange={handleChange}
                className="glass-input pr-8"
                required
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Description <span className="text-rose-500">*</span></label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="glass-input resize-y min-h-[120px]"
                placeholder="Detailed explanation of the issue..."
                rows="4"
                required
              />
            </div>

            {/* Advanced Mode Fields */}
            {isAdvancedMode && (
              <div className="space-y-6 pt-4 border-t border-slate-200">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 mb-2">
                  <Settings2 className="w-4 h-4" />
                  Advanced Options
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Priority Level</label>
                    <select
                      name="priority"
                      value={form.priority}
                      onChange={handleChange}
                      className="glass-input pr-8"
                    >
                      <option value="">Let AI decide</option>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                      <option value="critical">Critical / Blocker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-500 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Assign To</label>
                    <select
                      name="assignedTo"
                      value={form.assignedTo}
                      onChange={handleChange}
                      className="glass-input pr-8"
                      disabled={!form.category || employees.length === 0}
                    >
                      <option value="">Let AI assign (recommended)</option>
                      {employees.map((emp) => (
                        <option key={emp._id} value={emp._id}>
                          {emp.email.split('@')[0]}
                          {emp.skills?.length > 0 && ` (${emp.skills.map(s => s.name).join(', ')})`}
                        </option>
                      ))}
                    </select>
                    {!form.category && (
                      <p className="text-xs text-slate-400 mt-1 ml-1">Select a department first to see available assignees</p>
                    )}
                    {form.category && employees.length === 0 && (
                      <p className="text-xs text-amber-500 mt-1 ml-1">No employees found in this department</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="glass-button-primary px-8"
              >
                {isAdvancedMode && form.assignedTo ? "Create & Assign Ticket" : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {tickets.length === 0 ? (
          <div className="glass-panel py-16 text-center border-dashed border-slate-200">
            <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-700 mb-2">No Tickets Found</h3>
            <p className="text-slate-500 font-medium max-w-sm mx-auto">
              {activeTab === "raised"
                ? "You haven't raised any tickets yet. Create your first ticket!"
                : activeTab === "assigned"
                  ? "No tickets assigned to you yet."
                  : activeTab === "collaborating"
                    ? "You're not collaborating on any tickets yet."
                    : activeTab === "department"
                      ? "No tickets found in your department."
                      : activeTab === "collab_pending"
                        ? "No pending collaboration requests to review."
                        : activeTab === "all"
                          ? "No tickets exist in the system yet."
                          : "No tickets yet."}
            </p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="glass-panel p-5 cursor-pointer group hover:bg-slate-50 border-l-4 border-l-transparent hover:border-l-indigo-500"
              onClick={() => navigate(`/tickets/${ticket._id}`)}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                 
                 <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                       {ticket.ticketNumber && (
                           <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold border border-slate-200">
                               TKT-{String(ticket.ticketNumber).padStart(3, '0')}
                           </span>
                       )}
                       <h3 className="text-lg font-bold text-slate-800 group-hover:text-indigo-600 truncate">
                         {ticket.title}
                       </h3>
                    </div>
                    <p className="text-slate-500 text-sm line-clamp-2 md:line-clamp-1 mb-4">
                      {ticket.description}
                    </p>
                    
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs font-medium text-slate-400">
                       <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ticket.createdAt).toLocaleDateString()}
                       </div>
                       
                       {activeTab !== "raised" && ticket.createdBy?.email && (
                          <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                             <User className="w-3 h-3" />
                             Raised by: <span className="text-slate-700">{ticket.createdBy.email.split('@')[0]}</span>
                          </div>
                       )}

                       <div className="flex items-center gap-1.5" title="Assignee">
                          <User className="w-3.5 h-3.5" />
                          {ticket.assignedTo?.email ? (
                             <span className="text-slate-600 font-semibold">{ticket.assignedTo.email.split('@')[0]}</span>
                          ) : (
                             <span className="text-rose-400 italic">Unassigned</span>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="flex md:flex-col items-center md:items-end justify-between md:justify-start gap-3 shrink-0">
                     <span className={getStatusBadge(ticket.status)}>
                        {ticket.status.replace("_", " ")}
                     </span>
                     <div className="flex items-center gap-2">
                        {ticket.department?.name && (
                            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                                <Tag className="w-3 h-3" /> {ticket.department.name}
                            </span>
                        )}
                        <span className={getPriorityBadge(ticket.priority)}>
                           {ticket.priority || 'NONE'}
                        </span>
                     </div>
                 </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Tickets