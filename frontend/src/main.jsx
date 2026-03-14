import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import CheckAuth from './components/check-auth.jsx'
import Tickets from './pages/tickets.jsx'
import TicketDetailsPage from './pages/ticket.jsx'
import Login from './pages/login.jsx'
import Admin from './pages/admin.jsx'

createRoot(document.getElementById('root')).render(
   <StrictMode>
      <BrowserRouter>
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
            </Route>

         </Routes>
      </BrowserRouter>
   </StrictMode>,
)
