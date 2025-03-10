import React from 'react';
import Avatar from 'components/Avatar';
import classNames from 'classnames';
import DraggableRow from './DraggableRow';
import Message from '../../Message';
import { format } from 'utilities/date';
import { SerializedThread } from 'serializers/thread';
import { SerializedMessage } from 'serializers/message';
import { Settings } from 'serializers/account/settings';
import { SerializedUser } from 'serializers/user';
import { ThreadState } from '@prisma/client';
import styles from './index.module.scss';
import CheckIcon from 'components/icons/CheckIcon';
import Actions from 'components/Actions';
import { Permissions } from 'types/shared';
import { Mode } from 'hooks/mode';

interface Props {
  className?: string;
  thread: SerializedThread;
  message: SerializedMessage;
  isPreviousMessageFromSameUser?: boolean;
  isSubDomainRouting: boolean;
  settings: Settings;
  permissions: Permissions;
  children?: React.ReactNode;
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
}

export function Row({
  className,
  thread,
  message,
  isPreviousMessageFromSameUser,
  children,
  isSubDomainRouting,
  currentUser,
  settings,
  permissions,
  mode,
  onReaction,
  onPin,
}: Props) {
  const top = !isPreviousMessageFromSameUser;
  const owner = currentUser ? currentUser.id === message.usersId : false;
  const draggable = permissions.manage || owner;
  return (
    <DraggableRow
      id={message.id}
      className={classNames(className, styles.row, {
        [styles.top]: top,
      })}
      draggable={draggable}
      mode={mode}
    >
      <div className={styles.left}>
        {top ? (
          <Avatar
            size="lg"
            src={message.author?.profileImageUrl}
            text={message.author?.displayName}
          />
        ) : (
          <span className={styles.date}>{format(message.sentAt, 'p')}</span>
        )}
      </div>
      <div className={styles.content}>
        {top && (
          <div className={styles.header}>
            <p className={styles.username}>
              {message.author?.displayName || 'user'}
            </p>
            <div className={styles.date}>{format(message.sentAt, 'Pp')}</div>
            {thread.state === ThreadState.CLOSE && <CheckIcon />}
          </div>
        )}
        <div
          className={classNames(styles.message, {
            [styles.top]: top,
            [styles.basic]: !top,
          })}
        >
          <Message
            text={message.body}
            format={message.messageFormat}
            mentions={message.mentions}
            reactions={message.reactions}
            attachments={message.attachments}
            currentUser={currentUser}
          />
          {children}
          <div className={styles.actions}>
            <Actions
              thread={thread}
              message={message}
              settings={settings}
              permissions={permissions}
              currentUser={currentUser}
              isSubDomainRouting={isSubDomainRouting}
              onPin={onPin}
              onReaction={onReaction}
            />
          </div>
        </div>
      </div>
    </DraggableRow>
  );
}

export default Row;
