import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchUserProfile,
  type ProfileRole,
  type UpdateUserProfileInput,
  type UserProfileData,
  updateUserProfile,
  uploadUserProfilePhoto,
} from '../utils/profileApi';

interface ProfileFallback {
  name: string;
  email: string;
}

interface RoleProfileState extends UserProfileData {
  loaded: boolean;
  loading: boolean;
  photoUploading: boolean;
}

type ProfileStore = Record<ProfileRole, RoleProfileState>;

interface ProfileContextValue {
  profiles: ProfileStore;
  ensureProfile: (role: ProfileRole, fallback: ProfileFallback) => Promise<void>;
  uploadPhotoForRole: (role: ProfileRole, file: File, fallback: ProfileFallback) => Promise<void>;
  updateProfileForRole: (role: ProfileRole, payload: UpdateUserProfileInput, fallback: ProfileFallback) => Promise<void>;
}

interface UseRoleProfileResult {
  name: string;
  email: string;
  photoUrl: string | null;
  createdAt: string | null;
  phoneNumber: string | null;
  category: 'UGS' | 'ULS' | null;
  accessSinceMonthYear: string | null;
  loading: boolean;
  photoUploading: boolean;
  uploadPhoto: (file: File) => Promise<void>;
  updateProfile: (payload: UpdateUserProfileInput) => Promise<void>;
}

const monthYearFormatter = new Intl.DateTimeFormat('fr-FR', {
  month: 'long',
  year: 'numeric',
});

const capitalize = (value: string): string => {
  if (!value) {
    return value;
  }
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const toMonthYearLabel = (isoDate: string | null): string | null => {
  if (!isoDate) {
    return null;
  }

  const parsedDate = new Date(isoDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return capitalize(monthYearFormatter.format(parsedDate));
};

const emptyRoleState = (): RoleProfileState => ({
  name: '',
  email: '',
  photoUrl: null,
  createdAt: null,
  phoneNumber: null,
  category: null,
  loaded: false,
  loading: false,
  photoUploading: false,
});

const initialStore: ProfileStore = {
  client: emptyRoleState(),
  admin: emptyRoleState(),
  tech: emptyRoleState(),
  superadmin: emptyRoleState(),
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const [profiles, setProfiles] = useState<ProfileStore>(initialStore);

  const ensureProfile = useCallback(async (role: ProfileRole, fallback: ProfileFallback) => {
    let shouldFetch = false;

    setProfiles((prev) => {
      const current = prev[role];

      if (current.loading || current.loaded) {
        return {
          ...prev,
          [role]: {
            ...current,
            name: current.name || fallback.name,
            email: current.email || fallback.email,
          },
        };
      }

      shouldFetch = true;
      return {
        ...prev,
        [role]: {
          ...current,
          name: current.name || fallback.name,
          email: current.email || fallback.email,
          loading: true,
        },
      };
    });

    if (!shouldFetch) {
      return;
    }

    try {
      const remote = await fetchUserProfile(role);

      setProfiles((prev) => {
        const current = prev[role];
        return {
          ...prev,
          [role]: {
            ...current,
            name: remote.name || fallback.name,
            email: remote.email || fallback.email,
            photoUrl: remote.photoUrl ?? current.photoUrl,
            createdAt: remote.createdAt ?? current.createdAt,
            phoneNumber: remote.phoneNumber ?? current.phoneNumber,
            category: remote.category ?? current.category,
            loading: false,
            loaded: true,
          },
        };
      });
    } catch {
      setProfiles((prev) => {
        const current = prev[role];
        return {
          ...prev,
          [role]: {
            ...current,
            name: current.name || fallback.name,
            email: current.email || fallback.email,
            loading: false,
            loaded: true,
          },
        };
      });
    }
  }, []);

  const uploadPhotoForRole = useCallback(async (role: ProfileRole, file: File, fallback: ProfileFallback) => {
    setProfiles((prev) => {
      const current = prev[role];
      return {
        ...prev,
        [role]: {
          ...current,
          name: current.name || fallback.name,
          email: current.email || fallback.email,
          photoUploading: true,
        },
      };
    });

    try {
      const remote = await uploadUserProfilePhoto(role, file);

      setProfiles((prev) => {
        const current = prev[role];
        return {
          ...prev,
          [role]: {
            ...current,
            name: remote.name || current.name || fallback.name,
            email: remote.email || current.email || fallback.email,
            photoUrl: remote.photoUrl ?? current.photoUrl,
            createdAt: remote.createdAt ?? current.createdAt,
            phoneNumber: remote.phoneNumber ?? current.phoneNumber,
            category: remote.category ?? current.category,
            photoUploading: false,
            loaded: true,
          },
        };
      });
    } catch (error) {
      setProfiles((prev) => {
        const current = prev[role];
        return {
          ...prev,
          [role]: {
            ...current,
            photoUploading: false,
          },
        };
      });
      throw error;
    }
  }, []);

  const updateProfileForRole = useCallback(async (role: ProfileRole, payload: UpdateUserProfileInput, fallback: ProfileFallback) => {
    const remote = await updateUserProfile(role, payload);

    setProfiles((prev) => {
      const current = prev[role];
      return {
        ...prev,
        [role]: {
          ...current,
          name: remote.name || current.name || fallback.name,
          email: remote.email || current.email || fallback.email,
          photoUrl: remote.photoUrl ?? current.photoUrl,
          createdAt: remote.createdAt ?? current.createdAt,
          phoneNumber: remote.phoneNumber ?? current.phoneNumber,
          category: remote.category ?? current.category,
          loaded: true,
        },
      };
    });
  }, []);

  const value = useMemo<ProfileContextValue>(() => ({
    profiles,
    ensureProfile,
    uploadPhotoForRole,
    updateProfileForRole,
  }), [profiles, ensureProfile, uploadPhotoForRole, updateProfileForRole]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useRoleProfile(role: ProfileRole, fallback: ProfileFallback): UseRoleProfileResult {
  const context = useContext(ProfileContext);

  if (!context) {
    throw new Error('useRoleProfile must be used inside ProfileProvider');
  }

  const { profiles, ensureProfile, uploadPhotoForRole, updateProfileForRole } = context;

  useEffect(() => {
    void ensureProfile(role, fallback);
  }, [ensureProfile, role, fallback.name, fallback.email]);

  const roleProfile = profiles[role];

  return {
    name: roleProfile.name || fallback.name,
    email: roleProfile.email || fallback.email,
    photoUrl: roleProfile.photoUrl,
    createdAt: roleProfile.createdAt,
    phoneNumber: roleProfile.phoneNumber,
    category: roleProfile.category,
    accessSinceMonthYear: toMonthYearLabel(roleProfile.createdAt),
    loading: roleProfile.loading,
    photoUploading: roleProfile.photoUploading,
    uploadPhoto: (file: File) => uploadPhotoForRole(role, file, fallback),
    updateProfile: (payload: UpdateUserProfileInput) => updateProfileForRole(role, payload, fallback),
  };
}
