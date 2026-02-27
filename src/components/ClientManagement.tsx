import { useState, useEffect } from 'react';
import { Building2, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Client {
  id: string;
  name: string;
  created_at: string;
}

export function ClientManagement() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [clientName, setClientName] = useState('');

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    setLoading(true);
    try {
      if (editingClient) {
        const { error } = await supabase
          .from('clients')
          .update({ name: clientName })
          .eq('id', editingClient.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('clients')
          .insert([{ name: clientName }]);

        if (error) throw error;
      }

      setClientName('');
      setEditingClient(null);
      setIsOpen(false);
      fetchClients();
    } catch (error) {
      console.error('Error saving client:', error);
      alert('Error al guardar el cliente');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (client: Client) => {
    setEditingClient(client);
    setClientName(client.name);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data, error: countError } = await supabase
        .from('sla_tickets')
        .select('id', { count: 'exact' })
        .eq('client_id', id);

      if (countError) throw countError;
      if (data && data.length > 0) {
        alert(`No se puede eliminar. Hay ${data.length} registro(s) asociado(s).`);
        return;
      }

      if (!confirm('¿Estás seguro de eliminar este cliente?')) {
        return;
      }

      const { error } = await supabase.from('clients').delete().eq('id', id);
      if (error) throw error;
      fetchClients();
    } catch (error) {
      console.error('Error deleting client:', error);
      alert('Error al eliminar el cliente');
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingClient(null);
    setClientName('');
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold">Gestión de Clientes</h2>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Building2 size={20} className="text-gray-600" />
                  <span className="font-medium text-gray-900">{client.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(client)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(client.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {clients.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay clientes registrados</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <button
          onClick={handleCancel}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre del Cliente *
          </label>
          <input
            type="text"
            required
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Nombre de la empresa"
            autoFocus
          />
        </div>

        <div className="flex gap-3 justify-end pt-4">
          <button
            type="button"
            onClick={handleCancel}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={18} />
            {loading ? 'Guardando...' : editingClient ? 'Actualizar' : 'Crear Cliente'}
          </button>
        </div>
      </form>
    </div>
  );
}
