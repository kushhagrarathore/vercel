import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { FiUser, FiSettings, FiShield, FiFileText, FiLock, FiLogOut, FiTrash2, FiCamera, FiX, FiSun, FiMoon, FiAward, FiActivity } from 'react-icons/fi';

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

const accent = '#6366f1';
const accent2 = '#a084ee';
const danger = '#b91c1c';
const success = '#22c55e';

export default function Profile() {
  const [profile, setProfile] = useState({ name: '', email: '', id: '' });
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
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [stats, setStats] = useState({ level: 1, quizzes: 0, achievements: 0 });
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [emailEdit, setEmailEdit] = useState('');
  const [emailEditMode, setEmailEditMode] = useState(false);
  const [nameEdit, setNameEdit] = useState('');
  const [nameEditMode, setNameEditMode] = useState(false);
  const [passEdit, setPassEdit] = useState('');
  const [passEditMode, setPassEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            name: user.user_metadata?.name || '',
            email: user.email,
            id: user.id,
          });
          setNameEdit(user.user_metadata?.name || '');
          setEmailEdit(user.email);
          // Stats
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
          // Profile completion
          let completion = 0;
          if (user.user_metadata?.name) completion += 20;
          if (user.email && (user.email_confirmed_at)) completion += 20;
          if (quizzes > 0) completion += 20;
          if (achievements > 0) completion += 20;
          // Avatar
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          if (profileData?.avatar_url) {
            setProfilePicUrl(profileData.avatar_url);
            completion += 20;
          }
          setProfileCompletion(completion);
          // Recent activity
          const { data: recent } = await supabase
            .from('quizzes')
            .select('id, title, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(5);
          setRecentActivity(recent || []);
          // Achievements (mock)
          setAchievements([
            ...(achievements > 0 ? [{ label: 'Quiz Master', icon: <FiAward color={success} /> }] : []),
            ...(level > 2 ? [{ label: 'Level Up', icon: <FiActivity color={accent} /> }] : []),
          ]);
        }
      } catch (err) {
        toast('Failed to load profile', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [toast]);

  // Save profile changes
  const handleSave = async () => {
    setSaving(true);
    try {
      if (nameEdit !== profile.name) {
        const { error } = await supabase.auth.updateUser({ data: { name: nameEdit } });
        if (error) throw error;
        setProfile(p => ({ ...p, name: nameEdit }));
      }
      if (emailEdit !== profile.email) {
        const { error } = await supabase.auth.updateUser({ email: emailEdit });
        if (error) throw error;
        setProfile(p => ({ ...p, email: emailEdit }));
      }
      if (passEdit) {
        const { error } = await supabase.auth.updateUser({ password: passEdit });
        if (error) throw error;
        setPassEdit('');
      }
      toast('Profile updated!', 'success');
      setNameEditMode(false);
      setEmailEditMode(false);
      setPassEditMode(false);
    } catch (err) {
      toast(err.message || 'Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Profile picture upload
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfilePic(file);
      const fileExt = file.name.split('.').pop();
      const fileName = `${profile.email.replace(/[^a-zA-Z0-9]/g, '')}_${Date.now()}.${fileExt}`;
      const { data, error } = await supabase.storage.from('profile-pics').upload(fileName, file, { upsert: true });
      if (!error) {
        const url = supabase.storage.from('profile-pics').getPublicUrl(fileName).publicUrl;
        setProfilePicUrl(url);
        await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
        setProfileCompletion(pc => Math.min(pc + 20, 100));
        toast('Profile picture updated!', 'success');
      } else {
        toast('Failed to upload picture', 'error');
      }
    }
  };

  // Remove profile picture
  const handleRemovePic = async () => {
    setProfilePicUrl('');
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', profile.id);
    setProfileCompletion(pc => Math.max(pc - 20, 0));
    toast('Profile picture removed', 'success');
  };

  // Theme toggle
  const handleThemeToggle = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast('Logged out', 'success');
    navigate('/login');
  };

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteInput !== 'DELETE') {
      setDeleteError('You must type DELETE to confirm.');
      return;
    }
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('forms').delete().eq('user_id', user.id);
        await supabase.from('quizzes').delete().eq('user_id', user.id);
        await supabase.from('responses').delete().eq('user_id', user.id);
        await supabase.from('user_stats').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
        await supabase.auth.admin.deleteUser(user.id);
        toast('Account deleted successfully.', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 1200);
      }
    } catch (err) {
      setDeleteError('Failed to delete account. Please try again.');
    }
    setLoading(false);
  };

  // Profile completion tips
  const completionTips = [];
  if (profileCompletion < 100) {
    if (!profile.name) completionTips.push('Add your name');
    if (!profilePicUrl) completionTips.push('Upload a profile picture');
    if (stats.quizzes === 0) completionTips.push('Create or complete a quiz');
    if (stats.achievements === 0) completionTips.push('Earn an achievement');
  }

  // Main content rendering
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: theme === 'dark' ? '#181c24' : '#f8f9fb' }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: theme === 'dark' ? '#23263a' : 'linear-gradient(120deg, #ede9fe 60%, #f8fafc 100%)', boxShadow: '2px 0 24px #a5b4fc22', borderRight: '2px solid #ede9fe', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 18px 32px 18px', position: 'relative', zIndex: 2, height: '100vh', gap: 0 }}>
        <button onClick={() => navigate('/dashboard')} style={{ width: '100%', background: `linear-gradient(90deg, ${accent} 0%, ${accent2} 100%)`, color: '#fff', border: 'none', borderRadius: 10, padding: '12px 0', fontWeight: 800, fontSize: 17, cursor: 'pointer', marginBottom: 24, boxShadow: '0 2px 8px #a5b4fc22', transition: 'background 0.2s, color 0.2s', letterSpacing: '0.01em' }}>← Back to Dashboard</button>
        <div style={{ width: 62, height: 62, borderRadius: '50%', background: profilePicUrl ? 'linear-gradient(135deg, #fff 0%, #f3f4f6 100%)' : `linear-gradient(135deg, ${accent2} 0%, ${accent} 100%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 4px 18px #a5b4fc33, 0 1.5px 6px #a084ee22', border: '3px solid #ede9fe', position: 'relative' }}>
          {profilePicUrl ? (
            <img src={profilePicUrl} alt="Profile" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 2px 8px #a5b4fc22' }} />
          ) : (
            <FiUser size={32} color="#fff" />
          )}
          <label htmlFor="profile-pic-upload" style={{ position: 'absolute', bottom: -8, right: -8, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px #a5b4fc22', padding: 4, cursor: 'pointer', border: `1.5px solid ${accent2}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiCamera size={16} color={accent2} />
            <input id="profile-pic-upload" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleProfilePicUpload} />
          </label>
          {profilePicUrl && (
            <button onClick={handleRemovePic} style={{ position: 'absolute', top: -8, right: -8, background: '#fff', borderRadius: '50%', boxShadow: '0 1px 4px #a5b4fc22', padding: 4, border: `1.5px solid ${accent2}`, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Picture">
              <FiX size={14} color={accent2} />
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 22, color: accent2, marginBottom: 2 }}>{profile.name || 'Your Name'}</div>
          <div style={{ color: accent, fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {profile.email}
            {profile.email && <span style={{ marginLeft: 4, color: success, fontWeight: 700, fontSize: 15 }} title="Verified">✔</span>}
          </div>
        </div>
        <div style={{ width: '100%', margin: '22px 0 10px 0', borderTop: '1.5px solid #e0e0e0' }} />
        <div style={{ width: '100%', marginBottom: 18 }}>
          {['Settings', 'Legal', 'Account'].map(group => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 700, color: accent2, marginBottom: 10, fontSize: 16 }}>{group}</div>
              {SIDEBAR_SECTIONS.filter(s => s.group === group).map(({ label, icon }) => (
                <div
                  key={label}
                  onClick={async () => {
                    if (label === 'Log out') { setSelectedSection(label); setShowLogoutModal(true); }
                    else if (label === 'Delete Account') { setSelectedSection(label); setShowDeleteModal(true); }
                    else if (label === 'View Plans') { navigate('/plan'); }
                    else { setSelectedSection(label); }
                  }}
                  style={{ color: selectedSection === label ? accent : '#444', fontSize: 15, marginBottom: 8, cursor: 'pointer', opacity: 0.92, borderRadius: 8, padding: '9px 14px', background: selectedSection === label ? 'rgba(99,102,241,0.08)' : 'transparent', fontWeight: selectedSection === label ? 700 : 500, display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.18s, color 0.18s' }}
                  onMouseOver={e => { e.target.style.background = '#ede9fe'; e.target.style.color = accent; }}
                  onMouseOut={e => { if (selectedSection !== label) { e.target.style.background = 'transparent'; e.target.style.color = '#444'; }}}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') e.currentTarget.click(); }}
                  aria-label={label}
                >
                  {icon} {label}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', width: '100%' }}>
          <button onClick={handleThemeToggle} style={{ width: '100%', background: theme === 'dark' ? accent : '#fff', color: theme === 'dark' ? '#fff' : accent, border: `2px solid ${accent}`, borderRadius: 10, padding: '10px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer', marginTop: 18, boxShadow: '0 2px 8px #a5b4fc22', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {theme === 'dark' ? <FiSun /> : <FiMoon />} {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
      {/* Main Content */}
      <div style={{ flex: 1, padding: '48px 0 0 0', maxWidth: 700, margin: '0 auto', minHeight: '100vh' }}>
        {loading ? <Spinner /> : (
          <div style={{ padding: '0 32px' }}>
            {/* Profile Completion Bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6 }}>Profile Completion</div>
              <div style={{ width: '100%', height: 16, background: '#ede9fe', borderRadius: 8, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: `${profileCompletion}%`, height: '100%', background: profileCompletion === 100 ? success : accent, borderRadius: 8, transition: 'width 0.4s' }} />
              </div>
              {profileCompletion < 100 && (
                <div style={{ color: danger, fontWeight: 500, fontSize: 15, marginTop: 2 }}>
                  {completionTips.map((tip, i) => <span key={i}>{tip}{i < completionTips.length - 1 ? ', ' : ''}</span>)}
                </div>
              )}
            </div>
            {/* Editable Profile Info */}
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 12px #a5b4fc11', padding: 28, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                <div style={{ fontWeight: 700, fontSize: 20, color: accent2 }}>Profile Info</div>
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#444', fontSize: 15 }}>Name</label><br />
                <input type="text" value={nameEdit} disabled={saving} onChange={e => setNameEdit(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${accent2}`, fontSize: 16, marginTop: 4, marginBottom: 8 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#444', fontSize: 15 }}>Email</label><br />
                <input type="email" value={emailEdit} disabled={saving} onChange={e => setEmailEdit(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${accent2}`, fontSize: 16, marginTop: 4, marginBottom: 8 }} />
              </div>
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#444', fontSize: 15 }}>Password</label><br />
                <input type="password" value={passEdit} disabled={saving} onChange={e => setPassEdit(e.target.value)} placeholder="New password" style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1.5px solid ${accent2}`, fontSize: 16, marginTop: 4, marginBottom: 8 }} />
              </div>
              <button onClick={handleSave} disabled={saving} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 28px', fontWeight: 700, fontSize: 17, cursor: saving ? 'not-allowed' : 'pointer', marginTop: 8 }}>{saving ? 'Saving...' : 'Save Changes'}</button>
            </div>
            {/* Stats & Achievements */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 32, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 180, background: '#f3f4f6', borderRadius: 14, padding: 18, textAlign: 'center', boxShadow: '0 2px 8px #a5b4fc11' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: accent2 }}>Level</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: accent }}>{stats.level}</div>
              </div>
              <div style={{ flex: 1, minWidth: 180, background: '#f3f4f6', borderRadius: 14, padding: 18, textAlign: 'center', boxShadow: '0 2px 8px #a5b4fc11' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: accent2 }}>Quizzes</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: accent }}>{stats.quizzes}</div>
              </div>
              <div style={{ flex: 1, minWidth: 180, background: '#f3f4f6', borderRadius: 14, padding: 18, textAlign: 'center', boxShadow: '0 2px 8px #a5b4fc11' }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: accent2 }}>Achievements</div>
                <div style={{ fontSize: 32, fontWeight: 900, color: accent }}>{stats.achievements}</div>
              </div>
            </div>
            {/* Achievements Badges */}
            {achievements.length > 0 && (
              <div style={{ marginBottom: 32 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: accent2, marginBottom: 8 }}>Achievements</div>
                <div style={{ display: 'flex', gap: 18 }}>
                  {achievements.map((a, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 10, padding: '10px 18px', boxShadow: '0 2px 8px #a5b4fc11', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, color: accent }}>{a.icon} {a.label}</div>
                  ))}
                </div>
              </div>
            )}
            {/* Recent Activity */}
            <div style={{ marginBottom: 32 }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: accent2, marginBottom: 8 }}>Recent Activity</div>
              {recentActivity.length === 0 ? (
                <div style={{ color: '#888', fontWeight: 500 }}>No recent quizzes.</div>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {recentActivity.map(q => (
                    <li key={q.id} style={{ marginBottom: 8, color: accent, fontWeight: 600 }}>{q.title} <span style={{ color: '#888', fontWeight: 400, fontSize: 14 }}>({new Date(q.created_at).toLocaleString()})</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
        {/* Logout Modal */}
        {showLogoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,34,45,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 32, minWidth: 360, maxWidth: 400, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 900, fontSize: 28, color: danger, marginBottom: 18 }}>Log Out</h2>
              <p style={{ color: '#444', fontWeight: 500, fontSize: 17, marginBottom: 18 }}>Are you sure you want to log out?</p>
              <div style={{ display: 'flex', gap: 18, width: '100%' }}>
                <button style={{ flex: 1, background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button style={{ flex: 1, background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 900, fontSize: 16, cursor: 'pointer' }} onClick={handleLogout}>Log Out</button>
              </div>
            </div>
          </div>
        )}
        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(30,34,45,0.18)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#fff', borderRadius: 18, boxShadow: '0 8px 32px rgba(60,60,100,0.13)', padding: 32, minWidth: 360, maxWidth: 400, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 900, fontSize: 28, color: danger, marginBottom: 18 }}>Delete Account</h2>
              <p style={{ color: danger, fontWeight: 600, fontSize: 17, marginBottom: 18 }}>Warning: This action is irreversible!</p>
              <input type="text" value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteError(''); }} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${danger}`, fontSize: 16, marginBottom: 12 }} />
              {deleteError && <div style={{ color: danger, fontSize: 14, marginBottom: 8 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: 18, width: '100%' }}>
                <button style={{ flex: 1, background: '#f3f4f6', color: '#444', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 700, fontSize: 16, cursor: 'pointer' }} onClick={() => { setShowDeleteModal(false); setDeleteInput(''); setDeleteError(''); }}>Cancel</button>
                <button style={{ flex: 1, background: danger, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 900, fontSize: 16, cursor: 'pointer' }} onClick={handleDeleteAccount}>Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 