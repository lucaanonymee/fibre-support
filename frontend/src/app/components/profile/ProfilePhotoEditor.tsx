import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Move, RotateCcw, X, ZoomIn, ZoomOut } from 'lucide-react';

const PREVIEW_SIZE = 280;
const OUTPUT_SIZE = 512;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const DEFAULT_AUTO_ZOOM = 1.2;

const getBaseScale = (width: number, height: number): number => {
  return Math.max(PREVIEW_SIZE / width, PREVIEW_SIZE / height);
};

const clampValue = (value: number, limit: number): number => {
  if (!Number.isFinite(limit)) {
    return value;
  }

  return Math.min(limit, Math.max(-limit, value));
};

const getAutoZoom = (width: number, height: number): number => {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return DEFAULT_AUTO_ZOOM;
  }

  const ratio = Math.max(width, height) / Math.max(1, Math.min(width, height));
  if (ratio >= 1.6) {
    return 1.1;
  }
  if (ratio >= 1.3) {
    return 1.15;
  }
  return DEFAULT_AUTO_ZOOM;
};

const loadImageFromFile = (file: File): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossible de lire l\'image selectionnee.'));
    };

    image.src = objectUrl;
  });
};

const createAdjustedProfileImage = async (
  file: File,
  zoom: number,
  offsetX: number,
  offsetY: number,
): Promise<File> => {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement('canvas');
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Canvas non disponible pour ajuster la photo.');
  }

  const baseScale = getBaseScale(image.naturalWidth, image.naturalHeight);
  const drawWidth = image.naturalWidth * baseScale * zoom;
  const drawHeight = image.naturalHeight * baseScale * zoom;
  const drawX = (PREVIEW_SIZE - drawWidth) / 2 + offsetX;
  const drawY = (PREVIEW_SIZE - drawHeight) / 2 + offsetY;

  const outputScale = OUTPUT_SIZE / PREVIEW_SIZE;
  context.setTransform(outputScale, 0, 0, outputScale, 0, 0);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92);
  });

  if (!blob) {
    throw new Error('Impossible de generer la photo ajustee.');
  }

  const safeName = file.name.replace(/\.[^/.]+$/, '');
  return new File([blob], `${safeName}-profile.jpg`, { type: 'image/jpeg' });
};

interface ProfilePhotoEditorProps {
  file: File | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File) => Promise<void>;
}

export default function ProfilePhotoEditor({ file, open, onClose, onConfirm }: ProfilePhotoEditorProps) {
  const [zoom, setZoom] = useState(DEFAULT_AUTO_ZOOM);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  useEffect(() => {
    if (!open || !file) {
      setImageSize(null);
      return;
    }

    let active = true;

    loadImageFromFile(file)
      .then((image) => {
        if (!active) {
          return;
        }
        setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
      })
      .catch(() => {
        if (active) {
          setImageSize(null);
        }
      });

    return () => {
      active = false;
    };
  }, [open, file]);

  const autoZoom = useMemo(() => {
    if (!imageSize) {
      return DEFAULT_AUTO_ZOOM;
    }

    return getAutoZoom(imageSize.width, imageSize.height);
  }, [imageSize]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setZoom(autoZoom);
    setOffsetX(0);
    setOffsetY(0);
    setError(null);
    setProcessing(false);
    setDragging(false);
  }, [autoZoom, open]);

  const previewUrl = useMemo(() => {
    if (!file) {
      return null;
    }

    return URL.createObjectURL(file);
  }, [file]);

  const shouldRender = Boolean(open && file && previewUrl);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const offsetBounds = (() => {
    if (!imageSize) {
      return { maxX: 0, maxY: 0 };
    }

    const baseScale = getBaseScale(imageSize.width, imageSize.height);
    const scaledWidth = imageSize.width * baseScale * zoom;
    const scaledHeight = imageSize.height * baseScale * zoom;

    return {
      maxX: Math.max(0, (scaledWidth - PREVIEW_SIZE) / 2),
      maxY: Math.max(0, (scaledHeight - PREVIEW_SIZE) / 2),
    };
  })();

  useEffect(() => {
    setOffsetX((prev) => clampValue(prev, offsetBounds.maxX));
    setOffsetY((prev) => clampValue(prev, offsetBounds.maxY));
  }, [offsetBounds.maxX, offsetBounds.maxY]);

  if (!shouldRender) {
    return null;
  }

  const adjustZoom = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number((prev + delta).toFixed(2))));
      return next;
    });
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (processing) {
      return;
    }

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      baseX: offsetX,
      baseY: offsetY,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }

    const deltaX = event.clientX - dragRef.current.startX;
    const deltaY = event.clientY - dragRef.current.startY;

    setOffsetX(clampValue(dragRef.current.baseX + deltaX, offsetBounds.maxX));
    setOffsetY(clampValue(dragRef.current.baseY + deltaY, offsetBounds.maxY));
  };

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      return;
    }

    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleConfirm = async () => {
    setError(null);
    setProcessing(true);

    try {
      const adjustedFile = await createAdjustedProfileImage(file, zoom, offsetX, offsetY);
      await onConfirm(adjustedFile);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Erreur lors de l\'ajustement de la photo.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 22, 40, 0.72)',
        backdropFilter: 'blur(4px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          width: 'min(720px, 100%)',
          background: 'white',
          borderRadius: 16,
          border: '1px solid #e8ecf0',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.22)',
          padding: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#1a237e' }}>Ajuster la photo</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#666' }}>
              Glissez pour cadrer. La photo est agrandie automatiquement.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={processing}
            style={{
              border: '1px solid #dfe5eb',
              background: 'white',
              borderRadius: 10,
              width: 34,
              height: 34,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: processing ? 'not-allowed' : 'pointer',
            }}
          >
            <X size={16} color="#556" />
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: 18 }}>
          <div
            style={{
              width: PREVIEW_SIZE,
              height: PREVIEW_SIZE,
              borderRadius: '50%',
              overflow: 'hidden',
              margin: '0 auto',
              border: '2px solid #e3f2fd',
              background: '#f8faff',
              position: 'relative',
              cursor: dragging ? 'grabbing' : 'grab',
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
          >
            <img
              src={previewUrl}
              alt="Apercu profil"
              style={{
                width: PREVIEW_SIZE,
                height: PREVIEW_SIZE,
                objectFit: 'cover',
                transform: `translate(${offsetX}px, ${offsetY}px) scale(${zoom})`,
                transformOrigin: 'center center',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#37474f' }}>
                <ZoomIn size={14} /> Zoom
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <button
                  onClick={() => adjustZoom(-0.1)}
                  disabled={processing}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid #d7dde5',
                    background: 'white',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ZoomOut size={14} color="#546e7a" />
                </button>
                <input
                  type="range"
                  min={MIN_ZOOM}
                  max={MAX_ZOOM}
                  step={0.01}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                  style={{ flex: 1 }}
                />
                <button
                  onClick={() => adjustZoom(0.1)}
                  disabled={processing}
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    border: '1px solid #d7dde5',
                    background: 'white',
                    cursor: processing ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ZoomIn size={14} color="#546e7a" />
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10, fontSize: 12, color: '#78909c' }}>
                <Move size={14} /> Faites glisser la photo pour la repositionner.
              </div>
            </div>

            <button
              onClick={() => {
                setZoom(autoZoom);
                setOffsetX(0);
                setOffsetY(0);
              }}
              disabled={processing}
              style={{
                alignSelf: 'flex-start',
                padding: '8px 14px',
                borderRadius: 8,
                border: '1px solid #d7dde5',
                background: 'white',
                color: '#1a237e',
                cursor: processing ? 'not-allowed' : 'pointer',
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <RotateCcw size={14} /> Recentrer
            </button>

            {error && (
              <div style={{ fontSize: 12, color: '#b71c1c', fontWeight: 700 }}>{error}</div>
            )}

            <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={onClose}
                disabled={processing}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: '1px solid #d7dde5',
                  background: 'white',
                  color: '#546e7a',
                  cursor: processing ? 'not-allowed' : 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                Annuler
              </button>
              <button
                onClick={handleConfirm}
                disabled={processing}
                style={{
                  padding: '10px 18px',
                  borderRadius: 10,
                  border: 'none',
                  background: 'linear-gradient(135deg, #1a237e, #1565c0)',
                  color: 'white',
                  cursor: processing ? 'wait' : 'pointer',
                  fontWeight: 700,
                  fontSize: 13,
                  opacity: processing ? 0.8 : 1,
                }}
              >
                {processing ? 'Traitement...' : 'Utiliser cette photo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
