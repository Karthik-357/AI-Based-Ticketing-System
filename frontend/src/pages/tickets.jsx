import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";

function Tickets() {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: "", description: "", category: "", priority: "medium" })
  // This tab maps directly to backend ticket view filter.
  const [activeTab, setActiveTab] = useState("raised")
  const navigate = useNavigate()
  const userRole = localStorage.getItem("userRole")

  useEffect(() => {
    fetchTickets()
  }, [activeTab])

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
      }
    } catch (error) {
      console.error("Error fetching tickets:", error)
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
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/tickets`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify(form)
        }
      )
      const data = await res.json()
      if (res.ok) {
        setForm({ title: "", description: "", category: "", priority: "medium" })
        setShowForm(false)
        fetchTickets()
      } else {
        alert(data.message || "Failed to create ticket")
      }
    } catch (error) {
      alert("Error creating ticket")
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Tickets</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          {showForm ? "Cancel" : "Create Ticket"}
        </button>
      </div>

      {/* Tabs for Raised / Assigned / All (admin only) */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab("raised")}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${activeTab === "raised"
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          Tickets Raised
        </button>
        <button
          onClick={() => setActiveTab("assigned")}
          className={`px-5 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${activeTab === "assigned"
              ? "border-blue-600 text-blue-700 bg-blue-50"
              : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
            }`}
        >
          Tickets Assigned
        </button>
        {userRole === "admin" && (
          <button
            onClick={() => setActiveTab("all")}
            className={`px-5 py-2 rounded-t-lg font-semibold text-sm border-b-2 transition-colors ${activeTab === "all"
                ? "border-blue-600 text-blue-700 bg-blue-50"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
          >
            All Tickets
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Create New Ticket</h2>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Title</label>
              <input
                type="text"
                name="title"
                value={form.title}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-semibold mb-2">Description</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="5"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Category</label>
                <select
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Category</option>
                  <option value="IT">IT</option>
                  <option value="HR">HR</option>
                  <option value="Legal">Legal</option>
                  <option value="Finance">Finance</option>
                  <option value="Facilities">Facilities</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Priority</label>
                <select
                  name="priority"
                  value={form.priority}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Submit Ticket
            </button>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {tickets.length === 0 ? (
          <div className="bg-white shadow rounded-lg p-6 text-center text-gray-600">
            {activeTab === "raised"
              ? "You haven't raised any tickets yet. Create your first ticket!"
              : activeTab === "assigned"
                ? "No tickets assigned to you yet."
                : activeTab === "all"
                  ? "No tickets exist in the system yet."
                  : "No tickets yet."}
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket._id}
              className="bg-white shadow rounded-lg p-6 cursor-pointer hover:shadow-lg transition"
              onClick={() => navigate(`/tickets/${ticket._id}`)}
            >
              <h3 className="text-xl font-semibold mb-2 text-gray-900">
                {ticket.ticketNumber && <span className="text-blue-600 font-mono text-sm mr-2">TKT-{String(ticket.ticketNumber).padStart(3, '0')}</span>}
                {ticket.title}
              </h3>
              <p className="text-gray-700 mb-3">{ticket.description}</p>
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2 text-sm text-gray-600">
                  <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  {/* In assigned / all views, also show who raised the ticket. */}
                  {(activeTab === "assigned" || activeTab === "all") && ticket.createdBy?.email && (
                    <><span className="text-gray-500">Raised by: {ticket.createdBy.email}</span><span>•</span></>
                  )}
                  <span>{ticket.assignedTo?.email || "Unassigned"}</span>
                </div>

                <div className="flex gap-2">
                  {/* Department Badge */}
                  <span className="px-2 py-1 rounded text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    {ticket.department?.name || 'Uncategorized'}
                  </span>

                  {/* Priority Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${!ticket.priority ? "bg-gray-100 text-gray-700 border-gray-200" :
                    ticket.priority === "low" ? "bg-green-50 text-green-700 border-green-200" :
                      ticket.priority === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" :
                        ticket.priority === "critical" ? "bg-purple-50 text-purple-700 border-purple-200" :
                          "bg-red-50 text-red-700 border-red-200"
                    }`}>
                    {ticket.priority ? ticket.priority.toUpperCase() : 'NO PRIORITY'}
                  </span>

                  {/* Status Badge */}
                  <span className={`px-2 py-1 rounded text-xs font-semibold border ${ticket.status === "TODO" ? "bg-gray-100 text-gray-700 border-gray-200" :
                    ticket.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 border-blue-200" :
                      "bg-green-50 text-green-700 border-green-200"
                    }`}>
                    {ticket.status.replace("_", " ")}
                  </span>
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