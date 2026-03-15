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

interface OdooReport {
  id: string;
  ticket_id: string;
  client_name: string;
  description: string;
  odoo_number: string;
  created_at: string;
}

interface ReportsMenuProps {
  userRole: string;
  userId: string;
}

export function ReportsMenu({ userRole, userId }: ReportsMenuProps) {
  const [activeReport, setActiveReport] = useState<'work' | 'odoo'>('work');
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [odooReports, setOdooReports] = useState<OdooReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [selectedDeveloper, setSelectedDeveloper] = useState('');
  const [developers, setDevelopers] = useState<{ id: string; username: string }[]>([]);

  useEffect(() => {
    loadDevelopers();
    if (activeReport === 'work') {
      loadWorkLogs();
    } else {
      loadOdooReports();
    }
  }, [activeReport]);

  const loadDevelopers = async () => {
    try {
      const { data, error } = await supabase
        .from('users') // Tabla pública de usuarios
        .select('id, username')
        .order('username');

      if (error) throw error;
      setDevelopers(data || []);
    } catch (error) {
      console.error('Error loading developers:', error);
    }
  };

  const loadWorkLogs = async () => {
    try {
      setLoading(true);

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

      if (userRole !== 'admin') {
        query = query.eq('developer_id', userId);
      }
      else if (selectedDeveloper) {
        query = query.eq('developer_id', selectedDeveloper);
      }

      if (fromDate) {
        query = query.gte('work_date', fromDate);
      }
      if (toDate) {
        query = query.lte('work_date', toDate);
      }

      const { data, error } = await query;
      if (error) throw error;

      const formattedLogs: WorkLog[] = (data || []).map((log: any) => ({
        id: log.id,
        date: log.work_date,
        description: log.notes || '',
        hours: parseFloat(log.hours) || 0,
        ticket_id: log.sla_tickets?.ticket_number || '',
        ticket_title: log.sla_tickets?.title || '',
        developer_name: log.users?.username || 'Sin usuario',
      }));

      setWorkLogs(formattedLogs);
    } catch (error) {
      console.error('Error loading work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadOdooReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('development_hours')
        .select(`
          id,
          work_date,
          notes,
          ticket_id,
          sla_tickets(ticket_number),
          clients(name)
        `)
        .not('notes', 'is', null)
        .order('work_date', { ascending: false });

      if (error) throw error;

      const formattedReports: OdooReport[] = (data || []).map((report: any) => ({
        id: report.id,
        ticket_id: report.sla_tickets?.ticket_number || '',
        client_name: report.clients?.name || '',
        description: report.notes || '',
        odoo_number: '',
        created_at: report.work_date,
      }));

      setOdooReports(formattedReports);
    } catch (error) {
      console.error('Error loading odoo reports:', error);
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
      log.developer_name, // Ahora usa el nombre real
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
            body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
            h1 { text-align: center; color: #1f2937; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
            .meta { text-align: right; color: #666; margin-bottom: 20px; font-size: 12px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #3b82f6; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; }
            td { padding: 10px 12px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9fafb; }
            .summary { margin-top: 20px; padding: 15px; background-color: #f0f9ff; border-left: 4px solid #3b82f6; border-radius: 4px; }
            .summary p { margin: 5px 0; font-weight: bold; }
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
              ${workLogs.map((log) => `
                <tr>
                  <td>${log.date}</td>
                  <td>${log.ticket_id}</td>
                  <td>${log.ticket_title}</td>
                  <td>${log.developer_name}</td>
                  <td>${log.hours}</td>
                  <td>${log.description}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="summary">
            <p>Total de registros: ${workLogs.length}</p>
            <p>Total de horas: ${totalHours.toFixed(1)}</p>
            <p>Promedio de horas: ${averageHours}</p>
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
      <div className="bg-white rounded-lg shadow-sm border-b border-gray-200">
        <div className="flex gap-1 px-6">
          <button
            onClick={() => setActiveReport('work')}
            className={`px-4 py-4 font-medium border-b-2 transition-colors ${
              activeReport === 'work'
                ? 'text-blue-600 border-blue-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Reporte de Trabajo
          </button>
          <button
            onClick={() => setActiveReport('odoo')}
            className={`px-4 py-4 font-medium border-b-2 transition-colors ${
              activeReport === 'odoo'
                ? 'text-purple-600 border-purple-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            Reporte Odoo
          </button>
        </div>
      </div>

      {activeReport === 'work' && (
        <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {userRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Usuarios</label>
              <select
                value={selectedDeveloper}
                onChange={(e) => setSelectedDeveloper(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos</option>
                {developers.map((dev) => (
                  <option key={dev.id} value={dev.id}>{dev.username}</option>
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

        {/* Tarjetas de Resumen */}
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
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Usuarios</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {workLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{log.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{log.ticket_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.ticket_title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{log.developer_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{log.hours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      )}

      {activeReport === 'odoo' && (
        <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Filtros</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Desde</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hasta</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="flex items-end md:col-span-2">
            <button
              onClick={() => loadOdooReports()}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
            >
              Aplicar Filtros
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Reporte Odoo</h2>
          <div className="flex gap-3">
            <button
              onClick={() => {
                const headers = ['Fecha', 'Código Odoo', 'Cliente', 'Ticket', 'Título', 'Usuario', 'Horas', 'Descripción'];
                const rows = odooReports.map((report) => [
                  report.date,
                  report.odoo_code || '',
                  report.client_name,
                  report.ticket_id,
                  report.ticket_title,
                  report.developer_name,
                  report.hours.toFixed(1),
                  report.description,
                ]);
                const csvContent = [headers, ...rows]
                  .map((row) =>
                    row
                      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                      .join(',')
                  )
                  .join('\n');
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement('a');
                const url = URL.createObjectURL(blob);
                link.setAttribute('href', url);
                link.setAttribute('download', `reporte_odoo_${new Date().getTime()}.csv`);
                link.click();
              }}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <Download size={18} />
              Descargar CSV
            </button>
            <button
              onClick={() => {
                const printWindow = window.open('', '_blank');
                if (!printWindow) return;
                const htmlContent = `
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <title>Reporte Odoo</title>
                      <style>
                        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                        h1 { text-align: center; color: #1f2937; border-bottom: 2px solid #a855f7; padding-bottom: 10px; }
                        .meta { text-align: right; color: #666; margin-bottom: 20px; font-size: 12px; }
                        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                        th { background-color: #a855f7; color: white; padding: 12px; text-align: left; border: 1px solid #ddd; }
                        td { padding: 10px 12px; border: 1px solid #ddd; }
                        tr:nth-child(even) { background-color: #f9fafb; }
                      </style>
                    </head>
                    <body>
                      <h1>Reporte Odoo</h1>
                      <div class="meta">
                        <p>Fecha: ${new Date().toLocaleDateString('es-CL')} ${new Date().toLocaleTimeString('es-CL')}</p>
                      </div>
                      <table>
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Código Odoo</th>
                            <th>Cliente</th>
                            <th>Ticket</th>
                            <th>Título</th>
                            <th>Usuario</th>
                            <th>Horas</th>
                            <th>Descripción</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${odooReports.map((report) => `
                            <tr>
                              <td>${report.date}</td>
                              <td>${report.odoo_code || ''}</td>
                              <td>${report.client_name}</td>
                              <td>${report.ticket_id}</td>
                              <td>${report.ticket_title}</td>
                              <td>${report.developer_name}</td>
                              <td>${report.hours.toFixed(1)}</td>
                              <td>${report.description}</td>
                            </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </body>
                  </html>
                `;
                printWindow.document.write(htmlContent);
                printWindow.document.close();
                printWindow.focus();
                setTimeout(() => printWindow.print(), 250);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              <Printer size={18} />
              Imprimir
            </button>
          </div>
        </div>

        {odooReports.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No hay registros que mostrar</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Código Odoo</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Cliente</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Ticket</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Horas</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700">Descripción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {odooReports.map((report) => (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{report.date}</td>
                    <td className="px-6 py-4 text-sm font-medium text-purple-600">{report.odoo_code || '-'}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{report.client_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-blue-600">{report.ticket_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{report.ticket_title}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{report.developer_name}</td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{report.hours.toFixed(1)}h</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">{report.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
        </div>
      )}
    </div>
  );
}