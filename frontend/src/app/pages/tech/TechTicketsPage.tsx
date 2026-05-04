import { useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { CheckCircle2, Phone, Mail, User, MapPin, Calendar, Ticket, AlertTriangle } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { resolvePhotoUrl } from '../../utils/profileApi';
import { formatDateTimeFr, toProblemTypeLabel } from '../../utils/backendMappers';

interface BackendUserRef {
  nom?: string;
  email?: string;
  numTelephone?: string;
  photoUrl?: string | null;
}

interface BackendTechnicianTicket {
  _id: string;
  ticketRef?: string;
  sn: string;
  typeProbleme: string;
  description?: string | null;
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  creationDate?: string;
  assignationDate?: string;
  clotureDate?: string;
  localisation?: { lat?: number; lng?: number };
  clientId?: BackendUserRef | null;
}

interface UiTechTicket {
  id: string;
  rawId: string;
  sn: string;
  type: string;
  status: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  client: { name: string; email: string; phone: string; photoUrl: string | null };
  assigned: string;
  assignedEpoch: number;
  lat: number;
  lng: number;
  notes: string;
  closedAt?: string;
}

export default function TechTicketsPage() {
  const [tickets, setTickets] = useState<UiTechTicket[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [closingTicketId, setClosingTicketId] = useState<string | null>(null);
  const [closeConfirmTicketId, setCloseConfirmTicketId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadTickets = async () => {
    setLoading(true);
    setFetchError(null);
    setActionError(null);

    try {
      const response = await apiRequest<BackendTechnicianTicket[]>('/api/technicien/tickets', {
        method: 'GET',
      });

      const mapped = response
        .filter((ticket) => ticket.statut !== 'CLOTURE')
        .map((ticket) => {
        const assignationDate = ticket.assignationDate || ticket.creationDate;
        const assignationEpoch = assignationDate ? new Date(assignationDate).getTime() : 0;

        return {
          id: ticket.ticketRef || ticket._id,
          rawId: ticket._id,
          sn: ticket.sn,
          type: toProblemTypeLabel(ticket.typeProbleme),
          status: ticket.statut,
          client: {
            name: ticket.clientId?.nom || 'Client inconnu',
            email: ticket.clientId?.email || 'email@inconnu.tn',
            phone: ticket.clientId?.numTelephone || 'Numero non renseigne',
            photoUrl: resolvePhotoUrl(ticket.clientId?.photoUrl),
          },
          assigned: formatDateTimeFr(assignationDate),
          assignedEpoch: Number.isFinite(assignationEpoch) ? assignationEpoch : 0,
          lat: typeof ticket.localisation?.lat === 'number' ? ticket.localisation.lat : 36.8189,
          lng: typeof ticket.localisation?.lng === 'number' ? ticket.localisation.lng : 10.1658,
          notes: ticket.description || 'Aucune description complementaire.',
          closedAt: ticket.clotureDate ? formatDateTimeFr(ticket.clotureDate) : undefined,
        } satisfies UiTechTicket;
        });

      setTickets(mapped);
      setExpanded((current) => {
        if (current && mapped.some((ticket) => ticket.id === current)) {
          return current;
        }

        return mapped[0]?.id ?? null;
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setTickets([]);
        setFetchError(null);
      } else {
        setTickets([]);
        setFetchError(getErrorMessage(error, 'Impossible de charger les tickets assignes.'));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTickets();
  }, []);

  const handleClose = async (ticketId: string, ticketRawId: string) => {
    if (closingTicketId) {
      return;
    }

    setClosingTicketId(ticketId);
    setActionError(null);

    try {
      await apiRequest<{ ticket?: { clotureDate?: string; statut?: 'CLOTURE' | 'EN_COURS' } }>(`/api/technicien/ticket/${ticketRawId}`, {
        method: 'PUT',
        body: { statut: 'CLOTURE' },
      });

      setTickets((prev) => prev.filter((ticket) => ticket.id !== ticketId));
      setExpanded((current) => (current === ticketId ? null : current));
      setCloseConfirmTicketId(null);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Impossible de cloturer ce ticket.'));
    } finally {
      setClosingTicketId(null);
    }
  };

  const visibleTickets = useMemo(() => {
    return [...tickets].sort((a, b) => a.assignedEpoch - b.assignedEpoch);
  }, [tickets]);

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Mes Tickets Assignes</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Les tickets EN_COURS peuvent etre clotures depuis cet ecran.</p>
        <div style={{
          marginTop: 12,
          padding: '12px 14px',
          borderRadius: 12,
          border: '1px solid #ffe082',
          background: 'linear-gradient(135deg, #fffde7, #fff8e1)',
          boxShadow: '0 4px 12px rgba(245, 124, 0, 0.12)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} color="#ef6c00" />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#1a237e' }}>
              Ordre automatique de traitement des tickets.
            </span>
          </div>
        </div>
      </div>

      {loading && (
        <div style={{
          marginBottom: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#f8faff',
          border: '1px solid #e3f2fd',
          color: '#1a237e',
          fontSize: 12,
          fontWeight: 700,
        }}>
          Chargement des tickets...
        </div>
      )}

      {fetchError && (
        <div style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#ffebee',
          border: '1px solid #ffcdd2',
          color: '#b71c1c',
          fontSize: 13,
          fontWeight: 600,
        }}>
          {fetchError}
        </div>
      )}

      {actionError && (
        <div style={{
          marginBottom: 16,
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fff8e1',
          border: '1px solid #ffe082',
          color: '#8d6e63',
          fontSize: 12,
          fontWeight: 700,
        }}>
          {actionError}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {visibleTickets.map((ticket, index) => {
          const isClosed = ticket.status === 'CLOTURE';
          const isExpanded = expanded === ticket.id;
          return (
            <div key={ticket.id} style={{
              background: 'white', borderRadius: 16,
              border: `1.5px solid ${isClosed ? '#a5d6a7' : isExpanded ? '#42a5f5' : '#e8ecf0'}`,
              boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              opacity: isClosed ? 0.75 : 1,
            }}>
              <div
                style={{
                  padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  cursor: 'pointer', borderBottom: isExpanded ? '1px solid #e8ecf0' : 'none',
                  borderRadius: isExpanded ? '16px 16px 0 0' : 16,
                }}
                onClick={() => setExpanded(isExpanded ? null : ticket.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: isClosed ? '#e8f5e9' : '#e3f2fd',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {isClosed ? <CheckCircle2 size={22} color="#4caf50" /> : <Ticket size={22} color="#1565c0" />}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 12,
                        fontWeight: 800,
                        color: '#ef6c00',
                        background: '#fff3e0',
                        border: '1px solid #ffe0b2',
                        borderRadius: 999,
                        padding: '2px 8px',
                      }}>
                        N° {index + 1}
                      </span>
                      <span style={{ fontWeight: 800, color: '#1a237e', fontSize: 15 }}>{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                    </div>
                    <div style={{ fontSize: 13, color: '#555', marginTop: 2 }}>
                      {ticket.type}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ textAlign: 'right', fontSize: 12, color: '#888' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar size={12} /> Assigne le {ticket.assigned}
                    </div>
                  </div>
                  <span style={{ fontSize: 18, color: '#aaa' }}>{isExpanded ? '▲' : '▼'}</span>
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    <div>
                      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <User size={15} /> Informations Client
                      </h4>
                      <div style={{
                        background: '#f8faff', borderRadius: 10, padding: '14px',
                        border: '1px solid #e3f2fd', display: 'flex', flexDirection: 'column', gap: 10,
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 40, height: 40, borderRadius: '50%', background: '#1a237e',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden',
                          }}>
                            {ticket.client.photoUrl ? (
                              <img
                                src={ticket.client.photoUrl}
                                alt={ticket.client.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                              />
                            ) : (
                              ticket.client.name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#1a237e', fontSize: 14 }}>{ticket.client.name}</div>
                            <div style={{ fontSize: 12, color: '#888' }}>Client Tunisie Telecom</div>
                          </div>
                        </div>
                        {[
                          { icon: <Mail size={13} color="#42a5f5" />, val: ticket.client.email },
                          { icon: <Phone size={13} color="#42a5f5" />, val: ticket.client.phone },
                        ].map((contact, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#444' }}>
                            {contact.icon} {contact.val}
                          </div>
                        ))}
                      </div>

                      <div style={{ marginTop: 12, padding: '12px 14px', background: '#f8faff', borderRadius: 10, border: '1px solid #e3f2fd' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Numero de serie</div>
                        <div style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#1a237e', letterSpacing: 1 }}>{ticket.sn}</div>
                      </div>

                      <div style={{ marginTop: 12, padding: '12px 14px', background: '#fffbf0', borderRadius: 10, border: '1px solid #ffe082' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 4 }}>Notes</div>
                        <div style={{ fontSize: 13, color: '#555', lineHeight: 1.5 }}>{ticket.notes}</div>
                      </div>
                    </div>

                    <div>
                      <h4 style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={15} /> Localisation du client
                      </h4>
                      <MapPlaceholder
                        height={260}
                        showPolygon={false}
                        markers={[
                          { x: 48, y: 45, lat: ticket.lat, lng: ticket.lng, label: ticket.client.name, color: '#f44336', type: 'ticket' },
                        ]}
                        center={[ticket.lat, ticket.lng]}
                        zoom={15}
                      />
                    </div>
                  </div>

                  {!isClosed && (
                    closeConfirmTicketId === ticket.id ? (
                      <div style={{
                        marginTop: 16, padding: '14px 16px', borderRadius: 10,
                        background: '#fff8e1', border: '1px solid #ffd54f',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#f57f17', marginBottom: 10 }}>
                          Confirmer la cloture du ticket {ticket.id} ?
                        </div>
                        <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
                          Une fois cloture, le ticket ne pourra plus etre modifie.
                        </p>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button onClick={() => setCloseConfirmTicketId(null)} disabled={closingTicketId === ticket.id} style={{
                            padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                            background: 'white', color: '#666', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                          }}>Annuler</button>
                          <button onClick={() => void handleClose(ticket.id, ticket.rawId)} disabled={closingTicketId === ticket.id} style={{
                            padding: '9px 24px', borderRadius: 8, border: 'none',
                            background: '#4caf50', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                            display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                            opacity: closingTicketId === ticket.id ? 0.7 : 1,
                          }}>
                            <CheckCircle2 size={15} /> {closingTicketId === ticket.id ? 'Cloture...' : 'Confirmer la cloture'}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                        <button onClick={() => setCloseConfirmTicketId(ticket.id)} disabled={Boolean(closingTicketId)} style={{
                          padding: '11px 24px', borderRadius: 10, border: 'none',
                          background: 'linear-gradient(135deg, #2e7d32, #43a047)',
                          color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                          display: 'flex', alignItems: 'center', gap: 8,
                          boxShadow: '0 4px 12px rgba(46,125,50,0.3)', fontFamily: 'inherit',
                          opacity: closingTicketId ? 0.7 : 1,
                        }}>
                          <CheckCircle2 size={16} /> Cloturer ce ticket
                        </button>
                      </div>
                    )
                  )}

                  {isClosed && (
                    <div style={{
                      marginTop: 16, padding: '12px 16px', borderRadius: 10,
                      background: '#e8f5e9', border: '1px solid #a5d6a7',
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}>
                      <CheckCircle2 size={18} color="#4caf50" />
                      <span style={{ fontSize: 14, fontWeight: 600, color: '#2e7d32' }}>
                        Ticket cloture {ticket.closedAt ? `le ${ticket.closedAt}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {visibleTickets.length === 0 && !loading && !fetchError && (
          <div style={{
            background: 'white', borderRadius: 12, border: '1px solid #e8ecf0',
            padding: '28px', textAlign: 'center', color: '#999',
          }}>
            Aucun ticket assigne.
          </div>
        )}
      </div>
    </div>
  );
}
