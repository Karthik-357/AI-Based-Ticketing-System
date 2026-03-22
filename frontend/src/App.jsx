import React, { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'

function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [user, setUser] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userRole = localStorage.getItem('userRole')
    const userEmail = localStorage.getItem('userEmail')
    
    if (token && userRole && userEmail) {
      setUser({ email: userEmail, role: userRole })
    }
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('userRole')
    localStorage.removeItem('userEmail')
    setUser(null)
    navigate('/login')
  }

  const isAdmin = user?.role === 'admin'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 
                className="text-2xl font-bold text-blue-600 cursor-pointer"
                onClick={() => navigate('/')}
              >
                Ticketing System
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate('/')}
                className={`text-gray-600 hover:text-gray-900 font-medium ${location.pathname === '/' ? 'text-blue-600' : ''}`}
              >
                Tickets
              </button>
              <button
                onClick={() => navigate('/incidents')}
                className={`text-gray-600 hover:text-gray-900 font-medium ${location.pathname.startsWith('/incidents') ? 'text-blue-600' : ''}`}
              >
                Incidents
              </button>
              {isAdmin && (
                <button 
                  onClick={() => navigate('/admin')}
                  className={`text-gray-600 hover:text-gray-900 font-medium ${location.pathname === '/admin' ? 'text-blue-600' : ''}`}
                >
                  User Management
                </button>
              )}
              {user && (
                <span className="text-gray-600 text-sm">
                  {user.email}
                </span>
              )}
              <button 
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  )
}

export default App
