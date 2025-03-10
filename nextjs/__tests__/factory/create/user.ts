import { users } from '@prisma/client';
import prisma from 'client';

export default async function createUser(options?: object): Promise<users> {
  return prisma.users.create({
    data: {
      displayName: 'John Doe',
      profileImageUrl: 'https://foo.com/assets/images/john_doe.svg',
      externalUserId: null,
      isAdmin: false,
      isBot: false,
      accountsId: '1',
      ...options,
    },
  });
}
