var remoteVideo;
var remoteVideo2;
var remoteVideo3;
var remoteVideo4;
var webRtcPeer;
var ICE_config= {
    'iceServers': [
      {
        'url': 'stun:95.216.146.44:3478'
      }
    ]
  }
window.onload = function() {	
	console.log('Page loaded ...');	
    remoteVideo = document.getElementById('remoteVideo');	
    remoteVideo2 = document.getElementById('remoteVideo2');	
    remoteVideo3 = document.getElementById('remoteVideo3');	
    remoteVideo4 = document.getElementById('remoteVideo4');	
}

var ws = new WebSocket('ws://localhost:8080');

window.onbeforeunload = function() {
    ws.close();
}

ws.onopen = function(event){
    console.log('socket opened');
}

ws.onmessage = function(msg) {    
    var parsedMsg = JSON.parse(msg.data);

    switch (parsedMsg.id){
        case 'error':
            console.error(parsedMsg.message);
        break;

        // add the server's ice candidate to webRtcPeer
        case 'iceCandidate':
            console.log('received ice candidate');
            webRtcPeer.addIceCandidate(parsedMsg.candidate, function(err){
                if(err){
                    console.error('ERROR: ' + err);
                }
            }); 
        break;

        case 'sdpAnswer':
            console.log('SDP answer received, processing..');

            //console.log(parsedMsg.sdpAnswer);

            webRtcPeer.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: parsedMsg.sdpAnswer }));
        break;

        default:
            console.error('Unrecongnized message', parsedMsg);
        break;
    }
}

//
// when a local ice candidate is generated
//
function onIceCandidate(event){
    console.log(`local candidate: ${JSON.stringify(event.candidate)}`);

    if (event.candidate == null) {
        console.log('null candidate');
        return;
    }

    var message = {
        id: 'iceCandidate',
        candidate: event.candidate
    }

    ws.send(JSON.stringify(message));
}

//
// when a sdp offset is created, send the offer to the server
//
function onLocalOfferCreated(err, sdpOffer){
    if(err){
        console.error(err);
    }    

    //
    // remove all other rtp profiles and request only h264 
    //
    let split = sdpOffer.sdp.split('a=rtpmap:96 VP8/90000');
    var h264Sdp = split[0] + "a=rtpmap:96 H264/90000\n";
    sdpOffer.sdp = h264Sdp;

    webRtcPeer.setLocalDescription(sdpOffer);

    var message = {
        id: 'start',
        sdpOffer: sdpOffer.sdp
    }

    console.log('sending local sdp offer');
    ws.send(JSON.stringify(message));
}

//
// On start button click
//
function btnStart(){
    console.log('Creating WebRtcPeer and generating local sdp offer ...');

    //
    // Create the webRtcPeer instance
    // 
    webRtcPeer = new RTCPeerConnection(ICE_config);

    webRtcPeer.onicecandidate = onIceCandidate;
    webRtcPeer.onopen = () => console.log('real time connection has established');
    webRtcPeer.onerror = (err) => console.log(`real time connection error ${err}`);
    webRtcPeer.onaddstream = (event) => {       
        remoteVideo.srcObject = event.stream;
        return;
        remoteVideo.src = window.URL.createObjectURL(event.stream);
        remoteVideo2.src = window.URL.createObjectURL(event.stream);
        remoteVideo3.src = window.URL.createObjectURL(event.stream);
        remoteVideo4.src = window.URL.createObjectURL(event.stream);
    }

    webRtcPeer.createOffer((offer) => onLocalOfferCreated(null, offer), (err) => onLocalOfferCreated(err, null), { offerToReceiveAudio: 0, offerToReceiveVideo: 1 });
}
