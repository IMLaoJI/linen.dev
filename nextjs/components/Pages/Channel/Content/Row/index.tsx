import DraggableRow from 'components/Pages/Channel/Content/Row/DraggableRow';
import Avatars from '../../../../Avatars';
import type { Settings } from 'serializers/account/settings';
import Row from 'components/Message/Row';
import styles from './index.module.scss';
import { SerializedThread } from 'serializers/thread';
import { SerializedUser } from 'serializers/user';
import { Permissions } from 'types/shared';
import { Mode } from 'hooks/mode';

export const uniqueUsers = (users: SerializedUser[]): SerializedUser[] => {
  let userMap = new Map<string, SerializedUser>();

  users.forEach((user) => {
    userMap.set(user.id, user);
  });

  return Array.from(userMap.values());
};

export default function ChannelRow({
  className,
  thread,
  permissions,
  isSubDomainRouting,
  settings,
  currentUser,
  mode,
  onPin,
  onReaction,
  onDrop,
}: {
  className?: string;
  thread: SerializedThread;
  permissions: Permissions;
  isSubDomainRouting: boolean;
  settings: Settings;
  currentUser: SerializedUser | null;
  mode?: Mode;
  onPin?(threadId: string): void;
  onReaction?({
    threadId,
    messageId,
    type,
    active,
  }: {
    threadId: string;
    messageId: string;
    type: string;
    active: boolean;
  }): void;
  onDrop?({
    source,
    target,
    from,
    to,
  }: {
    source: string;
    target: string;
    from: string;
    to: string;
  }): void;
}) {
  const { messages } = thread;
  const message = messages[0];
  let users = messages.map((m) => m.author).filter(Boolean) as SerializedUser[];
  const authors = uniqueUsers(users);
  const avatars = authors
    .filter((user) => user.id !== message.author?.id)
    .map((a) => ({
      src: a.profileImageUrl,
      text: a.displayName,
    }));

  const owner = currentUser ? currentUser.id === message.usersId : false;

  return (
    <DraggableRow
      id={thread.id}
      className={styles.container}
      draggable={permissions.manage || owner}
      onDrop={onDrop}
      mode={mode}
    >
      <div className={styles.content}>
        <Row
          className={className}
          thread={thread}
          message={message}
          isSubDomainRouting={isSubDomainRouting}
          settings={settings}
          permissions={permissions}
          currentUser={currentUser}
          mode={mode}
          onPin={onPin}
          onReaction={onReaction}
        >
          {messages.length > 1 && (
            <div className={styles.footer}>
              <Avatars size="sm" users={avatars} />
              <>
                {messages.length - 1}{' '}
                {messages.length > 2 ? 'replies' : 'reply'} &middot;{' '}
                {`${authors.length} participant${
                  authors.length > 1 ? 's' : ''
                }`}
              </>
            </div>
          )}
        </Row>
      </div>
    </DraggableRow>
  );
}
