import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import api from '../lib/api.js';
import type { LoginRequest, RegisterRequest } from '@overleaf/shared';

export function useLogin() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (input: LoginRequest) => {
      const { data } = await api.post('/auth/login', input);
      return data;
    },
    onSuccess: () => navigate('/dashboard'),
  });
}

export function useRegister() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async (input: RegisterRequest) => {
      const { data } = await api.post('/auth/register', input);
      return data;
    },
    onSuccess: () => navigate('/dashboard'),
  });
}

export function useLogout() {
  const navigate = useNavigate();
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/logout');
    },
    onSuccess: () => navigate('/login'),
  });
}
