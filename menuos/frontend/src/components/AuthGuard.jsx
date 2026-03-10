import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore.js';

export default function AuthGuard({ roles }) {
  const user = useAuthStore(s => s.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
