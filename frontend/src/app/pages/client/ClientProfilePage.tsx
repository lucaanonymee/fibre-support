import { useEffect, useRef, useState } from 'react';
import { User, Mail, Phone, Lock, Camera, CheckCircle2, Eye, EyeOff, Edit3 } from 'lucide-react';
import { useRoleProfile } from '../../context/ProfileContext';
import ProfilePhotoEditor from '../../components/profile/ProfilePhotoEditor';
import { getErrorMessage } from '../../utils/httpApi';

export default function ClientProfilePage() {
  const fallbackName = 'Client Tunisie Telecom';
  const fallbackEmail = 'client@tunisietelecom.tn';
  const { name, email, photoUrl, phoneNumber, accessSinceMonthYear, photoUploading, uploadPhoto, updateProfile } = useRoleProfile('client', {
    name: fallbackName,
    email: fallbackEmail,
  });

  const [displayName, setDisplayName] = useState(name);
  const [displayEmail, setDisplayEmail] = useState(email);
  const [displayPhone, setDisplayPhone] = useState(phoneNumber ?? '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [infoSaving, setInfoSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);
  const [infoError, setInfoError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoFileForEdit, setPhotoFileForEdit] = useState<File | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDisplayName(name);
  }, [name]);

  useEffect(() => {
    setDisplayEmail(email);
  }, [email]);

  useEffect(() => {
    setDisplayPhone(phoneNumber ?? '');
  }, [phoneNumber]);

  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const handlePhotoChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';

    if (!file) {
      return;
    }

    setPhotoFileForEdit(file);
  };

  const handlePhotoConfirm = async (file: File) => {
    setPhotoError(null);

    try {
      await uploadPhoto(file);
    } catch (error) {
      const message = getErrorMessage(error, 'Erreur lors du chargement de la photo.');
      setPhotoError(message);
      throw error;
    }
  };

  const handleSaveProfile = async () => {
    setInfoSaving(true);
    setInfoError(null);

    try {
      await updateProfile({
        name: displayName,
        email: displayEmail,
        phoneNumber: displayPhone,
      });
      setSaved('Profil mis a jour avec succes.');
    } catch (error) {
      setInfoError(getErrorMessage(error, 'Impossible de mettre a jour le profil.'));
    } finally {
      setInfoSaving(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!currentPassword.trim() || !newPassword.trim() || !confirmPassword.trim()) {
      setPasswordError('Remplissez les trois champs de mot de passe.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('La confirmation du nouveau mot de passe est incorrecte.');
      return;
    }

    setPasswordSaving(true);
    setPasswordError(null);

    try {
      await updateProfile({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      setSaved('Mot de passe mis a jour avec succes.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      setPasswordError(getErrorMessage(error, 'Impossible de mettre a jour le mot de passe.'));
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 800, color: '#1a237e' }}>Mon Profil</h1>
        <p style={{ margin: 0, color: '#888', fontSize: 14 }}>Gérez vos informations personnelles</p>
      </div>

      {saved && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 18px', borderRadius: 10, marginBottom: 20,
          background: '#e8f5e9', border: '1px solid #a5d6a7', color: '#2e7d32',
        }}>
          <CheckCircle2 size={18} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{saved}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 24 }}>
        {/* Avatar card */}
        <div>
          <div style={{
            background: 'white', borderRadius: 16, padding: '32px 24px',
            border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
            textAlign: 'center',
          }}>
            <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>
              <div style={{
                width: 96, height: 96, borderRadius: '50%',
                background: 'linear-gradient(135deg, #1a237e, #42a5f5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, fontWeight: 800, color: 'white',
                boxShadow: '0 8px 24px rgba(26,35,126,0.25)', overflow: 'hidden',
              }}>
                {photoUrl ? (
                  <img src={photoUrl} alt="Photo de profil client" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  initials
                )}
              </div>
              <button
                onClick={() => photoInputRef.current?.click()}
                disabled={photoUploading}
                style={{
                position: 'absolute', bottom: 2, right: 2,
                width: 28, height: 28, borderRadius: '50%',
                background: '#42a5f5', border: '2px solid white',
                cursor: photoUploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: photoUploading ? 0.7 : 1,
              }}>
                <Camera size={13} color="white" />
              </button>
            </div>

            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />

            {photoError && (
              <div style={{ marginBottom: 10, color: '#c62828', fontSize: 11 }}>{photoError}</div>
            )}

            <h3 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 800, color: '#1a237e' }}>{name}</h3>
            <p style={{ margin: '0 0 16px', color: '#888', fontSize: 13 }}>{email}</p>

            <div style={{ marginTop: 14, fontSize: 12, color: '#aaa' }}>
              Membre depuis {accessSinceMonthYear || '--'}
            </div>
          </div>
        </div>

        {/* Edit form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Personal info */}
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px',
            border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1a237e' }}>Informations personnelles</h2>
              <span style={{ fontSize: 12, color: '#607d8b', fontWeight: 700 }}><Edit3 size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Edition active</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
              {[
                { label: "Nom d'utilisateur", val: displayName, icon: <User size={15} color="#aaa" />, setValue: setDisplayName },
                { label: 'Adresse email', val: displayEmail, icon: <Mail size={15} color="#aaa" />, setValue: setDisplayEmail },
                { label: 'Numero de telephone', val: displayPhone, icon: <Phone size={15} color="#aaa" />, setValue: setDisplayPhone },
              ].map((f, i) => (
                <div key={i}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }}>{f.icon}</span>
                    <input
                      value={f.val}
                      onChange={(event) => f.setValue(event.target.value)}
                      style={{
                        width: '100%', padding: '11px 12px 11px 36px',
                        borderRadius: 9, border: '1.5px solid #42a5f5',
                        fontSize: 14, background: 'white',
                        color: '#333', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                        cursor: 'text',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {infoError && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>{infoError}</div>
            )}

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleSaveProfile} disabled={infoSaving} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                color: 'white', cursor: infoSaving ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6, opacity: infoSaving ? 0.8 : 1,
              }}>
                <CheckCircle2 size={15} /> {infoSaving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>

          {/* Password change */}
          <div style={{
            background: 'white', borderRadius: 16, padding: '28px',
            border: '1px solid #e8ecf0', boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 16, fontWeight: 700, color: '#1a237e' }}>Changer le mot de passe</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
              {['Mot de passe actuel', 'Nouveau mot de passe', 'Confirmer le nouveau'].map((label, i) => (
                <div key={i}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 6 }}>{label}</label>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} color="#aaa" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={i === 0 ? currentPassword : i === 1 ? newPassword : confirmPassword}
                      onChange={(event) => {
                        const nextValue = event.target.value;
                        if (i === 0) {
                          setCurrentPassword(nextValue);
                        } else if (i === 1) {
                          setNewPassword(nextValue);
                        } else {
                          setConfirmPassword(nextValue);
                        }
                      }}
                      style={{
                        width: '100%', padding: '11px 36px 11px 36px',
                        borderRadius: 9, border: '1.5px solid #e0e0e0',
                        fontSize: 14, background: '#fafafa', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
                      }}
                    />
                    {i === 0 && (
                      <button onClick={() => setShowPass(!showPass)} style={{
                        position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                        background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      }}>
                        {showPass ? <EyeOff size={14} color="#aaa" /> : <Eye size={14} color="#aaa" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {passwordError && (
              <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: '#b71c1c' }}>{passwordError}</div>
            )}
            <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={handleUpdatePassword} disabled={passwordSaving} style={{
                padding: '10px 24px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                color: 'white', cursor: passwordSaving ? 'wait' : 'pointer', fontSize: 14, fontWeight: 700, fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
                opacity: passwordSaving ? 0.8 : 1,
              }}>
                <Lock size={14} /> {passwordSaving ? 'Mise a jour...' : 'Mettre a jour'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ProfilePhotoEditor
        file={photoFileForEdit}
        open={Boolean(photoFileForEdit)}
        onClose={() => setPhotoFileForEdit(null)}
        onConfirm={handlePhotoConfirm}
      />
    </div>
  );
}
