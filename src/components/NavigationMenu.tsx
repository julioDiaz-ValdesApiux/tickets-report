import { useState } from 'react';
import { ChevronDown, Building2, Users as UsersIcon, FileText, BarChart3 } from 'lucide-react';

interface NavigationMenuProps {
  showUserManagement: boolean;
  showClientManagement: boolean;
  showReports: boolean;
  onNavigate: (view: 'users' | 'clients' | 'reports' | 'tickets') => void;
  userRole: string;
}

export function NavigationMenu({
  showUserManagement,
  showClientManagement,
  showReports,
  onNavigate,
  userRole,
}: NavigationMenuProps) {
  const [openManagementMenu, setOpenManagementMenu] = useState(false);
  const [openReportsMenu, setOpenReportsMenu] = useState(false);

  const handleManagementClick = (view: 'users' | 'clients') => {
    onNavigate(view);
    setOpenManagementMenu(false);
  };

  const handleReportsClick = (view: 'reports') => {
    onNavigate(view);
    setOpenReportsMenu(false);
  };

  const handleTicketsClick = () => {
    onNavigate('tickets');
    setOpenManagementMenu(false);
    setOpenReportsMenu(false);
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleTicketsClick}
        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
          !showUserManagement && !showClientManagement && !showReports
            ? 'text-green-600 bg-green-50'
            : 'text-gray-600 hover:bg-gray-100'
        }`}
      >
        <FileText size={18} />
        Ver Tickets
      </button>

      {userRole === 'admin' && (
        <div className="relative">
          <button
            onClick={() => setOpenManagementMenu(!openManagementMenu)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              showUserManagement || showClientManagement
                ? 'text-amber-600 bg-amber-50'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Building2 size={18} />
            Gestión
            <ChevronDown
              size={16}
              className={`transition-transform ${
                openManagementMenu ? 'rotate-180' : ''
              }`}
            />
          </button>

          {openManagementMenu && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
              <button
                onClick={() => handleManagementClick('users')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-blue-50 transition-colors ${
                  showUserManagement ? 'text-blue-600 bg-blue-50' : 'text-gray-700'
                }`}
              >
                <UsersIcon size={18} />
                <div>
                  <div className="font-medium">Gestión de Usuarios</div>
                  <div className="text-xs text-gray-500">Crear y administrar usuarios</div>
                </div>
              </button>
              <button
                onClick={() => handleManagementClick('clients')}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-t border-gray-200 hover:bg-amber-50 transition-colors ${
                  showClientManagement ? 'text-amber-600 bg-amber-50' : 'text-gray-700'
                }`}
              >
                <Building2 size={18} />
                <div>
                  <div className="font-medium">Gestión de Clientes</div>
                  <div className="text-xs text-gray-500">Administrar clientes</div>
                </div>
              </button>
            </div>
          )}
        </div>
      )}

      <div className="relative">
        <button
          onClick={() => setOpenReportsMenu(!openReportsMenu)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            showReports
              ? 'text-purple-600 bg-purple-50'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 size={18} />
          Reportes
          <ChevronDown
            size={16}
            className={`transition-transform ${openReportsMenu ? 'rotate-180' : ''}`}
          />
        </button>

        {openReportsMenu && (
          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <button
              onClick={() => handleReportsClick('reports')}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-purple-50 transition-colors ${
                showReports ? 'text-purple-600 bg-purple-50' : 'text-gray-700'
              }`}
            >
              <BarChart3 size={18} />
              <div>
                <div className="font-medium">Reportes de Trabajo</div>
                <div className="text-xs text-gray-500">Ver reportes disponibles</div>
              </div>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
