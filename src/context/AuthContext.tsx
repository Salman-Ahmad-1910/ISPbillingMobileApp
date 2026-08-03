import React, {createContext, useContext, useEffect, useState, useCallback} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiClient from '../api/client';
import {User, Company, ApiResponse, AuthResponse} from '../types';

interface AuthContextType {
  isLoading: boolean;
  isAuthenticated: boolean;
  userToken: string | null;
  user: User | null;
  companyId: string | null;
  companies: Company[];
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, companyName: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  selectCompany: (company: Company) => Promise<void>;
  refreshCompanies: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({children}: {children: React.ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);

  useEffect(() => {
    bootstrapAuth();
  }, []);

  const bootstrapAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      const storedCompanyId = await AsyncStorage.getItem('company_id');
      const userData = await AsyncStorage.getItem('user_data');

      if (token && userData && storedCompanyId) {
        setUserToken(token);
        setCompanyId(storedCompanyId);
        setUser(JSON.parse(userData));
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
      await AsyncStorage.removeItem('company_id');
      await AsyncStorage.removeItem('user_data');
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/login', {
      email,
      password,
    });

    const {token, user: userData} = response.data.data!;

    await AsyncStorage.setItem('auth_token', token);
    await AsyncStorage.setItem('user_data', JSON.stringify(userData));
    if (userData.companyId) {
      await AsyncStorage.setItem('company_id', userData.companyId);
      setCompanyId(userData.companyId);
    }

    setUserToken(token);
    setUser(userData);
  }, []);

  const signup = useCallback(
    async (name: string, companyName: string, email: string, password: string) => {
      const response = await apiClient.post<ApiResponse<AuthResponse>>('/auth/signup', {
        name,
        companyName,
        email,
        password,
      });

      const {token, user: userData} = response.data.data!;

      await AsyncStorage.setItem('auth_token', token);
      await AsyncStorage.setItem('user_data', JSON.stringify(userData));
      if (userData.companyId) {
        await AsyncStorage.setItem('company_id', userData.companyId);
        setCompanyId(userData.companyId);
      }

      setUserToken(token);
      setUser(userData);
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors, clear locally regardless
    }
    await AsyncStorage.removeItem('auth_token');
    await AsyncStorage.removeItem('company_id');
    await AsyncStorage.removeItem('user_data');
    setUserToken(null);
    setUser(null);
    setCompanyId(null);
    setCompanies([]);
  }, []);

  const refreshCompanies = useCallback(async () => {
    try {
      const response = await apiClient.get<ApiResponse<Company[]>>('/companies');
      setCompanies(response.data.data || []);
    } catch {
      // ignore
    }
  }, []);

  const selectCompany = useCallback(async (company: Company) => {
    await AsyncStorage.setItem('company_id', company.id);
    setCompanyId(company.id);
    if (user) {
      const updatedUser = {...user, companyId: company.id, company: {id: company.id, name: company.name}};
      await AsyncStorage.setItem('user_data', JSON.stringify(updatedUser));
      setUser(updatedUser);
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        isLoading,
        isAuthenticated: !!userToken,
        userToken,
        user,
        companyId,
        companies,
        login,
        signup,
        logout,
        selectCompany,
        refreshCompanies,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
