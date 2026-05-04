import { apiRequest, buildApiUrl } from './httpApi';

export type ProfileRole = 'client' | 'admin' | 'tech' | 'superadmin';

export interface UserProfileData {
  name: string;
  email: string;
  photoUrl: string | null;
  createdAt: string | null;
  phoneNumber: string | null;
  category: 'UGS' | 'ULS' | null;
}

export interface UpdateUserProfileInput {
  name?: string;
  email?: string;
  phoneNumber?: string;
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
}

const MAX_PHOTO_SIZE_BYTES = 2 * 1024 * 1024;

const ROLE_ENDPOINTS: Record<Exclude<ProfileRole, 'superadmin'>, { profile: string; photo: string }> = {
  admin: {
    profile: '/api/admin/profile',
    photo: '/api/admin/profile/photo',
  },
  client: {
    profile: '/api/client/profile',
    photo: '/api/client/profile/photo',
  },
  tech: {
    profile: '/api/technicien/profile',
    photo: '/api/technicien/profile/photo',
  },
};

const RAW_API_BASE_URL = ((import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '').trim().replace(/\/$/, '');
const API_ORIGIN = RAW_API_BASE_URL.endsWith('/api') ? RAW_API_BASE_URL.slice(0, -4) : RAW_API_BASE_URL;

export const resolvePhotoUrl = (value: unknown): string | null => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return null;
  }

  const photoUrl = value.trim();

  if (/^https?:\/\//i.test(photoUrl) || photoUrl.startsWith('data:')) {
    return photoUrl;
  }

  if (photoUrl.startsWith('/')) {
    if (API_ORIGIN) {
      return `${API_ORIGIN}${photoUrl}`;
    }

    return buildApiUrl(photoUrl);
  }

  if (API_ORIGIN) {
    return `${API_ORIGIN}/${photoUrl.replace(/^\/+/, '')}`;
  }

  return photoUrl;
};

const endpointsForRole = (role: ProfileRole) => {
  if (role === 'superadmin') {
    return null;
  }

  return ROLE_ENDPOINTS[role];
};

function normalizeProfilePayload(payload: any): Partial<UserProfileData> {
  const source = payload?.data?.user ?? payload?.data ?? payload?.user ?? payload;
  const categoryValue = typeof source?.categorie === 'string' ? source.categorie.toUpperCase() : '';

  return {
    name: source?.nom ?? source?.name ?? source?.nomComplet ?? source?.fullName ?? source?.username ?? '',
    email: source?.email ?? '',
    photoUrl: resolvePhotoUrl(source?.photoUrl ?? source?.profilePhotoUrl ?? source?.avatarUrl ?? source?.avatar ?? source?.photo ?? null),
    createdAt: typeof source?.createdAt === 'string' ? source.createdAt : null,
    phoneNumber: typeof source?.numTelephone === 'string' ? source.numTelephone : null,
    category: categoryValue === 'UGS' || categoryValue === 'ULS' ? categoryValue : null,
  };
}

export async function fetchUserProfile(role: ProfileRole): Promise<Partial<UserProfileData>> {
  if (role === 'superadmin') {
    // Le backend actuel ne propose pas de route profil pour SUPER_ADMIN.
    return {};
  }

  const data = await apiRequest<any>('/api/utilisateur/profil', {
    method: 'GET',
  });

  return normalizeProfilePayload(data);
}

export async function updateUserProfile(role: ProfileRole, input: UpdateUserProfileInput): Promise<Partial<UserProfileData>> {
  if (role === 'superadmin') {
    throw new Error('Mise a jour profil non disponible pour ce role.');
  }

  const body: Record<string, string> = {};

  if (typeof input.name === 'string' && input.name.trim()) {
    body.nom = input.name.trim();
  }

  if (typeof input.email === 'string' && input.email.trim()) {
    body.email = input.email.trim();
  }

  if (typeof input.phoneNumber === 'string' && input.phoneNumber.trim()) {
    body.numTelephone = input.phoneNumber.trim();
  }

  if (typeof input.currentPassword === 'string' && input.currentPassword.trim()) {
    body.motDePasseActuel = input.currentPassword;
  }

  if (typeof input.newPassword === 'string' && input.newPassword.trim()) {
    body.motDePasse = input.newPassword;
  }

  if (typeof input.confirmPassword === 'string' && input.confirmPassword.trim()) {
    body.confirmationMotDePasse = input.confirmPassword;
  }

  const data = await apiRequest<any>('/api/utilisateur/profil', {
    method: 'PUT',
    body,
  });

  return normalizeProfilePayload(data);
}

export async function uploadUserProfilePhoto(role: ProfileRole, file: File): Promise<Partial<UserProfileData>> {
  const endpoints = endpointsForRole(role);

  if (!endpoints) {
    throw new Error('Upload photo non disponible pour ce role.');
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('Le fichier selectionne doit etre une image.');
  }

  if (file.size > MAX_PHOTO_SIZE_BYTES) {
    throw new Error('La taille maximale autorisee est 2MB.');
  }

  const formData = new FormData();
  formData.append('photo', file);

  const data = await apiRequest<any>(endpoints.photo, {
    method: 'PATCH',
    body: formData,
  });

  return normalizeProfilePayload(data);
}
