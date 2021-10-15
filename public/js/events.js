const inviteLink = document.getElementById('invite-link');
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
    inviteLink.innerText = message;
    setTimeout(() => {
        inviteLink.innerText = '';
    }, 3000);
}
