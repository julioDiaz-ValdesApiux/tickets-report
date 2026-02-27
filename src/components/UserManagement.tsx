import { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, X, Save } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  password: string;
  role: 'user' | 'admin';
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    role: 'user' as 'user' | 'admin',
  });

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users')
          .update({
            username: formData.username,
            password: formData.password,
            role: formData.role,
          })
          .eq('id', editingUser.id);

        if (error) throw error;
      } else {
        const { error } = await supabase.from('users').insert([formData]);
        if (error) throw error;
      }

      setFormData({ username: '', password: '', role: 'user' });
      setEditingUser(null);
      setIsOpen(false);
      fetchUsers();
    } catch (error) {
      console.error('Error saving user:', error);
      alert('Error al guardar el usuario. Verifica que el nombre de usuario no esté duplicado.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      password: user.password,
      role: user.role,
    });
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) {
      return;
    }

    setLoading(true);
    try {
      const { error: deleteAssignmentsError } = await supabase
        .from('tickets_assignments')
        .delete()
        .eq('user_id', id);

      if (deleteAssignmentsError) throw deleteAssignmentsError;

      const { error: deleteHoursError } = await supabase
        .from('development_hours')
        .delete()
        .eq('developer_id', id);

      if (deleteHoursError) throw deleteHoursError;

      const { error: deleteUserError } = await supabase.from('users').delete().eq('id', id);

      if (deleteUserError) throw deleteUserError;
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Error al eliminar el usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    setEditingUser(null);
    setFormData({ username: '', password: '', role: 'user' });
  };

  if (!isOpen) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users size={24} className="text-blue-600" />
            <h2 className="text-xl font-semibold">Gestión de Usuarios</h2>
          </div>
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus size={20} />
            Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-2">
            {users.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-gray-900">{user.username}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {user.role === 'admin' ? 'Administrador' : 'Usuario'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
            {users.length === 0 && (
              <p className="text-center text-gray-500 py-8">No hay usuarios registrados</p>
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
          {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
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
            Nombre de Usuario *
          </label>
          <input
            type="text"
            required
            value={formData.username}
            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="usuario123"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Contraseña *
          </label>
          <input
            type="text"
            required
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Contraseña"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <select
            value={formData.role}
            onChange={(e) =>
              setFormData({ ...formData, role: e.target.value as 'user' | 'admin' })
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="user">Usuario</option>
            <option value="admin">Administrador</option>
          </select>
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
            {loading ? 'Guardando...' : editingUser ? 'Actualizar' : 'Crear Usuario'}
          </button>
        </div>
      </form>
    </div>
  );
}
