const notification = document.getElementById('notification');
const link = `${location.protocol}/${location.host}/${ROOMID}`;

const inviteBtn = document.getElementById('invite-btn');
inviteBtn.addEventListener('click', () => {
    var data = [new ClipboardItem({ "text/plain": new Blob([`${link}`], { type: "text/plain" }) })];

    navigator.clipboard.write(data)
        .then(function() {
            linkNotif('Invite link copied!');
        }, function() {
            linkNotif('Something went wrong.');
        });
})

function linkNotif(message)
{
    notification.innerText = '';
    notification.innerText = message;
    notification.classList.add('shownotif');

    setTimeout(() => {
        notification.classList.remove('shownotif');
    }, 3000);
}


const videoBtn = document.getElementById('video-btn');
videoBtn.addEventListener('click', () => {
    const cam = toggleCamera();
    const camStatus = cam ? 'ON' : 'OFF';
    linkNotif(`Camera turned ${camStatus}`);
    videoBtn.classList.toggle('on');
});

const audioBtn = document.getElementById('audio-btn');
audioBtn.addEventListener('click', () => {
    const audio = toggleAudio();
    const audioStatus = audio ? 'ON' : 'OFF'; 
    linkNotif(`Audio turned ${audioStatus}` );
    audioBtn.classList.toggle('on');
});
