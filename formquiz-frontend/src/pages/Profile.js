import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';

const SIDEBAR_SECTIONS = [
  { label: 'Profile', group: 'Settings' },
  { label: 'Account', group: 'Settings' },
  { label: 'Privacy', group: 'Settings' },
  { label: 'Terms of Service', group: 'Legal' },
  { label: 'Privacy Policy', group: 'Legal' },
  { label: 'Cookie Policy', group: 'Legal' },
  { label: 'Log out', group: 'Account' },
  { label: 'Delete Account', group: 'Account' },
];

const Profile = () => {
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('Profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const toast = useToast();
  const navigate = useNavigate();

  // Simulated stats (replace with real fetch if needed)
  const [stats, setStats] = useState({ level: 1, quizzes: 0, achievements: 0 });

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            name: user.user_metadata?.name || '',
            email: user.email,
          });
        }
        // Fetch stats (replace with real fetch if needed)
        setStats({ level: 1, quizzes: 0, achievements: 0 });
      } catch (err) {
        toast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Update name
      const { error: metaError } = await supabase.auth.updateUser({
        data: { name: profile.name },
      });
      if (metaError) throw metaError;
      // Update password if provided
      if (password) {
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;
      }
      toast('Profile updated!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Sidebar content (left)
  const sidebar = (
    <div style={{
      width: 280,
      minHeight: '100vh',
      background: 'linear-gradient(120deg, #ede9fe 60%, #f8fafc 100%)',
      boxShadow: '2px 0 16px #a5b4fc11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 18px 32px 18px',
      position: 'relative',
      zIndex: 2,
      height: '100vh',
      gap: 0,
    }}>
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          alignSelf: 'flex-start',
          background: '#ede9fe',
          color: '#5b21b6',
          border: 'none',
          borderRadius: 8,
          padding: '10px 22px',
          fontWeight: 700,
          fontSize: 16,
          cursor: 'pointer',
          boxShadow: '0 2px 8px #a5b4fc22',
          marginBottom: 32,
          transition: 'background 0.2s, color 0.2s',
        }}
        onMouseOver={e => { e.target.style.background = '#c7d2fe'; e.target.style.color = '#3730a3'; }}
        onMouseOut={e => { e.target.style.background = '#ede9fe'; e.target.style.color = '#5b21b6'; }}
      >
        ← Dashboard
      </button>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#5b21b6', marginBottom: 2 }}>{profile.name || 'Your Name'}</div>
        <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 14 }}>{profile.email}</div>
      </div>
      <div style={{ width: '100%', margin: '22px 0 10px 0', borderTop: '1.5px solid #e0e0e0' }} />
      {/* Settings group */}
      <div style={{ width: '100%', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 10, fontSize: 16 }}>Settings</div>
        {SIDEBAR_SECTIONS.filter(s => s.group === 'Settings').map(({ label }) => (
          <div
            key={label}
            onClick={() => setSelectedSection(label)}
            style={{
              color: selectedSection === label ? '#5b21b6' : '#444',
              fontSize: 15,
              marginBottom: 8,
              cursor: 'pointer',
              opacity: 0.88,
              borderRadius: 6,
              padding: '7px 10px',
              background: selectedSection === label ? '#ede9fe' : 'transparent',
              fontWeight: selectedSection === label ? 700 : 500,
              transition: 'background 0.18s, color 0.18s',
            }}
            onMouseOver={e => { e.target.style.background = '#ede9fe'; e.target.style.color = '#5b21b6'; }}
            onMouseOut={e => { if (selectedSection !== label) { e.target.style.background = 'transparent'; e.target.style.color = '#444'; }}}
          >
            {label}
          </div>
        ))}
        {/* View Plans button */}
        <div
          onClick={() => navigate('/plan')}
          style={{
            color: '#6366f1',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
            opacity: 0.95,
            borderRadius: 6,
            padding: '7px 10px',
            background: '#f3f4f6',
            marginTop: 8,
            marginBottom: 8,
            transition: 'background 0.18s, color 0.18s',
            boxShadow: '0 1px 4px #a5b4fc11',
          }}
          onMouseOver={e => { e.target.style.background = '#ede9fe'; e.target.style.color = '#5b21b6'; }}
          onMouseOut={e => { e.target.style.background = '#f3f4f6'; e.target.style.color = '#6366f1'; }}
        >
          View Plans
        </div>
      </div>
      {/* Legal group */}
      <div style={{ width: '100%', marginBottom: 18 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 10, fontSize: 16 }}>Legal</div>
        {SIDEBAR_SECTIONS.filter(s => s.group === 'Legal').map(({ label }) => (
          <div
            key={label}
            onClick={() => setSelectedSection(label)}
            style={{
              color: selectedSection === label ? '#5b21b6' : '#444',
              fontSize: 15,
              marginBottom: 8,
              cursor: 'pointer',
              opacity: 0.88,
              borderRadius: 6,
              padding: '7px 10px',
              background: selectedSection === label ? '#ede9fe' : 'transparent',
              fontWeight: selectedSection === label ? 700 : 500,
              transition: 'background 0.18s, color 0.18s',
            }}
            onMouseOver={e => { e.target.style.background = '#ede9fe'; e.target.style.color = '#5b21b6'; }}
            onMouseOut={e => { if (selectedSection !== label) { e.target.style.background = 'transparent'; e.target.style.color = '#444'; }}}
          >
            {label}
          </div>
        ))}
      </div>
      {/* Account group */}
      <div style={{ width: '100%', marginTop: 'auto', marginBottom: 0 }}>
        <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 10, fontSize: 16 }}>Account</div>
        <div
          style={{
            color: '#e11d48',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            marginBottom: 10,
            opacity: 0.93,
            borderRadius: 6,
            padding: '7px 10px',
            transition: 'background 0.18s, color 0.18s',
            background: selectedSection === 'Log out' ? '#fee2e2' : 'transparent',
          }}
          onClick={async () => { setSelectedSection('Log out'); await supabase.auth.signOut(); navigate('/login'); }}
          onMouseOver={e => { e.target.style.background = '#fee2e2'; e.target.style.color = '#b91c1c'; }}
          onMouseOut={e => { if (selectedSection !== 'Log out') { e.target.style.background = 'transparent'; e.target.style.color = '#e11d48'; }}}
        >
          Log out
        </div>
        <div
          style={{
            color: '#b91c1c',
            fontWeight: 600,
            fontSize: 15,
            cursor: 'pointer',
            opacity: 0.85,
            borderRadius: 6,
            padding: '7px 10px',
            transition: 'background 0.18s, color 0.18s',
            background: selectedSection === 'Delete Account' ? '#fee2e2' : 'transparent',
          }}
          onClick={() => setShowDeleteModal(true)}
          onMouseOver={e => { e.target.style.background = '#fee2e2'; e.target.style.color = '#7f1d1d'; }}
          onMouseOut={e => { if (selectedSection !== 'Delete Account') { e.target.style.background = 'transparent'; e.target.style.color = '#b91c1c'; }}}
        >
          Delete Account
        </div>
      </div>
    </div>
  );

  // Main content (right)
  let mainContent;
  if (selectedSection === 'Profile') {
    mainContent = (
      <div style={{ display: 'flex', gap: 48, alignItems: 'flex-start', justifyContent: 'center', width: '100%' }}>
        {/* Left: Profile Form & Stats */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 520 }}>
          <div style={{ marginBottom: 32, textAlign: 'left' }}>
            <div style={{ fontWeight: 900, fontSize: 32, color: '#5b21b6', marginBottom: 4 }}>Welcome, {profile.name || 'User'}!</div>
            <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 18, marginBottom: 8 }}>This is your personal profile hub. Complete your profile for a better experience!</div>
            <div style={{ color: '#7c3aed', fontWeight: 600, fontSize: 16, marginBottom: 0 }}>Profile Completion: <span style={{ color: '#6366f1' }}>80%</span></div>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 36 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#7c3aed', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🎉 Level {stats.level}</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#6366f1', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🚀 {stats.quizzes} Quizzes</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#5b21b6', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🏆 {stats.achievements} Achievements</div>
          </div>
          <form onSubmit={handleSave} style={{ zIndex: 1, position: 'relative', maxWidth: 480 }}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontWeight: 800, fontSize: 18 }}>Name</label>
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                style={{ width: '100%', padding: 16, borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 18, marginTop: 8, background: '#fff' }}
                disabled={loading}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontWeight: 800, fontSize: 18 }}>Email</label>
              <input
                type="email"
                value={profile.email}
                disabled
                style={{ width: '100%', padding: 16, borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 18, marginTop: 8, background: '#f3f4f6' }}
              />
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontWeight: 800, fontSize: 18 }}>New Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: 16, borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 18, marginTop: 8, background: '#fff' }}
                placeholder="Leave blank to keep current password"
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 10, padding: '18px 0', fontWeight: 900, fontSize: 20, cursor: 'pointer', width: '100%', boxShadow: '0 2px 8px #6366f122', transition: 'background 0.2s', marginTop: 12, letterSpacing: '0.03em' }}
              disabled={loading}
              onMouseOver={e => { e.target.style.background = '#4338ca'; }}
              onMouseOut={e => { e.target.style.background = '#6366f1'; }}
            >
              {loading ? <Spinner size={24} /> : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    );
  } else if (selectedSection === 'Account') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Account Settings</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Manage your account preferences, security, and connected services here.</p>
        <ul style={{ color: '#444', fontSize: 16, lineHeight: 1.7 }}>
          <li>Change email or password</li>
          <li>Enable two-factor authentication</li>
          <li>Connect social accounts</li>
          <li>Delete account</li>
        </ul>
      </div>
    );
  } else if (selectedSection === 'Privacy') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Privacy Settings</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Manage your privacy and data sharing preferences.</p>
        <ul style={{ color: '#444', fontSize: 16, lineHeight: 1.7 }}>
          <li>Profile visibility (coming soon)</li>
          <li>Data download (coming soon)</li>
          <li>Ad preferences (coming soon)</li>
        </ul>
        <div style={{ color: '#888', fontSize: 14, marginTop: 18 }}>
          We collect only the data necessary to provide and improve our services. You can request a copy of your data or delete your account at any time. For more details, see our Privacy Policy.
        </div>
      </div>
    );
  } else if (selectedSection === 'Terms of Service') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Terms of Service</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Read our terms and conditions for using this platform.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>1. Acceptance of Terms</h3>
          <p>By using this platform, you agree to abide by these terms and all applicable laws and regulations.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>2. User Responsibilities</h3>
          <p>You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>3. Content</h3>
          <p>You retain ownership of your content but grant us a license to use, display, and distribute it as necessary to provide the service.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>4. Prohibited Conduct</h3>
          <p>You agree not to misuse the platform, including but not limited to spamming, hacking, or violating any laws.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>5. Termination</h3>
          <p>We reserve the right to suspend or terminate your account for violations of these terms.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>6. Limitation of Liability</h3>
          <p>We are not liable for any damages arising from your use of the platform.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>7. Changes to Terms</h3>
          <p>We may update these terms at any time. Continued use of the platform constitutes acceptance of the new terms.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>8. Contact</h3>
          <p>If you have questions, contact us at support@yourdomain.com.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Privacy Policy') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Privacy Policy</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Learn how we handle your data and privacy.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>1. Data Collection</h3>
          <p>We collect information you provide (such as name, email, and quiz data) and usage data (such as device and log information).</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>2. Data Usage</h3>
          <p>We use your data to provide, maintain, and improve our services, and to communicate with you.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>3. Data Sharing</h3>
          <p>We do not sell your data. We may share data with service providers as necessary to operate the platform.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>4. Data Security</h3>
          <p>We use industry-standard security measures to protect your data.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>5. Your Rights</h3>
          <p>You can access, update, or delete your data at any time. Contact us for assistance.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>6. Cookies</h3>
          <p>We use cookies to enhance your experience. See our Cookie Policy for details.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>7. Contact</h3>
          <p>If you have questions, contact us at privacy@yourdomain.com.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Cookie Policy') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Cookie Policy</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>How we use cookies and similar technologies.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <h3 style={{ fontWeight: 700, marginBottom: 8 }}>1. What Are Cookies?</h3>
          <p>Cookies are small text files stored on your device to help us improve your experience.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>2. How We Use Cookies</h3>
          <p>We use cookies for authentication, analytics, and to remember your preferences.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>3. Managing Cookies</h3>
          <p>You can manage or disable cookies in your browser settings, but some features may not work as intended.</p>
          <h3 style={{ fontWeight: 700, marginBottom: 8, marginTop: 16 }}>4. Contact</h3>
          <p>If you have questions, contact us at privacy@yourdomain.com.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Delete Account') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#b91c1c', marginBottom: 18 }}>Delete Account</h2>
        <p style={{ color: '#e11d48', fontWeight: 600, fontSize: 17, marginBottom: 18 }}>Warning: This action is irreversible!</p>
        <button style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 10, padding: '16px 32px', fontWeight: 900, fontSize: 18, cursor: 'pointer', marginTop: 12, letterSpacing: '0.03em' }} onClick={() => setShowDeleteModal(true)}>Delete My Account</button>
        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(30,34,45,0.18)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 32, minWidth: 360, maxWidth: 400, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h3 style={{ fontWeight: 900, fontSize: 22, color: '#b91c1c', marginBottom: 12 }}>Confirm Account Deletion</h3>
              <p style={{ color: '#e11d48', fontWeight: 600, fontSize: 16, marginBottom: 18, textAlign: 'center' }}>
                Are you sure you want to permanently delete your account? This action cannot be undone.<br />
                Please type <span style={{ fontWeight: 900 }}>DELETE</span> to confirm.
              </p>
              <input
                type="text"
                value={deleteInput}
                onChange={e => { setDeleteInput(e.target.value); setDeleteError(''); }}
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1.5px solid #e0e0e0', fontSize: 16, marginBottom: 12 }}
                placeholder="Type DELETE to confirm"
                autoFocus
              />
              {deleteError && <div style={{ color: '#b91c1c', fontSize: 14, marginBottom: 8 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                <button
                  style={{ flex: 1, background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }}
                  onClick={() => { setShowDeleteModal(false); setDeleteInput(''); setDeleteError(''); }}
                >
                  Cancel
                </button>
                <button
                  style={{ flex: 1, background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 900, fontSize: 16, cursor: 'pointer' }}
                  onClick={async () => {
                    if (deleteInput !== 'DELETE') {
                      setDeleteError('You must type DELETE to confirm.');
                      return;
                    }
                    try {
                      // Delete all user data from relevant tables
                      const { data: { user } } = await supabase.auth.getUser();
                      if (user) {
                        await supabase.from('forms').delete().eq('user_id', user.id);
                        await supabase.from('quizzes').delete().eq('user_id', user.id);
                        await supabase.from('responses').delete().eq('user_id', user.id);
                        await supabase.from('user_stats').delete().eq('user_id', user.id);
                        await supabase.from('profiles').delete().eq('id', user.id);
                        // Delete from auth
                        await supabase.auth.admin.deleteUser(user.id);
                        toast('Account deleted successfully.', 'success');
                        setTimeout(() => {
                          navigate('/login');
                        }, 1200);
                      }
                    } catch (err) {
                      setDeleteError('Failed to delete account. Please try again.');
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const main = (
    <div style={{ flex: 1, padding: '60px 60px 40px 60px', minWidth: 0, position: 'relative', height: '100vh', overflowY: 'auto' }}>
      {mainContent}
    </div>
  );

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(120deg, #f8fafc 60%, #ede9fe 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'row',
      overflow: 'hidden',
      position: 'relative',
    }}>
      {sidebar}
      {main}
    </div>
  );
};

export default Profile; 