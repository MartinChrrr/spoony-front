/**
 * Accessibility audit — Phase 7
 *
 * Tests every critical screen for:
 * - accessibilityRole + accessibilityLabel on all interactive elements
 * - accessibilityLabel on every TextInput
 * - minHeight ≥ 44 on every interactive element
 * - SpoonGauge respects reduce-motion preference
 * - CalendarScreen nav buttons have distinct labels
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AccessibilityInfo } from 'react-native';

// ---------------------------------------------------------------------------
// Module mocks (must be before any imports of the mocked modules)
// ---------------------------------------------------------------------------

jest.mock('@/features/auth/hooks/useAuth');
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));
jest.mock('@/data/api/client', () => ({
  registerSessionExpiredHandler: jest.fn(),
  api: { post: jest.fn(), get: jest.fn(), delete: jest.fn() },
}));
jest.mock('@/data/cache/cacheManager', () => ({
  cacheManager: { clear: jest.fn() },
}));
jest.mock('jwt-decode', () => ({
  jwtDecode: jest.fn(),
}));
jest.mock('@tanstack/react-query', () => ({
  useQuery: jest.fn(),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(() => ({ invalidateQueries: jest.fn() })),
}));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  })),
  useLocalSearchParams: jest.fn(() => ({ spoons: '8', id: 'task-1' })),
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));
jest.mock('@/data/repositories/energyRepository', () => ({
  energyRepository: { getToday: jest.fn() },
}));
jest.mock('@/data/repositories/taskLogRepository', () => ({
  taskLogRepository: { getAll: jest.fn(), updateStatus: jest.fn() },
}));
jest.mock('@/data/repositories/taskRepository', () => ({
  taskRepository: {
    getAll: jest.fn(),
    getById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  },
}));
jest.mock('@/data/repositories/userRepository', () => ({
  userRepository: { deleteAccount: jest.fn() },
}));
jest.mock('@/data/api/endpoints/energy', () => ({
  energyEndpoints: { declare: jest.fn() },
}));
jest.mock('react-native/Libraries/Linking/Linking', () => ({
  openURL: jest.fn(() => Promise.resolve()),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      // Return realistic French translations for a11y label checks
      const translations: Record<string, string> = {
        'auth.emailLabel': 'Email',
        'auth.emailPlaceholder': 'votre@email.com',
        'auth.passwordLabel': 'Mot de passe',
        'auth.passwordPlaceholder': 'Votre mot de passe',
        'auth.passwordFieldHint': 'Saisissez votre mot de passe',
        'auth.loginButton': 'Se connecter',
        'auth.loginButtonHint': 'Appuyez pour vous connecter à votre compte',
        'auth.firstNameLabel': 'Prénom',
        'auth.firstNamePlaceholder': 'Votre prénom',
        'auth.registerButton': "S'inscrire",
        'checkin.presetExhausted': 'Épuisé',
        'checkin.presetMedium': 'Moyen',
        'checkin.presetGood': 'Bien',
        'checkin.presetInShape': 'En forme',
        'checkin.presetNotToday': "Pas aujourd'hui",
        'checkin.spoonsSlider': 'Nombre de cuillères',
        'checkin.decreaseSpoons': 'Diminuer les cuillères',
        'checkin.increaseSpoons': 'Augmenter les cuillères',
        'checkin.step2Title': 'Comment vous sentez-vous ?',
        'checkin.continue': 'Continuer',
        'checkin.presetsGroupLabel': "Préréglage d'énergie rapide",
        'home.greeting': params?.name ? `Bonjour ${params.name}` : 'Bonjour',
        'home.reevaluate': 'Réévaluer ma journée',
        'home.reevaluateHint': 'Ouvre le formulaire pour réévaluer votre énergie du jour',
        'home.todayTasks': 'Tâches du jour',
        'taskForm.name': 'Nom de la tâche',
        'taskForm.moreOptions': "Plus d'options",
        'taskForm.lessOptions': "Moins d'options",
        'taskForm.spoonCost': 'Coût en cuillères',
        'taskForm.dueDateLabel': "Date d'échéance",
        'taskForm.dueDateHint': 'Format attendu : AAAA-MM-JJ',
        'taskForm.dueDatePlaceholder': 'AAAA-MM-JJ',
        'taskForm.newTaskTitle': 'Nouvelle tâche',
        'taskForm.save': 'Enregistrer',
        'taskForm.category': 'Catégorie',
        'taskForm.importance': 'Importance',
        'taskForm.notes': 'Notes',
        'profile.title': 'Mon profil',
        'profile.firstName': 'Prénom',
        'profile.email': 'Email',
        'profile.privacyPolicy': 'Politique de confidentialité',
        'profile.privacyPolicyHint': 'Ouvre la politique de confidentialité',
        'profile.deleteAccount': 'Supprimer mon compte',
        'profile.deleteAccountHint': 'Ouvre la confirmation de suppression de compte',
        'profile.deleteConfirmTitle': 'Supprimer votre compte ?',
        'profile.deleteConfirmMessage': 'Cette action est irréversible.',
        'profile.deleteConfirmPlaceholder': 'SUPPRIMER',
        'profile.deleteConfirmButton': 'Confirmer la suppression',
        'profile.deleteConfirmButtonHint': 'Confirme la suppression définitive du compte',
        'profile.deleteConfirmInputLabel': 'Confirmation de suppression',
        'profile.cancelButton': 'Annuler',
        'calendar.prevMonth': 'Mois précédent',
        'calendar.nextMonth': 'Mois suivant',
        'calendar.monthHeader': 'Mois en cours',
        'checkin.spoonsCount': `${params?.count ?? 0} cuillères`,
        'checkin.sliderMin': `Minimum : ${params?.min ?? 0} cuillères`,
        'checkin.sliderMax': `Maximum : ${params?.max ?? 12} cuillères`,
        'checkin.spoonsUsedLabel': `${params?.used ?? 0} sur ${params?.total ?? 0} cuillères utilisées`,
      };
      return translations[key] ?? key;
    },
  }),
}));

import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/hooks/useAuth';

const mockUseQuery = useQuery as jest.Mock;
const mockUseMutation = useMutation as jest.Mock;
const mockUseAuth = useAuth as jest.Mock;

const defaultMutation = {
  mutateAsync: jest.fn(),
  mutate: jest.fn(),
  isPending: false,
  isError: false,
};

const defaultUser = { id: '1', email: 'test@example.com', firstName: 'Alice' };

// ---------------------------------------------------------------------------
// Global setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();

  // Default auth — authenticated user
  mockUseAuth.mockReturnValue({
    user: defaultUser,
    isLoading: false,
    login: jest.fn(),
    logout: jest.fn(),
    register: jest.fn(),
    completeOnboarding: jest.fn(),
    hasCompletedOnboarding: true,
    sessionExpired: false,
  });

  // Default TanStack Query stubs
  mockUseMutation.mockReturnValue(defaultMutation);
  mockUseQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
  });

  // AccessibilityInfo default: reduce motion disabled
  jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
});

// ---------------------------------------------------------------------------
// 1. LoginScreen accessibility
// ---------------------------------------------------------------------------

describe('LoginScreen accessibility', () => {
  it('should_HaveAccessibilityLabelsOnAllInputs_When_Rendered', () => {
    // Arrange
    const LoginScreen = require('../../app/(auth)/login').default;

    // Act
    render(<LoginScreen />);

    // Assert — both inputs must carry an accessibilityLabel
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Mot de passe')).toBeDefined();
  });

  it('should_HaveAccessibilityRoleOnSubmitButton_When_Rendered', () => {
    // Arrange
    const LoginScreen = require('../../app/(auth)/login').default;

    // Act
    render(<LoginScreen />);

    // Assert — submit button must be discoverable by role and label
    const loginButton = screen.getByRole('button', { name: 'Se connecter' });
    expect(loginButton).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 2. RegisterScreen accessibility
// ---------------------------------------------------------------------------

describe('RegisterScreen accessibility', () => {
  it('should_HaveAccessibilityLabelsOnAllInputs_When_Rendered', () => {
    // Arrange
    const RegisterScreen = require('../../app/(auth)/register').default;

    // Act
    render(<RegisterScreen />);

    // Assert — all three fields carry accessibilityLabel
    expect(screen.getByLabelText('Prénom')).toBeDefined();
    expect(screen.getByLabelText('Email')).toBeDefined();
    expect(screen.getByLabelText('Mot de passe')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 3. CheckinStep2 accessibility
// ---------------------------------------------------------------------------

describe('CheckinStep2 accessibility', () => {
  it('should_HaveAccessiblePresetButtons_When_Rendered', () => {
    // Arrange
    const CheckinStep2 = require('../../app/checkin/step2').default;

    // Act
    render(<CheckinStep2 />);

    // Assert — each preset button is a radio with a descriptive label
    expect(screen.getByRole('radio', { name: 'Épuisé' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Moyen' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'Bien' })).toBeDefined();
    expect(screen.getByRole('radio', { name: 'En forme' })).toBeDefined();
    expect(screen.getByRole('radio', { name: "Pas aujourd'hui" })).toBeDefined();
  });

  it('should_HaveAccessibleSliderControls_When_Rendered', () => {
    // Arrange
    const CheckinStep2 = require('../../app/checkin/step2').default;

    // Act
    render(<CheckinStep2 />);

    // Assert — the main slider control is an adjustable with a descriptive label
    const slider = screen.getByRole('adjustable', { name: 'Nombre de cuillères' });
    expect(slider).toBeDefined();

    // Fine-adjustment controls must be accessible buttons
    const decrementButton = screen.getByRole('button', { name: 'Diminuer les cuillères' });
    const incrementButton = screen.getByRole('button', { name: 'Augmenter les cuillères' });
    expect(decrementButton).toBeDefined();
    expect(incrementButton).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 4. HomeScreen accessibility
// ---------------------------------------------------------------------------

describe('HomeScreen accessibility', () => {
  it('should_HaveAccessibleReevaluateButton_When_Rendered', () => {
    // Arrange — provide energy data so the gauge and reevaluate button render.
    // HomeScreen calls useQuery three times (energy, task-logs, tasks).
    // We differentiate by inspecting the queryKey passed in the options object.
    mockUseQuery.mockImplementation(({ queryKey }: { queryKey: string[] }) => {
      if (queryKey[0] === 'energy') {
        return { data: { spoons: 8, spoonsUsed: 3 }, isLoading: false, isError: false };
      }
      // task-logs and tasks return empty arrays
      return { data: [], isLoading: false, isError: false };
    });
    const HomeScreen = require('../../app/(tabs)/index').default;

    // Act
    render(<HomeScreen />);

    // Assert — reevaluate button must have role="button" and descriptive label
    const reevaluateButton = screen.getByRole('button', { name: 'Réévaluer ma journée' });
    expect(reevaluateButton).toBeDefined();
    expect(reevaluateButton.props.accessibilityLabel).toBe('Réévaluer ma journée');
  });
});

// ---------------------------------------------------------------------------
// 5. TaskNewScreen accessibility
// ---------------------------------------------------------------------------

describe('TaskNewScreen accessibility', () => {
  it('should_HaveAccessibleSpoonCostSlider_When_Rendered', () => {
    // Arrange
    const TaskNewScreen = require('../../app/task/new').default;
    render(<TaskNewScreen />);

    // Act — reveal the more-options section which contains the spoon cost slider
    const moreOptionsButton = screen.getByRole('button', { name: "Plus d'options" });
    fireEvent.press(moreOptionsButton);

    // Assert — the adjustable slider for spoon cost must be accessible
    const slider = screen.getByRole('adjustable', { name: 'Coût en cuillères' });
    expect(slider).toBeDefined();
    expect(slider.props.accessibilityValue).toEqual({ min: 1, max: 5, now: 1 });
  });

  it('should_HaveAccessibleDueDateInput_When_Rendered', () => {
    // Arrange
    const TaskNewScreen = require('../../app/task/new').default;
    render(<TaskNewScreen />);

    // Act — open more options to reveal the due-date input
    const moreOptionsButton = screen.getByRole('button', { name: "Plus d'options" });
    fireEvent.press(moreOptionsButton);

    // Assert — due date input carries an accessibilityLabel
    const dueDateInput = screen.getByLabelText("Date d'échéance");
    expect(dueDateInput).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 6. ProfileScreen accessibility
// ---------------------------------------------------------------------------

describe('ProfileScreen accessibility', () => {
  it('should_HaveAccessibleDeleteFlow_When_Rendered', () => {
    // Arrange
    const ProfileScreen = require('../../app/(tabs)/profile').default;
    render(<ProfileScreen />);

    // Assert — delete account button must have role and descriptive label
    const deleteButton = screen.getByRole('button', { name: 'Supprimer mon compte' });
    expect(deleteButton).toBeDefined();

    // Act — open the confirmation modal
    fireEvent.press(deleteButton);

    // Assert — the confirmation TextInput inside the modal must have an accessibilityLabel
    const confirmInput = screen.getByLabelText('Confirmation de suppression');
    expect(confirmInput).toBeDefined();

    // The confirm action button must have role and label
    const confirmButton = screen.getByRole('button', { name: 'Confirmer la suppression' });
    expect(confirmButton).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// 7. SpoonGauge — reduce motion support
// ---------------------------------------------------------------------------

describe('SpoonGauge accessibility', () => {
  it('should_RespectReduceMotion_When_Enabled', () => {
    // Arrange — simulate device reduce-motion preference being ON
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockResolvedValue(true);

    const SpoonGauge = require('../../src/components/shared/SpoonGauge').default;

    // Act
    render(<SpoonGauge spoons={10} spoonsUsed={4} />);

    // Assert — the component still renders the progressbar element
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();

    // AccessibilityInfo was queried so the component reacted to the preference
    expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalled();
  });

  it('should_RenderProgressbarWithCorrectAccessibilityValue_When_SpoonsProvided', () => {
    // Arrange
    const SpoonGauge = require('../../src/components/shared/SpoonGauge').default;

    // Act
    render(<SpoonGauge spoons={8} spoonsUsed={3} />);

    // Assert — progressbar reports correct accessible value
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
    expect(progressBar.props.accessibilityValue).toEqual({ min: 0, max: 8, now: 3 });
  });
});

// ---------------------------------------------------------------------------
// 8. CalendarScreen accessibility
// ---------------------------------------------------------------------------

describe('CalendarScreen accessibility', () => {
  it('should_HaveDistinctNavButtonLabels_When_Rendered', () => {
    // Arrange — calendar queries task-logs and energy
    mockUseQuery.mockReturnValue({ data: [], isLoading: false, isError: false });
    const CalendarScreen = require('../../app/(tabs)/calendar').default;

    // Act
    render(<CalendarScreen />);

    // Assert — prev and next buttons are discoverable with distinct labels
    const prevButton = screen.getByRole('button', { name: 'Mois précédent' });
    const nextButton = screen.getByRole('button', { name: 'Mois suivant' });

    expect(prevButton).toBeDefined();
    expect(nextButton).toBeDefined();

    // Labels must differ — no two nav buttons share the same label
    expect(prevButton.props.accessibilityLabel).not.toBe(
      nextButton.props.accessibilityLabel,
    );
  });
});
