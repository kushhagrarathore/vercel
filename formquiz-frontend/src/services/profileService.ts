import { supabase } from '../supabase';
import { UserProfile, UserStats, ProfileCompletion } from '../types/profile';

export const ProfileService = {
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;
    // Fetch profile from your user table if needed
    return {
      id: user.id,
      name: user.user_metadata?.name || '',
      email: user.email || '',
      emailVerified: user.email_confirmed_at != null,
      createdAt: user.created_at,
      updatedAt: user.updated_at || user.created_at,
    };
  },
  async getUserStats(): Promise<UserStats | null> {
    // Replace with your actual stats fetching logic
    return {
      level: 1,
      quizzesCreated: 0,
      quizzesCompleted: 0,
      achievements: 0,
    };
  },
  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile | null> {
    // Update user profile in your user table and/or Supabase auth
    if (updates.name) {
      await supabase.auth.updateUser({ data: { name: updates.name } });
    }
    // Fetch updated user
    return this.getCurrentUser();
  },
  async updatePassword(newPassword: string): Promise<void> {
    await supabase.auth.updateUser({ password: newPassword });
  },
  calculateProfileCompletion(profile: UserProfile, stats: UserStats): ProfileCompletion {
    let percentage = 0;
    const missingFields: string[] = [];
    if (profile.name) percentage += 40; else missingFields.push('Name');
    if (profile.email) percentage += 40; else missingFields.push('Email');
    if (profile.emailVerified) percentage += 20; else missingFields.push('Email Verification');
    return { percentage, missingFields };
  },
  async deleteAccount(): Promise<void> {
    // Delete all user data from your tables (forms, quizzes, responses, etc.)
    // Example: await supabase.from('forms').delete().eq('user_id', userId);
    // Finally, delete user from auth
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Delete from your tables here
      // ...
      // Delete from auth
      await supabase.auth.admin.deleteUser(user.id);
    }
  },
}; 