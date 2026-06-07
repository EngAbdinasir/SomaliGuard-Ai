import React, { useEffect, useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Save, Search, Trash2, UserCheck, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createUser, deactivateUser, getUsers, updateUser } from '../services/api';

const emptyForm = {
  id: null,
  full_name: '',
  email: '',
  password: '',
  role: 'user',
  is_active: true,
};

const UserList = ({ embedded = false }) => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [mode, setMode] = useState('create');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getUsers();
      setUsers(data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) => (
      [user.full_name, user.email, user.role, user.is_active ? 'active' : 'inactive']
        .join(' ')
        .toLowerCase()
        .includes(query)
    ));
  }, [users, search]);

  const isEditingSelf = mode === 'edit' && form.id === currentUser.id;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMode('create');
    setError('');
    setMessage('');
  };

  const startEdit = (user) => {
    setMode('edit');
    setForm({
      id: user.id,
      full_name: user.full_name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'user',
      is_active: Boolean(user.is_active),
    });
    setError('');
    setMessage('');
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    const payload = {
      full_name: form.full_name.trim(),
      email: form.email.trim(),
      role: form.role,
      is_active: form.is_active,
      ...(form.password ? { password: form.password } : {}),
    };

    try {
      if (mode === 'create') {
        await createUser({ ...payload, password: form.password });
        setMessage('User registered.');
      } else {
        await updateUser(form.id, payload);
        setMessage('User updated.');
      }
      resetForm();
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser.id) {
      setError('You cannot deactivate your own account.');
      return;
    }

    setPendingDelete(user);
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    setError('');
    setMessage('');
    try {
      await deactivateUser(pendingDelete.id);
      setMessage('User deactivated.');
      if (form.id === pendingDelete.id) resetForm();
      setPendingDelete(null);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  const content = (
    <>
      <section style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ margin: '0 0 6px', fontSize: '32px' }}>User Management</h1>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{users.length} accounts</p>
        </div>
        <button onClick={loadUsers} className="btn light" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <RefreshCw size={18} /> Refresh
        </button>
      </section>

      {(error || message) && (
        <div className={error ? 'alert-error' : 'card'} style={{ marginBottom: '20px', padding: '12px 14px', borderRadius: '8px', color: error ? undefined : '#10b981', fontWeight: 700 }}>
          {error || message}
        </div>
      )}

      <section className="responsive-grid users-management-grid" style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>
        <form onSubmit={submitForm} className="card" style={{ padding: '22px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {mode === 'create' ? <Plus size={18} /> : <Edit3 size={18} />}
              {mode === 'create' ? 'Register User' : 'Edit User'}
            </h3>
            {mode === 'edit' && (
              <button type="button" onClick={resetForm} className="btn light" style={{ padding: '7px 9px' }} aria-label="Cancel edit">
                <X size={16} />
              </button>
            )}
          </div>

          <label style={label}>Full name</label>
          <input style={input} value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} required />

          <label style={label}>Email</label>
          <input style={input} type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />

          <label style={label}>{mode === 'create' ? 'Password' : 'New password'}</label>
          <input
            style={input}
            type="password"
            value={form.password}
            onChange={(event) => updateField('password', event.target.value)}
            required={mode === 'create'}
            minLength={form.password ? 6 : undefined}
          />

          <label style={label}>Role</label>
          <select style={input} value={form.role} onChange={(event) => updateField('role', event.target.value)} disabled={isEditingSelf}>
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <label style={label}>Status</label>
          <select style={input} value={form.is_active ? 'active' : 'inactive'} onChange={(event) => updateField('is_active', event.target.value === 'active')} disabled={isEditingSelf}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button type="submit" className="btn primary" style={{ width: '100%', marginTop: '8px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }} disabled={saving}>
            <Save size={18} /> {saving ? 'Saving...' : mode === 'create' ? 'Register' : 'Update'}
          </button>
        </form>

        <section className="card" style={{ padding: '22px', borderRadius: '12px', border: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: '18px', flexWrap: 'wrap' }}>
            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} /> Accounts
            </h3>
            <div style={{ position: 'relative' }}>
              <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
                className="responsive-search-input"
                style={{ ...input, width: '260px', margin: 0, paddingLeft: '36px' }}
              />
            </div>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '22px', color: 'var(--muted)' }}>Loading users...</td>
                  </tr>
                )}

                {!loading && filteredUsers.map((user, index) => {
                  const self = user.id === currentUser.id;
                  return (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="user-avatar" style={{ width: '30px', height: '30px', fontSize: '0.8rem' }}>
                            {user.profile_picture_url ? (
                              <img src={user.profile_picture_url} alt={`${user.full_name || user.email} profile`} />
                            ) : (
                              (user.full_name || user.email).charAt(0).toUpperCase()
                            )}
                          </div>
                          <span style={{ fontWeight: 700 }}>{user.full_name}</span>
                        </div>
                      </td>
                      <td style={{ color: 'var(--muted)' }}>{user.email}</td>
                      <td><RoleBadge role={user.role} /></td>
                      <td><StatusBadge active={user.is_active} /></td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button onClick={() => startEdit(user)} className="btn light" style={actionButton}>
                            <Edit3 size={15} /> Edit
                          </button>
                          <button onClick={() => handleDelete(user)} className="btn light" style={{ ...actionButton, color: '#ef4444', borderColor: '#fecaca' }} disabled={self}>
                            <Trash2 size={15} /> Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '22px', color: 'var(--muted)' }}>No users found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </section>

      {pendingDelete && (
        <div style={modalOverlay} role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="card" style={modalPanel}>
            <div style={modalIcon}>
              <Trash2 size={24} />
            </div>
            <h3 id="delete-user-title" style={{ margin: '0 0 8px', fontSize: '22px' }}>Deactivate this user?</h3>
            <p style={{ margin: '0 0 18px', color: 'var(--muted)', lineHeight: 1.6 }}>
              You are about to deactivate <strong style={{ color: 'var(--text)' }}>{pendingDelete.full_name || pendingDelete.email}</strong>. Their account will remain in user management but they will not be able to sign in.
            </p>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.18)', color: '#ef4444', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', fontWeight: 700, marginBottom: '20px' }}>
              You can reactivate the user later by editing their status.
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" className="btn light" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Keep User
              </button>
              <button type="button" className="btn primary" onClick={confirmDelete} disabled={deleting} style={{ background: '#ef4444', borderColor: '#ef4444', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                <Trash2 size={17} /> {deleting ? 'Deactivating...' : 'Deactivate User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (embedded) {
    return (
      <section id="dashboard-users" style={{ scrollMarginTop: '110px' }}>
        {content}
      </section>
    );
  }

  return (
    <main className="page" style={{ padding: '32px 20px', maxWidth: '1500px', margin: '0 auto' }}>
      {content}
    </main>
  );
};

const label = {
  display: 'block',
  margin: '14px 0 7px',
  color: 'var(--text)',
  fontSize: '13px',
  fontWeight: 800,
};

const input = {
  width: '100%',
  border: '1px solid var(--line)',
  borderRadius: '8px',
  background: 'var(--bg)',
  color: 'var(--text)',
  padding: '11px 12px',
  fontSize: '14px',
  marginBottom: '2px',
};

const actionButton = {
  padding: '7px 10px',
  fontSize: '12px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
};

const modalOverlay = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15, 23, 42, 0.55)',
  display: 'grid',
  placeItems: 'center',
  padding: '20px',
  zIndex: 1000,
};

const modalPanel = {
  width: 'min(440px, 100%)',
  borderRadius: '12px',
  border: '1px solid var(--line)',
  padding: '26px',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.28)',
};

const modalIcon = {
  width: '48px',
  height: '48px',
  borderRadius: '12px',
  background: 'rgba(239, 68, 68, 0.1)',
  color: '#ef4444',
  display: 'grid',
  placeItems: 'center',
  marginBottom: '16px',
};

const RoleBadge = ({ role }) => (
  <span className={`tag ${role === 'admin' ? 'offensive' : 'non'}`} style={{ display: 'inline-block' }}>
    {String(role || 'user').toUpperCase()}
  </span>
);

const StatusBadge = ({ active }) => (
  <span style={{ color: active ? '#10b981' : '#ef4444', fontWeight: 800 }}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
};

export default UserList;
