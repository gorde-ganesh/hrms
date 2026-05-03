import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Chat } from './chat';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ChatService } from '../../../services/chat.service';
import { HuddleService } from '../../../services/huddle.service';
import { CallService } from '../../../services/call.service';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

describe('Chat', () => {
  let component: Chat;
  let fixture: ComponentFixture<Chat>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Chat, NoopAnimationsModule],
      providers: [
        provideHttpClientTesting(),
        {
          provide: ChatService,
          useValue: {
            messages$: of([]),
            onlineUsers$: of([]),
            typingUsers$: of([]),
            registerUser: () => {},
            listenForMessages: () => {},
            listenForTyping: () => {},
            listenForOnlineStatus: () => {},
            sendMessage: () => {},
            disconnect: () => {},
          },
        },
        {
          provide: HuddleService,
          useValue: {
            activeHuddle$: of(null),
            huddleParticipants$: of([]),
            isMuted$: of(false),
            isVideoEnabled$: of(false),
            localStream$: of(null),
            remoteStreams$: of([]),
            startHuddle: () => Promise.resolve(),
            joinHuddle: () => Promise.resolve(),
            leaveHuddle: () => {},
            toggleMute: () => {},
            toggleVideo: () => {},
          },
        },
        {
          provide: CallService,
          useValue: {
            activeCall$: of(null),
            incomingCall$: of(null),
            isVideoEnabled$: of(false),
            isAudioEnabled$: of(true),
            localStream$: of(null),
            remoteStream$: of(null),
            answerCall: () => {},
            rejectCall: () => {},
            toggleVideo: () => {},
            toggleAudio: () => {},
            endCall: () => {},
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Chat);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
