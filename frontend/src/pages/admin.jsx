import React, { useState, useEffect } from 'react'
import { useNavigate } from "react-router-dom";

function Admin() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token")
      const usersRes = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`,
        {
          headers: { "Authorization": `Bearer ${token}` }
        }
      )
      const usersData = await usersRes.json()
      if (usersRes.ok) setUsers(Array.isArray(usersData) ? usersData : [])
    } catch (error) {
      console.error("Error fetching data:", error)
    }
    finally {
      setLoading(false)
    }
  }

  const startEdit = (user) => {
    setEditingUser(user._id)
    setEditForm({
      originalEmail: user.email,
      email: user.email,
      role: user.role,
      department: user.department?.name || '',
      skills: user.skills?.map(s => s.name).join(', ') || ''
    })
  }

  const cancelEdit = () => {
    setEditingUser(null)
    setEditForm({})
  }

  const saveUser = async (userId) => {
    try {
      const token = localStorage.getItem("token")
      // Backend expects skills as array, so split comma-separated text.
      const skillsArray = editForm.skills.split(',').map(s => s.trim()).filter(s => s)

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            userId,
            email: editForm.email,
            role: editForm.role,
            department: editForm.department,
            skills: skillsArray
          })
        }
      )

      const data = await res.json()
      if (res.ok) {
        setEditingUser(null)
        setEditForm({})
        fetchData()
      } else {
        alert(data.error || "Failed to update user")
      }
    } catch (error) {
      console.error("Error saving user:", error)
      alert("Error updating user")
    }
  }

  const deleteUser = async (userId, email) => {
    if (!window.confirm(`Are you sure you want to delete user "${email}"? This action cannot be undone.`)) {
      return
    }
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/delete-user/${userId}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        }
      )
      const data = await res.json()
      if (res.ok) {
        fetchData()
      } else {
        alert(data.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      alert("Error deleting user")
    }
  }

  if (loading) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">User Management</h1>

      {/* Create User Section */}
      <div className="bg-white shadow rounded-lg p-6 mb-8 border border-blue-100">
        <h2 className="text-xl font-bold mb-4 text-blue-800">Create New User</h2>
        <CreateUserForm onSuccess={fetchData} />
      </div>

      <h2 className="text-2xl font-semibold mb-4">Existing Users</h2>
          <div className="space-y-4">
            {users.map((user) => (
              <div key={user._id} className="bg-white shadow rounded-lg p-6">
                {editingUser === user._id ? (
                  <div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Email</label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        {editForm.email !== editForm.originalEmail && (
                          <p className="text-xs text-amber-600 mt-1">Email will be changed from {editForm.originalEmail}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Role</label>
                        <select
                          value={editForm.role}
                          onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="employee">Employee</option>
                          <option value="manager">Manager</option>
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Department</label>
                        <select
                          value={editForm.department}
                          onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">None</option>
                          <option value="IT">IT</option>
                          <option value="HR">HR</option>
                          <option value="Legal">Legal</option>
                          <option value="Finance">Finance</option>
                          <option value="Facilities">Facilities</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-gray-700 font-semibold mb-2">Skills</label>
                        <input
                          type="text"
                          value={editForm.skills}
                          onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="e.g. React, Node.js, Python"
                        />
                        <p className="text-xs text-gray-500 mt-1">Comma-separated list of skills</p>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => saveUser(user._id)}
                        className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mr-4">
                        <div>
                          <p className="text-gray-500 text-xs uppercase font-bold">Email</p>
                          <p className="font-medium">{user.email}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase font-bold">Role</p>
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'manager' ? 'bg-emerald-100 text-emerald-800' :
                              user.role === 'employee' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {user.role.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase font-bold">Department</p>
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {user.department?.name || 'Unassigned'}
                          </span>
                        </div>
                        <div>
                          <p className="text-gray-500 text-xs uppercase font-bold">Skills</p>
                          <p className="text-gray-600 text-sm truncate">{user.skills?.map(s => s.name).join(', ') || 'None'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => startEdit(user)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteUser(user._id, user.email)}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
    </div>
  );
}

function CreateUserForm({ onSuccess }) {
  const [form, setForm] = useState({
    email: '',
    password: '',
    role: 'employee',
    department: '',
    skills: ''
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      // Same parsing for create user flow.
      const skillsArray = form.skills.split(',').map(s => s.trim()).filter(s => s)

      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/auth/add-user`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          email: form.email,
          password: form.password,
          role: form.role,
          department: form.department,
          skills: skillsArray
        })
      })
      const data = await res.json()
      if (res.ok) {
        alert("User created successfully!")
        setForm({ email: '', password: '', role: 'employee', department: '', skills: '' })
        if (onSuccess) onSuccess()
      } else {
        alert(data.error || "Failed to create user")
      }
    } catch (err) {
      alert("Error creating user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
        <input
          type="email"
          required
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="new.user@example.com"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
        <input
          type="password"
          required
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="********"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="employee">Employee</option>
          <option value="manager">Manager</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
        <select
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">None</option>
          <option value="IT">IT</option>
          <option value="HR">HR</option>
          <option value="Legal">Legal</option>
          <option value="Finance">Finance</option>
          <option value="Facilities">Facilities</option>
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-sm font-medium text-gray-700 mb-1">Skills</label>
        <input
          type="text"
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:outline-none"
          placeholder="e.g. React, Node.js, Python"
        />
        <p className="text-xs text-gray-500 mt-1">Comma-separated list of skills</p>
      </div>
      <div className="md:col-span-3 flex justify-end mt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2 bg-blue-700 text-white font-medium rounded hover:bg-blue-800 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create User"}
        </button>
      </div>
    </form>
  )
}

export default Admin