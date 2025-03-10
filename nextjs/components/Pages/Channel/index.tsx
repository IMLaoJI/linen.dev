import React, { useEffect, useState } from 'react';
import PageLayout from 'components/layout/PageLayout';
import { toast } from 'components/Toast';
import { buildChannelSeo } from 'utilities/seo';
import { ChannelSerialized } from 'lib/channel';
import ContentForUsers from 'components/Pages/Channel/Content/ContentForUsers';
import ContentForBots from 'components/Pages/Channel/Content/ContentForBots';
import { SerializedAccount } from 'serializers/account';
import { Settings } from 'serializers/account/settings';
import { SerializedThread } from 'serializers/thread';
import { SerializedMessage } from 'serializers/message';
import { SerializedUser } from 'serializers/user';
import { Permissions } from 'types/shared';
import {
  postReaction,
  mergeThreadsRequest,
  moveMessageToThreadRequest,
  moveMessageToChannelRequest,
  moveThreadToChannelRequest,
} from './Content/utilities/http';
import { createThreadImitation } from './Content/utilities/thread';
import useWebsockets from 'hooks/websockets';
import useThreadWebsockets from 'hooks/websockets/thread';
import { useUsersContext } from 'contexts/Users';
import { ThreadState } from '@prisma/client';

interface Props {
  settings: Settings;
  channelName: string;
  channels?: ChannelSerialized[];
  currentChannel: ChannelSerialized;
  currentCommunity: SerializedAccount | null;
  threads: SerializedThread[];
  pinnedThreads: SerializedThread[];
  isSubDomainRouting: boolean;
  nextCursor: {
    next: string | null;
    prev: string | null;
  };
  pathCursor: string | null;
  isBot: boolean;
  permissions: Permissions;
}

export default function Channel({
  threads: initialThreads,
  pinnedThreads: initialPinnedThreads,
  channels,
  currentChannel,
  currentCommunity,
  settings,
  channelName,
  isSubDomainRouting,
  nextCursor,
  pathCursor,
  isBot,
  permissions,
}: Props) {
  const [threads, setThreads] = useState<SerializedThread[]>(initialThreads);
  const [pinnedThreads, setPinnedThreads] =
    useState<SerializedThread[]>(initialPinnedThreads);
  const [currentThreadId, setCurrentThreadId] = useState<string>();
  const [allUsers] = useUsersContext();

  const currentUser = permissions.user || null;
  const token = permissions.token || null;

  useEffect(() => {
    setThreads(initialThreads);
    setCurrentThreadId(undefined);
  }, [initialThreads]);

  useEffect(() => {
    setPinnedThreads(initialPinnedThreads);
    setCurrentThreadId(undefined);
  }, [initialPinnedThreads]);

  useWebsockets({
    room: `room:lobby:${currentChannel.id}`,
    token,
    permissions,
    onNewMessage(payload) {
      try {
        if (payload.is_reply) {
          const threadId = payload.thread_id;
          const messageId = payload.message_id;
          const imitationId = payload.imitation_id;
          const message: SerializedMessage =
            payload.message && JSON.parse(payload.message);
          if (!message) {
            return;
          }
          setThreads((threads) => {
            const index = threads.findIndex(({ id }) => id === threadId);
            const newThreads = [...threads];
            if (index > -1) {
              newThreads[index].messages = [
                ...newThreads[index].messages.filter(
                  ({ id }) => id !== imitationId && id !== messageId
                ),
                message,
              ];
            }
            return newThreads;
          });
        }

        if (payload.is_thread) {
          const threadId = payload.thread_id;
          const imitationId = payload.imitation_id;
          const thread: SerializedThread =
            payload.thread && JSON.parse(payload.thread);
          if (!thread) {
            return;
          }
          setThreads((threads) => [
            ...threads.filter(
              ({ id }) => id !== imitationId && id !== threadId
            ),
            thread,
          ]);
        }
      } catch (e) {
        if (process.env.NODE_ENV === 'development') {
          console.log(e);
        }
      }
    },
  });

  useThreadWebsockets({
    id: currentThreadId,
    token,
    permissions,
    onMessage(message, messageId, imitationId) {
      setThreads((threads) => {
        return threads.map((thread) => {
          if (thread.id === currentThreadId) {
            return {
              ...thread,
              messages: [
                ...thread.messages.filter(
                  ({ id }: any) => id !== imitationId && id !== messageId
                ),
                message,
              ],
            };
          }
          return thread;
        });
      });
    },
  });

  function onSelectThread(thread: SerializedThread) {
    setCurrentThreadId(thread.id);
  }

  async function pinThread(threadId: string) {
    const thread = threads.find(({ id }) => id === threadId);
    if (!thread) {
      return;
    }
    const newPinned = !thread.pinned;
    setThreads((threads) => {
      return threads.map((thread) => {
        if (thread.id === threadId) {
          return { ...thread, pinned: newPinned };
        }
        return thread;
      });
    });
    setPinnedThreads((pinnedThreads) => {
      if (newPinned) {
        return [...pinnedThreads, { ...thread, pinned: true }];
      } else {
        return pinnedThreads.filter(({ id }) => id !== threadId);
      }
    });
    return fetch(`/api/threads/${thread.id}`, {
      method: 'PUT',
      body: JSON.stringify({ pinned: newPinned }),
    })
      .then((response) => {
        if (response.ok) {
          return;
        }
        throw new Error('Failed to pin the thread.');
      })
      .catch((exception) => {
        alert(exception.message);
      });
  }

  async function sendReaction({
    threadId,
    messageId,
    type,
    active,
  }: {
    threadId: string;
    messageId: string;
    type: string;
    active: boolean;
  }) {
    function addReaction(threads: SerializedThread[]) {
      if (!currentUser) {
        return threads;
      }
      return threads.map((thread) => {
        if (thread.id === threadId) {
          return {
            ...thread,
            messages: thread.messages.map((message) => {
              if (message.id === messageId) {
                const reaction = message.reactions.find(
                  (reaction) => reaction.type === type
                );
                if (!reaction) {
                  return {
                    ...message,
                    reactions: [
                      ...message.reactions,
                      { type, count: 1, users: [currentUser] },
                    ],
                  };
                }

                if (active) {
                  return {
                    ...message,
                    reactions: message.reactions
                      .filter((reaction) => {
                        if (
                          reaction.type === type &&
                          reaction.count - 1 === 0
                        ) {
                          return false;
                        }
                        return true;
                      })
                      .map((reaction) => {
                        if (reaction.type === type) {
                          const count = reaction.count - 1;
                          return {
                            type,
                            count,
                            users: reaction.users.filter(
                              ({ id }) => id !== currentUser.id
                            ),
                          };
                        }
                        return reaction;
                      }),
                  };
                }

                return {
                  ...message,
                  reactions: message.reactions.map((reaction) => {
                    if (reaction.type === type) {
                      return {
                        type,
                        count: reaction.count + 1,
                        users: [...reaction.users, currentUser],
                      };
                    }
                    return reaction;
                  }),
                };
              }
              return message;
            }),
          };
        }
        return thread;
      });
    }
    setThreads(addReaction);
    setPinnedThreads(addReaction);
    postReaction({
      communityId: currentCommunity?.id,
      messageId,
      type,
      action: active ? 'decrement' : 'increment',
    });
  }

  const mergeThreads = ({ from, to }: { from: string; to: string }) => {
    const source = threads.find((thread) => thread.id === from);
    const target = threads.find((thread) => thread.id === to);

    setThreads((threads) => {
      if (!source || !target) {
        return threads;
      }
      return threads
        .map((thread) => {
          if (thread.id === from) {
            return null;
          }
          if (thread.id === to) {
            return {
              ...thread,
              messages: [...thread.messages, ...source.messages].sort(
                (a, b) => {
                  return (
                    new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
                  );
                }
              ),
            };
          }
          return thread;
        })
        .filter(Boolean) as SerializedThread[];
    });
    if (!source || !target) {
      return Promise.resolve();
    }
    return mergeThreadsRequest({
      from: source.id,
      to: target.id,
      communityId: currentCommunity?.id,
    });
  };

  const moveMessageToThread = ({
    messageId,
    threadId,
  }: {
    messageId: string;
    threadId: string;
  }) => {
    const messages = [...threads.map((thread) => thread.messages)].flat();
    const message = messages.find(({ id }) => id === messageId);

    setThreads((threads) => {
      if (!message) {
        return threads;
      }
      return threads
        .map((thread) => {
          if (thread.id === threadId) {
            const ids = thread.messages.map(({ id }) => id);
            if (ids.includes(messageId)) {
              return thread;
            }
            return {
              ...thread,
              messages: [...thread.messages, message].sort((a, b) => {
                return (
                  new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
                );
              }),
            };
          }
          const ids = thread.messages.map(({ id }) => id);
          if (ids.includes(messageId)) {
            return {
              ...thread,
              messages: thread.messages.filter(({ id }) => id !== messageId),
            };
          }
          return thread;
        })
        .filter(Boolean) as SerializedThread[];
    });

    return moveMessageToThreadRequest({
      messageId,
      threadId,
      communityId: currentCommunity?.id,
    });
  };

  const moveThreadToChannel = ({
    threadId,
    channelId,
  }: {
    threadId: string;
    channelId: string;
  }) => {
    setThreads((threads) => {
      return threads.filter((thread) => {
        if (thread.id === threadId && thread.channelId !== channelId) {
          return false;
        }
        return true;
      });
    });

    return moveThreadToChannelRequest({
      threadId,
      channelId,
      communityId: currentCommunity?.id,
    });
  };

  const moveMessageToChannel = ({
    messageId,
    channelId,
  }: {
    messageId: string;
    channelId: string;
  }) => {
    const messages = [...threads.map((thread) => thread.messages)].flat();
    const message = messages.find(({ id }) => id === messageId);
    if (!message) {
      return;
    }
    const imitation =
      currentChannel.id === channelId &&
      createThreadImitation({
        message: message.body,
        files: message.attachments.map((attachment) => {
          return {
            id: attachment.name,
            url: attachment.url,
          };
        }),
        author: message.author as SerializedUser,
        mentions: allUsers,
        channel: currentChannel,
      });

    setThreads((threads) => {
      const result = threads.map((thread) => {
        const ids = thread.messages.map(({ id }) => id);
        if (ids.includes(messageId)) {
          return {
            ...thread,
            messages: thread.messages.filter(({ id }) => id !== messageId),
          };
        }

        return thread;
      });

      if (imitation) {
        return [...result, imitation];
      }

      return result;
    });

    return moveMessageToChannelRequest({
      messageId,
      channelId,
      communityId: currentCommunity?.id,
    }).then((thread: SerializedThread) => {
      setThreads((threads) => {
        if (imitation) {
          return threads.map((current) => {
            if (current.id === imitation.id) {
              return thread;
            }
            return current;
          });
        }
        return threads;
      });
    });
  };

  const updateThread = ({
    state: newState,
    title: newTitle,
  }: {
    state?: ThreadState;
    title?: string;
  }) => {
    if (!currentThreadId) {
      return;
    }
    const options: { state?: ThreadState; title?: string } = {};
    if (newState) {
      options.state = newState;
    }
    if (newTitle) {
      options.title = newTitle;
    }
    setThreads((threads) => {
      return threads.map((thread) => {
        if (thread.id === currentThreadId) {
          return {
            ...thread,
            ...options,
          };
        }
        return thread;
      });
    });
    return fetch(`/api/threads/${currentThreadId}`, {
      method: 'PUT',
      body: JSON.stringify(options),
    })
      .then((response) => {
        if (response.ok) {
          return;
        }
        throw new Error('Failed to close the thread.');
      })
      .catch((exception) => {
        toast.error(exception.message);
      });
  };

  function onChannelDrop({
    source,
    target,
    from,
    to,
  }: {
    source: string;
    target: string;
    from: string;
    to: string;
  }) {
    if (source === 'thread' && target === 'channel') {
      return moveThreadToChannel({ threadId: from, channelId: to });
    } else if (source === 'message' && target === 'channel') {
      return moveMessageToChannel({ messageId: from, channelId: to });
    }
  }

  function onThreadDrop({
    source,
    target,
    from,
    to,
  }: {
    source: string;
    target: string;
    from: string;
    to: string;
  }) {
    if (source === 'thread' && target === 'thread') {
      return mergeThreads({ from, to });
    } else if (source === 'message' && target === 'thread') {
      return moveMessageToThread({
        messageId: from,
        threadId: to,
      });
    } else if (source === 'message' && target === 'channel') {
      return moveMessageToChannel({ messageId: from, channelId: to });
    }
  }

  return (
    <PageLayout
      currentChannel={currentChannel}
      seo={{
        ...buildChannelSeo({
          settings,
          channelName,
          isSubDomainRouting,
          pathCursor,
          threads,
        }),
      }}
      channels={channels as ChannelSerialized[]}
      settings={settings}
      isSubDomainRouting={isSubDomainRouting}
      permissions={permissions}
      onDrop={onChannelDrop}
    >
      {isBot ? (
        <ContentForBots
          threads={threads}
          settings={settings}
          channelName={channelName}
          isSubDomainRouting={isSubDomainRouting}
          nextCursor={nextCursor}
          isBot={isBot}
          permissions={permissions}
        />
      ) : (
        <ContentForUsers
          threads={threads}
          pinnedThreads={pinnedThreads}
          currentChannel={currentChannel}
          currentCommunity={currentCommunity}
          settings={settings}
          channelName={channelName}
          isSubDomainRouting={isSubDomainRouting}
          nextCursor={nextCursor}
          pathCursor={pathCursor}
          isBot={isBot}
          permissions={permissions}
          currentThreadId={currentThreadId}
          setThreads={setThreads}
          pinThread={pinThread}
          onDrop={onThreadDrop}
          sendReaction={sendReaction}
          onSelectThread={onSelectThread}
          updateThread={updateThread}
        />
      )}
    </PageLayout>
  );
}
