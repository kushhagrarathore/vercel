export interface UserProfile {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string; // Last updated timestamp
  // Add more fields as needed (e.g., phone, bio)
}

export interface AvatarConfig {
  seed: string;
  backgroundColor: string;
  skinColor: string;
  hairColor: string;
  hairStyle: string;
  eyeStyle: string;
  mouthStyle: string;
  accessory: string;
  clothing: string;
  clothingColor: string;
}

export interface UserStats {
  level: number;
  quizzesCreated: number;
  quizzesCompleted: number;
  achievements: number;
}

export interface ProfileCompletion {
  percentage: number;
  missingFields: string[];
}

export interface SidebarSection {
  label: string;
  group: 'Settings' | 'Legal' | 'Account';
  icon: string;
}

export interface FormData {
  name: string;
  email: string;
  newPassword?: string;
}

export interface DeleteAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
} 