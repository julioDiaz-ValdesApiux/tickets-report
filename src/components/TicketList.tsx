import { useState, useEffect } from 'react';
import { Trash2, ChevronDown, ChevronUp, Lock, Unlock, Search, X } from 'lucide-react';
import { supabase, SLATicket, DevelopmentHour } from '../lib/supabase';
import { HoursForm } from './HoursForm';

interface TicketListProps {
  refreshTrigger: number;
  userId?: string;
  userRole?: string;
}

interface ExtendedTicket extends SLATicket {
  assigned_user?: { username: string } | null;
  client?: { name: string } | null;
}

interface HoursByStatus {
  [key: string]: number;
}

export function TicketList({ refreshTrigger, userId, userRole }: TicketListProps) {
  const [activeTickets, setActiveTickets] = useState<ExtendedTicket[]>([]);
  const [archivedTickets, setArchivedTickets] = useState<ExtendedTicket[]>([]);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [ticketHours, setTicketHours] = useState<Record<string, DevelopmentHour[]>>({});
  const [hoursByStatus, setHoursByStatus] = useState<Record<string, HoursByStatus>>({});
  const [loading, setLoading] = useState(true);
  const [editingStatus, setEditingStatus] = useState<string | null>(null);
  const [editingPriority, setEditingPriority] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      if (userRole === 'admin') {
        const { data, error } = await supabase
          .from('sla_tickets')
          .select('*, assigned_user:tickets_assignments(user_id), client:client_id(name)')
          .order('created_at', { ascending: false });

        if (error) throw error;

        const tickets = data || [];
        setActiveTickets(tickets.filter((t) => !t.is_archived));
        setArchivedTickets(tickets.filter((t) => t.is_archived));
      } else if (userId) {
        const { data, error } = await supabase
          .from('tickets_assignments')
          .select('ticket_id')
          .eq('user_id', userId);

        if (error) throw error;

        const ticketIds = data?.map((a) => a.ticket_id) || [];

        if (ticketIds.length === 0) {
          setActiveTickets([]);
          setArchivedTickets([]);
          setLoading(false);
          return;
        }

        const { data: ticketsData, error: ticketsError } = await supabase
          .from('sla_tickets')
          .select('*, assigned_user:tickets_assignments(user_id), client:client_id(name)')
          .in('id', ticketIds)
          .order('created_at', { ascending: false });

        if (ticketsError) throw ticketsError;

        const tickets = ticketsData || [];
        setActiveTickets(tickets.filter((t) => !t.is_archived));
        setArchivedTickets(tickets.filter((t) => t.is_archived));
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHoursForTicket = async (ticketId: string) => {
    try {
      const { data, error } = await supabase
        .from('development_hours')
        .select('*')
        .eq('ticket_id', ticketId)
        .order('work_date', { ascending: false });

      if (error) throw error;

      setTicketHours((prev) => ({ ...prev, [ticketId]: data || [] }));

      const statusMap: HoursByStatus = {};
      data?.forEach((hour) => {
        const status = hour.status_after || 'development';
        statusMap[status] = (statusMap[status] || 0) + Number(hour.hours);
      });

      setHoursByStatus((prev) => ({ ...prev, [ticketId]: statusMap }));
    } catch (error) {
      console.error('Error fetching hours:', error);
    }
  };

  const deleteTicket = async (id: string) => {
    if (userRole !== 'admin') {
      alert('Solo los administradores pueden eliminar tickets');
      return;
    }

    if (!confirm('¿Estás seguro de eliminar este ticket?')) {
      return;
    }

    try {
      const { error } = await supabase.from('sla_tickets').delete().eq('id', id);
      if (error) throw error;
      fetchTickets();
    } catch (error) {
      console.error('Error deleting ticket:', error);
      alert('Error al eliminar el ticket');
    }
  };

  const deleteHours = async (id: string, ticketId: string) => {
    if (!confirm('¿Estás seguro de eliminar este registro de horas?')) {
      return;
    }

    try {
      const { error } = await supabase.from('development_hours').delete().eq('id', id);
      if (error) throw error;
      fetchHoursForTicket(ticketId);
    } catch (error) {
      console.error('Error deleting hours:', error);
      alert('Error al eliminar las horas');
    }
  };

  const toggleExpand = (ticketId: string) => {
    if (expandedTicket === ticketId) {
      setExpandedTicket(null);
    } else {
      setExpandedTicket(ticketId);
      if (!ticketHours[ticketId]) {
        fetchHoursForTicket(ticketId);
      }
    }
  };

  const archiveTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('sla_tickets')
        .update({ is_archived: true })
        .eq('id', ticketId);

      if (error) throw error;
      fetchTickets();
    } catch (error) {
      console.error('Error archiving ticket:', error);
      alert('Error al archivar el ticket');
    }
  };

  const reopenTicket = async (ticketId: string) => {
    try {
      const { error } = await supabase
        .from('sla_tickets')
        .update({ is_archived: false, status: 'waiting' })
        .eq('id', ticketId);

      if (error) throw error;
      fetchTickets();
    } catch (error) {
      console.error('Error reopening ticket:', error);
      alert('Error al reabrir el ticket');
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('sla_tickets')
        .update({ status: newStatus, is_archived: newStatus === 'closed' })
        .eq('id', ticketId);

      if (error) throw error;
      setEditingStatus(null);
      fetchTickets();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const updateTicketPriority = async (ticketId: string, newPriority: string) => {
    try {
      const { error } = await supabase
        .from('sla_tickets')
        .update({ priority: newPriority })
        .eq('id', ticketId);

      if (error) throw error;
      setEditingPriority(null);
      fetchTickets();
    } catch (error) {
      console.error('Error updating priority:', error);
      alert('Error al actualizar la prioridad');
    }
  };

  const updateAssignedUser = async (ticketId: string, newUserId: string) => {
    try {
      await supabase.from('tickets_assignments').delete().eq('ticket_id', ticketId);

      const { error } = await supabase.from('tickets_assignments').insert([
        {
          ticket_id: ticketId,
          user_id: newUserId,
        },
      ]);

      if (error) throw error;
      setEditingUser(null);
      fetchTickets();
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Error al actualizar el usuario asignado');
    }
  };

  useEffect(() => {
    fetchTickets();
    fetchUsers();
  }, [refreshTrigger, userRole]);

  useEffect(() => {
    activeTickets.forEach((ticket) => {
      if (!ticketHours[ticket.id]) {
        fetchHoursForTicket(ticket.id);
      }
    });
  }, [activeTickets]);

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      waiting: 'bg-gray-100 text-gray-800',
      development: 'bg-blue-100 text-blue-800',
      qa: 'bg-purple-100 text-purple-800',
      deploying: 'bg-orange-100 text-orange-800',
      production: 'bg-green-100 text-green-800',
      client_validation: 'bg-cyan-100 text-cyan-800',
      closed: 'bg-red-100 text-red-800',
    };
    return colors[status] || colors.waiting;
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      waiting: 'En espera',
      development: 'En desarrollo',
      qa: 'Pruebas QA',
      deploying: 'Desplegando',
      production: 'Paso a producción',
      client_validation: 'Espera validación cliente',
      closed: 'Cerrado',
    };
    return labels[status] || status;
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: 'bg-gray-100 text-gray-800',
      medium: 'bg-blue-100 text-blue-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority] || colors.medium;
  };

  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      critical: 'Crítica',
    };
    return labels[priority] || priority;
  };

  const filterTickets = (tickets: ExtendedTicket[]) => {
    if (!searchTerm.trim()) return tickets;

    const term = searchTerm.toLowerCase();
    return tickets.filter(
      (ticket) =>
        ticket.ticket_number.toLowerCase().includes(term) ||
        ticket.title.toLowerCase().includes(term) ||
        (ticket.description && ticket.description.toLowerCase().includes(term)) ||
        ((ticket.client as any)?.name && (ticket.client as any).name.toLowerCase().includes(term))
    );
  };

  const canEditTicket = (isArchived: boolean) => {
    return !isArchived;
  };

  const renderTicketCard = (ticket: ExtendedTicket, isArchived: boolean = false) => (
    <div key={ticket.id} className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <h3 className="text-lg font-semibold text-gray-900">{ticket.ticket_number}</h3>
              {ticket.client && (
                <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                  {(ticket.client as any).name}
                </span>
              )}
              {!isArchived && (
                <>
                  <div className="flex items-center gap-2">
                    {editingPriority === ticket.id && userRole === 'admin' ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={ticket.priority}
                          onChange={(e) => updateTicketPriority(ticket.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="low">Baja</option>
                          <option value="medium">Media</option>
                          <option value="high">Alta</option>
                          <option value="critical">Crítica</option>
                        </select>
                        <button
                          onClick={() => setEditingPriority(null)}
                          className="text-xs text-gray-600 hover:text-gray-900"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() =>
                          userRole === 'admin' && setEditingPriority(ticket.id)
                        }
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer ${
                          userRole === 'admin' ? 'hover:opacity-75' : ''
                        } ${getPriorityColor(ticket.priority)}`}
                        title={
                          userRole === 'admin'
                            ? 'Haz clic para editar'
                            : 'Solo admin puede cambiar'
                        }
                      >
                        {getPriorityLabel(ticket.priority)}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {editingStatus === ticket.id ? (
                      <div className="flex items-center gap-1">
                        <select
                          value={ticket.status}
                          onChange={(e) => updateTicketStatus(ticket.id, e.target.value)}
                          className="px-2 py-1 border border-gray-300 rounded text-xs"
                        >
                          <option value="waiting">En espera</option>
                          <option value="development">En desarrollo</option>
                          <option value="qa">Pruebas QA</option>
                          <option value="deploying">Desplegando</option>
                          <option value="production">Paso a producción</option>
                          <option value="client_validation">
                            Espera validación cliente
                          </option>
                          <option value="closed">Cerrado</option>
                        </select>
                        <button
                          onClick={() => setEditingStatus(null)}
                          className="text-xs text-gray-600 hover:text-gray-900"
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingStatus(ticket.id)}
                        className={`px-2 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-75 ${getStatusColor(
                          ticket.status
                        )}`}
                      >
                        {getStatusLabel(ticket.status)}
                      </button>
                    )}
                  </div>
                </>
              )}
              {isArchived && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Archivado
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium mb-1">{ticket.title}</p>
            {ticket.description && (
              <p className="text-gray-600 text-sm mb-2">{ticket.description}</p>
            )}
            {ticketHours[ticket.id] && ticketHours[ticket.id].length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                <div className="space-y-1">
                  {Object.entries(hoursByStatus[ticket.id] || {}).map(([status, hours]) => (
                    <div key={status} className="flex justify-between text-sm">
                      <span className="text-gray-700">{getStatusLabel(status)}:</span>
                      <span className="font-semibold text-blue-600">{hours.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(userRole === 'admin' || userRole !== 'admin') && (
              <div className="mt-2">
                {editingUser === ticket.id ? (
                  <div className="flex items-center gap-1">
                    <select
                      onChange={(e) => updateAssignedUser(ticket.id, e.target.value)}
                      className="px-2 py-1 border border-gray-300 rounded text-xs"
                    >
                      <option value="">Selecciona usuario</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => setEditingUser(null)}
                      className="text-xs text-gray-600 hover:text-gray-900"
                    >
                      ✓
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">
                    {userRole === 'admin' ? 'Asignado a' : 'Derivar a'}:{' '}
                    <button
                      onClick={() => setEditingUser(ticket.id)}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {(ticket as any).assigned_user &&
                      Array.isArray((ticket as any).assigned_user) &&
                      (ticket as any).assigned_user[0]
                        ? users.find((u) => u.id === (ticket as any).assigned_user[0].user_id)
                            ?.username
                        : 'Sin asignar'}
                    </button>
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isArchived ? (
              userRole === 'admin' && (
                <button
                  onClick={() => reopenTicket(ticket.id)}
                  className="text-blue-600 hover:text-blue-800 p-2"
                  title="Reabrir registro"
                >
                  <Unlock size={18} />
                </button>
              )
            ) : (
              <>
                {userRole === 'admin' && (
                  <button
                    onClick={() => deleteTicket(ticket.id)}
                    className="text-red-600 hover:text-red-800 p-2"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-4">
            {!isArchived && (
              <HoursForm
                ticketId={ticket.id}
                ticketNumber={ticket.ticket_number}
                onHoursAdded={() => fetchHoursForTicket(ticket.id)}
                userId={userId}
                userRole={userRole}
                isTicketClosed={ticket.status === 'closed'}
                isTicketArchived={isArchived}
              />
            )}
            {ticketHours[ticket.id] && ticketHours[ticket.id].length > 0 && (
              <span className="text-sm text-gray-600">
                Total: <strong>{Object.values(hoursByStatus[ticket.id] || {}).reduce((a, b) => a + b, 0).toFixed(1)} horas</strong>
              </span>
            )}
          </div>
          <button
            onClick={() => toggleExpand(ticket.id)}
            className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
          >
            {expandedTicket === ticket.id ? (
              <>
                Ocultar detalles <ChevronUp size={16} />
              </>
            ) : (
              <>
                Ver detalles <ChevronDown size={16} />
              </>
            )}
          </button>
        </div>
      </div>

      {expandedTicket === ticket.id && (
        <div className="border-t border-gray-200 bg-gray-50 p-4">
          <h4 className="font-semibold text-gray-900 mb-3">Horas Registradas</h4>
          {ticketHours[ticket.id]?.length > 0 ? (
            <div className="space-y-4">
              {Object.entries(hoursByStatus[ticket.id] || {}).map(([status, hours]) => (
                <div key={status}>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    {getStatusLabel(status)}: <strong>{hours.toFixed(1)}h</strong>
                  </p>
                </div>
              ))}
              <div className="border-t border-gray-300 pt-3">
                <h5 className="font-semibold text-gray-900 mb-2">Detalles de horas:</h5>
                <div className="space-y-2">
                  {ticketHours[ticket.id].map((hour) => (
                    <div
                      key={hour.id}
                      className="bg-white rounded p-3 flex items-start justify-between"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="font-medium text-gray-900">
                            {users.find((u) => u.id === (hour as any).developer_id)
                              ?.username || (hour as any).developer_name}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(hour.work_date).toLocaleDateString('es-ES')}
                          </span>
                          <span className="font-semibold text-blue-600">
                            {Number(hour.hours).toFixed(1)}h
                          </span>
                          <span className="text-xs bg-gray-200 text-gray-800 px-2 py-0.5 rounded">
                            {getStatusLabel((hour as any).status_after || 'development')}
                          </span>
                        </div>
                        {hour.notes && (
                          <p className="text-sm text-gray-600">{hour.notes}</p>
                        )}
                      </div>
                      {userRole === 'admin' && !isArchived && (
                        <button
                          onClick={() => deleteHours(hour.id, ticket.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No hay horas registradas para este ticket.</p>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
      </div>
    );
  }

  const filteredActiveTickets = filterTickets(activeTickets);
  const filteredArchivedTickets = filterTickets(archivedTickets);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar por número, título, descripción o cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {activeTickets.length === 0 && archivedTickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No hay tickets registrados. Crea uno para comenzar.</p>
        </div>
      ) : searchTerm && filteredActiveTickets.length === 0 && filteredArchivedTickets.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <p className="text-gray-500">No se encontraron registros que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <>
          {filteredActiveTickets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Registros en Curso</h3>
              {filteredActiveTickets.map((ticket) => renderTicketCard(ticket, false))}
            </div>
          )}

          {filteredArchivedTickets.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Registros Archivados</h3>
              {filteredArchivedTickets.map((ticket) => renderTicketCard(ticket, true))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
