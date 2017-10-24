/* global $, JitsiMeetJS */
const options = {
    hosts: {
        domain: 'uxf.zimbra-vnc.de',
        anonymousdomain: 'external.uxf.zimbra-vnc.de',
        muc: 'conference.external.uxf.zimbra-vnc.de',
        bridge: 'jitsi-videobridge.uxf.zimbra-vnc.de',
        focus: 'focus.uxf.zimbra-vnc.de'
    },
    bosh: 'https://talk.uxf.zimbra-vnc.de/http-bind',
    clientNode: 'VNCtalk',
    useStunTurn: true,
    useIPv6: false,
    // ask for nickname
    useNicks: true,
    clientNode: 'VNCtalk',
    focusUserJid: 'focus@auth.uxf.zimbra-vnc.de',

    etherpad_base: '/etherpad/p/',
    etherpad_extra_options: '',

    //defaultSipNumber: '', // Default SIP number

    disablePrezi: false,

    desktopSharingChromeMethod: 'ext',
    desktopSharingChromeExtId: 'ccommbdjhehjihcilflmcdkooamhcncc',
    desktopSharingChromeSources: ['screen', 'window'],
    desktopSharingChromeMinExtVersion: '0.1',

    desktopSharingFirefoxExtId: 'zimbra-talk-screenshare@vnc.biz',
    desktopSharingFirefoxDisabled: false,
    desktopSharingFirefoxMaxVersionExtRequired: -1,
    desktopSharingFirefoxExtensionURL: 'https://addons.mozilla.org/firefox/downloads/latest/zimbra-talk-screensharing/addon-744463-latest.xpi',

    webrtcIceUdpDisable: false,
    webrtcIceTcpDisable: false,

    openSctp: true, // Toggle to enable/disable SCTP channels
    useRtcpMux: true,
    enableLipSync: true,
    stereo: false,


    // This is an integer, which can be set on a specific video channel.
    //  If set to N for a channel, only the video from the first N other
    //  endpoints in the conference will be sent to the channel.
    //  The endpoints are ordered by the last time they were the "dominant
    //  speaker".
    // https://github.com/jitsi/jitsi-videobridge/blob/master/doc/adaptive-last-n.md
    channelLastN: -1, // The default value of the channel attribute last-n.
    //Adaptive lastN is a feature of Jitsi Videobridge which dynamically
    //  adjusts the value of lastN for a video channel based on the current
    //  network conditions.
    adaptiveLastN: false,

    resolution: '150',

    adaptiveSimulcast: false,
    enableSimulcast: false, // blocks FF support
    enableRecording: false,
    enableWelcomePage: false,
    requireDisplayName: false, //Forces the participants that doesn't have display name to enter it when they enter the room.
    disableAudioLevels: false,
    startAudioMuted: 10, //every participant after the Nth will start audio muted
    startVideoMuted: 10, //every participant after the Nth will start video muted
    defaultLanguage: "en",
    disableStats: true,
    logStats: false,
    disableThirdPartyRequests: true,
    minHDHeight: 540
};

const confOptions = {
    openBridgeChannel: true
};

let connection = null;
let isJoined = false;
let room = null;

let localTracks = [];
const remoteTracks = {};

/**
 * Handles local tracks.
 * @param tracks Array with JitsiTrack objects
 */
function onLocalTracks(tracks) {
    localTracks = tracks;
    console.log('onLocalTracks', tracks);
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
            audioLevel => console.log(`Audio Level local: ${audioLevel}`));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
            () => console.log('local track muted'));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
            () => console.log('local track stoped'));
        localTracks[i].addEventListener(
            JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
            deviceId =>
                console.log(
                    `track audio output device was changed to ${deviceId}`));
        if (localTracks[i].getType() === 'video') {
            $('body').append(`<video autoplay='1' id='localVideo${i}' />`);
            localTracks[i].attach($(`#localVideo${i}`)[0]);
        } else {
            $('body').append(
                `<audio autoplay='1' muted='true' id='localAudio${i}' />`);
            localTracks[i].attach($(`#localAudio${i}`)[0]);
        }
        if (isJoined) {
            room.addTrack(localTracks[i]);
        }
    }
}

/**
 * Handles remote tracks
 * @param track JitsiTrack object
 */
function onRemoteTrack(track) {
    if (track.isLocal()) {
        return;
    }
    const participant = track.getParticipantId();

    if (!remoteTracks[participant]) {
        remoteTracks[participant] = [];
    }
    const idx = remoteTracks[participant].push(track);

    track.addEventListener(
        JitsiMeetJS.events.track.TRACK_AUDIO_LEVEL_CHANGED,
        audioLevel => console.log(`Audio Level remote: ${audioLevel}`));
    track.addEventListener(
        JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
        () => console.log('remote track muted'));
    track.addEventListener(
        JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
        () => console.log('remote track stoped'));
    track.addEventListener(JitsiMeetJS.events.track.TRACK_AUDIO_OUTPUT_CHANGED,
        deviceId =>
            console.log(
                `track audio output device was changed to ${deviceId}`));
    const id = participant + track.getType() + idx;

    if (track.getType() === 'video') {
        $('body').append(
            `<video autoplay='1' id='${participant}video${idx}' />`);
    } else {
        $('body').append(
            `<audio autoplay='1' id='${participant}audio${idx}' />`);
    }
    track.attach($(`#${id}`)[0]);
}

/**
 * That function is executed when the conference is joined
 */
function onConferenceJoined() {
    console.log('conference joined!');
    isJoined = true;
    for (let i = 0; i < localTracks.length; i++) {
        room.addTrack(localTracks[i]);
    }
}

/**
 *
 * @param id
 */
function onUserLeft(id) {
    console.log('user left');
    if (!remoteTracks[id]) {
        return;
    }
    const tracks = remoteTracks[id];

    for (let i = 0; i < tracks.length; i++) {
        tracks[i].detach($(`#${id}${tracks[i].getType()}`));
    }
}

/**
 * That function is called when connection is established successfully
 */
function onConnectionSuccess() {
    console.log('onConnectionSuccess');
    room = connection.initJitsiConference('testssa1', confOptions);
    room.on(JitsiMeetJS.events.conference.TRACK_ADDED, onRemoteTrack);
    room.on(JitsiMeetJS.events.conference.TRACK_REMOVED, track => {
        console.log(`track removed!!!${track}`);
    });
    room.on(
        JitsiMeetJS.events.conference.CONFERENCE_JOINED,
        onConferenceJoined);
    room.on(JitsiMeetJS.events.conference.USER_JOINED, id => {
        console.log('user join');
        remoteTracks[id] = [];
    });
    room.on(JitsiMeetJS.events.conference.USER_LEFT, onUserLeft);
    room.on(JitsiMeetJS.events.conference.TRACK_MUTE_CHANGED, track => {
        console.log(`${track.getType()} - ${track.isMuted()}`);
    });
    room.on(
        JitsiMeetJS.events.conference.DISPLAY_NAME_CHANGED,
        (userID, displayName) => console.log(`${userID} - ${displayName}`));
    room.on(
        JitsiMeetJS.events.conference.TRACK_AUDIO_LEVEL_CHANGED,
        (userID, audioLevel) => console.log(`${userID} - ${audioLevel}`));
    room.on(
        JitsiMeetJS.events.conference.RECORDER_STATE_CHANGED,
        () =>
            console.log(
                `${room.isRecordingSupported()} - ${
                room.getRecordingState()} - ${
                room.getRecordingURL()}`));
    room.on(
        JitsiMeetJS.events.conference.PHONE_NUMBER_CHANGED,
        () => console.log(`${room.getPhoneNumber()} - ${room.getPhonePin()}`));
    room.join();
}

/**
 * This function is called when the connection fail.
 */
function onConnectionFailed() {
    console.error('Connection Failed!');
}

/**
 * This function is called when the connection fail.
 */
function onDeviceListChanged(devices) {
    console.info('current devices', devices);
}

/**
 * This function is called when we disconnect.
 */
function disconnect() {
    console.log('disconnect!');
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
        onConnectionSuccess);
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_FAILED,
        onConnectionFailed);
    connection.removeEventListener(
        JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
        disconnect);
}

/**
 *
 */
function unload() {
    for (let i = 0; i < localTracks.length; i++) {
        localTracks[i].stop();
    }
    room.leave();
    connection.disconnect();
}

let isVideo = true;

/**
 *
 */
function switchVideo() { // eslint-disable-line no-unused-vars
    isVideo = !isVideo;
    if (localTracks[1]) {
        localTracks[1].dispose();
        localTracks.pop();
    } else if (localTracks[0]) {
        localTracks[0].dispose();
        localTracks.pop();
    }
    JitsiMeetJS.createLocalTracks({
        devices: [isVideo ? 'video' : 'desktop']
    })
        .then(tracks => {
            console.log(localTracks);
            localTracks.push(tracks[0]);
            if (localTracks[1]) {
                localTracks[1].addEventListener(
                    JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                    () => console.log('local track muted'));
                localTracks[1].addEventListener(
                    JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                    () => console.log('local track stoped'));
                localTracks[1].attach($('#localVideo')[0]);
                room.addTrack(localTracks[1]);
            } else if (localTracks[0]) {
                localTracks[0].addEventListener(
                    JitsiMeetJS.events.track.TRACK_MUTE_CHANGED,
                    () => console.log('local track muted'));
                localTracks[0].addEventListener(
                    JitsiMeetJS.events.track.LOCAL_TRACK_STOPPED,
                    () => console.log('local track stoped'));
                localTracks[0].attach($('#localVideo')[0]);
                room.addTrack(localTracks[0]);
            }

        })
        .catch(error => console.log(error));
}

/**
 *
 * @param selected
 */
function changeAudioOutput(selected) { // eslint-disable-line no-unused-vars
    JitsiMeetJS.mediaDevices.setAudioOutputDevice(selected.value);
}

$(window).bind('beforeunload', unload);
$(window).bind('unload', unload);

JitsiMeetJS.setLogLevel(JitsiMeetJS.logLevels.INFO);
const initOptions = {
};

JitsiMeetJS.init(initOptions)
    .then(() => {
        connection = new JitsiMeetJS.JitsiConnection(null, null, options);

        connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_ESTABLISHED,
            onConnectionSuccess);
        connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_FAILED,
            onConnectionFailed);
        connection.addEventListener(
            JitsiMeetJS.events.connection.CONNECTION_DISCONNECTED,
            disconnect);

        JitsiMeetJS.mediaDevices.addEventListener(
            JitsiMeetJS.events.mediaDevices.DEVICE_LIST_CHANGED,
            onDeviceListChanged);

        connection.connect();
        JitsiMeetJS.createLocalTracks({ devices: ['audio', 'video'] })
            .then(onLocalTracks)
            .catch(error => {
                console.log('createLocalTracks error', error); // Sensor: for only audio device, it shows this error so we cannot show our local stream
                throw error;
            });
    })
    .catch(error => console.log(error));

if (JitsiMeetJS.mediaDevices.isDeviceChangeAvailable('output')) {
    JitsiMeetJS.mediaDevices.enumerateDevices(devices => {
        const audioOutputDevices
            = devices.filter(d => d.kind === 'audiooutput');

        if (audioOutputDevices.length > 1) {

            $('#audioOutputSelect').html(
                audioOutputDevices
                    .map(
                    d => {
                        console.log('audioOutputDevices', devices);
                        return '<option value="' + d.deviceId + '">' + (d.label || d.deviceId) + '</option>'; // Sensor: The lib to get device information does not work correctly because it cannot show device label here
                    }).join('\n'));

            $('#audioOutputSelectWrapper').show();
        }
    });
}
