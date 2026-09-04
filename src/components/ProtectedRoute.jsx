import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-zinc-500">
        Cargando...
      </div>
    );
  }
  if (!user) return <Navigate to="/iniciar-sesion" state={{ from: location }} replace />;
  if (role === 'vendedor' && user.role !== 'vendedor' && user.role !== 'both') {
    return <Navigate to="/panel" replace />;
  }
  return children;
};

export default ProtectedRoute;
