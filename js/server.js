var localVideo = document.getElementById('localVideo');
let localStream;
let localPeerConnection;
let remoteConnection;

const servers = null; // Allows for RTC server configuration.

// Let us open a web socket
var ws = new WebSocket("ws://10.211.159.40:9000/");

ws.onopen = function() {

    // Web Socket is connected, send data using send()
    console.log('conectado a ws://10.211.159.40:9000/');

    ws.send('emisor ready');
};

ws.onmessage = function(evt) {
    console.log(' --------------------------- onmessage -------------------------- ');

    var data = evt.data;
    //try {
    var json = JSON.parse(data);
    console.log(json);
    console.log(json.type);
    if (json.type) {
        switch (json.type) {
            case 'offer':
                console.log('answer call');
                answerCall(json);
                break;
        }
    }
    if (json.candidate) {
        console.log(' ==== candidate ');
        localPeerConnection.addIceCandidate(json)
            .then(() => {
                console.log('handleConnectionSuccess(peerConnection)');
            }).catch((error) => {
                console.log('handleConnectionFailure(peerConnection, error)');
            });
    }
    // } catch (e) {
    //     console.log('JSON malformado');
    // }

    console.log(' --------------------------- end onmessage -------------------------- ');
};

//1)Request local stream
navigator.mediaDevices.getUserMedia({
    video: true
}).then(getLocalMediaStream).catch(function(e) {
    console.log('getUserMedia() error:');
    console.log(e);
});

//2)Recevied local stream
function getLocalMediaStream(mediaStream) {
    localVideo.srcObject = mediaStream;
    localStream = mediaStream;
    trace('Received local stream.');
}

//3)Start call
//4) create LocalPeerConnection
function answerCall(description) {

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);


    // Add local stream to connection and create offer to connect.
    localPeerConnection.addStream(localStream);
    trace('Added local stream to localPeerConnection.');

    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description)
        .then(() => {
            console.log('setRemoteDescriptionSuccess(localPeerConnection)');
        }).catch(setSessionDescriptionError);

    trace('localPeerConnection createAnswer start.');
    localPeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);

}


// Connects with new peer candidate.
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;
    console.log('iceCandidate');
    console.log(iceCandidate);
    if (iceCandidate) {
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        sendServer(iceCandidate);
    }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(`ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
    trace(`Answer from localPeerConnection:\n${description.sdp}.`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            console.log('setRemoteDescriptionSuccess(localPeerConnection)');
        }).catch(setSessionDescriptionError);

    sendServer(description);
}


// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

//Envia un mensaje al servidor websocket
function sendServer(msg) {
    ws.send(JSON.stringify(msg));
}

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
}