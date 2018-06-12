var remotelVideo = document.getElementById('remotelVideo');
let localStream;
let remoteStream;
let localPeerConnection;

const servers = null; // Allows for RTC server configuration.

const callButton = document.getElementById('callButton');
const hangupButton = document.getElementById('hangupButton');


// Set up to exchange only video.
const offerOptions = {
    offerToReceiveVideo: 1,
};

// Let us open a web socket
var ws = new WebSocket("ws://10.211.159.40:9000/");

ws.onopen = function() {

    // Web Socket is connected, send data using send()
    console.log('conectado a ws://10.211.159.40:9000/');

    ws.send('client ready');
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
            case 'answer':
                console.log('process answer ');
                handleAnswer(json);
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

    console.log(' --------------------------- end onmessage -------------------------- ');
};

/*navigator.mediaDevices.getUserMedia({ audio: false, video: true })
.then(function(stream) {
    localStream = stream;
}).catch(function(e) {
    console.log('getUserMedia() error:');
    console.log(e);
});*/


//1)Start call
function callAction() {
    //2)Create localPeerConnection
    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    localPeerConnection.addEventListener('addstream', handleRemoteStream);

    //remotePeerConnection.addEventListener('addstream', gotRemoteMediaStream);

    // Add local stream to connection and create offer to connect.
    //localPeerConnection.addStream(localStream);
    //trace('Added local stream to localPeerConnection.');

    trace('localPeerConnection createOffer start.');
    localPeerConnection.createOffer(offerOptions)
        .then(createdOffer).catch(setSessionDescriptionError);
}

// Handles remote MediaStream success by adding it as the remoteVideo src.
function handleRemoteStream(event) {
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
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
    trace(` ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}


// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            sendServer(description);
        }).catch(setSessionDescriptionError);
}

function handleAnswer(description) {

    trace('localPeerConnection setRemoteDescription start.');
    localPeerConnection.setRemoteDescription(description)
        .then(() => {
            console.log('setRemoteDescriptionSuccess(localPeerConnection)');
        }).catch(setSessionDescriptionError);

    /* trace('localPeerConnection createAnswer start.');
    localPeerConnection.createAnswer()
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
    }*/
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
    console.log(error);
}


function sendServer(msg) {
    ws.send(JSON.stringify(msg));
}



// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
}

callButton.addEventListener('click', callAction);
//hangupButton.addEventListener('click', hangupAction);