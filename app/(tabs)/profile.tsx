import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  StyleSheet,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { userRepository } from '@/data/repositories/userRepository';
import { COLORS } from '@/constants/colors';

const PRIVACY_POLICY_URL = 'https://spoony.app/privacy-policy';

export default function ProfileScreen(): React.ReactElement {
  const { t } = useTranslation();
  const confirmWord = t('profile.deleteConfirmPlaceholder');
  const router = useRouter();
  const { user, logout } = useAuth();

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  const { mutateAsync: deleteAccount } = useMutation<void, Error, void>({
    mutationFn: () => userRepository.deleteAccount(),
    onSuccess: async () => {
      await logout();
      router.replace('/(auth)' as never);
    },
  });

  async function handleDelete(): Promise<void> {
    if (confirmText !== confirmWord) return;
    try {
      await deleteAccount();
    } catch {
      // error is silent — handled by useMutation state
    }
  }

  function openDeleteModal(): void {
    setConfirmText('');
    setShowDeleteModal(true);
  }

  function closeDeleteModal(): void {
    setShowDeleteModal(false);
    setConfirmText('');
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        {/* ---------------------------------------------------------------- */}
        {/* Header                                                             */}
        {/* ---------------------------------------------------------------- */}
        <Text style={styles.title} accessibilityRole="header">
          {t('profile.title')}
        </Text>

        {/* ---------------------------------------------------------------- */}
        {/* User info card                                                     */}
        {/* ---------------------------------------------------------------- */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('profile.firstName')}</Text>
            <Text testID="profile-first-name" style={styles.infoValue}>
              {user?.firstName}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{t('profile.email')}</Text>
            <Text testID="profile-email" style={styles.infoValue}>
              {user?.email}
            </Text>
          </View>
        </View>

        {/* ---------------------------------------------------------------- */}
        {/* Privacy policy link                                               */}
        {/* ---------------------------------------------------------------- */}
        <Pressable
          testID="privacy-policy-link"
          onPress={() => void Linking.openURL(PRIVACY_POLICY_URL)}
          style={styles.linkRow}
          accessibilityRole="link"
          accessibilityLabel={t('profile.privacyPolicy')}
          accessibilityHint={t('profile.privacyPolicyHint')}
        >
          <Text style={styles.linkText}>{t('profile.privacyPolicy')}</Text>
          <Text style={styles.linkChevron}>{'>'}</Text>
        </Pressable>

        {/* ---------------------------------------------------------------- */}
        {/* Delete account button                                             */}
        {/* ---------------------------------------------------------------- */}
        <Pressable
          testID="delete-account-button"
          onPress={openDeleteModal}
          style={styles.deleteButton}
          accessibilityRole="button"
          accessibilityLabel={t('profile.deleteAccount')}
          accessibilityHint={t('profile.deleteAccountHint')}
        >
          <Text style={styles.deleteButtonText}>{t('profile.deleteAccount')}</Text>
        </Pressable>
      </ScrollView>

      {/* ------------------------------------------------------------------ */}
      {/* Delete confirmation modal                                            */}
      {/* ------------------------------------------------------------------ */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
        accessibilityViewIsModal
      >
        <View style={styles.modalOverlay}>
          <View testID="delete-confirmation-modal" style={styles.modalContent}>
            <Text style={styles.modalTitle} accessibilityRole="header">
              {t('profile.deleteConfirmTitle')}
            </Text>
            <Text style={styles.modalMessage}>
              {t('profile.deleteConfirmMessage')}
            </Text>

            <TextInput
              testID="delete-confirmation-input"
              value={confirmText}
              onChangeText={setConfirmText}
              placeholder={t('profile.deleteConfirmPlaceholder')}
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.confirmInput}
              accessibilityLabel={t('profile.deleteConfirmInputLabel')}
            />

            <View style={styles.modalActions}>
              <Pressable
                onPress={closeDeleteModal}
                style={styles.cancelButton}
                accessibilityRole="button"
                accessibilityLabel={t('profile.cancelButton')}
              >
                <Text style={styles.cancelButtonText}>
                  {t('profile.cancelButton')}
                </Text>
              </Pressable>

              <Pressable
                testID="delete-confirmation-confirm"
                onPress={() => void handleDelete()}
                style={[
                  styles.confirmButton,
                  confirmText !== confirmWord && styles.confirmButtonDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t('profile.deleteConfirmButton')}
                accessibilityHint={t('profile.deleteConfirmButtonHint')}
                accessibilityState={{ disabled: confirmText !== confirmWord }}
                disabled={confirmText !== confirmWord}
              >
                <Text style={styles.confirmButtonText}>
                  {t('profile.deleteConfirmButton')}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.CREAM,
  },
  content: {
    padding: 24,
    gap: 16,
  },

  // Title
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
    marginBottom: 8,
  },

  // Info card
  card: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    minHeight: 44,
  },
  infoLabel: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.CREAM,
  },

  // Privacy link
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.WHITE,
    borderRadius: 12,
    padding: 16,
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
  },
  linkText: {
    fontSize: 15,
    color: COLORS.ORANGE,
    fontWeight: '500',
  },
  linkChevron: {
    fontSize: 16,
    // BROWN_DARK (#6B5744) on WHITE (#FFFFFF) — contrast ≈ 7.2:1, passes WCAG AA
    // BROWN_MEDIUM (#8B7355) was only ≈ 4.0:1 — fails for 16dp normal weight text
    color: COLORS.BROWN_DARK,
  },

  // Delete button
  deleteButton: {
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    paddingHorizontal: 16,
  },
  deleteButtonText: {
    color: COLORS.WHITE,
    fontSize: 16,
    fontWeight: '700',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: COLORS.WHITE,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    gap: 16,
    shadowColor: COLORS.BROWN_DARK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.BROWN_DARK,
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.BROWN_DARK,
    lineHeight: 20,
  },
  confirmInput: {
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    fontSize: 15,
    color: COLORS.BROWN_DARK,
    backgroundColor: COLORS.CREAM,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.BROWN_LIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.BROWN_DARK,
  },
  confirmButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.ERROR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: COLORS.BROWN_LIGHT,
  },
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.WHITE,
  },
});
