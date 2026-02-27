import { useState, useEffect } from 'react';
import { Clock, LogOut, Users as UsersIcon, Building2, FileText } from 'lucide-react';
import { LoginForm } from './components/LoginForm';
import { TicketForm } from './components/TicketForm';
import { TicketList } from './components/TicketList';
import { UserManagement } from './components/UserManagement';
import { ClientManagement } from './components/ClientManagement';
import { ReportsMenu } from './components/ReportsMenu';
import { supabase } from './lib/supabase';

function App() {
  const [user, setUser] = useState<{
    id: string;
    username: string;
    role: string;
  } | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showUserManagement, setShowUserManagement] = useState(false);
  const [showClientManagement, setShowClientManagement] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const SESSION_TIMEOUT = 15 * 60 * 1000;

  useEffect(() => {
    if (!user) return;

    const handleActivity = () => {
      setLastActivity(Date.now());
    };

    const inactivityCheck = setInterval(() => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        handleLogout();
      }
    }, 60000);

    window.addEventListener('mousemove', handleActivity);
    window.addEventListener('keypress', handleActivity);
    window.addEventListener('click', handleActivity);
    window.addEventListener('scroll', handleActivity);

    return () => {
      clearInterval(inactivityCheck);
      window.removeEventListener('mousemove', handleActivity);
      window.removeEventListener('keypress', handleActivity);
      window.removeEventListener('click', handleActivity);
      window.removeEventListener('scroll', handleActivity);
    };
  }, [user, lastActivity, SESSION_TIMEOUT]);

  const handleLoginSuccess = (userId: string, username: string, role: string) => {
    setUser({ id: userId, username, role });
    setLastActivity(Date.now());
  };

  const handleLogout = () => {
    setUser(null);
    setRefreshTrigger(0);
    setShowUserManagement(false);
    setShowClientManagement(false);
    setShowReports(false);
    setLastActivity(Date.now());
  };

  const handleTicketCreated = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  if (!user) {
    return <LoginForm onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Clock size={32} className="text-blue-600" />
              <h1 className="text-3xl font-bold text-gray-900">
                Sistema de Tickets SLA
              </h1>
            </div>
            <p className="text-gray-600">
              {showReports
                ? 'Reportes de Trabajo'
                : user.role === 'admin'
                ? showUserManagement
                  ? 'Gestión de Usuarios'
                  : showClientManagement
                  ? 'Gestión de Clientes'
                  : 'Vista de administrador - Todos los tickets'
                : `Bienvenido ${user.username} - Tus tickets asignados`}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                setShowReports(!showReports);
                setShowUserManagement(false);
                setShowClientManagement(false);
              }}
              className="flex items-center gap-2 px-4 py-2 text-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
            >
              <FileText size={18} />
              {showReports ? 'Ver Tickets' : 'Reportes'}
            </button>
            {user.role === 'admin' && (
              <>
                <button
                  onClick={() => {
                    setShowClientManagement(!showClientManagement);
                    setShowUserManagement(false);
                    setShowReports(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-amber-600 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <Building2 size={18} />
                  {showClientManagement ? 'Ver Tickets' : 'Gestión de Clientes'}
                </button>
                <button
                  onClick={() => {
                    setShowUserManagement(!showUserManagement);
                    setShowClientManagement(false);
                    setShowReports(false);
                  }}
                  className="flex items-center gap-2 px-4 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <UsersIcon size={18} />
                  {showUserManagement ? 'Ver Tickets' : 'Gestión de Usuarios'}
                </button>
              </>
            )}
            <div className="text-right">
              <p className="text-sm text-gray-600">Sesión iniciada como</p>
              <p className="font-semibold text-gray-900">
                {user.username}
                {user.role === 'admin' && (
                  <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                    Admin
                  </span>
                )}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {showReports ? (
          <ReportsMenu userRole={user.role} userId={user.id} />
        ) : showUserManagement && user.role === 'admin' ? (
          <UserManagement />
        ) : showClientManagement && user.role === 'admin' ? (
          <ClientManagement />
        ) : (
          <>
            <div className="mb-6">
              <TicketForm
                onTicketCreated={handleTicketCreated}
                userId={user.id}
                userRole={user.role}
              />
            </div>

            <TicketList
              refreshTrigger={refreshTrigger}
              userId={user.id}
              userRole={user.role}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
