import { useState } from 'react';
import FarmerLayout from '../../layouts/FarmerLayout';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export default function FarmerProfilePage() {
  const { user, updateProfile } = useAuth();
  const toast = useToast();

  const [form, setForm] = useState({
    name: user?.name || 'Ravi Kumar',
    farmName: user?.farmName || 'Ravi Farm',
    email: user?.email || 'ravi@ravifarm.com',
    phone: user?.phone || '9876543210',
    location: user?.location || 'Dindigul',
    address: user?.address || 'Survey No. 45, Palani Road, Dindigul - 624002',
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateProfile(form);
    toast.success('Farmer Profile Saved', 'Your farm details and address have been updated.');
  };

  return (
    <FarmerLayout>
      <div className="page-container max-w-xl">
        <h1 className="section-title mb-2">🌾 Farmer Profile & Business Details</h1>
        <p className="section-subtitle mb-6">Manage your farm identity, contact details, and location for customers</p>

        <div className="card p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="avatar avatar-xl avatar-green">{user?.name?.charAt(0) || 'R'}</div>
            <div>
              <h2 className="text-xl font-bold">{user?.name || 'Ravi Kumar'}</h2>
              <div className="text-sm text-green font-semibold">🏡 {user?.farmName || 'Ravi Farm'}</div>
              <span className="badge badge-paid mt-1">✓ Verified Farmer</span>
            </div>
          </div>

          <form onSubmit={handleSave} className="flex flex-col gap-4">
            <div className="form-group">
              <label className="form-label">Farmer Full Name</label>
              <input type="text" className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Farm / Business Name</label>
              <input type="text" className="form-input" value={form.farmName} onChange={(e) => setForm({ ...form, farmName: e.target.value })} />
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
              <label className="form-label">Farm Location (City/Town)</label>
              <input type="text" className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>

            <div className="form-group">
              <label className="form-label">Farm Address</label>
              <textarea className="form-textarea" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} rows={3} />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg mt-2">
              Save Farmer Details
            </button>
          </form>
        </div>
      </div>
    </FarmerLayout>
  );
}
