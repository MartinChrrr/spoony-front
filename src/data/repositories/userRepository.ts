import { userEndpoints } from '../api/endpoints/users';
import { assertOnline } from './utils';

export const userRepository = {
  deleteAccount: async (): Promise<void> => {
    await assertOnline();
    await userEndpoints.deleteMe();
  },
};
