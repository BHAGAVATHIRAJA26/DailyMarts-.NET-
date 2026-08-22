import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import CustomerLayout from '../../layouts/CustomerLayout';
import { mockFarmers, mockProducts } from '../../utils/mockData';
import { formatCurrency, calcBillEstimate } from '../../utils/formatters';
import { useToast } from '../../context/ToastContext';
import './MilkRequestPage.css';

export default function MilkRequestPage() {
  const toast = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [selectedFarmer, setSelectedFarmer] = useState(mockFarmers[0].id);
  const [selectedProduct, setSelectedProduct] = useState('DM-MILK-001');
  const [frequency, setFrequency] = useState('daily');
  const [deliveryTime, setDeliveryTime] = useState('morning');
  const [capacity, setCapacity] = useState(1);
  const [packaging, setPackaging] = useState('glass-bottle');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [duration, setDuration] = useState(30);
  const [loading, setLoading] = useState(false);

  const farmer = mockFarmers.find((f) => f.id === selectedFarmer) || mockFarmers[0];
  const product = mockProducts.find((p) => p.id === selectedProduct) || mockProducts[0];

  const estimatedBill = calcBillEstimate(product.price, capacity, frequency, duration);

  const handleConfirm = async () => {
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('🥛 Daily Milk Subscription Confirmed!', `Your recurring request for ${product.name} has been placed with ${farmer.name}.`);
    setLoading(false);
    navigate('/customer/subscriptions');
  };

  return (
    <CustomerLayout>
      <div className="milk-request-page">
        {/* Banner */}
        <div className="milk-wizard-banner card">
          <div className="flex items-center gap-3">
            <span className="text-4xl">🥛</span>
            <div>
              <h1 className="text-xl font-bold text-primary">Daily Farm Milk Subscription Wizard</h1>
              <p className="text-xs text-muted">Set up doorstep delivery for pure cow, A2 Gir, or buffalo milk directly from verified local dairy farms</p>
            </div>
          </div>
          <div className="purity-seal-pill hide-mobile">✓ 100% Purity Guaranteed</div>
        </div>

        {/* Wizard Steps */}
        <div className="wizard-steps">
          {[
            { num: 1, label: '1. Select Dairy Farmer' },
            { num: 2, label: '2. Choose Milk Variant' },
            { num: 3, label: '3. Delivery Slot & Packaging' },
            { num: 4, label: '4. Summary & Bill' },
          ].map((s) => (
            <div key={s.num} className={`wizard-step ${step === s.num ? 'active' : ''} ${step > s.num ? 'done' : ''}`}>
              <div className="wizard-step-circle">{step > s.num ? '✓' : s.num}</div>
              <span className="wizard-step-label">{s.label}</span>
            </div>
          ))}
        </div>

        <div className="wizard-content card">
          <div className="card-body">
            {/* Step 1: Select Farmer */}
            {step === 1 && (
              <div className="wizard-step-panel anim-fade-in">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-bold text-primary">Step 1: Choose Your Verified Local Dairy Farmer</h2>
                  <span className="text-xs text-green font-semibold">📍 Near Dindigul & Surrounding Region</span>
                </div>
                <div className="farmer-select-grid">
                  {mockFarmers.map((f) => (
                    <div
                      key={f.id}
                      className={`farmer-card-item ${selectedFarmer === f.id ? 'selected' : ''}`}
                      onClick={() => setSelectedFarmer(f.id)}
                    >
                      <div className="avatar avatar-lg avatar-green">{f.name.charAt(0)}</div>
                      <div className="farmer-card-details">
                        <div className="font-bold text-base text-primary">{f.name}</div>
                        <div className="text-xs text-muted">🏡 {f.farm}</div>
                        <div className="text-xs text-green font-semibold mt-1">📍 {f.location} ({f.distance})</div>
                        <div className="flex items-center gap-2 mt-1 text-xs">
                          <span className="text-gold font-bold">★ {f.rating}</span>
                          <span className="text-muted">• {f.dairyCows} Dairy Cows</span>
                          <span className="text-secondary">• Fat: {f.fatAverage}</span>
                        </div>
                      </div>
                      <div className="farmer-select-radio">
                        <input type="radio" checked={selectedFarmer === f.id} onChange={() => setSelectedFarmer(f.id)} readOnly />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Choose Milk Variant */}
            {step === 2 && (
              <div className="wizard-step-panel anim-fade-in">
                <h2 className="text-lg font-bold text-primary mb-1">Step 2: Select Fresh Milk Variant</h2>
                <p className="text-xs text-muted mb-4">Chilled to 4°C immediately after morning milking. Zero additives or processing.</p>

                <div className="milk-type-grid">
                  {mockProducts.filter((p) => p.category === 'milk').map((p) => (
                    <div
                      key={p.id}
                      className={`milk-type-card ${selectedProduct === p.id ? 'selected' : ''}`}
                      onClick={() => setSelectedProduct(p.id)}
                    >
                      <div className="milk-card-top flex justify-between w-full">
                        <span className="text-4xl">{p.emoji}</span>
                        {p.isA2 && <span className="badge a2-badge">✨ A2 Pure</span>}
                      </div>
                      <div className="font-bold text-base mt-2 text-primary">{p.name}</div>
                      <div className="text-xs text-muted mb-2">ID: {p.id}</div>
                      <div className="text-xl font-extrabold text-green">{formatCurrency(p.price)} / {p.unit}</div>

                      <div className="milk-specs-box mt-3 w-full bg-cream p-2 rounded text-xs text-left">
                        <div>🧪 <strong>{p.fatContent}</strong> • <strong>{p.snfContent}</strong></div>
                        <div className="text-muted mt-1">🕒 {p.milkingSlot}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="form-group mt-6">
                  <label className="form-label font-bold">Daily Milk Quantity (Liters)</label>
                  <div className="flex items-center gap-3">
                    {[0.5, 1, 1.5, 2, 3].map((val) => (
                      <button
                        key={val}
                        type="button"
                        className={`config-preset ${capacity === val ? 'active' : ''}`}
                        onClick={() => setCapacity(val)}
                      >
                        {val} Liters {val === 1 ? '(Standard Family)' : ''}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Schedule & Slot */}
            {step === 3 && (
              <div className="wizard-step-panel anim-fade-in">
                <h2 className="text-lg font-bold text-primary mb-4">Step 3: Delivery Timing, Slot & Packaging</h2>
                <div className="grid grid-2 gap-6">
                  <div className="form-group">
                    <label className="form-label font-bold">Subscription Frequency</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'daily', title: '🥛 Daily Delivery', desc: 'Fresh milk delivered every single morning/evening' },
                        { id: 'alternate', title: '📆 Alternate Days', desc: 'Delivered every 2 days' },
                        { id: 'weekly', title: '📅 Weekly Selected Days', desc: 'Choose specific days of the week' },
                      ].map((freq) => (
                        <button
                          key={freq.id}
                          type="button"
                          className={`config-option text-left ${frequency === freq.id ? 'active' : ''}`}
                          onClick={() => setFrequency(freq.id)}
                        >
                          <div className="font-semibold">{freq.title}</div>
                          <div className="config-option-sub">{freq.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Doorstep Time Slot</label>
                    <div className="flex flex-col gap-2">
                      {[
                        { id: 'morning', title: '🌅 Morning Slot', desc: '6:00 AM - 7:30 AM (Ideal for Tea & Breakfast)' },
                        { id: 'evening', title: '🌇 Evening Slot', desc: '5:00 PM - 6:30 PM (Fresh Evening Milking)' },
                        { id: 'morning-evening', title: '☀️ Both Slots', desc: 'Split total quantity between morning & evening' },
                      ].map((slot) => (
                        <button
                          key={slot.id}
                          type="button"
                          className={`config-option text-left ${deliveryTime === slot.id ? 'active' : ''}`}
                          onClick={() => setDeliveryTime(slot.id)}
                        >
                          <div className="font-semibold">{slot.title}</div>
                          <div className="config-option-sub">{slot.desc}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid grid-2 gap-6 mt-6">
                  <div className="form-group">
                    <label className="form-label font-bold">Preferred Eco Packaging</label>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        className={`config-option text-left ${packaging === 'glass-bottle' ? 'active' : ''}`}
                        onClick={() => setPackaging('glass-bottle')}
                      >
                        <div className="font-semibold">🍾 Sterilized Glass Bottle</div>
                        <div className="config-option-sub">Reusable & Eco Friendly</div>
                      </button>
                      <button
                        type="button"
                        className={`config-option text-left ${packaging === 'sealed-pouch' ? 'active' : ''}`}
                        onClick={() => setPackaging('sealed-pouch')}
                      >
                        <div className="font-semibold">🥛 Food-Grade Sealed Pouch</div>
                        <div className="config-option-sub">Hygienic Tamper Proof</div>
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label font-bold">Subscription Start Date</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Summary & Bill */}
            {step === 4 && (
              <div className="wizard-step-panel anim-fade-in">
                <h2 className="text-lg font-bold text-primary mb-4">Step 4: Review Milk Subscription & Monthly Invoice</h2>
                <div className="summary-box">
                  <div className="summary-row"><span>Dairy Farmer:</span><strong>{farmer.name} ({farmer.farm})</strong></div>
                  <div className="summary-row"><span>Farm Location:</span><strong>{farmer.location} ({farmer.distance})</strong></div>
                  <div className="summary-row"><span>Milk Type:</span><strong>{product.name} ({product.fatContent})</strong></div>
                  <div className="summary-row"><span>Price per Liter:</span><strong>{formatCurrency(product.price)} / L</strong></div>
                  <div className="summary-row"><span>Daily Quantity:</span><strong>{capacity} Liters</strong></div>
                  <div className="summary-row"><span>Delivery Slot:</span><strong className="capitalize">{deliveryTime} Slot (Before 7:30 AM)</strong></div>
                  <div className="summary-row"><span>Packaging:</span><strong className="capitalize">{packaging.replace('-', ' ')}</strong></div>
                  <div className="summary-row"><span>Start Date:</span><strong>{startDate}</strong></div>
                  <div className="divider" />
                  <div className="summary-total-row">
                    <span>Estimated Monthly Invoice (30 Days):</span>
                    <span className="summary-total-price">{formatCurrency(estimatedBill)}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">Billing is post-supplied per day. You can pause or modify delivery anytime.</div>
                </div>
              </div>
            )}

            {/* Footer Navigation */}
            <div className="wizard-footer flex justify-between mt-8">
              {step > 1 ? (
                <button className="btn btn-secondary" onClick={() => setStep(step - 1)}>← Previous</button>
              ) : (
                <Link to="/customer/products" className="btn btn-ghost">Cancel</Link>
              )}

              {step < 4 ? (
                <button className="btn btn-primary btn-lg" onClick={() => setStep(step + 1)}>Next Step →</button>
              ) : (
                <button className="btn btn-gold btn-lg" onClick={handleConfirm} disabled={loading}>
                  {loading ? '⟳ Confirming Subscription…' : '🥛 Confirm Daily Milk Subscription'}
                </button>
              )}
            </div>

          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
