import { useState, useEffect } from 'react';
import { Download, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface WorkLog {
  id: string;
  date: string;
  description: string;
  hours: number;
  ticket_id: string;
  ticket_title: string;
  developer_name: string;
}

interface ReportsMenuProps {
  userRole: string;
  userId: string;
}

export function ReportsMenu({ userRole, userId }: ReportsMenuProps) {
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeveloper, setSelectedDeveloper] = useState('');
  const [developers, setDevelopers] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    loadDevelopers();
    loadWorkLogs();
  }, []);

  const loadDevelopers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, username'); // Simplificamos la query

    if (error) {
      console.error('Error detallado:', error.message);
      return;
    }
    
    console.log('Usuarios encontrados:', data); // Revisa esto en la consola F12
    setDevelopers(data || []);
  } catch (error) {
    console.error('Error loading developers:', error);
  }
};

 const loadWorkLogs = async () => {
    try {
      setLoading(true);
      // Ajustamos el select para traer el username directamente desde la tabla users
      let query = supabase
        .from('development_hours')
        .select(`
          id,
          hours,
          work_date,
          notes,
          developer_id,
          ticket_id,
          sla_tickets(ticket_number, title),
          users!development_hours_developer_id_fkey(username)
        `)
        .order('work_date', { ascending: false });

      // ... resto de tus filtros (userRole, fromDate, etc) ...

      const { data, error } = await query;
      if (error) throw error;

      // Ajustamos el mapeo de los datos
      const formattedLogs: WorkLog[] = (data || []).map((log: any) => ({
        id: log.id,
        date: log.work_date,
        description: log.notes || '',
        hours: parseFloat(log.hours) || 0,
        ticket_id: log.sla_tickets?.ticket_number || '',
        ticket_title: log.sla_tickets?.title || '',
        // Aquí tomamos el username directamente de la relación con users
        developer_name: log.users?.username || 'Sin usuario', 
      }));

      setWorkLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilter = () => {
    loadWorkLogs();
  };

  const totalHours = workLogs.reduce((sum, log) => sum + log.hours, 0);
  const averageHours = workLogs.length > 0 ? (totalHours / workLogs.length).toFixed(1) : '0';

  const exportToCSV = () => {
  const headers = ['Fecha', 'Ticket', 'Título', 'Usuario', 'Horas', 'Descripción'];
  const rows = workLogs.map((log) => [
    log.date,
    log.ticket_id,
    log.ticket_title,
    log.developer_name, // <-- CAMBIO AQUÍ: Antes decía developer_id
    log.hours,
    log.description,
  ]);

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');

  // El resto del código de descarga se mantiene igual...
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `reportes_${new Date().getTime()}.csv`);
  link.click();
};

  const printReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reporte de Trabajo</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              text-align: center;
              color: #1f2937;
              border-bottom: 2px solid #3b82f6;
              padding-bottom: 10px;
            }
            .meta {
              text-align: right;
              color: #666;
              margin-bottom: 20px;
              font-size: 12px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #3b82f6;
              color: white;
              padding: 12px;
              text-align: left;
              font-weight: bold;
              border: 1px solid #ddd;
            }
            td {
              padding: 10px 12px;
              border: 1px solid #ddd;
            }
            tr:nth-child(even) {
              background-color: #f9fafb;
            }
            .summary {
              margin-top: 20px;
              padding: 15px;
              background-color: #f0f9ff;
              border-left: 4px solid #3b82f6;
              border-radius: 4px;
            }
            .summary p {
              margin: 5px 0;
              font-weight: bold;
            }
            @media print {
              body {
                margin: 10px;
              }
            }
          </style>
        </head>
        <body>
          <h1>Reporte de Trabajo</h1>
          <div class="meta">
            <p>Fecha de generación: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Ticket</th>
                <th>Título</th>
                <th>Usuario</th>
                <th>Horas</th>
                <th>Descripción</th>
              </tr>
            </thead>
            <tbody>
              ${workLogs
                .map(
                  (log) => `
                <tr>
                  <td>${log.date}</td>
                  <td>${log.ticket_id}</td>
                  <td>${log.ticket_title}</td>
                  <td>${log.developer_name}</td>
                  <td>${log.hours}</td>
                  <td>${log.description}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>Total de registros: ${workLogs.length}</p>
            <p>Total de horas: ${totalHours.toFixed(1)}</p>
            <p>Promedio de horas por registro: ${averageHours}</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 250);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-gray-500">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Desde
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Hasta
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {userRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Usuarios
              </label>
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.username}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div className="flex items-end">
            <button
              onClick={handleFilter}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Reportes</h2>
          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download size={18} />
              Descargar CSV
            </button>
            <button
              onClick={printReport}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Printer size={18} />
              Imprimir
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4">
            <p className="text-sm text-blue-600 font-medium">Total de Registros</p>
            <p className="text-3xl font-bold text-blue-900">{workLogs.length}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4">
            <p className="text-sm text-green-600 font-medium">Total de Horas</p>
            <p className="text-3xl font-bold text-green-900">{totalHours.toFixed(1)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4">
            <p className="text-sm text-purple-600 font-medium">Promedio Horas</p>
            <p className="text-3xl font-bold text-purple-900">{averageHours}</p>
          </div>
        </div>

        {workLogs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay registros que mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Ticket
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Título
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Usuarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Horas
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">
                    Descripción
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{log.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">
                      {log.ticket_id}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.ticket_title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {log.developer_name}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {log.hours.toFixed(1)}h
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {log.description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
