import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router';
import {
  MapPin, Brain, Clock, Users, BarChart2, Layers,
  CheckCircle2, ArrowRight, Star, Phone, Mail, Globe,
  Wifi, Zap, Shield, TrendingUp, Menu, X
} from 'lucide-react';
import { LogoIcon } from '../components/Logo';

const fiberImg = '/fibre.jpg';
const technicianImg = '/fibre2.jpg';
const womanImg = '/women.png';
const manImg = '/man1.jpg';
const man2Img = '/tech.png';

function useScrollY() {
  const [y, setY] = useState(0);
  const [visible, setVisible] = useState(true);
  const lastY = useRef(0);
  useEffect(() => {
    const h = () => {
      const current = window.scrollY;
      setVisible(current < 100 || current < lastY.current);
      lastY.current = current;
      setY(current);
    };
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);
  return { y, visible };
}

function useCounter(target: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = target / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
        observer.disconnect();
      }
    });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);
  return { count, ref };
}

function StatCounter({ target, label, suffix = '' }: { target: number; label: string; suffix?: string }) {
  const { count, ref } = useCounter(target);
  return (
    <div ref={ref} style={{ textAlign: 'center', padding: '32px 24px' }}>
      <div style={{ fontSize: 56, fontWeight: 800, color: '#42a5f5', lineHeight: 1 }}>
        {count.toLocaleString()}{suffix}
      </div>
      <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.75)', marginTop: 10, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function LandingPage() {
  const { y: scrollY, visible: navVisible } = useScrollY();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navOpaque = scrollY > 50;

  return (
    <div style={{ fontFamily: '"Inter", "Segoe UI", sans-serif', background: 'white', overflowX: 'hidden' }}>
      {/* NAVBAR */}
      <nav style={{
        position: 'fixed', top: navVisible ? 0 : -90, left: 0, right: 0, zIndex: 1000,
        background: navOpaque ? 'rgba(26,35,126,0.97)' : 'transparent',
        backdropFilter: navOpaque ? 'blur(12px)' : 'none',
        borderBottom: navOpaque ? '1px solid rgba(255,255,255,0.1)' : 'none',
        transition: 'all 0.3s ease',
        padding: '0 48px', height: 78,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <LogoIcon size={76} />
          <span style={{ color: 'white', fontWeight: 800, fontSize: 21, letterSpacing: -0.5 }}>Smart Fibre TT</span>
        </div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }} className="hidden md:flex">
          {[{label:'Accueil',id:'accueil'},{label:'À propos',id:'apropos'},{label:'Processus',id:'processus'},{label:'Fonctionnalités',id:'fonctionnalites'},{label:'Contact',id:'contact'}].map((item, i) => (
            <a key={i} href={`#${item.id}`} style={{
              color: 'rgba(255,255,255,0.85)', textDecoration: 'none', fontSize: 15.5, fontWeight: 500,
              transition: 'color 0.2s',
            }}>{item.label}</a>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link to="/auth/login" style={{
            padding: '10px 24px', borderRadius: 8, border: '1.5px solid rgba(255,255,255,0.5)',
            color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 600,
            transition: 'all 0.2s',
          }}>Se connecter</Link>
          <Link to="/auth/register" style={{
            padding: '10px 24px', borderRadius: 8, background: '#42a5f5',
            color: 'white', textDecoration: 'none', fontSize: 15, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(66,165,245,0.4)',
          }}>S'inscrire</Link>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{
            display: 'none', background: 'none', border: 'none', color: 'white', cursor: 'pointer',
          }}>
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section id="accueil" style={{
        minHeight: '100vh', position: 'relative',
        background: 'linear-gradient(135deg, #0d1257 0%, #1a237e 40%, #1565c0 100%)',
        display: 'flex', alignItems: 'center', overflow: 'hidden',
      }}>
        {/* Background image overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${fiberImg})`,
          backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: 0.12,
        }} />
        {/* Decorative elements */}
        {[...Array(8)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: [300, 200, 150, 100, 80, 250, 120, 180][i],
            height: [300, 200, 150, 100, 80, 250, 120, 180][i],
            borderRadius: '50%',
            border: '1px solid rgba(66,165,245,0.08)',
            top: `${[10, 60, 30, 70, 20, 80, 50, 5][i]}%`,
            left: `${[5, 70, 45, 20, 80, 60, 10, 55][i]}%`,
            transform: 'translate(-50%, -50%)',
          }} />
        ))}

        <div style={{ position: 'relative', zIndex: 1, maxWidth: 1300, margin: '0 auto', padding: '120px 48px 80px', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '6px 14px', borderRadius: 20, marginBottom: 24,
                background: 'rgba(66,165,245,0.15)', border: '1px solid rgba(66,165,245,0.3)',
              }}>
                <Zap size={14} color="#42a5f5" />
                <span style={{ color: '#42a5f5', fontSize: 14, fontWeight: 600 }}>Plateforme IA · Tunisie Telecom</span>
              </div>
              <h1 style={{
                margin: '0 0 24px', color: 'white',
                fontSize: 62, fontWeight: 900, lineHeight: 1.1, letterSpacing: -1.5,
              }}>
                Smart<br />
                <span style={{ color: '#42a5f5' }}>Fibre</span> TT
              </h1>
              <p style={{
                margin: '0 0 36px', color: 'rgba(255,255,255,0.75)',
                fontSize: 20, lineHeight: 1.7, maxWidth: 520,
              }}>
                Plateforme intelligente de gestion et priorisation des incidents fibre optique. Résolvez les pannes plus vite grâce à l'IA et la géolocalisation.
              </p>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <Link to="/auth/login" style={{
                  padding: '16px 36px', borderRadius: 12,
                  background: '#42a5f5', color: 'white',
                  textDecoration: 'none', fontSize: 17, fontWeight: 700,
                  boxShadow: '0 6px 20px rgba(66,165,245,0.5)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  Se connecter <ArrowRight size={20} />
                </Link>
                <Link to="/auth/register" style={{
                  padding: '16px 36px', borderRadius: 12,
                  border: '2px solid rgba(255,255,255,0.35)', color: 'white',
                  textDecoration: 'none', fontSize: 17, fontWeight: 700,
                }}>
                  Créer un compte
                </Link>
              </div>

              <div style={{ display: 'flex', gap: 36, marginTop: 52 }}>
                {[
                  { value: '98%', label: 'Taux de résolution' },
                  { value: '< 4h', label: 'Temps moyen de réponse' },
                  { value: '24/7', label: 'Réclamations' },
                ].map((stat, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#42a5f5' }}>{stat.value}</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)', marginTop: 4 }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero visual */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ position: 'relative', width: 460, height: 460 }}>
                {/* Dashboard preview mockup */}
                <div style={{
                  width: 420, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.12)', borderRadius: 24,
                  padding: 24, backdropFilter: 'blur(10px)',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <span style={{ color: 'white', fontWeight: 700, fontSize: 16 }}>Tableau de bord</span>
                    <span style={{ color: '#42a5f5', fontSize: 13 }}>Temps réel</span>
                  </div>
                  {/* Mini stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                    {[
                      { label: 'Tickets ouverts', val: '23', color: '#ff9800' },
                      { label: 'En cours', val: '41', color: '#42a5f5' },
                      { label: 'Résolus', val: '187', color: '#66bb6a' },
                      { label: 'Techniciens actifs', val: '12', color: '#ce93d8' },
                    ].map((s, i) => (
                      <div key={i} style={{
                        background: 'rgba(255,255,255,0.07)', borderRadius: 12, padding: '14px',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}>
                        <div style={{ color: s.color, fontSize: 24, fontWeight: 800 }}>{s.val}</div>
                        <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, marginTop: 3 }}>{s.label}</div>
                      </div>
                    ))}
                  </div>
                  {/* Mini chart bars */}
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginBottom: 10 }}>Tickets 7 derniers jours</div>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'flex-end', height: 60 }}>
                      {[30, 55, 40, 65, 45, 70, 50].map((h, i) => (
                        <div key={i} style={{
                          flex: 1, background: `rgba(66,165,245,${0.4 + i * 0.08})`,
                          borderRadius: '3px 3px 0 0', height: `${h}%`,
                        }} />
                      ))}
                    </div>
                  </div>
                  {/* AI badge */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                    background: 'rgba(66,165,245,0.15)', borderRadius: 10,
                    border: '1px solid rgba(66,165,245,0.25)',
                  }}>
                    <Brain size={16} color="#42a5f5" />
                    <span style={{ color: '#42a5f5', fontSize: 13, fontWeight: 600 }}>IA: 3 tickets haute priorité détectés</span>
                  </div>
                </div>

                {/* Floating card */}
                <div style={{
                  position: 'absolute', bottom: 0, right: -24,
                  background: 'white', borderRadius: 14, padding: '14px 20px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: 12,
                    background: '#e8f5e9', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <CheckCircle2 size={22} color="#4caf50" />
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a237e' }}>Ticket #TT-2847</div>
                    <div style={{ fontSize: 12, color: '#4caf50', fontWeight: 600 }}>✓ Résolu en 2h 15min</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>


      </section>

      {/* À PROPOS */}
      <section id="apropos" style={{ padding: '100px 48px', background: '#f8faff' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>
            <div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, marginBottom: 20,
                background: '#e8eaf6', color: '#1a237e', fontSize: 13, fontWeight: 700,
              }}>À PROPOS</div>
              <h2 style={{ margin: '0 0 24px', fontSize: 42, fontWeight: 800, color: '#1a237e', lineHeight: 1.2 }}>
                La plateforme de gestion fibre optique de nouvelle génération
              </h2>
              <p style={{ color: '#555', lineHeight: 1.7, marginBottom: 18, fontSize: 16 }}>
                Smart Fibre TT est une solution centralisée développée pour <strong>Tunisie Telecom</strong> permettant de gérer, prioriser et résoudre les incidents fibre optique sur tout le territoire tunisien.
              </p>
              <p style={{ color: '#555', lineHeight: 1.7, fontSize: 16 }}>
                Grâce à l'intelligence artificielle, des scores de priorité et de pertinence sont générés pour chaque ticket selon sa criticité, sa localisation et les compétences des techniciens. Ces recommandations aident l'administrateur, qui conserve la validation finale pour garantir rapidité et contrôle humain.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginTop: 32 }}>
                {[
                  { icon: Brain, label: 'Priorisation par IA', color: '#7c4dff' },
                  { icon: MapPin, label: 'Géolocalisation précise', color: '#42a5f5' },
                  { icon: Clock, label: 'Suivi en temps réel', color: '#ff9800' },
                  { icon: Shield, label: 'Sécurité renforcée', color: '#4caf50' },
                ].map((f, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '14px 18px', borderRadius: 12, background: 'white',
                    border: '1px solid #e8ecf0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                  }}>
                    <f.icon size={22} color={f.color} />
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#333' }}>{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <img src={technicianImg} alt="Technicien fibre" style={{
                width: '100%', height: 480, objectFit: 'cover',
                borderRadius: 24, boxShadow: '0 20px 48px rgba(26,35,126,0.15)',
              }} />
              <div style={{
                position: 'absolute', bottom: 24, left: 24,
                background: 'white', borderRadius: 14, padding: '16px 24px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: '#e3f2fd', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <TrendingUp size={24} color="#1565c0" />
                </div>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#1a237e' }}>+34%</div>
                  <div style={{ fontSize: 13, color: '#666' }}>Efficacité améliorée</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESSUS */}
      <section id="processus" style={{ padding: '100px 48px', background: 'white' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, marginBottom: 20,
              background: '#e3f2fd', color: '#1565c0', fontSize: 13, fontWeight: 700,
            }}>PROCESSUS</div>
            <h2 style={{ margin: '0 0 14px', fontSize: 42, fontWeight: 800, color: '#1a237e' }}>4 étapes simples</h2>
            <p style={{ color: '#666', fontSize: 17, maxWidth: 540, margin: '0 auto' }}>
              De la déclaration de l'incident à la résolution, tout est automatisé et traçable.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 28, position: 'relative' }}>
            {/* Connecting line */}
            <div style={{
              position: 'absolute', top: 40, left: '12%', right: '12%', height: 2,
              background: 'linear-gradient(90deg, #42a5f5, #1a237e)', zIndex: 0,
              opacity: 0.3,
            }} />

            {[
              { step: 1, icon: Wifi, title: 'Signalement', desc: 'Le client signale une panne via l\'application en indiquant le type et sa localisation sur la carte', color: '#42a5f5' },
              { step: 2, icon: MapPin, title: 'Assignation Zone', desc: 'Le système géolocalise et assigne automatiquement l\'admin responsable de la zone concernée', color: '#7c4dff' },
              { step: 3, icon: Users, title: 'Technicien qualifié', desc: 'L\'admin sélectionne le meilleur technicien (présent, disponible, catégorie UGS/ULS adaptée)', color: '#ff9800' },
              { step: 4, icon: CheckCircle2, title: 'Résolution', desc: 'Le technicien intervient et clôture le ticket. L\'historique est conservé par numéro de série', color: '#4caf50' },
            ].map((s, i) => (
              <div key={i} style={{
                textAlign: 'center', padding: '32px 24px',
                background: '#f8faff', borderRadius: 20,
                border: '1px solid #e8ecf0', position: 'relative', zIndex: 1,
                boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
              }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: `${s.color}18`, border: `2px solid ${s.color}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px',
                  position: 'relative',
                }}>
                  <s.icon size={32} color={s.color} />
                  <div style={{
                    position: 'absolute', top: -8, right: -8,
                    width: 28, height: 28, borderRadius: '50%',
                    background: s.color, color: 'white',
                    fontSize: 12, fontWeight: 800,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>{s.step}</div>
                </div>
                <h3 style={{ margin: '0 0 12px', fontSize: 18, fontWeight: 700, color: '#1a237e' }}>{s.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FONCTIONNALITÉS */}
      <section id="fonctionnalites" style={{ padding: '88px 48px', background: '#f8faff' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, marginBottom: 20,
                background: '#e8f5e9', color: '#2e7d32', fontSize: 13, fontWeight: 700,
              }}>FONCTIONNALITÉS CLÉS</div>
            <h2 style={{ margin: '0 0 14px', fontSize: 42, fontWeight: 800, color: '#1a237e' }}>Tout ce dont vous avez besoin</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              { icon: MapPin, title: 'Géolocalisation intelligente', desc: 'Assignation automatique des tickets vers l\'admin de la zone géographique correspondante.', color: '#42a5f5', bg: '#e3f2fd' },
              { icon: Brain, title: 'Priorisation par IA', desc: 'L\'intelligence artificielle calcule la priorité de chaque incident et prédit le temps de résolution optimal.', color: '#7c4dff', bg: '#ede7f6' },
              { icon: Clock, title: 'Suivi en temps réel', desc: 'Suivez l\'état de votre ticket en temps réel : OUVERT, EN_COURS, CLÔTURÉ avec horodatage précis.', color: '#ff9800', bg: '#fff3e0' },
              { icon: Users, title: 'Gestion des techniciens', desc: 'Présence quotidienne, catégorie UGS/ULS, charge maximale (10 UGS / 5 ULS), activation/désactivation.', color: '#4caf50', bg: '#e8f5e9' },
              { icon: BarChart2, title: 'Historique des pannes', desc: 'Consultez tout l\'historique des pannes d\'un équipement via son numéro de série unique.', color: '#f06292', bg: '#fce4ec' },
              { icon: Layers, title: 'Tableau de bord personnalisé', desc: 'Interface et données adaptées à chaque rôle : Client, Technicien, Admin, Super Admin.', color: '#00bcd4', bg: '#e0f7fa' },
            ].map((f, i) => (
              <div key={i} style={{
                background: 'white', borderRadius: 18, padding: '28px 24px',
                border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s',
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 14, background: f.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18,
                }}>
                  <f.icon size={27} color={f.color} />
                </div>
                <h3 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700, color: '#1a237e' }}>{f.title}</h3>
                <p style={{ margin: 0, fontSize: 14, color: '#666', lineHeight: 1.7 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATISTIQUES */}
      <section style={{
        padding: '100px 48px',
        background: 'linear-gradient(135deg, #1a237e 0%, #1565c0 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {[...Array(4)].map((_, i) => (
          <div key={i} style={{
            position: 'absolute', borderRadius: '50%',
            width: [300, 200, 400, 150][i], height: [300, 200, 400, 150][i],
            border: '1px solid rgba(255,255,255,0.05)',
            top: `${[10, 50, -20, 60][i]}%`, left: `${[5, 60, 80, 30][i]}%`,
            transform: 'translate(-50%, -50%)',
          }} />
        ))}
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 42, fontWeight: 800, color: 'white' }}>Smart Fibre TT en chiffres</h2>
            <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 17 }}>Des résultats concrets pour Tunisie Telecom</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
            {[
              { target: 12487, label: 'Tickets résolus', suffix: '+' },
              { target: 248, label: 'Techniciens actifs', suffix: '' },
              { target: 24, label: 'Zones couvertes', suffix: '' },
              { target: 4, label: 'Heures moy. de résolution', suffix: 'h' },
            ].map((stat, i) => (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.07)', borderRadius: 20,
                border: '1px solid rgba(255,255,255,0.1)', padding: '8px 0',
              }}>
                <StatCounter target={stat.target} label={stat.label} suffix={stat.suffix} />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TÉMOIGNAGES */}
      <section style={{ padding: '100px 48px', background: 'white' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 6, marginBottom: 20,
                background: '#fff3e0', color: '#e65100', fontSize: 13, fontWeight: 700,
              }}>TÉMOIGNAGES</div>
            <h2 style={{ margin: 0, fontSize: 42, fontWeight: 800, color: '#1a237e' }}>Ce que disent nos utilisateurs</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {[
              {
                name: 'Sonia Mbarki', role: 'Abonnée fibre, Tunis',
                img: womanImg, rating: 5,
                text: 'Incroyable ! J\'ai signalé ma panne à 9h du matin et le technicien était là à 11h30. Le suivi en temps réel est vraiment pratique.',
              },
              {
                name: 'Karim Hamdi', role: 'Responsable IT, Sfax',
                img: manImg, rating: 5,
                text: 'Smart Fibre TT a transformé notre façon de gérer les incidents. La priorisation par IA nous permet d\'intervenir là où c\'est le plus urgent.',
              },
              {
                name: 'Nizar Ben Ali', role: 'Technicien ULS, Sousse',
                img: man2Img, rating: 5,
                text: 'L\'interface technicien est très intuitive. Je vois mes tickets assignés avec la localisation exacte du client. Un vrai gain de temps !',
              },
            ].map((t, i) => (
              <div key={i} style={{
                background: '#f8faff', borderRadius: 20, padding: '32px 28px',
                border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
              }}>
                <div style={{ display: 'flex', gap: 5, marginBottom: 20 }}>
                  {[...Array(t.rating)].map((_, j) => (
                    <Star key={j} size={18} fill="#ffc107" color="#ffc107" />
                  ))}
                </div>
                <p style={{ margin: '0 0 24px', fontSize: 15, color: '#444', lineHeight: 1.8, fontStyle: 'italic' }}>
                  "{t.text}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <img src={t.img} alt={t.name} style={{
                    width: 72, height: 72, borderRadius: '50%', objectFit: 'cover',
                    border: '3px solid #42a5f5',
                  }} />
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#1a237e' }}>{t.name}</div>
                    <div style={{ fontSize: 13, color: '#888' }}>{t.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section style={{
        padding: '80px 48px',
        background: 'linear-gradient(135deg, #42a5f5 0%, #1a237e 100%)',
        textAlign: 'center',
      }}>
        <h2 style={{ margin: '0 0 18px', fontSize: 42, fontWeight: 800, color: 'white' }}>
          Prêt à moderniser votre gestion fibre ?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 18, marginBottom: 36 }}>
          Rejoignez les milliers d'utilisateurs qui font confiance à Smart Fibre TT
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          <Link to="/auth/register" style={{
            padding: '16px 40px', borderRadius: 12,
            background: 'white', color: '#1a237e',
            textDecoration: 'none', fontSize: 17, fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
          }}>Créer un compte gratuit</Link>
          <Link to="/auth/login" style={{
            padding: '16px 40px', borderRadius: 12,
            border: '2px solid rgba(255,255,255,0.6)', color: 'white',
            textDecoration: 'none', fontSize: 17, fontWeight: 700,
          }}>Se connecter</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer id="contact" style={{
        background: '#0d1257', padding: '72px 48px 36px', color: 'rgba(255,255,255,0.65)',
      }}>
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: 48, marginBottom: 56 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <LogoIcon size={84} />
                <span style={{ color: 'white', fontWeight: 800, fontSize: 20 }}>Smart Fibre TT</span>
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.7, maxWidth: 300 }}>
                Plateforme intelligente de gestion des incidents fibre optique pour Tunisie Telecom.<br/>
                • IA • Géolocalisation • Temps réel
              </p>
            </div>

            {/* Liens rapides */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 18, marginTop: 0 }}>Liens rapides</h4>
              {[
                { label: 'Accueil', href: '#accueil' },
                { label: 'À propos', href: '#apropos' },
                { label: 'Connexion', href: '/auth/login' },
                { label: 'Inscription', href: '/auth/register' },
              ].map((item, j) => (
                <a key={j} href={item.href} style={{
                  display: 'block', color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                  fontSize: 14, marginBottom: 12, transition: 'color 0.2s',
                }}>{item.label}</a>
              ))}
            </div>

            {/* Fonctionnalités */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 18, marginTop: 0 }}>Fonctionnalités</h4>
              {[
                { label: 'Gestion des tickets', href: '#fonctionnalites' },
                { label: 'Priorisation par IA', href: '#fonctionnalites' },
                { label: 'Géolocalisation', href: '#fonctionnalites' },
                { label: 'Tableau de bord', href: '#fonctionnalites' },
              ].map((item, j) => (
                <a key={j} href={item.href} style={{
                  display: 'block', color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                  fontSize: 14, marginBottom: 12, transition: 'color 0.2s',
                }}>{item.label}</a>
              ))}
            </div>

            {/* Contact */}
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, fontSize: 15, marginBottom: 18, marginTop: 0 }}>Contact</h4>
              {[
                { label: '+216 71 001 298', icon: <Phone size={14} />, href: 'tel:+21671001298' },
                { label: 'smartfibrett@gmail.com', icon: <Mail size={14} />, href: 'mailto:smartfibrett@gmail.com' },
                { label: 'www.tunisietelecom.tn', icon: <Globe size={14} />, href: 'https://www.tunisietelecom.tn' },
              ].map((item, j) => (
                <a key={j} href={item.href} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  color: 'rgba(255,255,255,0.55)', textDecoration: 'none',
                  fontSize: 14, marginBottom: 12, transition: 'color 0.2s',
                }}>
                  {item.icon}
                  {item.label}
                </a>
              ))}
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: 8,
                color: 'rgba(255,255,255,0.55)', fontSize: 14, marginTop: 8, lineHeight: 1.5,
              }}>
                <Clock size={14} style={{ marginTop: 2, flexShrink: 0 }} />
                <div>
                  Réclamations : 24/7 <br/>
                  Traitement : <br/>
                  lun-ven : 08:00-18:00 <br/>
                  sam : 08:00-12:00
                </div>
              </div>
            </div>
          </div>

          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 24,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12,
          }}>
            <span style={{ fontSize: 14 }}>© 2026 Smart Fibre TT — Tunisie Telecom. Tous droits réservés.</span>
            <div style={{ display: 'flex', gap: 20 }}>
              {[
                { label: 'Politique de confidentialité', href: '/legal/privacy' },
                { label: "Conditions d'utilisation", href: '/legal/terms' },
                { label: 'Mentions légales', href: '/legal/mentions' },
              ].map((l, i) => (
                <Link key={i} to={l.href} style={{ color: 'rgba(255,255,255,0.45)', textDecoration: 'none', fontSize: 13 }}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
