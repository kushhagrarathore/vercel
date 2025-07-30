import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import Spinner from '../components/Spinner';
import { useToast } from '../components/Toast';
import { FiUser, FiSettings, FiShield, FiFileText, FiLock, FiLogOut, FiTrash2, FiX, FiAward, FiActivity, FiEdit3, FiSave, FiCheck, FiEye, FiEyeOff, FiExternalLink } from 'react-icons/fi';

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
  const [loading, setLoading] = useState(true);
  const [selectedSection, setSelectedSection] = useState('Profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const toast = useToast();
  const navigate = useNavigate();
  const [profilePicUrl, setProfilePicUrl] = useState('');
  const [stats, setStats] = useState({ level: 1, quizzes: 0, achievements: 0 });
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [nameEdit, setNameEdit] = useState('');
  const [nameEditMode, setNameEditMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordEditMode, setPasswordEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [memberSince, setMemberSince] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

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
          
          // Set member since date from user creation
          if (user.created_at) {
            setMemberSince(new Date(user.created_at).toLocaleDateString());
          }
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
          // Avatar - check both profiles table and user metadata
          const { data: profileData } = await supabase
            .from('profiles')
            .select('avatar_url')
            .eq('id', user.id)
            .single();
          
          // Check if avatar_url exists in profiles table
          if (profileData?.avatar_url) {
            setProfilePicUrl(profileData.avatar_url);
            completion += 20;
          } else if (user.user_metadata?.avatar_url) {
            // Fallback to user metadata
            setProfilePicUrl(user.user_metadata.avatar_url);
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

  // Handle name save
  const handleSaveName = async () => {
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        data: { name: nameEdit.trim() } 
      });
      if (error) throw error;
      setProfile(p => ({ ...p, name: nameEdit.trim() }));
      setNameEditMode(false);
      toast('Name updated successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update name', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Handle password save
  const handleSavePassword = async () => {
    if (!newPassword.trim()) {
      toast('Password cannot be empty', 'error');
      return;
    }
    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters', 'error');
      return;
    }
    
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ 
        password: newPassword 
      });
      if (error) throw error;
      setPasswordEditMode(false);
      setNewPassword('');
      setShowPassword(false);
      toast('Password updated successfully!', 'success');
    } catch (err) {
      toast(err.message || 'Failed to update password', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Profile picture upload
  const handleProfilePicUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast('Please select a valid image file (JPEG, PNG, GIF, or WebP)', 'error');
      return;
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast('Image size must be less than 5MB', 'error');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop().toLowerCase();
      const fileName = `${profile.id}_${Date.now()}.${fileExt}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('profile-pics')
        .upload(fileName, file, { 
          upsert: true,
          cacheControl: '3600'
        });

      if (error) {
        console.error('Upload error:', error);
        toast('Failed to upload picture', 'error');
        return;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(fileName);
      
      const url = urlData.publicUrl;
      setProfilePicUrl(url);

      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: url })
        .eq('id', profile.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Try updating user metadata as fallback
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: url }
        });
        
        if (metadataError) {
          console.error('Metadata update error:', metadataError);
          toast('Picture uploaded but failed to save to profile', 'error');
          return;
        }
      }

      setProfileCompletion(pc => Math.min(pc + 20, 100));
      toast('Profile picture updated successfully!', 'success');
    } catch (err) {
      console.error('Profile picture upload error:', err);
      toast('Failed to upload picture', 'error');
    }
  };

  // Remove profile picture
  const handleRemovePic = async () => {
    try {
      setProfilePicUrl('');
      
      // Update profiles table
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ avatar_url: null })
        .eq('id', profile.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        // Try updating user metadata as fallback
        const { error: metadataError } = await supabase.auth.updateUser({
          data: { avatar_url: null }
        });
        
        if (metadataError) {
          console.error('Metadata update error:', metadataError);
          toast('Failed to remove profile picture', 'error');
          return;
        }
      }

      setProfileCompletion(pc => Math.max(pc - 20, 0));
      toast('Profile picture removed successfully', 'success');
    } catch (err) {
      console.error('Remove profile picture error:', err);
      toast('Failed to remove profile picture', 'error');
    }
  };

  // Handle URL input for profile picture
  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      toast('Please enter a valid URL', 'error');
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput.trim());
    } catch {
      toast('Please enter a valid URL', 'error');
      return;
    }

    setUrlLoading(true);
    try {
      const url = urlInput.trim();
      
      // Test if the image loads
      const img = new Image();
      img.onload = async () => {
        // Image loaded successfully, save to database
        setProfilePicUrl(url);
        
        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ avatar_url: url })
          .eq('id', profile.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Try updating user metadata as fallback
          const { error: metadataError } = await supabase.auth.updateUser({
            data: { avatar_url: url }
          });
          
          if (metadataError) {
            console.error('Metadata update error:', metadataError);
            toast('Failed to save profile picture URL', 'error');
            setUrlLoading(false);
            setShowUrlModal(false);
            setUrlInput('');
            return;
          }
        }

        setProfileCompletion(pc => Math.min(pc + 20, 100));
        toast('Profile picture updated successfully!', 'success');
        setUrlLoading(false);
        setShowUrlModal(false);
        setUrlInput('');
      };
      
      img.onerror = () => {
        toast('Invalid image URL. Please check the URL and try again.', 'error');
        setUrlLoading(false);
      };
      
      img.src = url;
    } catch (err) {
      console.error('URL update error:', err);
      toast('Failed to update profile picture', 'error');
      setUrlLoading(false);
    }
  };



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
    setDeleteLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Delete user data from all tables
        await supabase.from('forms').delete().eq('user_id', user.id);
        await supabase.from('quizzes').delete().eq('user_id', user.id);
        await supabase.from('responses').delete().eq('user_id', user.id);
        await supabase.from('user_stats').delete().eq('user_id', user.id);
        await supabase.from('profiles').delete().eq('id', user.id);
        
        // Try to delete user account
        try {
          await supabase.auth.admin.deleteUser(user.id);
        } catch (adminError) {
          // If admin delete fails, just sign out
          await supabase.auth.signOut();
        }
        
        toast('Account deleted successfully.', 'success');
        setTimeout(() => {
          navigate('/login');
        }, 1200);
      }
    } catch (err) {
      setDeleteError('Failed to delete account. Please try again.');
    }
    setDeleteLoading(false);
  };

  // Handle section clicks
  const handleSectionClick = (section) => {
    if (section === 'Log out') {
      setShowLogoutModal(true);
    } else if (section === 'Delete Account') {
      setShowDeleteModal(true);
    } else {
      setSelectedSection(section);
    }
  };

  // Render content based on selected section
  const renderSectionContent = () => {
    switch (selectedSection) {
      case 'Profile':
        return (
          <div style={{ padding: '0 32px' }}>
            {/* Profile Completion Bar */}
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 6, color: '#000000' }}>Profile Completion</div>
              <div style={{ width: '100%', height: 8, background: '#e9ecef', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
                <div style={{ width: `${profileCompletion}%`, height: '100%', background: profileCompletion === 100 ? '#28a745' : '#000000', borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
              {profileCompletion < 100 && (
                <div style={{ color: '#dc3545', fontWeight: 500, fontSize: 14, marginTop: 2 }}>
                  {completionTips.map((tip, i) => <span key={i}>{tip}{i < completionTips.length - 1 ? ', ' : ''}</span>)}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 18 }}>
                <div style={{ fontWeight: 600, fontSize: 18, color: '#000000' }}>Profile Info</div>
              </div>
              
              {/* Name Field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Name</label><br />
                {nameEditMode ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input 
                      type="text" 
                      value={nameEdit} 
                      disabled={saving} 
                      onChange={e => setNameEdit(e.target.value)} 
                      style={{ flex: 1, height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #000000', fontSize: 14, background: '#ffffff' }} 
                    />
                    <button 
                      onClick={handleSaveName} 
                      disabled={saving} 
                      style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: saving ? 'not-allowed' : 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {saving ? <Spinner size={16} /> : <FiCheck size={16} />}
                    </button>
                    <button 
                      onClick={() => { setNameEditMode(false); setNameEdit(profile.name); }} 
                      disabled={saving} 
                      style={{ background: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 12px', cursor: saving ? 'not-allowed' : 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input 
                      type="text" 
                      value={profile.name} 
                      disabled 
                      style={{ flex: 1, height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 14, background: '#f8f9fa' }} 
                    />
                    <button 
                      onClick={() => setNameEditMode(true)} 
                      style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiEdit3 size={16} />
                    </button>
                  </div>
                )}
              </div>

              {/* Email Field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Email</label><br />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                  <input 
                    type="email" 
                    value={profile.email} 
                    disabled 
                    style={{ flex: 1, height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 14, background: '#f8f9fa' }} 
                  />
                  <div style={{ width: 40, height: 40 }}></div>
                </div>
              </div>

              {/* Password Field */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Password</label><br />
                {passwordEditMode ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input 
                      type={showPassword ? "text" : "password"}
                      value={newPassword} 
                      disabled={saving} 
                      onChange={e => setNewPassword(e.target.value)} 
                      placeholder="New password" 
                      style={{ flex: 1, height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #000000', fontSize: 14, background: '#ffffff' }} 
                    />
                    <button 
                      onClick={() => setShowPassword(!showPassword)} 
                      style={{ background: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <FiEye size={16} /> : <FiEyeOff size={16} />}
                    </button>
                    <button 
                      onClick={handleSavePassword} 
                      disabled={saving} 
                      style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: saving ? 'not-allowed' : 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      {saving ? <Spinner size={16} /> : <FiCheck size={16} />}
                    </button>
                    <button 
                      onClick={() => { setPasswordEditMode(false); setNewPassword(''); setShowPassword(false); }} 
                      disabled={saving} 
                      style={{ background: '#f8f9fa', color: '#6c757d', border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 12px', cursor: saving ? 'not-allowed' : 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiX size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
                    <input 
                      type="password" 
                      value="••••••••" 
                      disabled 
                      style={{ flex: 1, height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 14, background: '#f8f9fa' }} 
                    />
                    <button 
                      onClick={() => setPasswordEditMode(true)} 
                      style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', height: 40, width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <FiEdit3 size={16} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Account Statistics */}
            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Account Statistics</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiAward style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Level</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.level}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Current Level</div>
                </div>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiActivity style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Quizzes</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.quizzes}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Total Quizzes</div>
                </div>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiAward style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Achievements</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.achievements}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Earned</div>
                </div>
              </div>
            </div>

            {/* Achievements Badges */}
            {achievements.length > 0 && (
              <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Achievements</h2>
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                  {achievements.map((a, i) => (
                    <div key={i} style={{ background: '#f8f9fa', borderRadius: 8, padding: '12px 16px', border: '1px solid #e9ecef', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 600, color: '#000000' }}>{a.icon} {a.label}</div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Activity */}
            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Recent Activity</h2>
              
              {recentActivity.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000000' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#000000', fontSize: 14 }}>{activity.title}</div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>Created {new Date(activity.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: '#6c757d' }}>
                  <FiActivity style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: 16 }}>No recent activity</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>Start creating quizzes to see your activity here</div>
                </div>
              )}
            </div>
          </div>
        );

      case 'Account':
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Account Settings</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Manage your account preferences and settings</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Account Information</h2>
              
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Account ID</label><br />
                <input 
                  type="text" 
                  value={profile.id} 
                  disabled 
                  style={{ width: '100%', height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 14, marginTop: 4, background: '#f8f9fa' }} 
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Member Since</label><br />
                <input 
                  type="text" 
                  value={memberSince || 'Loading...'} 
                  disabled 
                  style={{ width: '100%', height: 40, padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6', fontSize: 14, marginTop: 4, background: '#f8f9fa' }} 
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Account Status</label><br />
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28a745' }}></div>
                  <span style={{ color: '#28a745', fontWeight: 600, fontSize: 14 }}>Active</span>
                </div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Account Statistics</h2>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiAward style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Level</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.level}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Current Level</div>
                </div>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiActivity style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Quizzes</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.quizzes}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Total Quizzes</div>
                </div>

                <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 20, border: '1px solid #e9ecef' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
                    <FiAward style={{ color: '#000000', fontSize: 18 }} />
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#495057' }}>Achievements</div>
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: '#000000' }}>{stats.achievements}</div>
                  <div style={{ fontSize: 12, color: '#6c757d', marginTop: 4 }}>Earned</div>
                </div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Recent Activity</h2>
              
              {recentActivity.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {recentActivity.slice(0, 5).map((activity, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#f8f9fa', borderRadius: 6, border: '1px solid #e9ecef' }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#000000' }}></div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, color: '#000000', fontSize: 14 }}>{activity.title}</div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>Created {new Date(activity.created_at).toLocaleDateString()}</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 16px', color: '#6c757d' }}>
                  <FiActivity style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }} />
                  <div style={{ fontSize: 16 }}>No recent activity</div>
                  <div style={{ fontSize: 14, marginTop: 4 }}>Start creating quizzes to see your activity here</div>
                </div>
              )}
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Account Security</h2>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Email Verification</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Your email is verified and secure</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28a745' }}></div>
                    <span style={{ color: '#28a745', fontWeight: 600, fontSize: 12 }}>Verified</span>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Two-Factor Authentication</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Add an extra layer of security</div>
                  </div>
                  <button style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    Enable
                  </button>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Login Sessions</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Manage your active sessions</div>
                  </div>
                  <button style={{ background: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    View
                  </button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'Privacy':
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Privacy Settings</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Control your privacy and data preferences</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24, marginBottom: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Data Privacy</h2>
              
              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Profile Visibility</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Allow others to see your profile</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 24 }}>
                    <input type="checkbox" style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: '#dee2e6', borderRadius: 24, transition: '0.3s' }}>
                      <span style={{ position: 'absolute', content: '', height: 18, width: 18, left: 3, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.3s' }}></span>
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Activity Tracking</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Track your quiz and form activity</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 24 }}>
                    <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: '#000000', borderRadius: 24, transition: '0.3s' }}>
                      <span style={{ position: 'absolute', content: '', height: 18, width: 18, left: 29, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.3s' }}></span>
                    </span>
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #e9ecef' }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#495057', fontSize: 14 }}>Email Notifications</div>
                    <div style={{ color: '#6c757d', fontSize: 12, marginTop: 2 }}>Receive email updates about your account</div>
                  </div>
                  <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 24 }}>
                    <input type="checkbox" defaultChecked style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, background: '#000000', borderRadius: 24, transition: '0.3s' }}>
                      <span style={{ position: 'absolute', content: '', height: 18, width: 18, left: 29, bottom: 3, background: 'white', borderRadius: '50%', transition: '0.3s' }}></span>
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 18 }}>Data Management</h2>
              
              <div style={{ marginBottom: 16 }}>
                <button 
                  style={{ background: '#000000', color: '#ffffff', border: 'none', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer', marginRight: 12 }}
                >
                  Download My Data
                </button>
                
                <button 
                  style={{ background: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6', borderRadius: 8, padding: '12px 24px', fontWeight: 600, cursor: 'pointer' }}
                >
                  Request Data Deletion
                </button>
              </div>
              
              <p style={{ color: '#6c757d', fontSize: 14, lineHeight: 1.5 }}>
                You can request a copy of your data or delete specific data from your account. 
                Data deletion requests are processed within 30 days.
              </p>
            </div>
          </div>
        );

      case 'Terms of Service':
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Terms of Service</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>1. Acceptance of Terms</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement. 
                  If you do not agree to abide by the above, please do not use this service.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>2. Use License</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  Permission is granted to temporarily download one copy of the materials (information or software) on this platform 
                  for personal, non-commercial transitory viewing only.
                </p>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  This is the grant of a license, not a transfer of title, and under this license you may not:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>modify or copy the materials</li>
                  <li style={{ marginBottom: 8 }}>use the materials for any commercial purpose or for any public display</li>
                  <li style={{ marginBottom: 8 }}>attempt to reverse engineer any software contained on the platform</li>
                  <li style={{ marginBottom: 8 }}>remove any copyright or other proprietary notations from the materials</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>3. User Responsibilities</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  You are responsible for maintaining the confidentiality of your account and password. 
                  You agree to accept responsibility for all activities that occur under your account or password.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>4. Disclaimer</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  The materials on this platform are provided on an 'as is' basis. We make no warranties, expressed or implied, 
                  and hereby disclaim and negate all other warranties including without limitation, implied warranties or conditions 
                  of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>5. Limitations</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  In no event shall we or our suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, 
                  or due to business interruption) arising out of the use or inability to use the materials on this platform.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>6. Contact Information</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6 }}>
                  If you have any questions about these Terms of Service, please contact us at: 
                  <span style={{ color: '#000000', fontWeight: 600 }}> support@inquizo.com</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 'Privacy Policy':
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Privacy Policy</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>1. Information We Collect</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We collect information you provide directly to us, such as when you create an account, complete forms, 
                  participate in quizzes, or contact us for support.
                </p>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  The types of information we collect include:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Account information (name, email, password)</li>
                  <li style={{ marginBottom: 8 }}>Profile information and preferences</li>
                  <li style={{ marginBottom: 8 }}>Quiz responses and form submissions</li>
                  <li style={{ marginBottom: 8 }}>Usage data and analytics</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>2. How We Use Your Information</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We use the information we collect to:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Provide, maintain, and improve our services</li>
                  <li style={{ marginBottom: 8 }}>Process and store your quiz responses and form submissions</li>
                  <li style={{ marginBottom: 8 }}>Send you technical notices and support messages</li>
                  <li style={{ marginBottom: 8 }}>Respond to your comments and questions</li>
                  <li style={{ marginBottom: 8 }}>Monitor and analyze usage patterns and trends</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>3. Information Sharing</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, 
                  except as described in this policy or as required by law.
                </p>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We may share your information with:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Service providers who assist in our operations</li>
                  <li style={{ marginBottom: 8 }}>Legal authorities when required by law</li>
                  <li style={{ marginBottom: 8 }}>Other users (only with your explicit consent)</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>4. Data Security</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We implement appropriate security measures to protect your personal information against unauthorized access, 
                  alteration, disclosure, or destruction. However, no method of transmission over the internet is 100% secure.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>5. Your Rights</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  You have the right to:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Access and update your personal information</li>
                  <li style={{ marginBottom: 8 }}>Request deletion of your data</li>
                  <li style={{ marginBottom: 8 }}>Opt-out of certain communications</li>
                  <li style={{ marginBottom: 8 }}>Export your data in a portable format</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>6. Contact Us</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6 }}>
                  If you have any questions about this Privacy Policy, please contact us at: 
                  <span style={{ color: '#000000', fontWeight: 600 }}> privacy@inquizo.com</span>
                </p>
              </div>
            </div>
          </div>
        );

      case 'Cookie Policy':
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Cookie Policy</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Last updated: {new Date().toLocaleDateString()}</p>
            </div>

            <div style={{ background: '#ffffff', borderRadius: 8, border: '1px solid #e9ecef', padding: 24 }}>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>1. What Are Cookies?</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  Cookies are small text files that are placed on your device when you visit our website. 
                  They help us provide you with a better experience by remembering your preferences and settings.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>2. Types of Cookies We Use</h2>
                
                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 16, color: '#000000', marginBottom: 8 }}>Essential Cookies</h3>
                  <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    These cookies are necessary for the website to function properly. They enable basic functions like page navigation 
                    and access to secure areas of the website.
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 16, color: '#000000', marginBottom: 8 }}>Functional Cookies</h3>
                  <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    These cookies allow the website to remember choices you make and provide enhanced, more personal features.
                  </p>
                </div>

                <div style={{ marginBottom: 16 }}>
                  <h3 style={{ fontWeight: 600, fontSize: 16, color: '#000000', marginBottom: 8 }}>Analytics Cookies</h3>
                  <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                    These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>3. Managing Cookies</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  You can control and manage cookies in various ways:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Browser settings: Most browsers allow you to refuse cookies or delete them</li>
                  <li style={{ marginBottom: 8 }}>Third-party tools: Use browser extensions to manage cookies</li>
                  <li style={{ marginBottom: 8 }}>Our settings: Use our cookie preferences panel</li>
                </ul>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  Please note that disabling certain cookies may affect the functionality of our website.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>4. Third-Party Cookies</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  Some cookies are placed by third-party services that appear on our pages. We use these services to:
                </p>
                <ul style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginLeft: 20 }}>
                  <li style={{ marginBottom: 8 }}>Analyze website traffic and usage patterns</li>
                  <li style={{ marginBottom: 8 }}>Provide authentication and security features</li>
                  <li style={{ marginBottom: 8 }}>Enable social media integration</li>
                </ul>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>5. Updates to This Policy</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6, marginBottom: 16 }}>
                  We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy 
                  on this page and updating the "Last updated" date.
                </p>
              </div>

              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontWeight: 600, fontSize: 18, color: '#000000', marginBottom: 12 }}>6. Contact Us</h2>
                <p style={{ color: '#495057', fontSize: 14, lineHeight: 1.6 }}>
                  If you have any questions about our use of cookies, please contact us at: 
                  <span style={{ color: '#000000', fontWeight: 600 }}> privacy@inquizo.com</span>
                </p>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div style={{ padding: '0 32px' }}>
            <div style={{ marginBottom: 24 }}>
              <h1 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 8 }}>Welcome to Your Profile</h1>
              <p style={{ color: '#6c757d', fontSize: 14 }}>Select a section from the sidebar to get started</p>
            </div>
          </div>
        );
    }
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
    <div style={{ display: 'flex', minHeight: '100vh', background: '#ffffff' }}>
      {/* Sidebar */}
      <div style={{ width: 280, background: '#f8f9fa', boxShadow: '2px 0 8px rgba(0,0,0,0.1)', borderRight: '1px solid #e9ecef', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 18px 32px 18px', position: 'fixed', left: 0, top: 0, zIndex: 2, height: '100vh', gap: 0, overflowY: 'auto' }}>
        <button onClick={() => navigate('/dashboard')} style={{ width: '100%', background: '#000000', color: '#fff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer', marginBottom: 24, transition: 'background 0.2s, color 0.2s', letterSpacing: '0.01em' }}>← Back to Dashboard</button>
        <div style={{ width: 62, height: 62, borderRadius: '50%', background: profilePicUrl ? '#ffffff' : '#000000', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', border: '2px solid #e9ecef', position: 'relative' }}>
          {profilePicUrl ? (
            <img src={profilePicUrl} alt="Profile" style={{ width: 54, height: 54, borderRadius: '50%', objectFit: 'cover' }} />
          ) : (
            <FiUser size={32} color="#ffffff" />
          )}
          <button onClick={() => setShowUrlModal(true)} style={{ position: 'absolute', bottom: -8, right: -8, background: '#ffffff', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: 4, cursor: 'pointer', border: '1px solid #000000', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Add URL">
            <FiExternalLink size={16} color="#000000" />
          </button>
          {profilePicUrl && (
            <button onClick={handleRemovePic} style={{ position: 'absolute', top: -8, right: -8, background: '#ffffff', borderRadius: '50%', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: 4, border: '1px solid #000000', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Picture">
              <FiX size={14} color="#000000" />
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 20, color: '#000000', marginBottom: 2 }}>{profile.name || 'Your Name'}</div>
          <div style={{ color: '#6c757d', fontWeight: 500, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {profile.email}
            {profile.email && <span style={{ marginLeft: 4, color: '#28a745', fontWeight: 700, fontSize: 15 }} title="Verified">✔</span>}
          </div>
        </div>
        <div style={{ width: '100%', margin: '22px 0 10px 0', borderTop: '1px solid #dee2e6' }} />
        <div style={{ width: '100%', marginBottom: 18 }}>
          {['Settings', 'Legal', 'Account'].map(group => (
            <div key={group} style={{ marginBottom: 10 }}>
              <div style={{ fontWeight: 600, color: '#495057', marginBottom: 10, fontSize: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{group}</div>
              {SIDEBAR_SECTIONS.filter(s => s.group === group).map(({ label, icon }) => (
                <div
                  key={label}
                  onClick={() => handleSectionClick(label)}
                  style={{ color: selectedSection === label ? '#000000' : '#6c757d', fontSize: 15, marginBottom: 8, cursor: 'pointer', borderRadius: 6, padding: '8px 12px', background: selectedSection === label ? '#e9ecef' : 'transparent', fontWeight: selectedSection === label ? 600 : 400, display: 'flex', alignItems: 'center', gap: 12, transition: 'background 0.18s, color 0.18s' }}
                  onMouseOver={e => { e.target.style.background = '#f8f9fa'; e.target.style.color = '#000000'; }}
                  onMouseOut={e => { if (selectedSection !== label) { e.target.style.background = 'transparent'; e.target.style.color = '#6c757d'; }}}
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

      </div>
      {/* Main Content */}
      <div style={{ marginLeft: 280, flex: 1, padding: '48px 32px 32px 32px', maxWidth: 'calc(100vw - 280px)', minHeight: '100vh', overflowY: 'auto', background: '#ffffff' }}>
        {loading ? <Spinner /> : renderSectionContent()}

        {/* Delete Account Modal */}
        {showDeleteModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: 32, minWidth: 360, maxWidth: 400, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 600, fontSize: 24, color: '#dc3545', marginBottom: 18 }}>Delete Account</h2>
              <p style={{ color: '#dc3545', fontWeight: 600, fontSize: 16, marginBottom: 18 }}>Warning: This action is irreversible!</p>
              <input type="text" value={deleteInput} onChange={e => { setDeleteInput(e.target.value); setDeleteError(''); }} placeholder="Type DELETE to confirm" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #dc3545', fontSize: 16, marginBottom: 12 }} />
              {deleteError && <div style={{ color: '#dc3545', fontSize: 14, marginBottom: 8 }}>{deleteError}</div>}
              <div style={{ display: 'flex', gap: 18, width: '100%' }}>
                <button style={{ flex: 1, background: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6', borderRadius: 8, padding: '12px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={() => { setShowDeleteModal(false); setDeleteInput(''); setDeleteError(''); }}>Cancel</button>
                <button style={{ flex: 1, background: '#dc3545', color: '#ffffff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, fontSize: 16, cursor: deleteLoading ? 'not-allowed' : 'pointer', opacity: deleteLoading ? 0.7 : 1 }} onClick={handleDeleteAccount} disabled={deleteLoading}>{deleteLoading ? <Spinner size={20} /> : 'Delete'}</button>
              </div>
            </div>
          </div>
        )}

        {/* Logout Modal */}
        {showLogoutModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: 32, minWidth: 360, maxWidth: 400, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <h2 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 18 }}>Logout</h2>
              <p style={{ color: '#6c757d', fontWeight: 500, fontSize: 16, marginBottom: 24, textAlign: 'center' }}>Are you sure you want to logout? You'll need to sign in again to access your account.</p>
              <div style={{ display: 'flex', gap: 18, width: '100%' }}>
                <button style={{ flex: 1, background: '#f8f9fa', color: '#495057', border: '1px solid #dee2e6', borderRadius: 8, padding: '12px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={() => setShowLogoutModal(false)}>Cancel</button>
                <button style={{ flex: 1, background: '#000000', color: '#ffffff', border: 'none', borderRadius: 8, padding: '12px 0', fontWeight: 600, fontSize: 16, cursor: 'pointer' }} onClick={handleLogout}>Logout</button>
              </div>
            </div>
          </div>
        )}

        {/* URL Input Modal */}
        {showUrlModal && (
          <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: '#ffffff', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', padding: 32, minWidth: 400, maxWidth: 500, position: 'relative', width: '90vw', display: 'flex', flexDirection: 'column' }}>
              <h2 style={{ fontWeight: 600, fontSize: 24, color: '#000000', marginBottom: 18 }}>Add Profile Picture URL</h2>
              <p style={{ color: '#6c757d', fontWeight: 500, fontSize: 14, marginBottom: 24, lineHeight: 1.5 }}>
                Enter the URL of an image to use as your profile picture. The image should be publicly accessible.
              </p>
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontWeight: 600, color: '#495057', fontSize: 14, marginBottom: 8 }}>Image URL</label>
                <input 
                  type="url" 
                  value={urlInput} 
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://example.com/image.jpg"
                  style={{ 
                    width: '100%', 
                    padding: '12px 16px', 
                    borderRadius: 8, 
                    border: '1px solid #dee2e6', 
                    fontSize: 16,
                    background: '#ffffff'
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleUrlSubmit();
                    }
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: 18, width: '100%' }}>
                <button 
                  style={{ 
                    flex: 1, 
                    background: '#f8f9fa', 
                    color: '#495057', 
                    border: '1px solid #dee2e6', 
                    borderRadius: 8, 
                    padding: '12px 0', 
                    fontWeight: 600, 
                    fontSize: 16, 
                    cursor: 'pointer' 
                  }} 
                  onClick={() => {
                    setShowUrlModal(false);
                    setUrlInput('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  style={{ 
                    flex: 1, 
                    background: '#000000', 
                    color: '#ffffff', 
                    border: 'none', 
                    borderRadius: 8, 
                    padding: '12px 0', 
                    fontWeight: 600, 
                    fontSize: 16, 
                    cursor: urlLoading ? 'not-allowed' : 'pointer',
                    opacity: urlLoading ? 0.7 : 1
                  }} 
                  onClick={handleUrlSubmit}
                  disabled={urlLoading}
                >
                  {urlLoading ? <Spinner size={20} /> : 'Add Picture'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 