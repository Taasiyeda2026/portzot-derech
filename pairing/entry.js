const input=document.querySelector('#roomCode');
const params=new URLSearchParams(location.search);
input.value=params.get('room')||'';
document.querySelector('#secretLogo')?.addEventListener('click',()=>location.assign('admin.html'));
document.querySelector('#startActivityBtn').addEventListener('click',()=>{
 const code=input.value.trim();
 if(!/^[0-9a-f]{32}$/.test(code)){document.querySelector('#joinError').textContent='יש להזין את קוד הפעילות מהמדריכה או לסרוק את ה־QR.';return;}
 location.assign('questionnaire.html?room='+encodeURIComponent(code));
});
