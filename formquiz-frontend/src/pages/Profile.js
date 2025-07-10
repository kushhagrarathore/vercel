import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { FiUser, FiSettings, FiShield, FiFileText, FiLock, FiLogOut, FiTrash2, FiCamera, FiX } from 'react-icons/fi';

const SIDEBAR_SECTIONS = [
  { label: 'Profile', group: 'Settings', icon: <FiUser /> },
  { label: 'Account', group: 'Settings', icon: <FiSettings /> },
  { label: 'Privacy', group: 'Settings', icon: <FiShield /> },
  { label: 'Terms of Service', group: 'Legal', icon: <FiFileText /> },
  { label: 'Privacy Policy', group: 'Legal', icon: <FiFileText /> },
  { label: 'Cookie Policy', group: 'Legal', icon: <FiFileText /> },
  { label: 'Log out', group: 'Account', icon: <FiLogOut /> },
  { label: 'Delete Account', group: 'Account', icon: <FiTrash2 /> },
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
  const [profilePic, setProfilePic] = useState(null);
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Simulated stats (replace with real fetch if needed)
  const [stats, setStats] = useState({ level: 1, quizzes: 0, achievements: 0 });
  const [profileCompletion, setProfileCompletion] = useState(0);

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
          // Fetch stats from user_stats table
          const { data: statsData } = await supabase
            .from('user_stats')
            .select('*')
            .eq('user_id', user.id)
            .single();
          let quizzes = 0, level = 1, achievements = 0;
          if (statsData) {
            quizzes = (statsData.quizzes_created || 0) + (statsData.quizzes_completed || 0);
            level = Math.floor(quizzes / 5) + 1;
            achievements = statsData.achievements || 0;
          }
          setStats({ level, quizzes, achievements });
          // Fetch avatar config from profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_config, email_verified')
            .eq('id', user.id)
            .single();
          // Calculate profile completion
          let completion = 0;
          if (user.user_metadata?.name) completion += 20;
          if (user.email && (profileData?.email_verified || user.email_confirmed_at)) completion += 20;
          if (profileData?.avatar_config && Object.keys(profileData.avatar_config).length > 0) completion += 20;
          if (quizzes > 0) completion += 20;
          if (achievements > 0) completion += 20;
          setProfileCompletion(completion);
          // Fetch profile picture URL if exists
          const { data: profileAvatarData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (profileAvatarData?.avatar_url) setProfilePicUrl(profileAvatarData.avatar_url);
        }
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
      boxShadow: '2px 0 24px #a5b4fc22',
      borderRight: '2px solid #ede9fe',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '48px 18px 32px 18px',
      position: 'relative',
      zIndex: 2,
      height: '100vh',
      gap: 0,
    }}>
      {/* Back to Dashboard Button */}
      <button
        onClick={() => navigate('/dashboard')}
        style={{
          width: '100%',
          background: 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)',
          color: '#fff',
          border: 'none',
          borderRadius: 10,
          padding: '12px 0',
          fontWeight: 800,
          fontSize: 17,
          cursor: 'pointer',
          marginBottom: 24,
          boxShadow: '0 2px 8px #a5b4fc22',
          transition: 'background 0.2s, color 0.2s',
          letterSpacing: '0.01em',
        }}
        onMouseOver={e => { e.target.style.background = 'linear-gradient(90deg, #6366f1 0%, #a084ee 100%)'; }}
        onMouseOut={e => { e.target.style.background = 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)'; }}
      >
        ← Back to Dashboard
      </button>
      {/* Humanoid Icon or Profile Pic */}
      <div style={{
        width: 62,
        height: 62,
        borderRadius: '50%',
        background: profilePicUrl ? 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' : 'linear-gradient(135deg, #a084ee 0%, #4f8cff 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        boxShadow: '0 4px 18px #a5b4fc33, 0 1.5px 6px #a084ee22',
        border: '3px solid #ede9fe',
        position: 'relative',
      }}>
        {profilePicUrl ? (
          <img src={profilePicUrl} alt="Profile" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px #a5b4fc22' }} />
        ) : (
          <FiUser size={32} color="#fff" />
        )}
        {/* Camera/Remove Button */}
        <label htmlFor="profile-pic-upload" style={{ position: 'absolute', bottom: -8, right: -8, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px #a5b4fc22', padding: 4, cursor: 'pointer', border: '1.5px solid #a084ee', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiCamera size={16} color="#7c3aed" />
          <input id="profile-pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
            const file = e.target.files[0];
            if (file) {
              setProfilePic(file);
              // Upload to Supabase Storage
              const fileExt = file.name.split('.').pop();
              const fileName = `${profile.email.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${fileExt}`;
              const { data, error } = await supabase.storage.from('profile-pics').upload(fileName, file, { upsert: true });
              if (!error) {
                const url = supabase.storage.from('profile-pics').getPublicUrl(fileName).publicUrl;
                setProfilePicUrl(url);
                // Save URL to profile
                await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
              }
            }
          }} />
        </label>
        {profilePicUrl && (
          <button onClick={async () => {
            setProfilePicUrl('');
            await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
          }} style={{ position: 'absolute', top: -8, right: -8, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px #a5b4fc22', padding: 4, border: '1.5px solid #a084ee', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Picture">
            <FiX size={14} color="#a084ee" />
          </button>
        )}
      </div>
      <div style={{ textAlign: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 900, fontSize: 22, color: '#5b21b6', marginBottom: 2 }}>{profile.name || 'Your Name'}</div>
        <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          {profile.email}
          {/* Verified badge */}
          {profile.email && <span style={{ marginLeft: 4, color: '#22c55e', fontWeight: 700, fontSize: 15 }} title="Verified">✔</span>}
        </div>
      </div>
      <div style={{ width: '100%', margin: '22px 0 10px 0', borderTop: '1.5px solid #e0e0e0' }} />
      {/* Sidebar Sections with Icons */}
      <div style={{ width: '100%', marginBottom: 18 }}>
        {['Settings', 'Legal', 'Account'].map(group => (
          <div key={group} style={{ marginBottom: 10 }}>
            <div style={{ fontWeight: 700, color: '#7c3aed', marginBottom: 10, fontSize: 16 }}>{group}</div>
            {SIDEBAR_SECTIONS.filter(s => s.group === group).map(({ label, icon }) => (
              <div
                key={label}
                onClick={async () => {
                  if (label === 'Log out') {
                    setSelectedSection(label);
                    setShowLogoutModal(true);
                  } else if (label === 'Delete Account') {
                    setSelectedSection(label);
                    setShowDeleteModal(true);
                  } else if (label === 'View Plans') {
                    navigate('/plan');
                  } else {
                    setSelectedSection(label);
                  }
                }}
                style={{
                  color: selectedSection === label ? '#4f8cff' : '#444',
                  fontSize: 15,
                  marginBottom: 8,
                  cursor: 'pointer',
                  opacity: 0.92,
                  borderRadius: 8,
                  padding: '9px 14px',
                  background: selectedSection === label ? 'rgba(99,102,241,0.08)' : 'transparent',
                  fontWeight: selectedSection === label ? 700 : 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  transition: 'background 0.18s, color 0.18s',
                }}
                onMouseOver={e => { e.target.style.background = '#ede9fe'; e.target.style.color = '#4f8cff'; }}
                onMouseOut={e => { if (selectedSection !== label) { e.target.style.background = 'transparent'; e.target.style.color = '#444'; }}}
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                aria-label={label}
              >
                <span style={{ fontSize: 18, color: selectedSection === label ? '#4f8cff' : '#a084ee', display: 'flex', alignItems: 'center' }}>{icon}</span>
                {label}
              </div>
            ))}
          </div>
        ))}
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
            {/* Profile Completion Progress Bar */}
            <div style={{ margin: '12px 0 24px 0' }}>
              <div style={{ color: '#7c3aed', fontWeight: 600, fontSize: 16, marginBottom: 6 }}>
                Profile Completion: <span style={{ color: '#6366f1' }}>{profileCompletion}%</span>
              </div>
              <div style={{
                width: '100%',
                height: 12,
                background: '#ede9fe',
                borderRadius: 8,
                overflow: 'hidden',
                boxShadow: '0 1px 4px #a5b4fc22'
              }}>
                <div style={{
                  width: `${profileCompletion}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #6D5BFF 0%, #FF6B81 100%)',
                  borderRadius: 8,
                  transition: 'width 0.5s cubic-bezier(.4,2,.6,1)'
                }} />
              </div>
            </div>
          </div>
          {/* Stats Cards with Hover Effects */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 36 }}>
            {[
              { icon: '🎉', label: `Level ${stats.level}`, color: '#7c3aed' },
              { icon: '🚀', label: `${stats.quizzes} Quizzes`, color: '#6366f1' },
              { icon: '🏆', label: `${stats.achievements} Achievements`, color: '#5b21b6' }
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  padding: '18px 32px',
                  fontWeight: 700,
                  color: item.color,
                  fontSize: 20,
                  boxShadow: '0 2px 12px #a5b4fc22',
                  transition: 'transform 0.18s, box-shadow 0.18s',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12
                }}
                onMouseOver={e => {
                  e.currentTarget.style.transform = 'scale(1.06) translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 24px #a5b4fc33';
                }}
                onMouseOut={e => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.boxShadow = '0 2px 12px #a5b4fc22';
                }}
              >
                <span style={{ fontSize: 28 }}>{item.icon}</span>
                {item.label}
              </div>
            ))}
          </div>
          <form onSubmit={handleSave} style={{ zIndex: 1, position: 'relative', maxWidth: 480 }}>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontWeight: 800, fontSize: 18 }}>Name</label>
              {/* Enhanced Input Field Example (Name) */}
              <input
                type="text"
                value={profile.name}
                onChange={e => setProfile(p => ({ ...p, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: 16,
                  borderRadius: 12,
                  border: '1.5px solid #e0e0e0',
                  fontSize: 18,
                  marginTop: 8,
                  background: '#fff',
                  boxShadow: '0 1px 4px #a5b4fc11',
                  transition: 'border 0.2s, box-shadow 0.2s'
                }}
                onFocus={e => {
                  e.target.style.border = '1.5px solid #7c3aed';
                  e.target.style.boxShadow = '0 0 0 2px #ede9fe';
                }}
                onBlur={e => {
                  e.target.style.border = '1.5px solid #e0e0e0';
                  e.target.style.boxShadow = '0 1px 4px #a5b4fc11';
                }}
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
            {/* Animated Gradient Save Button */}
            <button
              type="submit"
              style={{
                background: 'linear-gradient(90deg, #6D5BFF 0%, #FF6B81 100%)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '18px 0',
                fontWeight: 900,
                fontSize: 20,
                cursor: 'pointer',
                width: '100%',
                boxShadow: '0 2px 12px #6D5BFF22',
                transition: 'background 0.2s, transform 0.15s'
              }}
              onMouseOver={e => { e.target.style.transform = 'scale(1.03)'; }}
              onMouseOut={e => { e.target.style.transform = ''; }}
              disabled={loading}
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
      {/* Log out confirmation modal */}
      {showLogoutModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,34,45,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 32, minWidth: 320, maxWidth: 360, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h3 style={{ fontWeight: 900, fontSize: 20, color: '#7c3aed', marginBottom: 12 }}>Confirm Logout</h3>
            <p style={{ color: '#6366f1', fontWeight: 600, fontSize: 15, marginBottom: 18, textAlign: 'center' }}>
              Are you sure you want to log out?
            </p>
            <div style={{ display: 'flex', gap: 12, width: '100%' }}>
              <button style={{ flex: 1, background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
              <button style={{ flex: 1, background: 'linear-gradient(90deg, #4f8cff 0%, #a084ee 100%)', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 900, fontSize: 16, cursor: 'pointer' }} onClick={async () => { setShowLogoutModal(false); await supabase.auth.signOut(); localStorage.clear(); sessionStorage.clear(); navigate('/login'); }}>Log out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 