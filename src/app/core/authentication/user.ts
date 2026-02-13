import { User } from './interface';

export const admin: User = {
  id: 1,
  name: 'MechApp Admin',
  email: 'Ola',
  avatar: 'images/mech-app-icon.png',
};

export const guest: User = {
  name: 'unknown',
  email: 'unknown',
  avatar: 'images/avatar-default.jpg',
};
