import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { supabase } from '../supabase';
import { useToast } from '../components/Toast';
import { ProfileService } from '../services/profileService';
import { UserProfile, UserStats, ProfileCompletion, SidebarSection } from '../types/profile';
import Spinner from '../components/Spinner';

const SIDEBAR_SECTIONS: SidebarSection[] = [
  { label: 'Profile & Account', group: 'Settings', icon: '👤' },
  { label: 'Privacy', group: 'Settings', icon: '🔒' },
  { label: 'Terms of Service', group: 'Legal', icon: '📄' },
  { label: 'Privacy Policy', group: 'Legal', icon: '📋' },
  { label: 'Cookie Policy', group: 'Legal', icon: '🍪' },
  { label: 'Log out', group: 'Account', icon: '🚪' },
  { label: 'Delete Account', group: 'Account', icon: '🗑️' },
];

const formSchema = yup.object({
  name: yup.string().required('Name is required').min(2, 'Name must be at least 2 characters'),
  email: yup.string().email('Invalid email format').required('Email is required'),
  newPassword: yup.string().min(6, 'Password must be at least 6 characters').optional(),
});

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [profileCompletion, setProfileCompletion] = useState<ProfileCompletion | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedSection, setSelectedSection] = useState('Profile & Account');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailVerificationSent, setEmailVerificationSent] = useState(false);
  const [changeEmailMode, setChangeEmailMode] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [changeEmailLoading, setChangeEmailLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm({
    resolver: yupResolver(formSchema),
  });

  useEffect(() => {
    fetchProfileData();
  }, []);

  useEffect(() => {
    if (profile && userStats) {
      const completion = ProfileService.calculateProfileCompletion(profile, userStats);
      setProfileCompletion(completion);
    }
  }, [profile, userStats]);

  const fetchProfileData = async () => {
    setLoading(true);
    try {
      const [profileData, statsData] = await Promise.all([
        ProfileService.getCurrentUser(),
        ProfileService.getUserStats(),
      ]);

      if (profileData) {
        setProfile(profileData);
        setValue('name', profileData.name);
        setValue('email', profileData.email);
        setEmailVerified(profileData.emailVerified);
      }

      if (statsData) {
        setUserStats(statsData);
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast('Failed to load profile data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: yup.InferType<typeof formSchema>) => {
    if (!profile) return;
    setSaving(true);
    try {
      const updates: Partial<UserProfile> = {};
      if (data.name !== profile.name) {
        updates.name = data.name;
      }
      if (data.newPassword) {
        await ProfileService.updatePassword(data.newPassword);
        setValue('newPassword', '');
      }
      if (Object.keys(updates).length > 0) {
        const updatedProfile = await ProfileService.updateProfile(updates);
        if (updatedProfile) {
          setProfile(updatedProfile);
          toast('Profile updated successfully!', 'success');
        }
      } else if (data.newPassword) {
        toast('Password updated successfully!', 'success');
      } else {
        toast('No changes to save', 'info');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/login');
      toast('Logged out successfully', 'success');
    } catch (error) {
      console.error('Error logging out:', error);
      toast('Failed to log out', 'error');
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(true);
  };

  const handleSectionClick = (section: string) => {
    setSelectedSection(section);
    setIsMobileMenuOpen(false);
    if (section === 'Log out') {
      handleLogout();
    } else if (section === 'Delete Account') {
      handleDeleteAccount();
    }
  };

  const handleSendVerification = async () => {
    setEmailVerificationSent(false);
    if (!profile?.email) {
      toast('No email found for verification', 'error');
      return;
    }
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: profile.email });
      if (error) throw error;
      setEmailVerificationSent(true);
      toast('Verification email sent!', 'success');
    } catch (error) {
      toast('Failed to send verification email', 'error');
    }
  };

  const handleChangeEmail = async () => {
    if (!newEmail) return toast('Please enter a new email.', 'error');
    setChangeEmailLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ email: newEmail });
      if (error) throw error;
      toast('Email change requested. Please check your new email to verify.', 'success');
      setChangeEmailMode(false);
      setNewEmail('');
    } catch (error) {
      toast('Failed to change email', 'error');
    } finally {
      setChangeEmailLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <Spinner size={48} />
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Failed to load profile</p>
          <button
            onClick={fetchProfileData}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const renderMainContent = () => {
    switch (selectedSection) {
      case 'Profile & Account':
        return (
          <div className="flex flex-col gap-8 items-start justify-center w-full max-w-3xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-purple-900 mb-2">
                Welcome, {profile.name || 'User'}!
              </h1>
              <p className="text-indigo-600 font-medium text-lg mb-4">
                Manage your account, update your details, and keep your information secure.
              </p>
              {profileCompletion && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-purple-700 font-semibold text-lg">
                      Profile Completion: {profileCompletion.percentage}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion.percentage}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
            {userStats && (
              <div className="flex flex-wrap gap-4 mb-8">
                <div className="bg-white rounded-xl px-6 py-4 font-bold text-purple-700 text-lg shadow-sm">
                  🎉 Level {userStats.level}
                </div>
                <div className="bg-white rounded-xl px-6 py-4 font-bold text-indigo-600 text-lg shadow-sm">
                  🚀 {userStats.quizzesCreated + userStats.quizzesCompleted} Quizzes
                </div>
                <div className="bg-white rounded-xl px-6 py-4 font-bold text-purple-900 text-lg shadow-sm">
                  🏆 {userStats.achievements} Achievements
                </div>
              </div>
            )}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-lg">
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  Name
                </label>
                <input
                  {...register('name')}
                  type="text"
                  className={`w-full p-4 rounded-xl border-2 text-lg ${
                    errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors`}
                  disabled={saving}
                />
                {errors.name && (
                  <p className="mt-1 text-red-600 text-sm">{errors.name.message}</p>
                )}
              </div>
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  Email
                </label>
                <input
                  {...register('email')}
                  type="email"
                  disabled
                  className="w-full p-4 rounded-xl border-2 border-gray-300 bg-gray-50 text-lg"
                />
                <div className="flex items-center gap-2 mt-2">
                  {emailVerified ? (
                    <span className="text-green-600 text-sm font-semibold">Verified</span>
                  ) : (
                    <>
                      <span className="text-orange-600 text-sm font-semibold">Not Verified</span>
                      <button
                        type="button"
                        onClick={handleSendVerification}
                        className="ml-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 text-xs font-bold"
                        disabled={emailVerificationSent}
                      >
                        {emailVerificationSent ? 'Sent!' : 'Resend Verification'}
                      </button>
                    </>
                  )}
                </div>
                <div className="mt-2">
                  {!changeEmailMode ? (
                    <button
                      type="button"
                      className="text-blue-600 underline text-sm font-medium"
                      onClick={() => setChangeEmailMode(true)}
                    >
                      Change Email
                    </button>
                  ) : (
                    <div className="flex gap-2 items-center mt-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={e => setNewEmail(e.target.value)}
                        placeholder="Enter new email"
                        className="p-2 border rounded"
                        disabled={changeEmailLoading}
                      />
                      <button
                        type="button"
                        className="px-3 py-1 bg-blue-600 text-white rounded font-bold text-sm hover:bg-blue-700"
                        onClick={handleChangeEmail}
                        disabled={changeEmailLoading}
                      >
                        {changeEmailLoading ? 'Updating...' : 'Update Email'}
                      </button>
                      <button
                        type="button"
                        className="text-gray-500 underline text-xs"
                        onClick={() => setChangeEmailMode(false)}
                        disabled={changeEmailLoading}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-lg font-bold text-gray-900 mb-2">
                  New Password
                </label>
                <input
                  {...register('newPassword')}
                  type="password"
                  placeholder="Leave blank to keep current password"
                  className={`w-full p-4 rounded-xl border-2 text-lg ${
                    errors.newPassword ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                  } focus:outline-none focus:ring-2 focus:ring-blue-200 transition-colors`}
                  disabled={saving}
                />
                {errors.newPassword && (
                  <p className="mt-1 text-red-600 text-sm">{errors.newPassword.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={saving}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold text-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? (
                  <div className="flex items-center justify-center">
                    <Spinner size={24} />
                    <span className="ml-2">Saving...</span>
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </form>
          </div>
        );
      case 'Privacy':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-purple-900 mb-6">Privacy Settings</h2>
            <p className="text-indigo-600 font-medium text-lg mb-6">
              Manage your privacy, data sharing, and ad preferences. Download your data or control your visibility.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm space-y-6">
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Profile Visibility</label>
                <div className="flex gap-4 items-center">
                  <span>Public</span>
                  <input type="checkbox" className="toggle toggle-primary" disabled />
                  <span>Private</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Control who can see your profile and activity. (Coming soon)</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Data Download</label>
                <button className="px-4 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700" disabled>
                  Download My Data
                </button>
                <p className="text-xs text-gray-500 mt-1">Request a copy of your data. (Coming soon)</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Ad Preferences</label>
                <div className="flex gap-4 items-center">
                  <input type="checkbox" className="toggle toggle-primary" disabled />
                  <span>Allow personalized ads</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">Control whether you see personalized ads. (Coming soon)</p>
              </div>
              <div>
                <label className="block font-semibold text-gray-700 mb-2">Data Usage</label>
                <p className="text-gray-700 text-sm">
                  We collect only the data necessary to provide and improve our services. You can request a copy of your data or delete your account at any time. For more details, see our Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        );
      case 'Terms of Service':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-purple-900 mb-6">Terms of Service</h2>
            <p className="text-indigo-600 font-medium text-lg mb-6">
              Read our terms and conditions for using this platform.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-2">1. Acceptance of Terms</h3>
              <p className="mb-2">By using this platform, you agree to abide by these terms and all applicable laws and regulations.</p>
              <h3 className="font-bold mb-2">2. User Responsibilities</h3>
              <p className="mb-2">You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.</p>
              <h3 className="font-bold mb-2">3. Content</h3>
              <p className="mb-2">You retain ownership of your content but grant us a license to use, display, and distribute it as necessary to provide the service.</p>
              <h3 className="font-bold mb-2">4. Prohibited Conduct</h3>
              <p className="mb-2">You agree not to misuse the platform, including but not limited to spamming, hacking, or violating any laws.</p>
              <h3 className="font-bold mb-2">5. Termination</h3>
              <p className="mb-2">We reserve the right to suspend or terminate your account for violations of these terms.</p>
              <h3 className="font-bold mb-2">6. Limitation of Liability</h3>
              <p className="mb-2">We are not liable for any damages arising from your use of the platform.</p>
              <h3 className="font-bold mb-2">7. Changes to Terms</h3>
              <p className="mb-2">We may update these terms at any time. Continued use of the platform constitutes acceptance of the new terms.</p>
              <h3 className="font-bold mb-2">8. Contact</h3>
              <p>If you have questions, contact us at support@yourdomain.com.</p>
            </div>
          </div>
        );
      case 'Privacy Policy':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-purple-900 mb-6">Privacy Policy</h2>
            <p className="text-indigo-600 font-medium text-lg mb-6">
              Learn how we handle your data and privacy.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-2">1. Data Collection</h3>
              <p className="mb-2">We collect information you provide (such as name, email, and quiz data) and usage data (such as device and log information).</p>
              <h3 className="font-bold mb-2">2. Data Usage</h3>
              <p className="mb-2">We use your data to provide, maintain, and improve our services, and to communicate with you.</p>
              <h3 className="font-bold mb-2">3. Data Sharing</h3>
              <p className="mb-2">We do not sell your data. We may share data with service providers as necessary to operate the platform.</p>
              <h3 className="font-bold mb-2">4. Data Security</h3>
              <p className="mb-2">We use industry-standard security measures to protect your data.</p>
              <h3 className="font-bold mb-2">5. Your Rights</h3>
              <p className="mb-2">You can access, update, or delete your data at any time. Contact us for assistance.</p>
              <h3 className="font-bold mb-2">6. Cookies</h3>
              <p className="mb-2">We use cookies to enhance your experience. See our Cookie Policy for details.</p>
              <h3 className="font-bold mb-2">7. Contact</h3>
              <p>If you have questions, contact us at privacy@yourdomain.com.</p>
            </div>
          </div>
        );
      case 'Cookie Policy':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-purple-900 mb-6">Cookie Policy</h2>
            <p className="text-indigo-600 font-medium text-lg mb-6">
              How we use cookies and similar technologies.
            </p>
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold mb-2">1. What Are Cookies?</h3>
              <p className="mb-2">Cookies are small text files stored on your device to help us improve your experience.</p>
              <h3 className="font-bold mb-2">2. How We Use Cookies</h3>
              <p className="mb-2">We use cookies for authentication, analytics, and to remember your preferences.</p>
              <h3 className="font-bold mb-2">3. Managing Cookies</h3>
              <p className="mb-2">You can manage or disable cookies in your browser settings, but some features may not work as intended.</p>
              <h3 className="font-bold mb-2">4. Contact</h3>
              <p>If you have questions, contact us at privacy@yourdomain.com.</p>
            </div>
          </div>
        );
      case 'Delete Account':
        return (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-purple-900 mb-6">Delete Account</h2>
            <p className="text-indigo-600 font-medium text-lg mb-6">
              Are you sure you want to delete your account? This action cannot be undone.
            </p>
            <button
              onClick={handleDeleteAccount}
              className="px-4 py-2 bg-red-600 text-white rounded font-bold hover:bg-red-700"
            >
              Delete Account
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-purple-50">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-40">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white rounded-lg shadow-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>
      <div className="flex">
        {/* Sidebar */}
        <div className={`
          fixed lg:static inset-y-0 left-0 z-30 w-72 bg-gradient-to-b from-purple-50 to-indigo-50 shadow-xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
          <div className="flex flex-col h-full p-6">
            <button
              onClick={() => navigate('/dashboard')}
              className="self-start bg-purple-100 text-purple-700 border-none rounded-lg px-5 py-2 font-bold text-base cursor-pointer shadow-sm mb-8 hover:bg-purple-200 transition-colors"
            >
              ← Dashboard
            </button>
            <div className="flex flex-col items-center mb-8">
              <div className="text-center">
                <div className="font-bold text-xl text-purple-900 mb-1">
                  {profile.name || 'Your Name'}
                </div>
                <div className="text-indigo-600 font-medium text-sm">
                  {profile.email}
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-6">
              {/* Settings Group */}
              <div>
                <div className="font-bold text-purple-700 mb-3 text-lg">Settings</div>
                {SIDEBAR_SECTIONS.filter(s => s.group === 'Settings').map(({ label, icon }) => (
                  <div
                    key={label}
                    onClick={() => handleSectionClick(label)}
                    className={`
                      flex items-center text-base mb-2 cursor-pointer rounded-lg px-3 py-2 transition-all duration-200
                      ${selectedSection === label 
                        ? 'bg-purple-100 text-purple-700 font-bold' 
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                      }
                    `}
                  >
                    <span className="mr-3">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
              {/* Legal Group */}
              <div>
                <div className="font-bold text-purple-700 mb-3 text-lg">Legal</div>
                {SIDEBAR_SECTIONS.filter(s => s.group === 'Legal').map(({ label, icon }) => (
                  <div
                    key={label}
                    onClick={() => handleSectionClick(label)}
                    className={`
                      flex items-center text-base mb-2 cursor-pointer rounded-lg px-3 py-2 transition-all duration-200
                      ${selectedSection === label 
                        ? 'bg-purple-100 text-purple-700 font-bold' 
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                      }
                    `}
                  >
                    <span className="mr-3">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
              {/* Account Group */}
              <div className="mt-auto">
                <div className="font-bold text-purple-700 mb-3 text-lg">Account</div>
                {SIDEBAR_SECTIONS.filter(s => s.group === 'Account').map(({ label, icon }) => (
                  <div
                    key={label}
                    onClick={() => handleSectionClick(label)}
                    className={`
                      flex items-center text-base mb-2 cursor-pointer rounded-lg px-3 py-2 transition-all duration-200
                      ${label === 'Log out' 
                        ? 'text-red-600 hover:bg-red-50' 
                        : label === 'Delete Account'
                        ? 'text-red-700 hover:bg-red-50'
                        : selectedSection === label 
                        ? 'bg-purple-100 text-purple-700 font-bold' 
                        : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                      }
                    `}
                  >
                    <span className="mr-3">{icon}</span>
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        {/* Main Content */}
        <div className="flex-1 lg:ml-0">
          <div className="p-6 lg:p-12 min-h-screen">
            {renderMainContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile; 