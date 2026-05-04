import { useCallback, useEffect, useMemo, useState } from 'react';
import { StatusBadge } from '../../components/StatusBadge';
import { MapPlaceholder } from '../../components/MapPlaceholder';
import { CheckCircle2, UserCheck, AlertCircle } from 'lucide-react';
import { ApiError, apiRequest, getErrorMessage } from '../../utils/httpApi';
import { resolvePhotoUrl } from '../../utils/profileApi';
import {
  formatDateTimeFr,
  toPriorityLabel,
  toProblemTypeLabel,
  toTicketCategory,
} from '../../utils/backendMappers';

interface BackendUserRef {
  _id?: string;
  nom?: string;
}

interface BackendTicket {
  _id: string;
  ticketRef?: string;
  sn: string;
  typeProbleme: string;
  statut: 'OUVERT' | 'EN_COURS' | 'CLOTURE';
  priorite?: string;
  creationDate?: string;
  localisation?: { lat?: number; lng?: number };
  clientId?: BackendUserRef | null;
  technicienId?: BackendUserRef | null;
}

interface BackendTechnicien {
  _id: string;
  nom: string;
  email: string;
  categorie: 'UGS' | 'ULS';
  presentAujourdhui?: boolean;
  photoUrl?: string | null;
}

interface AssignTicket {
  id: string;
  rawId: string;
  sn: string;
  client: string;
  type: string;
  priority: string;
  date: string;
  category: 'UGS' | 'ULS';
  lat: number;
  lng: number;
}

interface TechnicianOption {
  id: string;
  name: string;
  email: string;
  cat: 'UGS' | 'ULS';
  presence: 'PRÉSENT' | 'ABSENT';
  activeTickets: number;
  maxTickets: number;
  photoUrl: string | null;
}

const AUTO_REFRESH_MS = 30000;

export default function AdminAssignPage() {
  const [openTickets, setOpenTickets] = useState<AssignTicket[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [expandedTicket, setExpandedTicket] = useState<string | null>(null);
  const [selectedTech, setSelectedTech] = useState<string | null>(null);
  const [confirmAssign, setConfirmAssign] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [assigned, setAssigned] = useState<{ ticketId: string; techName: string } | null>(null);

  const loadData = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setFetchError(null);
    }

    setActionError(null);

    try {
      let ticketsRaw: BackendTicket[] = [];
      try {
        ticketsRaw = await apiRequest<BackendTicket[]>('/api/admin/tickets', { method: 'GET' });
      } catch (error) {
        if (!(error instanceof ApiError && error.status === 404)) {
          throw error;
        }
      }

      const techRaw = await apiRequest<BackendTechnicien[]>('/api/admin/techniciens', { method: 'GET' });

      const activeTicketCountByTech = new Map<string, number>();
      ticketsRaw.forEach((ticket) => {
        const techId = ticket.technicienId?._id;
        if (ticket.statut === 'EN_COURS' && techId) {
          activeTicketCountByTech.set(techId, (activeTicketCountByTech.get(techId) ?? 0) + 1);
        }
      });

      const mappedOpenTickets = ticketsRaw
        .filter((ticket) => ticket.statut === 'OUVERT')
        .map((ticket) => ({
          id: ticket.ticketRef || ticket._id,
          rawId: ticket._id,
          sn: ticket.sn,
          client: ticket.clientId?.nom || 'Client inconnu',
          type: toProblemTypeLabel(ticket.typeProbleme),
          priority: toPriorityLabel(ticket.priorite),
          date: formatDateTimeFr(ticket.creationDate),
          category: toTicketCategory(ticket.typeProbleme),
          lat: typeof ticket.localisation?.lat === 'number' ? ticket.localisation.lat : 36.8189,
          lng: typeof ticket.localisation?.lng === 'number' ? ticket.localisation.lng : 10.1658,
        }));

      const mappedTechnicians: TechnicianOption[] = techRaw.map((tech) => ({
        id: tech._id,
        name: tech.nom,
        email: tech.email,
        cat: tech.categorie,
        presence: (tech.presentAujourdhui ? 'PRÉSENT' : 'ABSENT') as 'PRÉSENT' | 'ABSENT',
        activeTickets: activeTicketCountByTech.get(tech._id) ?? 0,
        maxTickets: tech.categorie === 'UGS' ? 10 : 5,
        photoUrl: resolvePhotoUrl(tech.photoUrl),
      }));

      setOpenTickets(mappedOpenTickets);
      setTechnicians(mappedTechnicians);

      if (!selectedTicket || !mappedOpenTickets.some((ticket) => ticket.id === selectedTicket)) {
        const next = mappedOpenTickets[0]?.id ?? null;
        setSelectedTicket(next);
        setExpandedTicket(next);
      }

      if (selectedTech && !mappedTechnicians.some((tech) => tech.id === selectedTech)) {
        setSelectedTech(null);
      }
    } catch (error) {
      if (!silent) {
        setOpenTickets([]);
        setTechnicians([]);
        setSelectedTicket(null);
        setExpandedTicket(null);
        setSelectedTech(null);
      }
      setFetchError(getErrorMessage(error, 'Impossible de charger les tickets et techniciens.'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [selectedTech, selectedTicket]);

  useEffect(() => {
    void loadData();

    const intervalId = window.setInterval(() => {
      void loadData({ silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const ticket = useMemo(() => openTickets.find((item) => item.id === selectedTicket) ?? null, [openTickets, selectedTicket]);

  const eligibleTechIds = useMemo(() => {
    if (!ticket) {
      return new Set<string>();
    }

    return new Set(
      technicians
        .filter((tech) => tech.cat === ticket.category && tech.presence === 'PRÉSENT' && tech.activeTickets < tech.maxTickets)
        .map((tech) => tech.id),
    );
  }, [technicians, ticket]);

  const handleAssign = async () => {
    if (!ticket || !selectedTech || assigning) {
      return;
    }

    setAssigning(true);
    setActionError(null);

    try {
      await apiRequest('/api/admin/assigner-ticket', {
        method: 'PUT',
        body: {
          ticketId: ticket.id,
          technicienId: selectedTech,
        },
      });

      const techName = technicians.find((tech) => tech.id === selectedTech)?.name || 'Technicien';
      setAssigned({ ticketId: ticket.id, techName });
      setConfirmAssign(false);
      setSelectedTech(null);
    } catch (error) {
      setActionError(getErrorMessage(error, 'Assignation impossible.'));
    } finally {
      setAssigning(false);
    }
  };

  if (assigned) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{
          background: 'white', borderRadius: 24, padding: '52px 44px', textAlign: 'center', maxWidth: 400,
          boxShadow: '0 8px 32px rgba(0,0,0,0.08)', border: '1px solid #e8ecf0',
        }}>
          <div style={{
            width: 80, height: 80, borderRadius: '50%', background: '#e8f5e9',
            display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
            boxShadow: '0 0 0 10px rgba(76,175,80,0.08)',
          }}>
            <CheckCircle2 size={40} color="#4caf50" />
          </div>
          <h2 style={{ margin: '0 0 10px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Ticket assigné !</h2>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
            Le ticket <strong>{assigned.ticketId}</strong> a été assigné à <strong>{assigned.techName}</strong>.<br />
            Le statut est passé à <strong style={{ color: '#1565c0' }}>EN_COURS</strong>.
          </p>
          <button onClick={() => { setAssigned(null); void loadData(); }} style={{
            padding: '12px 28px', borderRadius: 10, border: 'none',
            background: 'linear-gradient(135deg, #1a237e, #1565c0)',
            color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
          }}>
            Rafraichir la liste
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Assigner un Ticket</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Sélectionnez un ticket ouvert et assignez-le au technicien adéquat</p>
      </div>

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

      {loading && (
        <div style={{
          marginBottom: 16,
          padding: '12px 14px',
          borderRadius: 10,
          background: '#f8faff',
          border: '1px solid #e3f2fd',
          color: '#1a237e',
          fontSize: 13,
          fontWeight: 600,
        }}>
          Chargement des tickets ouverts et techniciens...
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Step 1: Select ticket */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '24px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a237e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>1</span>
            Sélectionner un ticket OUVERT
          </h2>

          {openTickets.length === 0 && !loading && (
            <div style={{
              padding: '16px 14px',
              borderRadius: 10,
              background: '#fafafa',
              border: '1px solid #eeeeee',
              color: '#999',
              fontSize: 13,
            }}>
              Aucun ticket OUVERT a assigner.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {openTickets.map(t => {
              const isExpanded = expandedTicket === t.id;
              const isSelected = selectedTicket === t.id;

              return (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTicket(t.id);
                    setSelectedTech(null);
                    setConfirmAssign(false);
                    setExpandedTicket(prev => (prev === t.id ? null : t.id));
                  }}
                  style={{
                    padding: '14px 16px', borderRadius: 12, cursor: 'pointer',
                    border: `2px solid ${isSelected ? '#1a237e' : '#e0e0e0'}`,
                    background: isSelected ? '#e8eaf6' : 'white',
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontWeight: 700, color: '#1a237e', fontSize: 13 }}>{t.id}</span>
                      <span style={{ marginLeft: 8, fontSize: 11, color: '#888', fontFamily: 'monospace' }}>{t.sn}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <StatusBadge status={t.priority} />
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                          background: t.category === 'UGS' ? '#e8eaf6' : '#e0f7fa',
                          color: t.category === 'UGS' ? '#283593' : '#006064',
                        }}>{t.category}</span>
                      </div>
                      <span style={{ fontSize: 14, color: '#888', lineHeight: 1 }}>{isExpanded ? '▲' : '▼'}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: '#333', marginBottom: 4 }}>{t.type}</div>
                  <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#888' }}>
                    <span>👤 {t.client}</span>
                    <span>{t.date}</span>
                  </div>

                  {isExpanded && (
                    <div
                      onClick={(event) => event.stopPropagation()}
                      onMouseDown={(event) => event.stopPropagation()}
                      onPointerDown={(event) => event.stopPropagation()}
                      onTouchStart={(event) => event.stopPropagation()}
                      style={{ marginTop: 10, borderRadius: 10, overflow: 'hidden', border: '1px solid #e3f2fd' }}
                    >
                      <MapPlaceholder
                        height={250}
                        showPolygon={false}
                        markers={[
                          { x: 50, y: 50, lat: t.lat, lng: t.lng, label: `Position ${t.id}`, color: '#f44336', type: 'ticket' },
                        ]}
                        center={[t.lat, t.lng]}
                        zoom={15}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select technician */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '24px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
        }}>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 700, color: '#1a237e', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', background: '#1a237e', color: 'white', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800 }}>2</span>
            Choisir un technicien
          </h2>

          {/* Category rule */}
          {ticket && (
            <div style={{
              padding: '8px 12px', borderRadius: 8, marginBottom: 16,
              background: ticket.category === 'UGS' ? '#e8eaf6' : '#e0f7fa',
              border: `1px solid ${ticket.category === 'UGS' ? '#c5cae9' : '#80deea'}`,
              fontSize: 12, color: ticket.category === 'UGS' ? '#283593' : '#006064',
            }}>
              <strong>{ticket.category}</strong> requis pour : {ticket.type}
              {ticket.category === 'UGS' ? ' (intervention a distance)' : ' (intervention sur site)'}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {technicians.map(tech => {
              const isEligible = ticket ? eligibleTechIds.has(tech.id) : false;
              const isSelected = selectedTech === tech.id;
              return (
                <div
                  key={tech.id}
                  onClick={() => {
                    if (!isEligible) return;
                    setSelectedTech(tech.id);
                    setConfirmAssign(false);
                  }}
                  style={{
                    padding: '12px 14px', borderRadius: 10, cursor: isEligible ? 'pointer' : 'not-allowed',
                    border: `2px solid ${isSelected ? '#1a237e' : isEligible ? '#e0e0e0' : '#f5f5f5'}`,
                    background: isSelected ? '#e8eaf6' : isEligible ? 'white' : '#fafafa',
                    opacity: isEligible ? 1 : 0.55,
                    transition: 'all 0.15s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                        background: isEligible ? (tech.cat === 'UGS' ? '#e8eaf6' : '#e0f7fa') : '#f5f5f5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#555', overflow: 'hidden',
                      }}>
                        {tech.photoUrl ? (
                          <img src={tech.photoUrl} alt={tech.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          tech.name.split(' ').filter(Boolean).map((segment) => segment[0]).join('').slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#333' }}>{tech.name}</div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
                          <StatusBadge status={tech.cat} />
                          <StatusBadge status={tech.presence} />
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 12, color: '#888' }}>Tickets actifs</div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: tech.activeTickets >= tech.maxTickets ? '#f44336' : '#4caf50' }}>
                        {tech.activeTickets} actifs (max {tech.maxTickets})
                      </div>
                      {/* Progress */}
                      <div style={{ width: 60, height: 4, borderRadius: 2, background: '#e0e0e0', marginTop: 4, overflow: 'hidden' }}>
                        <div style={{
                          height: '100%', borderRadius: 2,
                          width: `${(tech.activeTickets / tech.maxTickets) * 100}%`,
                          background: tech.activeTickets >= tech.maxTickets ? '#f44336' : '#4caf50',
                        }} />
                      </div>
                    </div>
                  </div>
                  {!isEligible && (
                    <div style={{ marginTop: 8, fontSize: 11, color: '#999', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <AlertCircle size={12} />
                      {tech.presence === 'ABSENT' ? 'Absent aujourd\'hui' :
                        (ticket && tech.cat !== ticket.category) ? `Categorie ${tech.cat} (requis: ${ticket.category})` :
                        'Charge maximale atteinte'}
                    </div>
                  )}
                </div>
              );
            })}

            {technicians.length === 0 && !loading && (
              <div style={{
                padding: '12px 14px',
                borderRadius: 10,
                background: '#fafafa',
                border: '1px solid #eeeeee',
                color: '#999',
                fontSize: 13,
              }}>
                Aucun technicien actif disponible.
              </div>
            )}
          </div>

          {actionError && (
            <div style={{
              marginTop: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#ffebee',
              border: '1px solid #ffcdd2',
              color: '#b71c1c',
              fontSize: 12,
              fontWeight: 700,
            }}>
              {actionError}
            </div>
          )}

          {/* Assign button */}
          {selectedTech && confirmAssign ? (
            <div style={{
              marginTop: 16, padding: '14px 16px', borderRadius: 10,
              background: '#fff8e1', border: '1px solid #ffd54f',
            }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#f57f17', marginBottom: 10 }}>
                          ⚠️ Confirmer l'assignation du ticket {ticket?.id} ?
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 13, color: '#555' }}>
                          Le ticket sera assigné à <strong>{technicians.find(t => t.id === selectedTech)?.name}</strong> et passera en statut <strong>EN_COURS</strong>.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setConfirmAssign(false)} style={{
                  padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e0e0e0',
                  background: 'white', color: '#666', cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
                }}>
                  Annuler
                </button>
                <button onClick={handleAssign} style={{
                  padding: '9px 24px', borderRadius: 8, border: 'none',
                  background: '#1a237e', color: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                            opacity: assigning ? 0.7 : 1,
                }}>
                            <UserCheck size={15} /> {assigning ? 'Assignation...' : 'Confirmer l\'assignation'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => {
                if (!selectedTech) return;
                setConfirmAssign(true);
              }}
              disabled={!selectedTech || !ticket}
              style={{
                width: '100%', marginTop: 16, padding: '13px', borderRadius: 10, border: 'none',
                background: selectedTech ? 'linear-gradient(135deg, #1a237e, #1565c0)' : '#e0e0e0',
                color: 'white', cursor: selectedTech ? 'pointer' : 'not-allowed',
                fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: selectedTech ? '0 6px 16px rgba(26,35,126,0.3)' : 'none',
              }}
            >
              <UserCheck size={16} />
              {selectedTech ? `Assigner a ${technicians.find(t => t.id === selectedTech)?.name}` : 'Selectionnez un technicien'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
