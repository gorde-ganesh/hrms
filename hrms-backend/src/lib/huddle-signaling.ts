import { Server, Socket } from 'socket.io';
import { prisma } from './prisma';
import { logger } from '../utils/logger';

/**
 * Huddle (group audio/video) signaling.
 *
 * A huddle is a conversation with `huddleActive = true`. Everything here is scoped to that
 * conversation's members, and the acting user always comes from the verified socket identity
 * (never the client payload).
 */

// conversationId -> userIds currently in the huddle (single-instance state)
const participants = new Map<string, Set<string>>();

const room = (userId: string) => `user:${userId}`;

async function memberIds(conversationId: string): Promise<string[]> {
  const rows = await prisma.conversationMember.findMany({
    where: { conversationId },
    select: { userId: true },
  });
  return rows.map((r) => r.userId);
}

async function isMember(conversationId: string, userId: string): Promise<boolean> {
  const row = await prisma.conversationMember.findFirst({
    where: { conversationId, userId },
    select: { id: true },
  });
  return !!row;
}

async function endHuddleFor(io: Server, conversationId: string) {
  participants.delete(conversationId);
  await prisma.conversation
    .update({ where: { id: conversationId }, data: { huddleActive: false } })
    .catch((err) => logger.error(`Failed to deactivate huddle ${conversationId}: ${err}`));
  for (const id of await memberIds(conversationId)) {
    io.to(room(id)).emit('huddle-ended', { huddleId: conversationId });
  }
}

async function leave(io: Server, conversationId: string, userId: string) {
  const set = participants.get(conversationId);
  if (!set || !set.delete(userId)) return;

  for (const other of set) {
    io.to(room(other)).emit('huddle-user-left', { huddleId: conversationId, userId });
  }
  // Nobody left: close the huddle so members don't see a stale "Huddle Active"
  if (set.size === 0) {
    await endHuddleFor(io, conversationId);
  }
}

export function registerHuddleHandlers(io: Server, socket: Socket, userId: string) {
  const relay = (event: string, payloadKey: 'offer' | 'answer' | 'candidate') =>
    socket.on(event, (data: { target: string; huddleId?: string } & Record<string, any>) => {
      if (!data?.target) return;
      // Only relay between people who are both in the same huddle
      const shared = [...participants.values()].some(
        (set) => set.has(userId) && set.has(data.target)
      );
      if (!shared) return;
      io.to(room(data.target)).emit(event, { from: userId, [payloadKey]: data[payloadKey] });
    });

  socket.on('huddle-started', async (data: { conversationId: string }) => {
    try {
      if (!data?.conversationId || !(await isMember(data.conversationId, userId))) return;
      const set = participants.get(data.conversationId) ?? new Set<string>();
      set.add(userId);
      participants.set(data.conversationId, set);

      const [starter, convo] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { name: true } }),
        prisma.conversation.findUnique({
          where: { id: data.conversationId },
          select: { name: true, isGroup: true },
        }),
      ]);
      const where = convo?.isGroup && convo.name ? ` in ${convo.name}` : '';

      for (const id of await memberIds(data.conversationId)) {
        if (id === userId) continue;
        io.to(room(id)).emit('huddle-started-notification', {
          conversationId: data.conversationId,
          userId,
        });
        // App-wide popup, so the receiver is alerted on any page (not only the Chat page)
        io.to(room(id)).emit('notification', {
          title: 'Huddle started',
          type: 'CHAT',
          message: `${starter?.name ?? 'Someone'} started a huddle${where}. Open Chat to join.`,
        });
      }
    } catch (err) {
      logger.error(`huddle-started failed: ${err}`);
    }
  });

  socket.on('huddle-join', async (data: { huddleId: string }) => {
    try {
      if (!data?.huddleId || !(await isMember(data.huddleId, userId))) return;
      const set = participants.get(data.huddleId) ?? new Set<string>();
      const existing = [...set].filter((id) => id !== userId);
      set.add(userId);
      participants.set(data.huddleId, set);

      // Existing participants each send the newcomer an offer
      for (const id of existing) {
        io.to(room(id)).emit('huddle-user-joined', { huddleId: data.huddleId, userId });
      }
    } catch (err) {
      logger.error(`huddle-join failed: ${err}`);
    }
  });

  relay('huddle-offer', 'offer');
  relay('huddle-answer', 'answer');
  relay('huddle-ice-candidate', 'candidate');

  socket.on('huddle-leave', (data: { huddleId: string }) => {
    if (data?.huddleId) void leave(io, data.huddleId, userId);
  });

  // Called once the API has confirmed an admin ended it
  socket.on('huddle-ended', async (data: { huddleId: string }) => {
    try {
      if (!data?.huddleId || !(await isMember(data.huddleId, userId))) return;
      await endHuddleFor(io, data.huddleId);
    } catch (err) {
      logger.error(`huddle-ended failed: ${err}`);
    }
  });

  // Drop this user from any huddle when their last socket goes away
  socket.on('disconnect', () => {
    setTimeout(() => {
      if ((io.sockets.adapter.rooms.get(room(userId))?.size ?? 0) > 0) return;
      for (const conversationId of [...participants.keys()]) {
        void leave(io, conversationId, userId);
      }
    }, 0);
  });
}
