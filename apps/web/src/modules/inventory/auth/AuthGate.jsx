import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../api/client.js';

const PUBLIC = new Set(['/login']);

export function AuthGate({ children }) {
  const location = useLocation();
  const token = getToken();

  if (PUBLIC.has(location.pathname)) {
    if (token && location.pathname === '/login') {
      return <Navigate to="/" replace />;
    }
    return children;
  }

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return children;
}
