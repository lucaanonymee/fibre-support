import ReCAPTCHA from 'react-google-recaptcha';

interface RecaptchaFieldProps {
  onTokenChange: (token: string | null) => void;
  size?: 'normal' | 'compact';
}

export default function RecaptchaField({ onTokenChange, size = 'normal' }: RecaptchaFieldProps) {
  const siteKey = ((import.meta.env as Record<string, string | undefined>).VITE_RECAPTCHA_SITE_KEY ?? '').trim();

  if (!siteKey) {
    return (
      <div
        style={{
          padding: '10px 12px',
          borderRadius: 8,
          background: '#fff8e1',
          border: '1px solid #ffe082',
          color: '#8d6e63',
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        reCAPTCHA non configure. Ajoutez VITE_RECAPTCHA_SITE_KEY dans le fichier .env frontend.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <ReCAPTCHA
        sitekey={siteKey}
        size={size}
        onChange={(token) => onTokenChange(token)}
        onExpired={() => onTokenChange(null)}
        onErrored={() => onTokenChange(null)}
      />
    </div>
  );
}
