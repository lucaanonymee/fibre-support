import { User, Mail, Shield, CheckCircle2, Lock } from 'lucide-react';

export default function SuperAdminProfilePage() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Mon Profil</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Compte Super Administrateur — Tunisie Telecom</p>
      </div>

      {/* Read-only notice */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 18px', borderRadius: 12, marginBottom: 24,
        background: 'linear-gradient(135deg, #f3e5f5, #ede7f6)',
        border: '1px solid #ce93d8',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10,
          background: 'rgba(106,27,154,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Lock size={18} color="#6a1b9a" />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#4a148c', marginBottom: 2 }}>
            Profil non modifiable
          </div>
          <div style={{ fontSize: 13, color: '#7b1fa2', lineHeight: 1.5 }}>
            Les informations du compte Super Administrateur sont gérées directement par le système.
            Pour toute modification, veuillez contacter l'équipe technique de Tunisie Telecom.
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Left card */}
        <div style={{
          background: 'white', borderRadius: 16, padding: '32px 24px',
          border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)', textAlign: 'center',
        }}>
          <div style={{
            width: 96, height: 96, borderRadius: '50%', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #4a148c, #7b1fa2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36, fontWeight: 800, color: 'white',
            boxShadow: '0 8px 24px rgba(74,20,140,0.3)',
          }}>DS</div>

          <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1a237e' }}>Directeur Système</h3>
          <p style={{ margin: '0 0 12px', color: '#888', fontSize: 13 }}>superadmin@tunisietelecom.tn</p>

          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 14px', borderRadius: 20,
            background: 'linear-gradient(135deg, #4a148c20, #7b1fa220)',
            color: '#7b1fa2', fontSize: 12, fontWeight: 700,
            border: '1px solid #ce93d880',
          }}>
            <Shield size={13} /> SUPER ADMIN
          </span>

          {/* Read-only lock indicator */}
          <div style={{
            marginTop: 14, padding: '8px 14px', borderRadius: 8,
            background: '#fafafa', border: '1px solid #f0f0f0',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            <Lock size={12} color="#aaa" />
            <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600 }}>Profil verrouillé</span>
          </div>

          <div style={{ marginTop: 14, fontSize: 12, color: '#aaa' }}>
            Accès depuis Janvier 2024
          </div>
        </div>

        {/* Right: info sections */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Personal info — read-only */}
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px',
            border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a237e' }}>Informations personnelles</h2>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 8,
                background: '#f3e5f5', border: '1px solid #ce93d8',
                fontSize: 12, color: '#7b1fa2', fontWeight: 600,
              }}>
                <Lock size={12} /> Lecture seule
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[
                { label: 'Nom complet', val: 'Directeur Système', icon: <User size={14} color="#aaa" /> },
                { label: 'Email', val: 'superadmin@tunisietelecom.tn', icon: <Mail size={14} color="#aaa" /> },
                { label: 'Rôle', val: 'SUPER_ADMIN', icon: <Shield size={14} color="#7b1fa2" /> },
                { label: 'Organisation', val: 'Tunisie Telecom', icon: <span style={{ fontSize: 13 }}>🏢</span> },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>{f.icon}</span>
                    <input
                      defaultValue={f.val}
                      disabled
                      style={{
                        width: '100%', padding: '11px 12px 11px 36px',
                        borderRadius: 9, border: '1.5px solid #e8ecf0',
                        fontSize: 14, background: '#f8f9fc',
                        color: '#555', fontFamily: 'inherit', outline: 'none',
                        boxSizing: 'border-box', cursor: 'not-allowed',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Permissions */}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', marginBottom: 10 }}>Permissions système</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {[
                  'Vue globale du système',
                  'Gestion des données et dashboards',
                  'Gestion des admins',
                ].map((perm, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 12px', borderRadius: 8, background: '#f8faff', border: '1px solid #e3f2fd',
                    fontSize: 12, color: '#1a237e',
                  }}>
                    <CheckCircle2 size={14} color="#4caf50" /> {perm}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
