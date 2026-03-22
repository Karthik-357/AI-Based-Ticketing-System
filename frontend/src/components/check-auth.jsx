import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Loader from './Loader';

function CheckAuth({children, protected: protectedRoute, requiredRole}) {
    const navigate = useNavigate()
    const [loading, setLoading] = useState(true)

useEffect(() => {
    const token = localStorage.getItem("token")
    const userRole = localStorage.getItem("userRole")

    // Handles both auth check and optional role-based access.
    if(protectedRoute){
        if(!token){
            navigate("/login")
        } else if(requiredRole && userRole !== requiredRole){
            navigate("/")
        } else {
            setLoading(false)
        }
    }else{
        if(token){
            navigate("/")
        }else{
            setLoading(false)
        }
    }
}, [navigate, protectedRoute, requiredRole])



  if(loading){
    return <Loader />;
  }
  return children;
}

export default CheckAuth;