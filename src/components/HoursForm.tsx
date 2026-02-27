import { useState, useEffect } from 'react';
import { Clock, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
}

interface HoursFormProps {
  ticketId: string;
  ticketNumber: string;
  onHoursAdded: () => void;
  userId?: string;
  userRole?: string;
  isTicketClosed?: boolean;
  isTicketArchived?: boolean;
}

export function HoursForm({
  ticketId,
  ticketNumber,
  onHoursAdded,
  userId,
  userRole,
  isTicketClosed,
  isTicketArchived,
}: HoursFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    developer_id: userId || '',
    hours: '',
    work_date: new Date().toISOString().split('T')[0],
    notes: '',
    status_after: 'development',
  });

  const fetchUsers = async () => {
    if (userRole !== 'admin') return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.developer_id) {
      alert('Selecciona un desarrollador');
      return;
    }

    setLoading(true);

    try {
      const { error: hoursError } = await supabase.from('development_hours').insert([
        {
          ticket_id: ticketId,
          developer_id: formData.developer_id,
          hours: parseFloat(formData.hours),
          work_date: formData.work_date,
          notes: formData.notes,
          status_after: formData.status_after,
        },
      ]);

      if (hoursError) throw hoursError;

      const { error: updateError } = await supabase
        .from('sla_tickets')
        .update({ status: formData.status_after })
        .eq('id', ticketId);

      if (updateError) throw updateError;

      setFormData({
        developer_id: userId || '',
        hours: '',
        work_date: new Date().toISOString().split('T')[0],
        notes: '',
        status_after: 'development',
      });
      setIsOpen(false);
      onHoursAdded();
    } catch (error) {
      console.error('Error adding hours:', error);
      alert('Error al registrar las horas');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) {
    const isDisabled = isTicketClosed || isTicketArchived;
    let title = '';
    if (isTicketArchived) {
      title = 'No puedes agregar horas a un ticket archivado';
    } else if (isTicketClosed) {
      title = 'No puedes agregar horas a un ticket cerrado';
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        disabled={isDisabled}
        className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title={title}
      >
        <Clock size={16} />
        Agregar Horas
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Registrar Horas - {ticketNumber}</h3>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1 text-gray-600 hover:bg-gray-100 rounded"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {userRole === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desarrollador *
              </label>
              <select
                required
                value={formData.developer_id}
                onChange={(e) =>
                  setFormData({ ...formData, developer_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Selecciona un desarrollador</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horas *
              </label>
              <input
                type="number"
                step="0.5"
                min="0.5"
                required
                value={formData.hours}
                onChange={(e) =>
                  setFormData({ ...formData, hours: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="2.5"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                required
                value={formData.work_date}
                onChange={(e) =>
                  setFormData({ ...formData, work_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado después de la tarea *
            </label>
            <select
              required
              value={formData.status_after}
              onChange={(e) =>
                setFormData({ ...formData, status_after: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="waiting">En espera</option>
              <option value="development">En desarrollo</option>
              <option value="qa">Pruebas QA</option>
              <option value="deploying">Desplegando</option>
              <option value="production">Paso a producción</option>
              <option value="client_validation">Espera validación cliente</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="Detalles del trabajo realizado"
            />
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={18} />
              {loading ? 'Guardando...' : 'Guardar Horas'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
