// Janus SIP Client for MarSIP
// Handles WebRTC connection to Janus Gateway for SIP calling

type JanusCallback = (data: any) => void;

interface JanusConfig {
  server: string;
  sipServer: string;
  username: string;
  password: string;
  displayName?: string;
}

interface JanusSession {
  sessionId: number;
  handleId: number;
  ws: WebSocket;
  pc: RTCPeerConnection | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  transactions: Map<string, JanusCallback>;
  registered: boolean;
  inCall: boolean;
}

export type CallStatus = 'idle' | 'registering' | 'registered' | 'calling' | 'ringing' | 'connected' | 'ended' | 'error';

export interface CallOptions {
  callerId?: string;
}

export interface JanusSipClient {
  connect: () => Promise<void>;
  register: () => Promise<void>;
  call: (number: string, options?: CallOptions) => Promise<void>;
  hangup: () => void;
  destroy: () => void;
  onStatusChange: (callback: (status: CallStatus, message?: string) => void) => void;
  onRemoteStream: (callback: (stream: MediaStream) => void) => void;
}

function randomString(len: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < len; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function createJanusSipClient(config: JanusConfig): JanusSipClient {
  let session: JanusSession | null = null;
  let statusCallback: ((status: CallStatus, message?: string) => void) | null = null;
  let remoteStreamCallback: ((stream: MediaStream) => void) | null = null;
  let keepAliveInterval: NodeJS.Timeout | null = null;

  const setStatus = (status: CallStatus, message?: string) => {
    if (statusCallback) statusCallback(status, message);
  };

  const sendMessage = (message: any): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (!session?.ws || session.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const transaction = randomString(12);
      message.transaction = transaction;

      session.transactions.set(transaction, (response) => {
        session?.transactions.delete(transaction);
        if (response.janus === 'error') {
          reject(new Error(response.error?.reason || 'Janus error'));
        } else {
          resolve(response);
        }
      });

      session.ws.send(JSON.stringify(message));

      // Timeout after 10 seconds
      setTimeout(() => {
        if (session?.transactions.has(transaction)) {
          session.transactions.delete(transaction);
          reject(new Error('Request timeout'));
        }
      }, 10000);
    });
  };

  const handleMessage = async (event: MessageEvent) => {
    const msg = JSON.parse(event.data);
    console.log('Janus message:', msg);

    // Handle transaction responses
    if (msg.transaction && session?.transactions.has(msg.transaction)) {
      const callback = session.transactions.get(msg.transaction)!;
      callback(msg);
      return;
    }

    // Handle events
    if (msg.janus === 'event' && msg.plugindata?.data) {
      const data = msg.plugindata.data;
      const jsep = msg.jsep;

      console.log('Janus SIP event data:', JSON.stringify(data));

      // Handle both 'sip' event format and direct result format
      const sipEvent = data.sip === 'event' ? data.result?.event : data.event;

      if (sipEvent || data.sip === 'event') {
        const event = sipEvent || data.result?.event;
        switch (event) {
          case 'registering':
            setStatus('registering');
            break;
          case 'registered':
            if (session) session.registered = true;
            setStatus('registered');
            break;
          case 'registration_failed':
            setStatus('error', data.result?.reason || 'Registration failed');
            break;
          case 'calling':
            setStatus('calling');
            break;
          case 'ringing':
            setStatus('ringing');
            break;
          case 'accepted':
            if (session) session.inCall = true;
            setStatus('connected');
            // Handle remote SDP
            if (jsep && session?.pc) {
              await session.pc.setRemoteDescription(new RTCSessionDescription(jsep));
            }
            break;
          case 'hangup':
            if (session) session.inCall = false;
            setStatus('ended');
            cleanupCall();
            break;
          case 'declining':
          case 'missed':
            setStatus('ended');
            cleanupCall();
            break;
        }
      }

      // Handle incoming SDP answer
      if (jsep && session?.pc && !session.pc.remoteDescription) {
        try {
          await session.pc.setRemoteDescription(new RTCSessionDescription(jsep));
        } catch (e) {
          console.error('Error setting remote description:', e);
        }
      }
    }

    // Handle WebRTC events
    if (msg.janus === 'webrtcup') {
      console.log('WebRTC connection established');
    }

    if (msg.janus === 'media') {
      console.log('Media event:', msg.type, msg.receiving);
    }

    if (msg.janus === 'hangup') {
      setStatus('ended');
      cleanupCall();
    }
  };

  const cleanupCall = () => {
    if (session?.pc) {
      session.pc.close();
      session.pc = null;
    }
    if (session?.localStream) {
      session.localStream.getTracks().forEach(t => t.stop());
      session.localStream = null;
    }
    if (session) {
      session.inCall = false;
      session.remoteStream = null;
    }
  };

  const connect = async (): Promise<void> => {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(config.server, 'janus-protocol');

      ws.onopen = async () => {
        console.log('Janus WebSocket connected');

        session = {
          sessionId: 0,
          handleId: 0,
          ws,
          pc: null,
          localStream: null,
          remoteStream: null,
          transactions: new Map(),
          registered: false,
          inCall: false,
        };

        try {
          // Create session
          const sessionResponse = await sendMessage({ janus: 'create' });
          session.sessionId = sessionResponse.data.id;
          console.log('Janus session created:', session.sessionId);

          // Attach to SIP plugin
          const attachResponse = await sendMessage({
            janus: 'attach',
            session_id: session.sessionId,
            plugin: 'janus.plugin.sip',
          });
          session.handleId = attachResponse.data.id;
          console.log('SIP plugin attached:', session.handleId);

          // Start keepalive
          keepAliveInterval = setInterval(() => {
            if (session?.ws?.readyState === WebSocket.OPEN) {
              session.ws.send(JSON.stringify({
                janus: 'keepalive',
                session_id: session.sessionId,
                transaction: randomString(12),
              }));
            }
          }, 25000);

          resolve();
        } catch (e) {
          reject(e);
        }
      };

      ws.onmessage = handleMessage;

      ws.onerror = (e) => {
        console.error('Janus WebSocket error:', e);
        setStatus('error', 'Connection error');
        reject(e);
      };

      ws.onclose = () => {
        console.log('Janus WebSocket closed');
        if (keepAliveInterval) clearInterval(keepAliveInterval);
        session = null;
      };
    });
  };

  const register = (): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!session) {
        reject(new Error('Not connected'));
        return;
      }

      setStatus('registering');

      // Set up a one-time listener for registration result
      const checkRegistration = () => {
        if (session?.registered) {
          resolve();
          return true;
        }
        return false;
      };

      // Check periodically for registration status (set by handleMessage)
      let attempts = 0;
      const maxAttempts = 100; // 10 seconds max
      const interval = setInterval(() => {
        attempts++;
        if (checkRegistration()) {
          clearInterval(interval);
        } else if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error('Registration timeout'));
        }
      }, 100);

      sendMessage({
        janus: 'message',
        session_id: session.sessionId,
        handle_id: session.handleId,
        body: {
          request: 'register',
          username: `sip:${config.username}@${config.sipServer}`,
          authuser: config.username,
          secret: config.password,
          display_name: config.displayName || config.username,
          proxy: `sip:${config.sipServer}:5060`,
        },
      }).catch((err) => {
        clearInterval(interval);
        reject(err);
      });
    });
  };

  const call = async (number: string, options?: CallOptions): Promise<void> => {
    if (!session || !session.registered) {
      throw new Error('Not registered');
    }

    setStatus('calling');

    // Get user media
    try {
      session.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
    } catch (e) {
      setStatus('error', 'Microphone access denied');
      throw e;
    }

    // Create peer connection
    session.pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });

    // Add local stream
    session.localStream.getTracks().forEach(track => {
      session!.pc!.addTrack(track, session!.localStream!);
    });

    // Handle remote stream
    session.pc.ontrack = (event) => {
      console.log('Remote track received');
      if (event.streams[0]) {
        session!.remoteStream = event.streams[0];
        if (remoteStreamCallback) {
          remoteStreamCallback(event.streams[0]);
        }
      }
    };

    // Note: We don't use trickle ICE - we wait for gathering to complete
    // and send all candidates in the SDP offer

    // Create offer
    const offer = await session.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: false,
    });
    await session.pc.setLocalDescription(offer);

    // Wait for ICE gathering to complete (or timeout after 3 seconds)
    await new Promise<void>((resolve) => {
      if (session!.pc!.iceGatheringState === 'complete') {
        resolve();
        return;
      }

      const timeout = setTimeout(() => {
        console.log('ICE gathering timeout, proceeding with current candidates');
        resolve();
      }, 3000);

      session!.pc!.onicegatheringstatechange = () => {
        if (session!.pc!.iceGatheringState === 'complete') {
          clearTimeout(timeout);
          resolve();
        }
      };
    });

    // Use the complete local description with gathered ICE candidates
    const completeOffer = session.pc.localDescription;

    // Format number for SIP
    let sipUri = number.replace(/\D/g, '');
    // Convert Kazakhstan numbers: +7xxx or 7xxx → 8xxx for trunk dialing
    if (sipUri.length === 11 && sipUri.startsWith('7')) {
      sipUri = '8' + sipUri.slice(1);
    } else if (sipUri.length === 10) {
      sipUri = '8' + sipUri;
    }
    if (!sipUri.startsWith('sip:')) {
      sipUri = `sip:${sipUri}@${config.sipServer}`;
    }

    // Build call body with optional callerId
    const callBody: { request: string; uri: string; from_display_name?: string } = {
      request: 'call',
      uri: sipUri,
    };

    // If callerId is provided, set it as the display name (CallerID)
    if (options?.callerId) {
      callBody.from_display_name = options.callerId;
    }

    // Send call request with complete SDP (including gathered ICE candidates)
    await sendMessage({
      janus: 'message',
      session_id: session.sessionId,
      handle_id: session.handleId,
      body: callBody,
      jsep: completeOffer,
    });

    // Signal that trickle ICE is complete (no more candidates)
    await sendMessage({
      janus: 'trickle',
      session_id: session.sessionId,
      handle_id: session.handleId,
      candidate: { completed: true },
    });
  };

  const hangup = () => {
    if (!session) return;

    if (session.inCall) {
      sendMessage({
        janus: 'message',
        session_id: session.sessionId,
        handle_id: session.handleId,
        body: { request: 'hangup' },
      }).catch(console.error);
    }

    cleanupCall();
    setStatus('ended');
  };

  const destroy = () => {
    hangup();

    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }

    if (session?.ws) {
      session.ws.close();
    }

    session = null;
  };

  return {
    connect,
    register,
    call,
    hangup,
    destroy,
    onStatusChange: (cb) => { statusCallback = cb; },
    onRemoteStream: (cb) => { remoteStreamCallback = cb; },
  };
}
