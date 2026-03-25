import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { Users, Building2, UserPlus, Shield, Edit2, Trash2, CheckCircle, XCircle, Search, Mail, Settings, Briefcase, PlusCircle, Loader2, AlertTriangle } from 'lucide-react';
import Loader from '../components/Loader';
import toast from 'react-hot-toast';

function Admin() {
  const [users, setUsers] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [activeSection, setActiveSection] = useState("users")
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showCreateUser, setShowCreateUser] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token")
      const [usersRes, deptsRes] = await Promise.all([
        fetch(`${import.meta.env.VITE_SERVER_URL}/auth/users`, {
          headers: { "Authorization": `Bearer ${token}` }
        }),
        fetch(`${import.meta.env.VITE_SERVER_URL}/departments`, {
          headers: { "Authorization": `Bearer ${token}` }
        })
      ])
      const usersData = await usersRes.json()
      const deptsData = await deptsRes.json()
      if (usersRes.ok) setUsers(Array.isArray(usersData) ? usersData : [])
      if (deptsRes.ok) setDepartments(Array.isArray(deptsData) ? deptsData : [])
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
      department: user.department?._id || '',
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
        toast.error(data.error || "Failed to update user")
      }
    } catch (error) {
      console.error("Error saving user:", error)
      toast.error("Error updating user")
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
        toast.error(data.error || "Failed to delete user")
      }
    } catch (error) {
      console.error("Error deleting user:", error)
      toast.error("Error deleting user")
    }
  }
  
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (user.department?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.role.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleCounts = {
    all: users.length,
    admin: users.filter(u => u.role === 'admin').length,
    manager: users.filter(u => u.role === 'manager').length,
    employee: users.filter(u => u.role === 'employee').length,
  };

  if (loading) return <Loader text="Loading System Administration..." />;

  const getRoleBadge = (role) => {
    switch(role) {
        case 'admin': return <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 w-max shadow-sm"><Shield className="w-3.5 h-3.5"/> Admin</span>;
        case 'manager': return <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-max shadow-sm">Manager</span>;
        default: return <span className="bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider w-max shadow-sm">Employee</span>;
    }
  }

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white shadow-sm p-6 sm:p-8 rounded-2xl border border-slate-100 relative overflow-hidden">
        
        <div className="relative z-10">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Settings className="w-8 h-8 text-indigo-500" />
            System Administration
          </h1>
          <p className="text-slate-500 font-medium mt-2">
            Manage users, roles, departments, and system configurations.
          </p>
        </div>

        <div className="relative z-10 flex border border-slate-200 rounded-xl overflow-hidden bg-slate-50 backdrop-hidden p-1 shadow-inner">
            <button
                onClick={() => setActiveSection("users")}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeSection === "users" ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Users className="w-4 h-4" /> Users
            </button>
            <button
                onClick={() => setActiveSection("departments")}
                className={`px-6 py-2 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${activeSection === "departments" ? 'bg-indigo-600 shadow-lg text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
            >
                <Building2 className="w-4 h-4" /> Departments
            </button>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSection === "users" && (
        <div className="space-y-6 relative z-10">
            
            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <div className="relative w-full sm:w-96">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input 
                        type="text" 
                        placeholder="Search by email, role, or department..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="glass-input pl-10 w-full rounded-xl py-2.5"
                    />
                </div>
                <button
                    onClick={() => setShowCreateUser(!showCreateUser)}
                    className="glass-button-primary w-full sm:w-auto flex items-center justify-center gap-2 whitespace-nowrap px-6 py-2.5 rounded-xl shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:shadow-[0_0_25px_rgba(99,102,241,0.5)]"
                >
                    {showCreateUser ? <XCircle className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                    {showCreateUser ? 'Cancel Creation' : 'Register New User'}
                </button>
            </div>

            {/* Role Filter Tabs */}
            <div className="flex gap-2 bg-white border border-slate-100 rounded-xl p-1.5 shadow-sm overflow-x-auto">
                {[
                    { key: 'all', label: 'All Users', icon: <Users className="w-3.5 h-3.5" /> },
                    { key: 'admin', label: 'Admins', icon: <Shield className="w-3.5 h-3.5" /> },
                    { key: 'manager', label: 'Managers', icon: <Briefcase className="w-3.5 h-3.5" /> },
                    { key: 'employee', label: 'Employees', icon: <UserPlus className="w-3.5 h-3.5" /> },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setRoleFilter(tab.key)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
                            roleFilter === tab.key
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                        }`}
                    >
                        {tab.icon}
                        {tab.label}
                        <span className={`text-xs px-1.5 py-0.5 rounded-md font-bold ${
                            roleFilter === tab.key
                                ? 'bg-white/20 text-white'
                                : 'bg-slate-100 text-slate-400'
                        }`}>
                            {roleCounts[tab.key]}
                        </span>
                    </button>
                ))}
            </div>

            {/* Create User Form Section */}
            {showCreateUser && (
                <div className="glass-panel p-6 sm:p-8 border-t-2 border-t-indigo-500 relative overflow-hidden">
                    <div className="relative z-10">
                        <h2 className="text-xl font-bold mb-6 text-slate-800 flex items-center gap-2">
                           <span className="p-1.5 bg-indigo-50 rounded-md text-indigo-600 border border-indigo-100"><UserPlus className="w-5 h-5" /></span>
                           Account Registration
                        </h2>
                        <CreateUserForm departments={departments} onSuccess={() => { fetchData(); setShowCreateUser(false); }} />
                    </div>
                </div>
            )}

            {/* Users List */}
            <div className="flex flex-col gap-4">
                {filteredUsers.map((user) => (
                    <div key={user._id} className="glass-panel p-4 sm:p-5 flex flex-col group relative overflow-visible hover:bg-slate-50 border-l-4 border-l-transparent hover:border-l-indigo-500">
                        {editingUser === user._id ? (
                            <div className="flex flex-col relative z-10 w-full">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-1">
                                      <h3 className="text-lg font-bold text-slate-800">Edit User Profile</h3>
                                      <span className="text-xs font-medium text-slate-400 flex items-center gap-1"><UserPlus className="w-3 h-3"/> {user.email}</span>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="glass-input w-full px-4 py-2.5 rounded-lg text-sm"
                                        />
                                        {editForm.email !== editForm.originalEmail && (
                                            <p className="text-xs text-amber-500 mt-1.5 ml-1 flex items-center gap-1 font-medium"><AlertTriangle className="w-3 h-3"/> Email verification will be bypassed</p>
                                        )}
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">Role Paradigm</label>
                                            <select
                                                value={editForm.role}
                                                onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                                className="glass-input w-full px-4 py-2.5 rounded-lg text-sm appearance-auto pr-8 cursor-pointer"
                                            >
                                                <option value="employee" className="bg-slate-50 text-slate-800">Employee / Agent</option>
                                                <option value="manager"  className="bg-slate-50 text-slate-800">Department Manager</option>
                                                <option value="admin"    className="bg-slate-50 text-slate-800">System Admin</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">Department</label>
                                            <select
                                                value={editForm.department}
                                                onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                                                className="glass-input w-full px-4 py-2.5 rounded-lg text-sm appearance-auto pr-8 cursor-pointer"
                                            >
                                                <option value="" className="bg-slate-50 text-slate-800">None / Floating</option>
                                                {departments.map((dept) => (
                                                    <option key={dept._id} value={dept._id} className="bg-slate-50 text-slate-800">{dept.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1.5 ml-1">Technical Skills</label>
                                        <input
                                            type="text"
                                            value={editForm.skills}
                                            onChange={(e) => setEditForm({ ...editForm, skills: e.target.value })}
                                            className="glass-input w-full px-4 py-2.5 rounded-lg text-sm"
                                            placeholder="e.g. React, Python, Support (comma separated)"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end mt-8 border-t border-slate-200 pt-4">
                                    <button
                                        onClick={cancelEdit}
                                        className="glass-button-secondary px-6 py-2.5 text-sm"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => saveUser(user._id)}
                                        className="glass-button-primary px-6 py-2.5 text-sm"
                                    >
                                        <CheckCircle className="w-4 h-4"/> Save Profile
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10 w-full px-2">
                                
                                {/* 1. Avatar & Identity */}
                                <div className="flex items-center gap-4 w-full lg:w-[35%] min-w-[250px]">
                                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border border-slate-200 bg-slate-50 relative group-hover:bg-indigo-50 group-hover:border-indigo-200">
                                        <span className="text-slate-800 group-hover:text-indigo-600 font-bold text-lg uppercase tracking-wider">{user.email.charAt(0)}</span>
                                        {user.role === 'admin' && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-white flex justify-center items-center"><Shield className="w-2.5 h-2.5 text-white"/></div>}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="text-slate-800 font-bold truncate text-[16px] leading-tight mb-0.5 group-hover:text-indigo-600 transition-colors">{user.email.split('@')[0]}</h3>
                                        <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate font-medium">
                                            <Mail className="w-3.5 h-3.5 shrink-0"/>
                                            <span className="truncate">{user.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* 2. Role & Department */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-[40%]">
                                    <div className="w-32 shrink-0">
                                        {getRoleBadge(user.role)}
                                    </div>
                                    <div className="flex-1 min-w-[120px]">
                                        <p className="text-slate-400 text-[9px] uppercase font-bold tracking-widest flex items-center gap-1 mb-1.5"><Briefcase className="w-3 h-3"/> Sector</p>
                                        <p className="text-[13px] font-semibold text-slate-700 truncate">
                                            {user.department?.name || <span className="text-slate-400 italic font-medium">Unassigned</span>}
                                        </p>
                                    </div>
                                </div>

                                {/* 3. Skills & Actions */}
                                <div className="flex items-center justify-between lg:justify-end gap-6 w-full lg:w-[25%]">
                                    <div className="hidden lg:block flex-1 min-w-0 max-w-[180px]">
                                        <div className="flex gap-1.5 overflow-hidden">
                                           {user.skills && user.skills.length > 0 ? (
                                                <div className="flex gap-1 overflow-hidden" title={user.skills.map(s => s.name).join(', ')}>
                                                    <span className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md max-w-full truncate shadow-sm">
                                                        {user.skills[0].name} {user.skills.length > 1 && <span className="text-indigo-400 ml-1">+{user.skills.length - 1}</span>}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-[11px] text-slate-500 italic">No skills specified</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-2 shrink-0 lg:opacity-0 group-hover:opacity-100">
                                        <button
                                            onClick={() => startEdit(user)}
                                            className="p-2 sm:p-2 bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 border border-slate-200 rounded-lg"
                                            title="Edit Profile"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => deleteUser(user._id, user.email)}
                                            className="p-2 sm:p-2 bg-slate-50 text-slate-500 hover:bg-red-50 hover:text-red-600 border border-slate-200 rounded-lg"
                                            title="Terminate User"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
            
            {filteredUsers.length === 0 && (
                <div className="glass-panel py-16 text-center border-dashed border-slate-200">
                    <Users className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-medium text-slate-600 mb-2">No Profiles Found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto font-light">We couldn't locate any user profiles matching your search query.</p>
                </div>
            )}
        </div>
      )}

      {activeSection === "departments" && (
        <DepartmentManagement departments={departments} users={users} onRefresh={fetchData} />
      )}
    </div>
  );
}

function CreateUserForm({ departments, onSuccess }) {
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
        setForm({ email: '', password: '', role: 'employee', department: '', skills: '' })
        if (onSuccess) onSuccess()
      } else {
        toast.error(data.error || "Failed to create user")
      }
    } catch (err) {
      toast.error("Error creating user")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div>
        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Email <span className="text-rose-500">*</span></label>
        <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            placeholder="agent@company.com"
            />
        </div>
      </div>
      <div>
        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Secure Password <span className="text-rose-500">*</span></label>
         <div className="relative">
             <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
            type="password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="glass-input w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            placeholder="••••••••"
            />
        </div>
      </div>
      <div>
        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Authorizations <span className="text-rose-500">*</span></label>
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm appearance-auto pr-8"
        >
          <option value="employee" className="bg-white">Standard Employee</option>
          <option value="manager" className="bg-white">Department Manager</option>
          <option value="admin" className="bg-white">System Administrator</option>
        </select>
      </div>
      <div>
        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Sector Placement</label>
        <select
          value={form.department}
          onChange={(e) => setForm({ ...form, department: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm appearance-auto pr-8"
        >
          <option value="" className="bg-white">No Department</option>
          {departments.map((dept) => (
            <option key={dept._id} value={dept._id} className="bg-white">{dept.name}</option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Skill Matrix</label>
        <input
          type="text"
          value={form.skills}
          onChange={(e) => setForm({ ...form, skills: e.target.value })}
          className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
          placeholder="e.g. Infrastructure, UI/UX, Legal (Comma separated)"
        />
      </div>
      <div className="md:col-span-full pt-4 mt-2 border-t border-slate-100 flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="glass-button-primary px-8 rounded-xl flex items-center gap-2 text-sm shadow-[0_0_15px_rgba(99,102,241,0.2)]"
        >
          {loading ? (
             <><div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"/> Processing</>
          ) : (
             <><UserPlus className="w-4 h-4"/> Provision Identity</>
          )}
        </button>
      </div>
    </form>
  )
}

function DepartmentManagement({ departments, users, onRefresh }) {
  const [form, setForm] = useState({ name: '', description: '', managerId: '' })
  const [editingDept, setEditingDept] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [creating, setCreating] = useState(false)
  const [showCreateDept, setShowCreateDept] = useState(false)

  const managers = users.filter(u => u.role !== 'admin')

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          managerId: form.managerId || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        setForm({ name: '', description: '', managerId: '' })
        setShowCreateDept(false)
        onRefresh()
      } else {
        toast.error(data.error || "Failed to create department")
      }
    } catch (err) {
      toast.error("Error creating department")
    } finally {
      setCreating(false)
    }
  }

  const startEditDept = (dept) => {
    setEditingDept(dept._id)
    setEditForm({
      name: dept.name,
      description: dept.description || '',
      managerId: dept.managerId?._id || ''
    })
  }

  const saveEdit = async (deptId) => {
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/departments/${deptId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: editForm.name,
          description: editForm.description,
          managerId: editForm.managerId || null
        })
      })
      const data = await res.json()
      if (res.ok) {
        setEditingDept(null)
        setEditForm({})
        onRefresh()
      } else {
        toast.error(data.error || "Failed to update department")
      }
    } catch (err) {
      toast.error("Error updating department")
    }
  }

  const deleteDept = async (deptId, deptName) => {
    if (!window.confirm(`Terminate sector "${deptName}"? All attached agents will become orphaned.`)) {
      return
    }
    try {
      const token = localStorage.getItem("token")
      const res = await fetch(`${import.meta.env.VITE_SERVER_URL}/departments/${deptId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      })
      const data = await res.json()
      if (res.ok) {
        onRefresh()
      } else {
        toast.error(data.error || "Failed to delete department")
      }
    } catch (err) {
      toast.error("Error deleting department")
    }
  }

  return (
    <div className="space-y-6 relative z-10">
      
      {/* Top Action Bar */}
      <div className="flex justify-between items-center bg-white border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-2 pl-4 rounded-xl border border-slate-100">
          <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2"><Building2 className="w-5 h-5 text-indigo-400"/> Operational Sectors</h2>
          <button
              onClick={() => setShowCreateDept(!showCreateDept)}
              className="glass-button-primary px-5 py-2 text-sm rounded-lg flex items-center gap-2"
          >
              {showCreateDept ? <XCircle className="w-4 h-4"/> : <PlusCircle className="w-4 h-4"/>}
              {showCreateDept ? 'Cancel' : 'Establish Sector'}
          </button>
      </div>

      {/* Create Department Form */}
      {showCreateDept && (
        <div className="glass-panel p-6 sm:p-8 border-l-4 border-l-indigo-500 overflow-hidden relative">
          <h3 className="text-xl font-bold mb-6 text-slate-800 relative z-10">New Sector Registration</h3>
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
            <div>
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Designation <span className="text-rose-500">*</span></label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                placeholder="e.g. Core Infrastructure"
              />
            </div>
            <div className="lg:col-span-1">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Assigned Overseer</label>
              <select
                value={form.managerId}
                onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm appearance-auto pr-8"
              >
                <option value="" className="bg-white">None Available</option>
                {managers.map((m) => (
                  <option key={m._id} value={m._id} className="bg-white">{m.email}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-full lg:col-span-3">
              <label className="block text-slate-400 text-xs font-bold uppercase tracking-wider mb-2 ml-1">Mission Parameters (Description)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm"
                placeholder="Operational purpose of this sector..."
              />
            </div>
            <div className="md:col-span-full pt-4 mt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={creating}
                className="glass-button-primary px-8 rounded-xl"
              >
                {creating ? "Establishing..." : "Commit Sector"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid */}
      {departments.length === 0 ? (
        <div className="glass-panel py-16 text-center border-dashed border-slate-200">
          <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
          <p className="text-slate-500 font-medium">Network contains no active sectors. Awaiting registration.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {departments.map((dept) => (
            <div key={dept._id} className="glass-panel p-6 group hover:bg-slate-50 border-l-2 border-l-transparent hover:border-l-indigo-500">
              {editingDept === dept._id ? (
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-700 border-b border-slate-100 pb-2">Reconfigure Sector Parameters</h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Designation</label>
                                <input
                                    type="text"
                                    value={editForm.name}
                                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                    className="glass-input w-full p-2.5 rounded-lg text-sm"
                                />
                            </div>
                            <div>
                                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Overseer</label>
                                <select
                                    value={editForm.managerId}
                                    onChange={(e) => setEditForm({ ...editForm, managerId: e.target.value })}
                                    className="glass-input w-full p-2.5 rounded-lg text-sm appearance-auto pr-8"
                                >
                                    <option value="" className="bg-white">Revoke Overseer</option>
                                    {managers.map((m) => (
                                    <option key={m._id} value={m._id} className="bg-white">{m.email}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="md:col-span-full">
                                <label className="block text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-2">Mission Parameters</label>
                                <input
                                    type="text"
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className="glass-input w-full p-2.5 rounded-lg text-sm"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end pt-4 mt-2 border-t border-slate-100">
                            <button
                                onClick={() => { setEditingDept(null); setEditForm({}) }}
                                className="px-6 py-2 rounded-lg text-sm font-medium text-slate-600 bg-slate-50 hover:bg-slate-700 transition-colors border border-slate-100"
                            >
                                Abort
                            </button>
                            <button
                                onClick={() => saveEdit(dept._id)}
                                className="bg-emerald-600/90 text-white px-6 py-2 rounded-lg text-sm font-bold flex items-center gap-1.5 hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 transition-all border border-emerald-500"
                            >
                                <CheckCircle className="w-4 h-4"/> Confirm Reconfiguration
                            </button>
                        </div>
                    </div>
              ) : (
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div className="flex-1 min-w-0 grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
                        <div className="min-w-0">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Designation</p>
                            <h3 className="font-bold text-lg text-slate-800 truncate flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-indigo-500"/>
                                {dept.name}
                            </h3>
                        </div>
                        <div className="min-w-0">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1.5 flex items-center gap-1"><Users className="w-3 h-3"/> Overseer</p>
                            <p className="text-sm font-medium text-slate-600 truncate">
                                {dept.managerId?.email ? (
                                    <span className="bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">{dept.managerId.email.split('@')[0]}</span>
                                ) : (
                                    <span className="text-rose-400/80 italic text-xs uppercase tracking-widest font-bold">Unassigned</span>
                                )}
                            </p>
                        </div>
                        <div className="min-w-0 md:col-span-full xl:col-span-1">
                            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-1">Objective</p>
                            <p className="text-slate-400 text-sm font-light truncate" title={dept.description}>
                                {dept.description || <span className="italic opacity-50">Classified / No data</span>}
                            </p>
                        </div>
                    </div>
                  
                    <div className="flex gap-2 shrink-0 md:opacity-0 group-hover:opacity-100">
                        <button
                            onClick={() => startEditDept(dept)}
                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-sm rounded-lg border border-indigo-100"
                            title="Configure"
                        >
                            <Edit2 className="w-4 h-4"/>
                        </button>
                        <button
                            onClick={() => deleteDept(dept._id, dept.name)}
                            className="p-2 bg-rose-50 text-rose-600 hover:bg-rose-100 text-sm rounded-lg border border-rose-100"
                            title="Scuttle"
                        >
                            <Trash2 className="w-4 h-4"/>
                        </button>
                    </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Admin
