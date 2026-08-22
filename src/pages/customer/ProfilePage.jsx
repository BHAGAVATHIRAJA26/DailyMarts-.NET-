import { useState } from 'react';
import CustomerLayout from '../../layouts/CustomerLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function CustomerProfilePage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    location: user?.location || '',
    address: user?.address || '',
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile(form);
    toast.success('Profile Updated', 'Your profile details have been saved.');
  };

  return (
    <CustomerLayout>
      <div className="page-container max-w-xl">
        <h1 className="section-title mb-2">👤 Customer Profile</h1>
        <p className="section-subtitle mb-6">Manage your personal details, location, and delivery address</p>

        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="avatar avatar-xl avatar-green">{user?.name?.charAt(0)}</div>
            <div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <span className="badge badge-active">Customer Account</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input type="tel" className="form-input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">City / Location</label>
              <input type="text" className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Delivery Address</label>
              <textarea className="form-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg mt-2">
              Save Changes
            </button>
          </form>
        </div>
      </div>
    </CustomerLayout>
  );
}
