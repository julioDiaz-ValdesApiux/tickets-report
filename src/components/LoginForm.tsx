import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LoginFormProps {
  onLoginSuccess: (userId: string, username: string, role: string) => void;
}

export function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: queryError } = await supabase
        .from('users')
        .select('id, username, password, role')
        .eq('username', formData.username)
        .maybeSingle();

      if (queryError) throw queryError;

      if (!data) {
        setError('Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }

      if (data.password !== formData.password) {
        setError('Usuario o contraseña incorrectos');
        setLoading(false);
        return;
      }

      onLoginSuccess(data.id, data.username, data.role);
    } catch (error) {
      console.error('Login error:', error);
      setError('Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <div className="flex items-center justify-center mb-8">
          <div className="bg-blue-600 p-3 rounded-lg">
            <LogIn size={32} className="text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Sistema de Tickets SLA
        </h1>
        <p className="text-gray-600 text-center mb-8">
          Inicia sesión para continuar
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Usuario
            </label>
            <input
              type="text"
              required
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu usuario"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Ingresa tu contraseña"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            <strong>Nota:</strong> Los usuarios y contraseñas deben ser agregados por el administrador en la base de datos.
          </p>
        </div>
      </div>
    </div>
  );
}
