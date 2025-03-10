import { useState } from 'react';
import classNames from 'classnames';
import type { ChannelSerialized } from 'lib/channel';
import NavItem from '../NavItem';
import NavLabel from './NavLabel';
import { Permissions } from 'types/shared';
import Link from 'components/Link/InternalLink';
import NewChannelModal from 'components/Pages/Channel/Content/NewChannelModal';
import useWebsockets from 'hooks/websockets';
import { toast } from 'components/Toast';
import Badge from 'components/Badge';
import styles from './index.module.scss';
import { FiRss, FiBarChart, FiHash } from 'react-icons/fi';
import { useRouter } from 'next/router';
import usePath from 'hooks/path';
import { Mode } from 'hooks/mode';

interface Props {
  mode: Mode;
  channels: ChannelSerialized[];
  channelName: string;
  permissions: Permissions;
  onDrop?({
    source,
    target,
    from,
    to,
  }: {
    source: string;
    target: string;
    to: string;
    from: string;
  }): void;
}

export default function DesktopNavBar({
  mode,
  channelName,
  channels,
  permissions,
  onDrop,
}: Props) {
  const [highlights, setHighlights] = useState<string[]>([]);
  const router = useRouter();

  const userId = permissions.auth?.id || null;
  const token = permissions.token || null;

  useWebsockets({
    room: userId && `user:${userId}`,
    permissions,
    token,
    onNewMessage(payload) {
      if (payload.mention_type === 'signal') {
        const channel = channels.find(
          (channel) => channel.id === payload.channel_id
        );
        if (channel) {
          toast.info(`You were mentioned in #${channel.channelName}`);
        }
      }
      setHighlights((highlights) => {
        return [...highlights, payload.channel_id];
      });
    },
  });

  const paths = {
    feed: usePath({ href: '/feed' }),
    metrics: usePath({ href: '/metrics' }),
  };

  return (
    <div className={styles.navbar}>
      {permissions.feed && (
        <Link onClick={() => setHighlights([])} href="/feed">
          <NavItem active={paths.feed === router.asPath}>
            <FiRss className="mr-1" /> Feed
            {highlights.length > 0 && (
              <Badge className="ml-2">{highlights.length}</Badge>
            )}
          </NavItem>
        </Link>
      )}
      {permissions.manage && (
        <Link onClick={() => setHighlights([])} href="/metrics">
          <NavItem active={paths.metrics === router.asPath}>
            <FiBarChart className="mr-1" /> Metrics
          </NavItem>
        </Link>
      )}
      <NavLabel>
        <div className="grow">Channels</div>
        {permissions.channel_create && !!permissions.accountId && (
          <NewChannelModal communityId={permissions.accountId} />
        )}
      </NavLabel>
      <div>
        {channels.map((channel: ChannelSerialized, index: number) => {
          const count = highlights.reduce((count: number, id: string) => {
            if (id === channel.id) {
              return count + 1;
            }
            return count;
          }, 0);

          function handleDrop(event: React.DragEvent) {
            const id = channel.id;
            const text = event.dataTransfer.getData('text');
            const data = JSON.parse(text);
            if (data.id === id) {
              return event.stopPropagation();
            }
            return onDrop?.({
              source: data.source,
              target: 'channel',
              from: data.id,
              to: id,
            });
          }

          function handleDragEnter(event: React.DragEvent) {
            event.currentTarget.classList.add(styles.hover);
          }

          function handleDragLeave(event: React.DragEvent) {
            event.currentTarget.classList.remove(styles.hover);
          }

          return (
            <Link
              className={classNames(styles.item, {
                [styles.dropzone]: mode === Mode.Drag,
              })}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                setHighlights((highlights) => {
                  return highlights.filter((id) => id !== channel.id);
                });
              }}
              key={`${channel.channelName}-${index}`}
              href={`/c/${channel.channelName}`}
            >
              <NavItem active={channel.channelName === channelName}>
                <FiHash className="mr-1" /> {channel.channelName}
                {count > 0 && <Badge className="ml-2">{count}</Badge>}
              </NavItem>
            </Link>
          );
        })}
      </div>
      <a target="_blank" rel="noreferrer" href="https://www.linen.dev">
        <NavItem>Powered by Linen</NavItem>
      </a>
    </div>
  );
}
