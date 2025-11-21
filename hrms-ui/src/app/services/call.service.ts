import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environment/environment';
import { ApiService } from './api-interface.service';

@Injectable({ providedIn: 'root' })
export class CallService {
  private socket: Socket;
  private API_URL = environment.apiUrl;
  private socketUrl = environment.apiUrl;

  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  activeCall$ = new BehaviorSubject<any>(null);
  incomingCall$ = new BehaviorSubject<any>(null);
  localStream$ = new BehaviorSubject<MediaStream | null>(null);
  remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  isVideoEnabled$ = new BehaviorSubject<boolean>(true);
  isAudioEnabled$ = new BehaviorSubject<boolean>(true);

  constructor(private serverApiService: ApiService) {
    this.socket = io(this.socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'], // allow fallback
      reconnection: true,
      // auth: { token: '...' } // optional
    });
    this.setupSocketListeners();
  }

  // ==================== Call Management ====================

  async initiateCall(
    receiverId: string,
    callType: 'audio' | 'video',
    callerId: string
  ) {
    try {
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: callType === 'video',
      });

      this.localStream$.next(this.localStream);

      // Create call log in backend
      const callLog: any = await this.serverApiService.post(
        `/api/calls/start`,
        {
          callerId,
          receiverId,
          callType,
        }
      );

      this.activeCall$.next(callLog);

      // Setup peer connection
      await this.setupPeerConnection();

      // Create and send offer
      const offer = await this.peerConnection!.createOffer();
      await this.peerConnection!.setLocalDescription(offer);

      this.socket.emit('call-user', {
        target: receiverId,
        callId: callLog.id,
        callType,
        offer: offer,
      });

      return callLog;
    } catch (error) {
      console.error('Error initiating call:', error);
      throw error;
    }
  }

  async answerCall(callId: string) {
    try {
      const call = this.incomingCall$.getValue();
      if (!call) return;

      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: call.callType === 'video',
      });

      this.localStream$.next(this.localStream);

      // Setup peer connection
      await this.setupPeerConnection();

      // Set remote description
      await this.peerConnection!.setRemoteDescription(
        new RTCSessionDescription(call.offer)
      );

      // Create and send answer
      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.socket.emit('call-answer', {
        target: call.from,
        answer: answer,
      });

      this.activeCall$.next({ id: callId, ...call });
      this.incomingCall$.next(null);
    } catch (error) {
      console.error('Error answering call:', error);
      throw error;
    }
  }

  rejectCall() {
    const call = this.incomingCall$.getValue();
    if (call) {
      this.socket.emit('call-rejected', { target: call.from });
      this.incomingCall$.next(null);
    }
  }

  async endCall() {
    const call = this.activeCall$.getValue();
    if (call) {
      // Update call log
      await this.serverApiService.post(`/api/calls/end`, { callId: call.id });

      this.socket.emit('call-ended', { callId: call.id });
    }

    this.cleanup();
  }

  // ==================== WebRTC Setup ====================

  private async setupPeerConnection() {
    const configuration: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    };

    this.peerConnection = new RTCPeerConnection(configuration);

    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        this.peerConnection!.addTrack(track, this.localStream!);
      });
    }

    // Handle incoming tracks
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.remoteStream$.next(this.remoteStream);
    };

    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        const call =
          this.activeCall$.getValue() || this.incomingCall$.getValue();
        if (call) {
          this.socket.emit('ice-candidate', {
            target: call.from || call.receiverId,
            candidate: event.candidate,
          });
        }
      }
    };

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection?.connectionState);
      if (
        this.peerConnection?.connectionState === 'disconnected' ||
        this.peerConnection?.connectionState === 'failed'
      ) {
        this.endCall();
      }
    };
  }

  // ==================== Socket Listeners ====================

  private setupSocketListeners() {
    // Incoming call
    this.socket.on('incoming-call', (data: any) => {
      this.incomingCall$.next(data);
    });

    // Call answered
    this.socket.on(
      'call-answered',
      async (data: { answer: RTCSessionDescriptionInit }) => {
        if (this.peerConnection) {
          await this.peerConnection.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
        }
      }
    );

    // ICE candidate
    this.socket.on(
      'ice-candidate',
      async (data: { candidate: RTCIceCandidateInit }) => {
        if (this.peerConnection) {
          await this.peerConnection.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
        }
      }
    );

    // Call ended
    this.socket.on('call-ended', () => {
      this.cleanup();
    });

    // Call rejected
    this.socket.on('call-rejected', () => {
      this.cleanup();
    });
  }

  // ==================== Media Controls ====================

  toggleVideo() {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        this.isVideoEnabled$.next(videoTrack.enabled);
      }
    }
  }

  toggleAudio() {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        this.isAudioEnabled$.next(audioTrack.enabled);
      }
    }
  }

  // ==================== Cleanup ====================

  private cleanup() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    this.localStream$.next(null);
    this.remoteStream$.next(null);
    this.activeCall$.next(null);
    this.incomingCall$.next(null);
    this.isVideoEnabled$.next(true);
    this.isAudioEnabled$.next(true);
  }

  disconnect() {
    this.cleanup();
    this.socket.disconnect();
  }
}
