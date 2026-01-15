// ------------------ FIREBASE CONFIG ------------------
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin credentials
const ADMIN_EMAIL = "joyreuben122@gmail.com";
const ADMIN_PASS = "Joyie";

// ------------------ AUTH FUNCTIONS ------------------
function showSection(section){
  document.querySelectorAll('.dashboard,.investment,.history,.admin').forEach(s => s.style.display='none');
  document.getElementById(section).style.display = 'block';
}

// Login
async function login(){
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  try{
    if(email === ADMIN_EMAIL && password === ADMIN_PASS){
      document.getElementById('adminBtn').style.display='inline';
      showSection('admin');
      renderAdmin();
      document.getElementById('loginModal').style.display='none';
      return;
    }
    await auth.signInWithEmailAndPassword(email, password);
    document.getElementById('loginModal').style.display='none';
    showSection('dashboard');
    loadDashboard();
  } catch(e){
    document.getElementById('loginError').innerText = e.message;
  }
}

// Register
async function register(){
  const name = document.getElementById('rname').value;
  const email = document.getElementById('remail').value;
  const password = document.getElementById('rpass').value;
  const dob = document.getElementById('rdob').value;
  const address = document.getElementById('raddress').value;
  const phone = document.getElementById('rphone').value;

  try{
    const userCred = await auth.createUserWithEmailAndPassword(email,password);
    await db.collection('users').doc(userCred.user.uid).set({
      name,address,phone,email,dob,
      main:0,profit:0,
      created:firebase.firestore.Timestamp.now(),
      transactions:[],
      activity:[{msg:"Account created", time:firebase.firestore.Timestamp.now()}]
    });
    alert('Account Created! Login Now.');
    document.getElementById('registerModal').style.display='none';
    document.getElementById('loginModal').style.display='flex';
  }catch(e){
    alert(e.message);
  }
}

// Logout
function logout(){ auth.signOut(); location.reload(); }

// ------------------ DASHBOARD FUNCTIONS ------------------
async function loadDashboard(){
  const user = auth.currentUser;
  if(!user) return;
  const doc = await db.collection('users').doc(user.uid).get();
  const data = doc.data();

  document.getElementById('mainBalance').innerText = '$'+data.main.toFixed(2);
  document.getElementById('profitBalance').innerText = '$'+data.profit.toFixed(2);
  document.getElementById('totalBalance').innerText = '$'+(data.main+data.profit).toFixed(2);

  // Populate transactions table
  const tbody = document.querySelector('#transactionTable tbody');
  tbody.innerHTML = '';
  data.transactions.slice(-10).reverse().forEach(tx=>{
    const row = document.createElement('tr');
    row.innerHTML=`<td>${tx.date}</td><td>${tx.type}</td><td>$${tx.amount}</td><td>$${tx.balance}</td>`;
    tbody.appendChild(row);
  });

  // Populate live activity feed
  const activity = document.getElementById('activityFeed');
  activity.innerHTML = data.activity.map(a=>`<div>${a.msg} (${new Date(a.time.toDate()).toLocaleString()})</div>`).join('');

  // Charts
  updateCharts(data.transactions);
  updateWithdrawStatus(data.created.toDate());
}

// ------------------ INVEST ------------------
async function invest(){
  const user = auth.currentUser;
  const planSelect = document.getElementById('planSelect');
  const amount = parseFloat(document.getElementById('investAmount').value);
  if(!amount) return alert('Enter amount');

  const plan = planSelect.options[planSelect.selectedIndex];
  const ret = parseFloat(plan.dataset.return);

  const userRef = db.collection('users').doc(user.uid);
  const doc = await userRef.get();
  const data = doc.data();

  const newTransaction = {
    date: new Date().toLocaleString(),
    type:`Invest ${plan.text}`,
    amount,
    balance:data.main + amount
  };
  const newActivity = {msg:`Invested $${amount} in ${plan.text}`,time:firebase.firestore.Timestamp.now()};

  await userRef.update({
    main: data.main + amount,
    profit: data.profit + amount*ret,
    transactions: firebase.firestore.FieldValue.arrayUnion(newTransaction),
    activity: firebase.firestore.FieldValue.arrayUnion(newActivity)
  });

  loadDashboard();
}

// ------------------ PDF ------------------
async function downloadPDF(){
  const user = auth.currentUser;
  const docSnap = await db.collection('users').doc(user.uid).get();
  const data = docSnap.data();
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text("Account Statement",10,10);
  pdf.text(`Balance: $${data.main}`,10,20);
  pdf.text(`Profit: $${data.profit}`,10,30);
  pdf.save('statement.pdf');
}

// ------------------ ADMIN ------------------
async function renderAdmin(){
  const snapshot = await db.collection('users').get();
  const view = document.getElementById('adminView');
  view.innerHTML = snapshot.docs.map(d=>{
    const u = d.data();
    return `<div>${u.name} | $${u.main.toFixed(2)} | $${u.profit.toFixed(2)}</div>`;
  }).join('');
}

// ------------------ LIVE CRYPTO TICKER ------------------
async function updateTicker(){
  const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd");
  const d = await r.json();
  document.getElementById('ticker').innerText=`BTC $${d.bitcoin.usd} | ETH $${d.ethereum.usd}`;
}
setInterval(updateTicker,30000); updateTicker();

// ------------------ WITHDRAW LOCK ------------------
function updateWithdrawStatus(createdDate){
  const unlock = new Date(createdDate.getTime() + 1000*60*60*24*180);
  const now = new Date();
  const diff = unlock-now;
  if(diff<=0) document.getElementById('withdrawStatus').innerText = "Withdrawals Enabled";
  else {
    const days = Math.floor(diff/86400000);
    const hrs = Math.floor((diff%86400000)/3600000);
    const mins = Math.floor((diff%3600000)/60000);
    document.getElementById('withdrawStatus').innerText = `Locked for ${days}d ${hrs}h ${mins}m`;
  }
}
