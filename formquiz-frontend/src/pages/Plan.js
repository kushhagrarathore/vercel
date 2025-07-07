import React from 'react';
import { useNavigate } from 'react-router-dom';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'per month',
    features: [
      'Unlimited quizzes',
      'Basic analytics',
      'Community support',
    ],
    cta: 'Current Plan',
    highlight: false,
    disabled: true,
  },
  {
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    features: [
      'Everything in Free',
      'Advanced analytics',
      'Custom branding',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    highlight: true,
    disabled: false,
  },
  {
    name: 'Business',
    price: '₹1999',
    period: 'per month',
    features: [
      'Everything in Pro',
      'Team management',
      'Dedicated account manager',
      'API access',
    ],
    cta: 'Contact Sales',
    highlight: false,
    disabled: false,
  },
];

const Plan = () => {
  const navigate = useNavigate();

  const handleCTAClick = (plan) => {
    if (plan.disabled) return;
    if (plan.name === 'Business') {
      window.open('mailto:sales@yourdomain.com', '_blank');
    } else {
      alert(`Subscribed to ${plan.name} plan! (Integrate with payment gateway here)`);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f8fafc 60%, #ede9fe 100%)', padding: '60px 0' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
        <h1 style={{ fontWeight: 900, fontSize: 38, color: '#5b21b6', marginBottom: 12, textAlign: 'center' }}>Choose Your Plan</h1>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 20, marginBottom: 40, textAlign: 'center' }}>
          Flexible pricing for every stage. Upgrade anytime.
        </p>
        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              style={{
                background: plan.highlight ? 'linear-gradient(120deg, #ede9fe 60%, #a5b4fc 100%)' : '#fff',
                borderRadius: 18,
                boxShadow: plan.highlight ? '0 4px 24px #a5b4fc33' : '0 2px 12px #a5b4fc11',
                border: plan.highlight ? '2.5px solid #7c3aed' : '1.5px solid #e0e0e0',
                padding: '38px 32px 32px 32px',
                minWidth: 260,
                maxWidth: 320,
                flex: '1 1 280px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                marginBottom: 24,
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: 'absolute',
                  top: 18,
                  right: 18,
                  background: '#7c3aed',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: 8,
                  padding: '4px 14px',
                  letterSpacing: '0.04em',
                  boxShadow: '0 2px 8px #7c3aed33',
                }}>
                  Recommended
                </div>
              )}
              <div style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontWeight: 800, fontSize: 32, color: '#7c3aed', marginBottom: 2 }}>{plan.price}</div>
              <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 16, marginBottom: 18 }}>{plan.period}</div>
              <ul style={{ color: '#444', fontSize: 16, lineHeight: 1.7, marginBottom: 28, width: '100%', paddingLeft: 0, listStyle: 'none' }}>
                {plan.features.map((f) => (
                  <li key={f} style={{ marginBottom: 8, display: 'flex', alignItems: 'center' }}>
                    <span style={{ color: '#7c3aed', fontWeight: 700, marginRight: 8 }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button
                style={{
                  background: plan.disabled ? '#e0e0e0' : '#6366f1',
                  color: plan.disabled ? '#888' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '14px 0',
                  fontWeight: 900,
                  fontSize: 18,
                  cursor: plan.disabled ? 'not-allowed' : 'pointer',
                  width: '100%',
                  boxShadow: '0 2px 8px #6366f122',
                  transition: 'background 0.2s',
                  letterSpacing: '0.03em',
                }}
                disabled={plan.disabled}
                onClick={() => handleCTAClick(plan)}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            style={{ background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px #a5b4fc22', transition: 'background 0.2s, color 0.2s' }}
            onClick={() => navigate('/profile')}
          >
            ← Back to Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default Plan; 