import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { AvatarCreator } from '@readyplayerme/react-avatar-creator';

const READY_PLAYER_ME_SUBDOMAIN = 'demo'; // Replace with your subdomain if you have one

const SIDEBAR_SECTIONS = [
  { label: 'Profile', group: 'Settings' },
  { label: 'Account', group: 'Settings' },
  { label: 'Notifications', group: 'Settings' },
  { label: 'Privacy', group: 'Settings' },
  { label: 'Terms of Service', group: 'Legal' },
  { label: 'Privacy Policy', group: 'Legal' },
  { label: 'Cookie Policy', group: 'Legal' },
  { label: 'Log out', group: 'Account' },
  { label: 'Delete Account', group: 'Account' },
];

const Profile = () => {
  const [profile, setProfile] = useState({ name: '', email: '', avatarUrl: '' });
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAvatarCreator, setShowAvatarCreator] = useState(false);
  const [selectedSection, setSelectedSection] = useState('Profile');
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            name: user.user_metadata?.name || '',
            email: user.email,
            avatarUrl: user.user_metadata?.avatarUrl || '',
          });
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
      // Update name and avatarUrl
      const { error: metaError } = await supabase.auth.updateUser({
        data: { name: profile.name, avatarUrl: profile.avatarUrl },
      });
      if (metaError) throw metaError;
      // Update password if provided
      if (password) {
        const { error: passError } = await supabase.auth.updateUser({ password });
        if (passError) throw passError;
      }
      toast("Profile updated! Don't forget to save your profile.", 'success');
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarExported = (event) => {
    setProfile((p) => ({ ...p, avatarUrl: event.data.url }));
    setShowAvatarCreator(false);
    toast("Avatar updated! Don't forget to save your profile.", 'success');
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
      <div
        style={{
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 2px 12px #a5b4fc22',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          border: '3px solid #ede9fe',
          cursor: 'pointer',
          transition: 'box-shadow 0.3s',
        }}
        onClick={() => setShowAvatarCreator(true)}
        title="Click to edit your 3D avatar!"
      >
        {profile.avatarUrl ? (
          <iframe
            title="3D Avatar"
            src={`https://demo.readyplayer.me/avatar?url=${encodeURIComponent(profile.avatarUrl)}&frameApi&bodyType=fullbody`}
            style={{ width: '100px', height: '100px', border: 'none', background: 'transparent', borderRadius: '50%' }}
            allow="camera; microphone; clipboard-read; clipboard-write"
          />
        ) : (
          <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>No 3D Avatar</div>
        )}
        <span style={{ position: 'absolute', bottom: -16, left: '50%', transform: 'translateX(-50%)', fontSize: 12, color: '#7c3aed', opacity: 0.8, fontWeight: 500 }}>
          Edit
        </span>
      </div>
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
          onClick={() => { setSelectedSection('Log out'); supabase.auth.signOut(); navigate('/login'); }}
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
          onClick={() => setSelectedSection('Delete Account')}
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
            <div style={{ color: '#6366f1', fontWeight: 500, fontSize: 18, marginBottom: 8 }}>This is your personal profile hub. Complete your profile and customize your avatar for a better experience!</div>
            <div style={{ color: '#7c3aed', fontWeight: 600, fontSize: 16, marginBottom: 0 }}>Profile Completion: <span style={{ color: '#6366f1' }}>80%</span></div>
          </div>
          <div style={{ display: 'flex', gap: 24, marginBottom: 36 }}>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#7c3aed', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🎉 Level 1</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#6366f1', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🚀 0 Quizzes</div>
            <div style={{ background: '#fff', borderRadius: 12, padding: '14px 28px', fontWeight: 700, color: '#5b21b6', fontSize: 18, boxShadow: '0 1px 4px #a5b4fc11' }}>🏆 0 Achievements</div>
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
        {/* Right: 3D Avatar & Customization */}
        <div style={{ minWidth: 340, maxWidth: 400, flex: '0 0 380px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', position: 'relative' }}>
          <div style={{
            width: 260,
            height: 340,
            background: 'rgba(255,255,255,0.55)',
            borderRadius: 32,
            boxShadow: '0 8px 32px 0 #a5b4fc33, 0 1.5px 6px #7c3aed22',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            position: 'relative',
            overflow: 'hidden',
            border: '2.5px solid #ede9fe',
            transition: 'box-shadow 0.3s',
            animation: 'floaty 3.5s ease-in-out infinite',
          }}>
            {profile.avatarUrl ? (
              <iframe
                title="3D Avatar"
                src={`https://demo.readyplayer.me/avatar?url=${encodeURIComponent(profile.avatarUrl)}&frameApi&bodyType=fullbody`}
                style={{ width: '220px', height: '320px', border: 'none', background: 'transparent', borderRadius: 28, boxShadow: '0 2px 12px #a5b4fc22' }}
                allow="camera; microphone; clipboard-read; clipboard-write"
              />
            ) : (
              <div style={{ color: '#a5b4fc', fontWeight: 700, fontSize: 18, textAlign: 'center', marginTop: 80 }}>No 3D Avatar</div>
            )}
            {/* Fun floating elements */}
            <div style={{ position: 'absolute', top: 18, right: 18, width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#a5b4fc 60%,#ede9fe 100%)', opacity: 0.18, filter: 'blur(2px)', animation: 'bounce 2.2s infinite alternate' }} />
            <div style={{ position: 'absolute', bottom: 18, left: 18, width: 24, height: 24, borderRadius: '50%', background: 'linear-gradient(135deg,#ede9fe 60%,#a5b4fc 100%)', opacity: 0.13, filter: 'blur(1.5px)', animation: 'bounce2 2.8s infinite alternate' }} />
          </div>
          {/* Customization Panel */}
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <button
              onClick={() => setShowAvatarCreator(true)}
              style={{ background: 'linear-gradient(90deg,#7c3aed 60%,#6366f1 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '12px 32px', fontWeight: 800, fontSize: 18, cursor: 'pointer', boxShadow: '0 2px 8px #7c3aed33', marginBottom: 0, letterSpacing: '0.03em', transition: 'transform 0.18s, box-shadow 0.18s', outline: 'none' }}
              onMouseOver={e => { e.target.style.transform = 'scale(1.07)'; e.target.style.boxShadow = '0 4px 16px #7c3aed44'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 2px 8px #7c3aed33'; }}
            >
              Edit Avatar
            </button>
            <button
              onClick={() => { setProfile(p => ({ ...p, avatarUrl: '' })); toast('Randomized! Click Edit Avatar to create a new look.', 'info'); }}
              style={{ background: 'linear-gradient(90deg,#f472b6 60%,#a5b4fc 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px #f472b633', marginBottom: 0, letterSpacing: '0.03em', transition: 'transform 0.18s, box-shadow 0.18s', outline: 'none', animation: 'bounce3 1.8s infinite alternate' }}
              onMouseOver={e => { e.target.style.transform = 'scale(1.09) rotate(-2deg)'; e.target.style.boxShadow = '0 4px 16px #f472b644'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 2px 8px #f472b633'; }}
            >
              🎲 Randomize
            </button>
            <button
              onClick={() => { if (profile.avatarUrl) { navigator.clipboard.writeText(profile.avatarUrl); toast('Avatar link copied!', 'success'); } }}
              style={{ background: 'linear-gradient(90deg,#6366f1 60%,#a5b4fc 100%)', color: '#fff', border: 'none', borderRadius: 12, padding: '10px 28px', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 2px 8px #6366f133', marginBottom: 0, letterSpacing: '0.03em', transition: 'transform 0.18s, box-shadow 0.18s', outline: 'none' }}
              onMouseOver={e => { e.target.style.transform = 'scale(1.06)'; e.target.style.boxShadow = '0 4px 16px #6366f144'; }}
              onMouseOut={e => { e.target.style.transform = 'scale(1)'; e.target.style.boxShadow = '0 2px 8px #6366f133'; }}
              disabled={!profile.avatarUrl}
            >
              📋 Copy Avatar Link
            </button>
          </div>
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
  } else if (selectedSection === 'Notifications') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Notifications</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Control your notification preferences.</p>
        <ul style={{ color: '#444', fontSize: 16, lineHeight: 1.7 }}>
          <li>Email notifications</li>
          <li>Push notifications</li>
          <li>Quiz reminders</li>
        </ul>
      </div>
    );
  } else if (selectedSection === 'Privacy') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Privacy Settings</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Manage your privacy and data sharing preferences.</p>
        <ul style={{ color: '#444', fontSize: 16, lineHeight: 1.7 }}>
          <li>Profile visibility</li>
          <li>Data download</li>
          <li>Ad preferences</li>
        </ul>
      </div>
    );
  } else if (selectedSection === 'Terms of Service') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Terms of Service</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Read our terms and conditions for using this platform.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam enim, nec dictum ex enim nec urna.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Privacy Policy') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Privacy Policy</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Learn how we handle your data and privacy.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam enim, nec dictum ex enim nec urna.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Cookie Policy') {
    mainContent = (
      <div style={{ maxWidth: 600 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#5b21b6', marginBottom: 18 }}>Cookie Policy</h2>
        <p style={{ color: '#6366f1', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>How we use cookies and similar technologies.</p>
        <div style={{ color: '#444', fontSize: 15, lineHeight: 1.7 }}>
          <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam enim, nec dictum ex enim nec urna.</p>
        </div>
      </div>
    );
  } else if (selectedSection === 'Delete Account') {
    mainContent = (
      <div style={{ maxWidth: 480 }}>
        <h2 style={{ fontWeight: 900, fontSize: 28, color: '#b91c1c', marginBottom: 18 }}>Delete Account</h2>
        <p style={{ color: '#e11d48', fontWeight: 600, fontSize: 17, marginBottom: 18 }}>Warning: This action is irreversible!</p>
        <button style={{ background: '#b91c1c', color: '#fff', border: 'none', borderRadius: 10, padding: '16px 32px', fontWeight: 900, fontSize: 18, cursor: 'pointer', marginTop: 12, letterSpacing: '0.03em' }} onClick={() => toast('Account deletion not implemented.', 'error')}>Delete My Account</button>
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
      {/* Avatar Creator Modal */}
      {showAvatarCreator && (
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
          <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 0, minWidth: 360, minHeight: 480, position: 'relative', width: '90vw', maxWidth: 600, height: '80vh', display: 'flex', flexDirection: 'column' }}>
            <button
              onClick={() => setShowAvatarCreator(false)}
              style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', fontSize: 24, color: '#888', cursor: 'pointer', zIndex: 10 }}
              aria-label="Close Avatar Creator"
            >
              ×
            </button>
            <AvatarCreator
              subdomain={READY_PLAYER_ME_SUBDOMAIN}
              style={{ width: '100%', height: '100%', border: 'none', borderRadius: 18 }}
              config={{ clearCache: true, bodyType: 'fullbody', quickStart: false, language: 'en' }}
              onAvatarExported={handleAvatarExported}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile; 