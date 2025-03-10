import { mentions } from '@prisma/client';
import { prisma } from 'client';
import { pushUserMention } from 'services/push';

type MentionNode = {
  type: string;
  id: string;
  source: string;
};

export async function eventNewMentions({
  mentions = [],
  mentionNodes = [],
  channelId,
  threadId,
}: {
  mentions: mentions[];
  mentionNodes: MentionNode[];
  threadId: string;
  channelId: string;
}) {
  for (const mention of mentions) {
    const user = await prisma.users.findUnique({
      where: { id: mention.usersId },
      select: { auth: { select: { id: true } } },
    });

    if (user?.auth?.id) {
      // we could save the mention type in the db instead
      // in that case we'd need to make mentions non unique
      const mentionType = mentionNodes.find(
        (node) => node.id === mention.usersId && node.type === 'signal'
      )
        ? 'signal'
        : 'user';
      await pushUserMention({
        userId: user.auth.id,
        threadId,
        channelId,
        mentionType,
      });
    }
  }
}
