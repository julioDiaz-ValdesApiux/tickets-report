import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  role: string;
}

interface Client {
  id: string;
  name: string;
}

interface TicketFormProps {
  onTicketCreated: () => void;
  userId?: string;
  userRole?: string;
}

export function TicketForm({ onTicketCreated, userId, userRole }: TicketFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    ticket_number: '',
    title: '',
    description: '',
    priority: 'medium',
    status: 'waiting',
    client_id: '',
  });

  const fetchUsers = async () => {
    if (userRole !== 'admin') return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, role')
        .order('username', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('id, name')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchClients();
      if (userRole === 'admin') {
        fetchUsers();
      }
    }
  }, [isOpen, userRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      alert('Debes seleccionar un cliente');
      return;
    }

    setLoading(true);

    try {
      const { data: ticket, error } = await supabase
        .from('sla_tickets')
        .insert([formData])
        .select()
        .single();

      if (error) throw error;

      if (userRole === 'admin' && selectedUsers.length > 0) {
        const assignments = selectedUsers.map((userId) => ({
          ticket_id: ticket.id,
          user_id: userId,
        }));

        const { error: assignError } = await supabase
          .from('tickets_assignments')
          .insert(assignments);

        if (assignError) throw assignError;
      } else if (userRole === 'user' && userId) {
        const { error: assignError } = await supabase
          .from('tickets_assignments')
          .insert([{ ticket_id: ticket.id, user_id: userId }]);

        if (assignError) throw assignError;
      }

      setFormData({
        ticket_number: '',
        title: '',
        description: '',
        priority: 'medium',
        status: 'waiting',
        client_id: '',
      });
      setSelectedUsers([]);
      setIsOpen(false);
      onTicketCreated();
    } catch (error) {
      console.error('Error creating ticket:', error);
      alert('Error al crear el ticket. Verifica que el número no esté duplicado.');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
      >
        <Plus size={20} />
        Crear Registro
      </button>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Crear Registro</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de Ticket *
            </label>
            <input
              type="text"
              required
              value={formData.ticket_number}
              onChange={(e) =>
                setFormData({ ...formData, ticket_number: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="TKT-001"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cliente *
            </label>
            <select
              required
              value={formData.client_id}
              onChange={(e) =>
                setFormData({ ...formData, client_id: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Selecciona un cliente</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Prioridad
            </label>
            <select
              value={formData.priority}
              onChange={(e) =>
                setFormData({ ...formData, priority: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value })
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="waiting">En espera</option>
              <option value="development">En desarrollo</option>
              <option value="qa">Pruebas QA</option>
              <option value="deploying">Desplegando</option>
              <option value="production">Paso a producción</option>
              <option value="client_validation">Espera validación cliente</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Título *
          </label>
          <input
            type="text"
            required
            value={formData.title}
            onChange={(e) =>
              setFormData({ ...formData, title: e.target.value })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Descripción breve del ticket"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Descripción
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Detalles adicionales del trabajo a realizar"
          />
        </div>

        {userRole === 'admin' && users.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Asignar a usuarios
            </label>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {users.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                >
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(user.id)}
                    onChange={() => toggleUserSelection(user.id)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-900">{user.username}</span>
                  {user.role === 'admin' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                      Admin
                    </span>
                  )}
                </label>
              ))}
            </div>
            {selectedUsers.length > 0 && (
              <p className="text-sm text-gray-600 mt-2">
                {selectedUsers.length} usuario(s) seleccionado(s)
              </p>
            )}
          </div>
        )}

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
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creando...' : 'Crear Registro'}
          </button>
        </div>
      </form>
    </div>
  );
}
