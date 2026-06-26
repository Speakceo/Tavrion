import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Organization } from '../types';
import { isMasterSuperAdmin } from '../utils/platformAccess';

async function assertActiveOrganization(organizationId: string) {
  const { data: org } = await supabase
    .from('organizations')
    .select('is_active')
    .eq('id', organizationId)
    .maybeSingle();

  if (!org?.is_active) {
    return { error: { message: 'This organisation has been deactivated. Contact your administrator.' } };
  }
  return { error: null };
}

interface AuthContextType {
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (userId: string, password: string, organizationId?: string) => Promise<{ error: any; profile?: UserProfile | null }>;
  signOut: () => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id');
    const storedOrgId = localStorage.getItem('org_id');
    if (storedUserId) {
      fetchProfile(storedUserId, storedOrgId || undefined);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchProfile = async (userId: string, orgId?: string) => {
    try {
      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('unique_id', userId)
        .eq('is_active', true);

      if (orgId) {
        query = query.eq('organization_id', orgId);
      }

      const { data, error } = await query.maybeSingle();

      if (error) throw error;
      setProfile(data);

      if (data?.organization_id) {
        const inactive = await assertActiveOrganization(data.organization_id);
        if (inactive.error) {
          localStorage.removeItem('user_id');
          localStorage.removeItem('org_id');
          setProfile(null);
          setOrganization(null);
          return;
        }

        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .eq('is_active', true)
          .maybeSingle();
        if (!orgData) {
          localStorage.removeItem('user_id');
          localStorage.removeItem('org_id');
          setProfile(null);
          setOrganization(null);
          return;
        }
        setOrganization(orgData);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('user_id');
      localStorage.removeItem('org_id');
    } finally {
      setLoading(false);
    }
  };

  const signIn = async (userId: string, password: string, organizationId?: string) => {
    try {
      if (organizationId) {
        const inactive = await assertActiveOrganization(organizationId);
        if (inactive.error) return { error: inactive.error, profile: null };
      }

      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('unique_id', userId)
        .eq('is_active', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      } else if (!isMasterSuperAdmin(userId)) {
        return { error: { message: 'Invalid organisation, User ID, or password' }, profile: null };
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return { error: { message: 'Invalid organisation, User ID, or password' }, profile: null };
      }

      if (data.role === 'super_admin' && !isMasterSuperAdmin(data.unique_id)) {
        return { error: { message: 'Invalid organisation, User ID, or password' }, profile: null };
      }

      if (!organizationId && !data.is_platform_owner) {
        return { error: { message: 'Invalid organisation, User ID, or password' }, profile: null };
      }

      const expectedPassword = data.password ?? data.unique_id;
      if (password !== expectedPassword) {
        return { error: { message: 'Invalid organisation, User ID, or password' }, profile: null };
      }

      localStorage.setItem('user_id', userId);
      if (organizationId) localStorage.setItem('org_id', organizationId);
      else localStorage.removeItem('org_id');
      setProfile(data);

      if (data.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .eq('is_active', true)
          .maybeSingle();
        if (!orgData) {
          localStorage.removeItem('user_id');
          localStorage.removeItem('org_id');
          setProfile(null);
          setOrganization(null);
          return { error: { message: 'This organisation has been deactivated. Contact your administrator.' }, profile: null };
        }
        setOrganization(orgData);
      } else {
        setOrganization(null);
      }

      return { error: null, profile: data };
    } catch (error: any) {
      return { error, profile: null };
    }
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!profile) return { error: { message: 'Not authenticated' } };

    const expectedPassword = profile.password ?? profile.unique_id;
    if (currentPassword !== expectedPassword) {
      return { error: { message: 'Current password is incorrect' } };
    }

    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ password: newPassword })
        .eq('id', profile.id);

      if (error) throw error;

      setProfile({ ...profile, password: newPassword });
      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    localStorage.removeItem('user_id');
    localStorage.removeItem('org_id');
    setProfile(null);
    setOrganization(null);
  };

  return (
    <AuthContext.Provider value={{ profile, organization, loading, signIn, signOut, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
