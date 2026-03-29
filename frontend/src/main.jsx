import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import CheckAuth from './components/check-auth.jsx'
import Tickets from './pages/tickets.jsx'
import TicketDetailsPage from './pages/ticket.jsx'
import Login from './pages/login.jsx'
import Admin from './pages/admin.jsx'
import Incidents from './pages/incidents.jsx'
import IncidentDetailsPage from './pages/incident.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
      <BrowserRouter>
         <Toaster position="bottom-right" toastOptions={{ className: 'text-sm font-medium' }} />
         <Routes>
            <Route
               path="/login"
               element={
                  <CheckAuth protected={false}>
                     <Login />
                  </CheckAuth>
               }
            />


            <Route element={<App />}>
               <Route
                  path="/"
                  element={
                     <CheckAuth protected={true}>
                        <Tickets />
                     </CheckAuth>
                  }
               />
               <Route
                  path="/tickets/:id"
                  element={
                     <CheckAuth protected={true}>
                        <TicketDetailsPage />
                     </CheckAuth>
                  }
               />
               <Route
                  path="/admin"
                  element={
                     <CheckAuth protected={true} requiredRole="admin">
                        <Admin />
                     </CheckAuth>
                  }
               />
               <Route
                  path="/incidents"
                  element={
                     <CheckAuth protected={true}>
                        <Incidents />
                     </CheckAuth>
                  }
               />
               <Route
                  path="/incidents/:id"
                  element={
                     <CheckAuth protected={true}>
                        <IncidentDetailsPage />
                     </CheckAuth>
                  }
               />
            </Route>

         </Routes>
      </BrowserRouter>
   </StrictMode>,
)
