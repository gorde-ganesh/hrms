import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, Subject, firstValueFrom } from 'rxjs';
import { environment } from '../../environment/environment';
import { ApiService } from './api-interface.service';

@Injectable({ providedIn: 'root' })
export class HuddleService {
  private socket: Socket;
  private API_URL = environment.apiUrl;
  private socketUrl = environment.apiUrl;

  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private localStream: MediaStream | null = null;

  /** Fires when a huddle starts/ends in any of the user's conversations (so lists can refresh) */
  huddleChanged$ = new Subject<void>();
  private currentUserId = '';

  activeHuddle$ = new BehaviorSubject<any>(null);
  huddleParticipants$ = new BehaviorSubject<any[]>([]);
  isMuted$ = new BehaviorSubject<boolean>(false);
  isVideoEnabled$ = new BehaviorSubject<boolean>(false);
  localStream$ = new BehaviorSubject<MediaStream | null>(null);
  remoteStreams$ = new BehaviorSubject<Map<string, MediaStream>>(new Map());

  constructor(private serverApiService: ApiService) {
    this.socket = io(this.socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // allow fallback
      reconnection: true,
      withCredentials: true, // send the authToken cookie on the handshake
    });
    this.setupSocketListeners();
  }

  // ==================== Huddle Management ====================

  /** Microphone is required; camera is optional (many machines have none) and starts switched off. */
  private async getLocalMedia(): Promise<MediaStream> {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
    } catch {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    }
    stream.getVideoTracks().forEach((track) => (track.enabled = false));
    return stream;
  }

  /** Tear down media/peers without calling the API (used when the huddle was ended remotely). */
  private resetLocalState() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }
    this.localStream$.next(null);
    this.isVideoEnabled$.next(false);
    this.isMuted$.next(false);
    this.remoteStreams$.next(new Map());
    this.activeHuddle$.next(null);
    this.huddleParticipants$.next([]);
  }

  async startHuddle(conversationId: string, userId: string) {
    try {
      // Get local media stream (audio + video)
      this.currentUserId = userId;
      this.localStream = await this.getLocalMedia();
      this.localStream$.next(this.localStream);

      // Start huddle on backend
      const response: any = await this.serverApiService.post(
        `/api/huddles/start`,
        {
          conversationId,
          userId,
        }
      );

      this.activeHuddle$.next(response);

      // Notify other members via socket
      this.socket.emit('huddle-started', { conversationId, userId });

      return response;
    } catch (error) {
      console.error('Error starting huddle:', error);
      throw error;
    }
  }

  async joinHuddle(huddleId: string, userId: string) {
    try {
      // Get local media stream
      this.currentUserId = userId;
      this.localStream = await this.getLocalMedia();
      this.localStream$.next(this.localStream);

      // Join huddle on backend
      const response: any = await this.serverApiService.post(
        `/api/huddles/${huddleId}/join`,
        {
          userId,
        }
      );
      console.log(response);
      this.activeHuddle$.next(response);

      // Notify other participants
      this.socket.emit('huddle-join', { huddleId, userId });

      return response;
    } catch (error) {
      console.error('Error joining huddle:', error);
      throw error;
    }
  }

  async leaveHuddle(huddleId: string, userId: string) {
    try {
      // Close all peer connections
      this.peerConnections.forEach((pc) => pc.close());
      this.peerConnections.clear();

      // Stop local stream
      if (this.localStream) {
        this.localStream.getTracks().forEach((track) => track.stop());
        this.localStream = null;
        this.isVideoEnabled$.next(false);
        this.isMuted$.next(false);
      }
      this.remoteStreams$.next(new Map());

      // Notify other participants
      this.socket.emit('huddle-leave', { huddleId, userId });

      // Leave huddle on backend
      await this.serverApiService.post(`/api/huddles/${huddleId}/leave`, {
        userId,
      });
    } catch (error) {
      console.error('Error leaving huddle:', error);
    } finally {
      // Always clear local state
      this.activeHuddle$.next(null);
      this.huddleParticipants$.next([]);
    }
  }

  async endHuddle(huddleId: string, userId: string) {
    try {
      await this.serverApiService.post(`/api/huddles/${huddleId}/end`, {
        userId,
      });

      this.socket.emit('huddle-ended', { huddleId });

      await this.leaveHuddle(huddleId, userId);
    } catch (error) {
      console.error('Error ending huddle:', error);
      throw error;
    }
  }

  async getActiveHuddles(userId: string): Promise<any[]> {
    return await this.serverApiService.get<any[]>(
      `/api/huddles/active?userId=${userId}`
    );
  }

  // ==================== WebRTC ====================

  private async createPeerConnection(
    participantId: string
  ): Promise<RTCPeerConnection> {
    const configuration: RTCConfiguration = {
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    };

    const peerConnection = new RTCPeerConnection(configuration);

    // Add local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        peerConnection.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    peerConnection.ontrack = (event) => {
      console.log('Received remote track from:', participantId);
      const currentStreams = this.remoteStreams$.getValue();
      currentStreams.set(participantId, event.streams[0]);
      this.remoteStreams$.next(new Map(currentStreams));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit('huddle-ice-candidate', {
          target: participantId,
          candidate: event.candidate,
        });
      }
    };

    this.peerConnections.set(participantId, peerConnection);
    return peerConnection;
  }

  // ==================== Socket Listeners ====================

  private setupSocketListeners() {
    // When a user joins the huddle
    this.socket.on(
      'huddle-user-joined',
      async (data: { huddleId: string; userId: string }) => {
        console.log('User joined huddle:', data.userId);

        // Create peer connection and send offer
        const pc = await this.createPeerConnection(data.userId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        this.socket.emit('huddle-offer', {
          target: data.userId,
          offer: offer,
        });
      }
    );

    // Receive offer
    this.socket.on(
      'huddle-offer',
      async (data: { from: string; offer: RTCSessionDescriptionInit }) => {
        const pc = await this.createPeerConnection(data.from);
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        this.socket.emit('huddle-answer', {
          target: data.from,
          answer: answer,
        });
      }
    );

    // Receive answer
    this.socket.on(
      'huddle-answer',
      async (data: { from: string; answer: RTCSessionDescriptionInit }) => {
        const pc = this.peerConnections.get(data.from);
        if (pc) {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      }
    );

    // Receive ICE candidate
    this.socket.on(
      'huddle-ice-candidate',
      async (data: { from: string; candidate: RTCIceCandidateInit }) => {
        const pc = this.peerConnections.get(data.from);
        if (pc) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          } catch (err) {
            // A candidate can arrive before the remote description is set; safe to drop
            console.warn('Ignoring ICE candidate', err);
          }
        }
      }
    );

    // User left huddle
    this.socket.on('huddle-user-left', (data: { userId: string }) => {
      const pc = this.peerConnections.get(data.userId);
      if (pc) {
        pc.close();
        this.peerConnections.delete(data.userId);
      }
      const streams = new Map(this.remoteStreams$.getValue());
      if (streams.delete(data.userId)) this.remoteStreams$.next(streams);
    });

    // Huddle ended
    this.socket.on('huddle-ended', (data: { huddleId?: string }) => {
      const activeHuddle = this.activeHuddle$.getValue();
      if (activeHuddle && (!data?.huddleId || data.huddleId === activeHuddle.id)) {
        this.resetLocalState();
      }
      this.huddleChanged$.next();
    });

    this.socket.on('huddle-started-notification', () => this.huddleChanged$.next());
  }

  // ==================== Audio Controls ====================

  toggleMute() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isMuted$.next(!audioTrack.enabled);
      }
    }
  }

  async toggleVideo() {
    const isVideoEnabled = this.isVideoEnabled$.getValue();
    console.log(isVideoEnabled);
    if (isVideoEnabled) {
      // DISABLE VIDEO
      // 1. Stop local track to turn off camera light
      if (this.localStream) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        if (videoTrack) {
          videoTrack.stop();
          this.localStream.removeTrack(videoTrack);
        }
      }

      // 2. Replace track with null in all peers (stops sending but keeps connection)
      for (const pc of this.peerConnections.values()) {
        const videoTransceiver = pc
          .getTransceivers()
          .find((t) => t.receiver.track.kind === 'video');
        if (videoTransceiver && videoTransceiver.sender) {
          await videoTransceiver.sender.replaceTrack(null);
        }
      }

      this.isVideoEnabled$.next(false);
      this.localStream$.next(this.localStream);
    } else {
      // ENABLE VIDEO
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        const newVideoTrack = videoStream.getVideoTracks()[0];

        if (this.localStream) {
          this.localStream.addTrack(newVideoTrack);
        } else {
          this.localStream = new MediaStream([newVideoTrack]);
        }

        // Replace track in all peers
        for (const pc of this.peerConnections.values()) {
          const videoTransceiver = pc
            .getTransceivers()
            .find((t) => t.receiver.track.kind === 'video');
          if (videoTransceiver && videoTransceiver.sender) {
            await videoTransceiver.sender.replaceTrack(newVideoTrack);
          } else {
            // Fallback if no transceiver found (should not happen if initialized correctly)
            // If we really need to add a track, we must renegotiate.
            // But for now, let's assume initialization created the transceiver.
            console.warn('No video transceiver found for peer');
          }
        }

        this.isVideoEnabled$.next(true);
        this.localStream$.next(this.localStream);
      } catch (error) {
        console.error('Error enabling video:', error);
      }
    }
  }

  // ==================== Cleanup ====================

  disconnect() {
    this.peerConnections.forEach((pc) => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.localStream$.next(null);
    this.remoteStreams$.next(new Map());
    this.activeHuddle$.next(null);
    this.huddleParticipants$.next([]);
    this.isMuted$.next(false);
    this.isVideoEnabled$.next(false);

    this.socket.disconnect();
  }
}
