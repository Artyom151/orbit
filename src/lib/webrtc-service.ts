import { Database, ref, set, onValue, off, push, update } from "firebase/database";
import type { Call } from "./types";

const servers = {
    iceServers: [
        {
            urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
        },
    ],
    iceCandidatePoolSize: 10,
};

const createPeerConnection = () => new RTCPeerConnection(servers);

export const listenForCallEnd = (db: Database, callId: string, onCallEnded: () => void) => {
    const callRef = ref(db, `calls/${callId}`);
    const listener = onValue(callRef, (snapshot) => {
        const data = snapshot.val();
        if (data && (data.status === 'ended' || data.status === 'declined')) {
            onCallEnded();
        }
    });
    return () => off(callRef, 'value', listener);
};

export const createOfferAndListenForCandidates = async (db: Database, call: Call, localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void): Promise<RTCPeerConnection> => {
    const pc = createPeerConnection();

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
    
    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            onRemoteStream(event.streams[0]);
        });
    };

    const callDoc = ref(db, `calls/${call.id}`);
    const offerCandidates = ref(db, `calls/${call.id}/offerCandidates`);
    const answerCandidates = ref(db, `calls/${call.id}/answerCandidates`);
    
    pc.onicecandidate = (event) => {
        if (event.candidate) {
            push(offerCandidates, event.candidate.toJSON());
        }
    };

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
        sdp: offerDescription.sdp,
        type: offerDescription.type,
    };

    await update(callDoc, { offer });

    onValue(callDoc, (snapshot) => {
        const data = snapshot.val();
        if (!pc.currentRemoteDescription && data?.answer) {
            const answerDescription = new RTCSessionDescription(data.answer);
            pc.setRemoteDescription(answerDescription);
        }
    });

    onValue(answerCandidates, (snapshot) => {
        if (snapshot.exists()) {
            snapshot.forEach((childSnapshot) => {
                const candidate = new RTCIceCandidate(childSnapshot.val());
                pc.addIceCandidate(candidate);
            });
        }
    });
    
    return pc;
};


export const createAnswerAndListenForCandidates = async (db: Database, call: Call, localStream: MediaStream, onRemoteStream: (stream: MediaStream) => void): Promise<RTCPeerConnection> => {
    const pc = createPeerConnection();

    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));

    pc.ontrack = (event) => {
        event.streams[0].getTracks().forEach(track => {
            onRemoteStream(event.streams[0]);
        });
    };
    
    const callDoc = ref(db, `calls/${call.id}`);
    const offerCandidates = ref(db, `calls/${call.id}/offerCandidates`);
    const answerCandidates = ref(db, `calls/${call.id}/answerCandidates`);

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            push(answerCandidates, event.candidate.toJSON());
        }
    };

    if (call.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(call.offer));
    }
    
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
        type: answerDescription.type,
        sdp: answerDescription.sdp,
    };
    
    await update(callDoc, { answer });
    
    onValue(offerCandidates, (snapshot) => {
        if (snapshot.exists()){
            snapshot.forEach((childSnapshot) => {
                const candidate = new RTCIceCandidate(childSnapshot.val());
                pc.addIceCandidate(candidate);
            });
        }
    });
    
    return pc;
}

export { endCall, acceptCall, declineCall, listenForIncomingCall } from './call-service';