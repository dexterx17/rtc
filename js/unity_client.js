var remotelVideo = document.getElementById('remotelVideo');
var localVideo = document.getElementById('localVideo');
let localStream;
let remoteStream;
let localPeerConnection;

const servers = null; // Allows for RTC server configuration.

const callButton = document.getElementById('callButton');
const sendSignalBtn = document.getElementById('sendSignal');
const hangupButton = document.getElementById('hangupButton');

// Set up to exchange only video.
const offerOptions = {
    offerToReceiveVideo: 1,
};

// Let us open a web socket
var ws = new WebSocket("ws://10.211.159.40:12776/callapp");

ws.binaryType = 'arraybuffer';

ws.onopen = function() {

    // Web Socket is connected, send data using send()
    console.log('conectado a ws://10.211.159.40:12776/callapp');

    //me conecto al canal y me autentifico
    var evt_call = {
        type: 3,
        dataType: 2,
        connectionId: new ConnectionId(-1),
        data: 'arsi'
    };
    ws.send(toByteArrayWeb(evt_call, false));


};

ws.onmessage = function(evt) {
    console.log(' --------------------------- onmessage -------------------------- ');

    var raw = evt.data;

    console.log(evt);

    var data = fromByteArrayWeb(raw);

    console.log(data);
    try {
        var json = JSON.parse(data.data);
        //console.log('json');
        //console.log(json);

        if (json.type) {
            switch (json.type) {
                case 'offer':
                    console.log('process offer');
                    handleOffer(json);
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

    } catch (e) {
        console.log('JSON malformado');
        console.log(e);
    }

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

function testCall() {
    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    trace('localPeerConnection createAnswer start.');
    localPeerConnection.createOffer(offerOptions)
        .then(createdAnswer)
        .catch(setSessionDescriptionError);
}

function requestCall() {

    var evt_call = {
        type: 6,
        dataType: 2,
        connectionId: new ConnectionId(-1),
        data: 'arsi'
    };
    ws.send(toByteArrayWeb(evt_call, false));
}

function sendSignal() {

    var e = Math.floor(Math.random() * (2147483647 - 0)) + 0;
    var evt_negotiation = {
        type: 2,
        dataType: 1,
        connectionId: new ConnectionId(16384),
        data: e.toString()
    };
    //sending to server
    var convertido = toByteArrayWeb(evt_negotiation, false);
    console.log('enviando numero randomico al serversillo');
    ws.send(convertido);
}



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

// Logs offer creation and sets peer connection session descriptions.
function createdOffer(description) {
    trace(`Offer from localPeerConnection:\n${description.sdp}`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            var evt_answer = {
                type: 2,
                dataType: 1,
                connectionId: new ConnectionId(16384),
                data: description
            };
            //sending to server
            var convertido = toByteArrayWeb(evt_answer, true);
            console.log('enviando al serversillo');
            ws.send(convertido);
            //setTimeout(sendSignal, 2000);
        }).catch(setSessionDescriptionError);

}

function handleOffer(description) {

    // Create peer connections and add behavior.
    localPeerConnection = new RTCPeerConnection(servers);
    trace('Created local peer connection object localPeerConnection.');

    localPeerConnection.addEventListener('icecandidate', handleConnection);
    localPeerConnection.addEventListener('iceconnectionstatechange', handleConnectionChange);
    localPeerConnection.addEventListener('addstream', handleRemoteStream);
    localPeerConnection.addEventListener('negotiationneeded', function(e) {
        console.log('OnRenegotiationNeeded()');
        console.log(e);
    });
    localPeerConnection.addEventListener('signalingstatechange', function(e) {
        console.log('t.OnSignalingChange()');
        console.log(e);
    });

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

// Handles remote MediaStream success by adding it as the remoteVideo src.
function handleRemoteStream(event) {
    console.log('handle stream!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
    console.log(event);
    const mediaStream = event.stream;
    remoteVideo.srcObject = mediaStream;
    remoteStream = mediaStream;
    trace('Remote peer connection received remote stream.');
}

// Connects with new peer candidate.
function handleConnection(event) {
    const peerConnection = event.target;
    const iceCandidate = event.candidate;
    console.log('iceCandidate: ');
    console.log(event);
    console.log(iceCandidate);
    if (iceCandidate) {
        const newIceCandidate = new RTCIceCandidate(iceCandidate);
        var evt_answer = {
            type: 2,
            dataType: 1,
            connectionId: new ConnectionId(16384),
            data: newIceCandidate
        };
        //sending to server
        var convertido = toByteArrayWeb(evt_answer, true);
        console.log('enviando candidato al serversillo');
        ws.send(convertido);
    }
}

// Logs changes to the connection state.
function handleConnectionChange(event) {
    const peerConnection = event.target;
    console.log('ICE state change event: ', event);
    trace(` ICE state: ` +
        `${peerConnection.iceConnectionState}.`);
}

// Logs answer to offer creation and sets peer connection session descriptions.
function createdAnswer(description) {
    trace(`Answer from localPeerConnection:\n${description.sdp}.`);

    trace('localPeerConnection setLocalDescription start.');
    localPeerConnection.setLocalDescription(description)
        .then(() => {
            console.log('setLocalDescriptionSuccess(localPeerConnection)');
        }).catch(setSessionDescriptionError);

    var evt_answer = {
        type: 2,
        dataType: 1,
        connectionId: new ConnectionId(16384),
        data: description
    };
    //sending to server
    var convertido = toByteArrayWeb(evt_answer, true);
    console.log('enviando al serversillo');
    ws.send(convertido);
}

// Logs error when setting session description fails.
function setSessionDescriptionError(error) {
    trace(`Failed to create session description: ${error.toString()}.`);
}

function fromByteArrayWeb(arr) {
    var datos = new Int8Array(arr);
    //console.log(datos);
    var type = new Int8Array(arr, 0, 1);; //byte
    //console.log('tipo: ' + type);
    var dataType = new Int8Array(arr, 1, 1); //byte
    //console.log('dataType: ' + dataType);
    var id = new Int16Array(arr, 2, 1); //short
    //console.log('id: ' + id);
    var length = new Int32Array(arr, 4, 1);
    length = length[0];
    //console.log('length: ' + length);

    var data = new Int16Array(arr, 8);
    var result = "";
    for (let index = 0; index < data.length; index++) {
        const one = data[index];
        //console.log(one);
        //console.log(String.fromCharCode(one));
        result += String.fromCharCode(one);
    }

    return {
        type: type[0],
        data: result
    };
}

/**
 * Type
 * * 0 => Invalid
 * * 1 => UnreliableMessageReceived
 * * 2 => ReliableMessageReceived
 * * 3 => ServerInitialized
 * * 4 => ServerInitFailed
 * * 5 => ServerClosed
 * * 6 => NewConnection
 * * 7 => ConnectionFailed
 * * 8 => Disconnected
 * * 100 => FatalError
 * * 101 => Warning
 * * 102 => Log"
 * 
 * DataType
 * * 0 => Null
 * * 1 => ByteArray
 * * 2 => UTF16String
 * 
 * @param {array} evt 
 */
function toByteArrayWeb(evt, json) {
    console.log('toByteArrayWeb');
    console.log(evt.data);
    var dat = "";

    if (json) {
        dat = JSON.stringify(evt.data);
    } else {
        console.log('no es json');
        dat = evt.data;
    }

    console.log(dat);
    console.log(dat.length);
    var length = 4 + (dat.length * 2) + 4; //4 bytes are always needed

    //creating the byte array
    var result = new Uint8Array(length);
    result[0] = evt.type;;
    result[1] = evt.dataType;
    //console.log(result);
    //console.log('conID:: ' + evt.connectionId.id);

    var conIdField = new Int16Array(result.buffer, result.byteOffset + 2, 1);
    conIdField[0] = evt.connectionId.id;
    //console.log(result);

    var lengthField = new Uint32Array(result.buffer, result.byteOffset + 4, 1);
    lengthField[0] = dat.length;
    //console.log('lengthDATA: ' + lengthField[0]);

    var dataField = new Uint16Array(result.buffer, result.byteOffset + 8, dat.length);
    for (var i = 0; i < dataField.length; i++) {
        dataField[i] = dat.charCodeAt(i);
    }

    //console.log('result');
    //console.log(result);

    return result;
}


var ConnectionId = (function() {
    function ConnectionId(nid) {
        this.id = nid;
    }
    ConnectionId.INVALID = new ConnectionId(-1);
    return ConnectionId;
}());


callButton.addEventListener('click', requestCall);
sendSignalBtn.addEventListener('click', sendSignal);

// Logs an action (text) and the time when it happened on the console.
function trace(text) {
    text = text.trim();
    const now = (window.performance.now() / 1000).toFixed(3);

    console.log(now, text);
}

var FrameBuffer = function() {
    function e(e) {
        this.mBufferedFrame = null;
        this.mCanvasElement = null;
        this.mIsActive = false;
        this.mMsPerFrame = 1 / 30 * 1e3;
        this.mLastFrame = 0;
        this.mHasVideo = false;
        this.mStream = e;
        if (this.mStream.getVideoTracks().length > 0) this.mHasVideo = true;
        this.SetupElements()
    }
    Object.defineProperty(e.prototype, "Stream", { get: function() { return this.mStream }, enumerable: true, configurable: true });
    Object.defineProperty(e.prototype, "VideoElement", { get: function() { return this.mVideoElement }, enumerable: true, configurable: true });
    e.prototype.SetupElements = function() {
        var e = this;
        this.mVideoElement = this.SetupVideoElement();
        this.mVideoElement.onloadedmetadata = function(t) {
            e.mVideoElement.play();
            if (e.mHasVideo) { e.mCanvasElement = e.SetupCanvas(); if (e.mCanvasElement == null) e.mHasVideo = false } else { e.mCanvasElement = null }
            e.mIsActive = true
        };
        var t = window.URL.createObjectURL(this.mStream);
        this.mVideoElement.src = t
    };
    e.prototype.TryGetFrame = function() {
        var e = this.mBufferedFrame;
        this.mBufferedFrame = null;
        return e
    };
    e.prototype.SetMute = function(e) { this.mVideoElement.muted = e };
    e.prototype.PeekFrame = function() { return this.mBufferedFrame };
    e.prototype.Update = function() {
        if (this.mIsActive && this.mHasVideo && this.mCanvasElement != null) {
            var e = (new Date).getTime();
            var t = e - this.mLastFrame;
            if (t >= this.mMsPerFrame) {
                this.mLastFrame = e;
                this.FrameToBuffer()
            }
        }
    };
    e.prototype.Dispose = function() {
        this.mIsActive = false;
        if (this.mCanvasElement != null && this.mCanvasElement.parentElement != null) { this.mCanvasElement.parentElement.removeChild(this.mCanvasElement) }
        if (this.mVideoElement != null && this.mVideoElement.parentElement != null) { this.mVideoElement.parentElement.removeChild(this.mVideoElement) }
        var e = this.mStream.getVideoTracks();
        for (var t = 0; t < e.length; t++) { e[t].stop() }
        var n = this.mStream.getAudioTracks();
        for (var t = 0; t < n.length; t++) { n[t].stop() }
        this.mStream = null;
        this.mVideoElement = null;
        this.mCanvasElement = null
    };
    e.prototype.CreateFrame = function() {
        var e = this.mCanvasElement.getContext("2d");
        var t = true;
        if (t) { e.clearRect(0, 0, this.mCanvasElement.width, this.mCanvasElement.height) }
        e.drawImage(this.mVideoElement, 0, 0);
        try { var n = e.getImageData(0, 0, this.mCanvasElement.width, this.mCanvasElement.height); var i = n.data; var r = new Uint8Array(i.buffer); return new RawFrame(r, this.mCanvasElement.width, this.mCanvasElement.height) } catch (e) {
            var r = new Uint8Array(this.mCanvasElement.width * this.mCanvasElement.height * 4);
            r.fill(255, 0, r.length - 1);
            return new RawFrame(r, this.mCanvasElement.width, this.mCanvasElement.height)
        }
    };
    e.prototype.FrameToBuffer = function() {
        if (e.sUseLazyFrames) { this.mBufferedFrame = new LazyFrame(this) } else {
            try { this.mBufferedFrame = this.CreateFrame() } catch (e) {
                this.mBufferedFrame = null;
                console.warn("frame skipped due to exception: " + JSON.stringify(e))
            }
        }
    };
    e.prototype.SetupVideoElement = function() {
        var t = document.createElement("video");
        t.width = 320;
        t.height = 240;
        t.controls = true;
        if (e.DEBUG_SHOW_ELEMENTS) document.body.appendChild(t);
        return t
    };
    e.prototype.SetupCanvas = function() {
        if (this.mVideoElement == null || this.mVideoElement.videoWidth <= 0 || this.mVideoElement.videoHeight <= 0) return null;
        var t = document.createElement("canvas");
        t.width = this.mVideoElement.videoWidth;
        t.height = this.mVideoElement.videoHeight;
        if (e.DEBUG_SHOW_ELEMENTS) document.body.appendChild(t);
        return t
    };
    e.prototype.SetVolume = function(e) {
        if (this.mVideoElement == null) { return }
        if (e < 0) e = 0;
        if (e > 1) e = 1;
        this.mVideoElement.volume = e
    };
    e.prototype.HasAudioTrack = function() { if (this.mStream != null && this.mStream.getAudioTracks() != null && this.mStream.getAudioTracks().length > 0) { return true } return false };
    e.prototype.HasVideoTrack = function() { if (this.mStream != null && this.mStream.getVideoTracks() != null && this.mStream.getVideoTracks().length > 0) { return true } return false };
    e.DEBUG_SHOW_ELEMENTS = false;
    e.sUseLazyFrames = false;
    return e
}();