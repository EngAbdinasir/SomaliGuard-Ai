const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5000';
const TOKEN_KEY = 'somaliguard_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const setToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
};

const authHeaders = () => {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const parseResponse = async (response) => {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || data.message || 'Request failed.');
  }
  return data;
};

const request = async (...args) => {
  try {
    return await fetch(...args);
  } catch (error) {
    throw new Error('Cannot connect to the server. Please make sure the backend is running.');
  }
};

const postJson = async (path, payload, includeAuth = false) => {
  const response = await request(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(includeAuth ? authHeaders() : {}),
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const sendVerificationCode = (email) =>
  postJson('/send-verification-code', { email });

export const registerUser = async (fullName, email, password, profilePicture, verificationCode) => {
  if (!profilePicture) {
    return postJson('/register', { full_name: fullName, email, password, verification_code: verificationCode });
  }

  const formData = new FormData();
  formData.append('full_name', fullName);
  formData.append('email', email);
  formData.append('password', password);
  formData.append('verification_code', verificationCode);
  formData.append('profile_picture', profilePicture);

  const response = await request(`${API_BASE_URL}/register`, {
    method: 'POST',
    body: formData,
  });
  return parseResponse(response);
};

export const loginUser = (email, password) =>
  postJson('/login', { email, password });

export const loginWithGoogleCredential = (credential) =>
  postJson('/auth/google', { credential });

export const forgotPassword = (email) =>
  postJson('/forgot-password', { email });

export const resetPassword = (token, newPassword, confirmPassword) =>
  postJson('/reset-password', { token, new_password: newPassword, confirm_password: confirmPassword });

export const sendContactMessage = (payload) =>
  postJson('/contact', payload);

export const predictText = (text) =>
  postJson('/predict-text', { text }, true);

export const predictImage = async (file) => {
  const formData = new FormData();
  formData.append('image', file);

  const response = await request(`${API_BASE_URL}/predict-image`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse(response);
};

export const getProfile = async () => {
  const response = await request(`${API_BASE_URL}/profile`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const uploadProfilePicture = async (file) => {
  const formData = new FormData();
  formData.append('profile_picture', file);

  const response = await request(`${API_BASE_URL}/profile-picture`, {
    method: 'POST',
    headers: authHeaders(),
    body: formData,
  });
  return parseResponse(response);
};

export const getHistory = async () => {
  const response = await request(`${API_BASE_URL}/history`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getAdminDashboard = async () => {
  const response = await request(`${API_BASE_URL}/admin/dashboard`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const getHealth = async () => {
  const response = await request(`${API_BASE_URL}/`);
  return parseResponse(response);
};

export const getUsers = async () => {
  const response = await request(`${API_BASE_URL}/users`, {
    headers: authHeaders(),
  });
  return parseResponse(response);
};

export const createUser = async (payload) => {
  const response = await request(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const updateUser = async (userId, payload) => {
  const response = await request(`${API_BASE_URL}/users/${userId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
};

export const updateUserRole = async (userId, role) => {
  const response = await request(`${API_BASE_URL}/users/${userId}/role`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
    },
    body: JSON.stringify({ role }),
  });
  return parseResponse(response);
};

export const deactivateUser = async (userId) => {
  const response = await request(`${API_BASE_URL}/users/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return parseResponse(response);
};
