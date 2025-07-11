import React from 'react';

const plans = [
  {
    name: 'Free',
    price: '₹0',
    period: 'per month',
    highlight: false,
    cta: 'Current Plan',
    disabled: true,
    features: {
      'Unlimited quizzes': true,
      'Basic analytics': true,
      'Community support': true,
      'Advanced analytics': false,
      'Custom branding': false,
      'Priority support': false,
      'Team management': false,
      'API access': false,
      'Remove branding': false,
      'Multi-language forms': false,
      'Partial responses': false,
    },
  },
  {
    name: 'Pro',
    price: '₹499',
    period: 'per month',
    highlight: true,
    cta: 'Upgrade to Pro',
    disabled: false,
    features: {
      'Unlimited quizzes': true,
      'Basic analytics': true,
      'Community support': true,
      'Advanced analytics': true,
      'Custom branding': true,
      'Priority support': true,
      'Team management': false,
      'API access': false,
      'Remove branding': true,
      'Multi-language forms': true,
      'Partial responses': true,
    },
  },
  {
    name: 'Business',
    price: '₹1999',
    period: 'per month',
    highlight: false,
    cta: 'Contact Sales',
    disabled: false,
    features: {
      'Unlimited quizzes': true,
      'Basic analytics': true,
      'Community support': true,
      'Advanced analytics': true,
      'Custom branding': true,
      'Priority support': true,
      'Team management': true,
      'API access': true,
      'Remove branding': true,
      'Multi-language forms': true,
      'Partial responses': true,
    },
  },
];

const featureList = [
  'Unlimited quizzes',
  'Basic analytics',
  'Community support',
  'Advanced analytics',
  'Custom branding',
  'Priority support',
  'Team management',
  'API access',
  'Remove branding',
  'Multi-language forms',
  'Partial responses',
];

const check = <span style={{ color: '#22c55e', fontWeight: 700, fontSize: 20 }}>✓</span>;
const dash = <span style={{ opacity: 0.25, fontWeight: 700, fontSize: 20 }}>—</span>;

const Plan = () => {
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(120deg, #f8fafc 60%, #ede9fe 100%)', padding: '60px 0', overflowX: 'auto' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 12px' }}>
        <h1 style={{ fontWeight: 900, fontSize: 38, color: '#5b21b6', marginBottom: 12, textAlign: 'center' }}>Compare Plans</h1>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 20, marginBottom: 40, textAlign: 'center' }}>
          Find the right plan for your team and upgrade anytime.
        </p>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `220px repeat(${plans.length}, 1fr)`,
          background: '#fff',
          borderRadius: 18,
          boxShadow: '0 4px 24px #a5b4fc22',
          overflow: 'auto',
        }}>
          {/* Header Row */}
          <div style={{ borderBottom: '2.5px solid #ede9fe', background: 'transparent' }}></div>
          {plans.map(plan => (
            <div key={plan.name} style={{
              borderBottom: '2.5px solid #ede9fe',
              background: plan.highlight ? 'linear-gradient(120deg, #ede9fe 60%, #a5b4fc 100%)' : '#f8fafc',
              borderTopLeftRadius: plan.highlight ? 18 : 0,
              borderTopRightRadius: plan.highlight ? 18 : 0,
              boxShadow: plan.highlight ? '0 2px 12px #a5b4fc33' : 'none',
              padding: '32px 12px 18px 12px',
              textAlign: 'center',
              position: 'relative',
            }}>
              {plan.highlight && (
                <div style={{
                  position: 'absolute',
                  top: 12,
                  right: 12,
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
              <div style={{ fontWeight: 900, fontSize: 24, color: '#5b21b6', marginBottom: 8 }}>{plan.name}</div>
              <div style={{ fontWeight: 800, fontSize: 32, color: '#7c3aed', marginBottom: 2 }}>{plan.price}</div>
              <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 16, marginBottom: 18 }}>{plan.period}</div>
              <button
                style={{
                  background: plan.disabled ? '#e0e0e0' : '#6366f1',
                  color: plan.disabled ? '#888' : '#fff',
                  border: 'none',
                  borderRadius: 10,
                  padding: '12px 0',
                  fontWeight: 900,
                  fontSize: 16,
                  cursor: plan.disabled ? 'not-allowed' : 'pointer',
                  width: '90%',
                  boxShadow: '0 2px 8px #6366f122',
                  transition: 'background 0.2s',
                  letterSpacing: '0.03em',
                  marginTop: 10,
                }}
                disabled={plan.disabled}
              >
                {plan.cta}
              </button>
            </div>
          ))}
          {/* Feature Rows */}
          {featureList.map(feature => (
            <React.Fragment key={feature}>
              <div style={{
                borderTop: '1.5px solid #ede9fe',
                fontWeight: 700,
                fontSize: 16,
                color: '#444',
                background: '#f8fafc',
                padding: '18px 16px',
                textAlign: 'left',
                minHeight: 48,
                display: 'flex',
                alignItems: 'center',
              }}>{feature}</div>
              {plans.map(plan => (
                <div key={plan.name + feature} style={{
                  borderTop: '1.5px solid #ede9fe',
                  textAlign: 'center',
                  fontSize: 18,
                  background: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 48,
                }}>
                  {plan.features[feature] ? check : dash}
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <button
            style={{ background: '#ede9fe', color: '#5b21b6', border: 'none', borderRadius: 8, padding: '12px 32px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px #a5b4fc22', transition: 'background 0.2s, color 0.2s' }}
            onClick={() => window.history.back()}
          >
            ← Back
          </button>
        </div>
        <div style={{ height: 140 }} />
      </div>
    </div>
  );
};

export default Plan; 