import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { UserProfile, Organization } from '../types';

interface AuthContextType {
  profile: UserProfile | null;
  organization: Organization | null;
  loading: boolean;
  signIn: (userId: string, password: string, organizationId?: string) => Promise<{ error: any }>;
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
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .maybeSingle();
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
      let query = supabase
        .from('user_profiles')
        .select('*')
        .eq('unique_id', userId)
        .eq('is_active', true);

      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query.maybeSingle();

      if (error || !data) {
        return { error: { message: 'Invalid organisation, User ID, or password' } };
      }

      const expectedPassword = data.password ?? data.unique_id;
      if (password !== expectedPassword) {
        return { error: { message: 'Invalid organisation, User ID, or password' } };
      }

      localStorage.setItem('user_id', userId);
      if (organizationId) localStorage.setItem('org_id', organizationId);
      setProfile(data);

      if (data.organization_id) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('*')
          .eq('id', data.organization_id)
          .maybeSingle();
        setOrganization(orgData);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
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
