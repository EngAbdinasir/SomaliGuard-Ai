import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Edit3,
  Plus,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createUser, deactivateUser, getUsers, updateUser } from '../services/api';
import { Alert, EmptyState, FormField, LoadingState, StatCard } from '../components/ui/Primitives';

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
  const [showUserModal, setShowUserModal] = useState(false);

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
    let active = true;
    getUsers()
      .then((data) => { if (active) setUsers(data.users || []); })
      .catch((requestError) => { if (active) setError(requestError.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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

  const userStats = useMemo(() => {
    const total = users.length;
    const active = users.filter((user) => user.is_active).length;
    const admins = users.filter((user) => user.role === 'admin').length;
    return {
      total,
      active,
      admins,
      inactive: total - active,
    };
  }, [users]);

  const isEditingSelf = mode === 'edit' && form.id === currentUser?.id;

  const updateField = (field, value) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setMode('create');
    setError('');
    setMessage('');
  };

  const closeUserModal = () => {
    resetForm();
    setShowUserModal(false);
  };

  const startCreate = () => {
    resetForm();
    setShowUserModal(true);
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
    setShowUserModal(true);
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
      setShowUserModal(false);
      await loadUsers();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentUser?.id) {
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
      <section className="sg-hero">
        <div className="sg-hero-copy">
          <span className="sg-eyebrow"><Sparkles size={14} /> Administrative Access</span>
          <h1>User Management</h1>
          <p>
            A dedicated workspace for managing SomaliGuard AI accounts, assigning roles,
            and monitoring access status.
          </p>
        </div>
        <div className="sg-hero-actions">
          <button onClick={loadUsers} className="sg-button sg-button-outline" type="button">
            <RefreshCw size={16} /> Refresh Registry
          </button>
        </div>
      </section>

      <section className="sg-stat-grid" style={{ marginBottom: 20 }}>
        <StatCard icon={Users} tone="blue" label="Total Accounts" value={userStats.total} />
        <StatCard icon={Activity} tone="teal" label="Active Users" value={userStats.active} />
        <StatCard icon={ShieldCheck} tone="violet" label="Administrators" value={userStats.admins} />
        <StatCard icon={UserCheck} tone="amber" label="Inactive Accounts" value={userStats.inactive} />
      </section>

      {(error || message) && <Alert type={error ? 'error' : 'success'}>{error || message}</Alert>}

      <section className="sg-card" style={{ marginTop: 18 }}>
        <div className="sg-card-header" style={{ flexWrap: 'wrap', gap: 14 }}>
          <div>
            <h2>Registered System Users</h2>
            <p>{filteredUsers.length} of {users.length} accounts shown</p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            <div className="sg-search-field" style={{ minWidth: 240 }}>
              <Search size={16} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name, email, role, or status"
                className="sg-input"
              />
            </div>
            <button type="button" className="sg-button sg-button-primary" onClick={startCreate}>
              <Plus size={16} /> Register User
            </button>
          </div>
        </div>

        <div className="sg-card-body">
          <div className="sg-table-wrap">
            <table className="sg-table">
              <colgroup>
                <col style={{ width: '48px' }} />
                <col style={{ width: '210px' }} />
                <col style={{ width: '260px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '100px' }} />
                <col style={{ width: '110px' }} />
                <col style={{ width: '170px' }} />
              </colgroup>
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
                {!loading && filteredUsers.map((user, index) => {
                  const self = user.id === currentUser?.id;
                  return (
                    <tr key={user.id}>
                      <td>{index + 1}</td>
                      <td>
                        <div className="sg-table-user">
                          <span className="sg-avatar">
                            {user.profile_picture_url ? (
                              <img src={user.profile_picture_url} alt={`${user.full_name || user.email} profile`} />
                            ) : (
                              (user.full_name || user.email).charAt(0).toUpperCase()
                            )}
                          </span>
                          <span>{user.full_name}</span>
                        </div>
                      </td>
                      <td>{user.email}</td>
                      <td><RoleBadge role={user.role} /></td>
                      <td><StatusBadge active={user.is_active} /></td>
                      <td>{formatDate(user.created_at)}</td>
                      <td>
                        <div className="sg-row-actions">
                          <button onClick={() => startEdit(user)} className="sg-button sg-button-outline sg-icon-action">
                            <Edit3 size={14} /> Edit
                          </button>
                          <button onClick={() => handleDelete(user)} className="sg-button sg-button-outline sg-icon-action" disabled={self} style={self ? undefined : { color: 'var(--sg-red)', borderColor: 'var(--sg-red-border)' }}>
                            <Trash2 size={14} /> Deactivate
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && <LoadingState message="Loading users…" />}
            {!loading && filteredUsers.length === 0 && <EmptyState title="No users found" description="Try a different search or register a new account." />}
          </div>
        </div>
      </section>

      {showUserModal && (
        <div className="sg-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="user-modal-title">
          <form onSubmit={submitForm} className="sg-modal">
            <header>
              <div>
                <span className="sg-eyebrow">Account Control</span>
                <h2 id="user-modal-title">{mode === 'create' ? 'Register New User' : 'Edit User Account'}</h2>
              </div>
              <button type="button" onClick={closeUserModal} className="sg-icon-button" aria-label="Close account form">
                <X size={16} />
              </button>
            </header>

            <div className="sg-modal-body">
              <p style={{ margin: 0, color: 'var(--sg-text-muted)', fontSize: 13 }}>
                {mode === 'create' ? 'Create a verified account for system access.' : 'Update role, status, or password for this account.'}
              </p>

              <FormField label="Full name" htmlFor="user-full-name">
                <input id="user-full-name" className="sg-input" value={form.full_name} onChange={(event) => updateField('full_name', event.target.value)} required />
              </FormField>

              <FormField label="Email" htmlFor="user-email">
                <input id="user-email" className="sg-input" type="email" value={form.email} onChange={(event) => updateField('email', event.target.value)} required />
              </FormField>

              <FormField label={mode === 'create' ? 'Password' : 'New password'} htmlFor="user-password">
                <input
                  id="user-password"
                  className="sg-input"
                  type="password"
                  value={form.password}
                  onChange={(event) => updateField('password', event.target.value)}
                  required={mode === 'create'}
                  minLength={form.password ? 6 : undefined}
                />
              </FormField>

              <FormField label="Role" htmlFor="user-role">
                <select id="user-role" className="sg-input" value={form.role} onChange={(event) => updateField('role', event.target.value)} disabled={isEditingSelf}>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </FormField>

              <FormField label="Status" htmlFor="user-status">
                <select id="user-status" className="sg-input" value={form.is_active ? 'active' : 'inactive'} onChange={(event) => updateField('is_active', event.target.value === 'active')} disabled={isEditingSelf}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>

            <footer>
              <button type="button" className="sg-button sg-button-outline" onClick={closeUserModal} disabled={saving}>
                Close
              </button>
              <button type="submit" className="sg-button sg-button-primary" disabled={saving}>
                <Save size={16} /> {saving ? 'Saving Account...' : mode === 'create' ? 'Register Account' : 'Done'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {pendingDelete && (
        <div className="sg-modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="delete-user-title">
          <div className="sg-modal" style={{ width: 'min(440px, 100%)' }}>
            <div className="sg-modal-body">
              <span className="sg-icon-chip red" style={{ marginBottom: 4 }}><Trash2 size={22} /></span>
              <h2 id="delete-user-title" style={{ margin: 0, fontSize: 21 }}>Deactivate this user?</h2>
              <p style={{ margin: 0, color: 'var(--sg-text-muted)', lineHeight: 1.6 }}>
                You are about to deactivate <strong style={{ color: 'var(--sg-text)' }}>{pendingDelete.full_name || pendingDelete.email}</strong>. Their account will remain in user management but they will not be able to sign in.
              </p>
              <div className="sg-alert sg-alert-error">
                You can reactivate the user later by editing their status.
              </div>
            </div>
            <footer>
              <button type="button" className="sg-button sg-button-outline" onClick={() => setPendingDelete(null)} disabled={deleting}>
                Keep User
              </button>
              <button type="button" className="sg-button sg-button-danger" onClick={confirmDelete} disabled={deleting}>
                <Trash2 size={16} /> {deleting ? 'Deactivating...' : 'Deactivate User'}
              </button>
            </footer>
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
    <main className="page sg-users-page">
      {content}
    </main>
  );
};

const RoleBadge = ({ role }) => (
  <span className={`sg-role-badge ${role === 'admin' ? 'admin' : 'user'}`}>
    {String(role || 'user').toLowerCase()}
  </span>
);

const StatusBadge = ({ active }) => (
  <span className={`sg-status-badge ${active ? 'active' : 'inactive'}`}>
    {active ? 'Active' : 'Inactive'}
  </span>
);

const formatDate = (value) => {
  if (!value) return '';
  return new Date(value).toLocaleDateString();
};

export default UserList;
