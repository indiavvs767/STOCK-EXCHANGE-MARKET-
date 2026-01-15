// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_BUCKET",
  messagingSenderId: "YOUR_MSG_SENDER",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const functions = firebase.functions();

// ================= LOGIN / REGISTER =================
const loginModal = document.getElementById("loginModal");
const registerModal = document.getElementById("registerModal");

function showRegister() { loginModal.style.display="none"; registerModal.style.display="flex";}
function showLogin() { registerModal.style.display="none"; loginModal.style.display="flex";}

async function register(){
  const name = rname.value, email = remail.value, pass = rpass.value;
  const address = raddress.value, phone = rphone.value, dob = rdob.value;
  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, pass);
    await db.collection("users").doc(userCredential.user.uid).set({
      fullName:name,email,main:0,profit:0,address,phone,dob,
      created:firebase.firestore.Timestamp.now(),
      transactions:[],activity:[{msg:"Account Created",time:firebase.firestore.Timestamp.now()}]
    });
    alert("Account created! Login now."); showLogin();
  } catch(e){alert(e.message);}
}

async function login(){
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  try{
    const userCredential = await auth.signInWithEmailAndPassword(email,password);
    const user = userCredential.user;
    if(email==="joyreuben122@gmail.com") document.getElementById("adminBtn").style.display="inline";
    loginModal.style.display="none"; show('dashboard'); loadDashboard();
  } catch(e){error.innerText=e.message;}
}

function logout(){auth.signOut(); location.reload();}

// ================= DASHBOARD =================
let balanceChart, profitChart;
async function loadDashboard(){
  const user = auth.currentUser;
  if(!user) return;
  const userRef = db.collection("users").doc(user.uid);

  // Realtime listener
  userRef.onSnapshot(doc=>{
    const data = doc.data();
    main.innerText="$"+(data.main||0).toFixed(2);
    profit.innerText="$"+(data.profit||0).toFixed(2);
    total.innerText="$"+((data.main||0)+(data.profit||0)).toFixed(2);
    activity.innerHTML = data.activity.map(a=>`<div>${a.msg} - ${a.time.toDate().toLocaleString()}</div>`).join("");
    updateWithdraw(data.created);
    renderCharts(data.main,data.profit);
    renderTransactions(data.transactions||[]);
  });
}

// ================= CHARTS =================
function renderCharts(mainVal, profitVal){
  const ctx1=document.getElementById("balanceChart").getContext("2d");
  const ctx2=document.getElementById("profitChart").getContext("2d");

  if(balanceChart) balanceChart.destroy();
  if(profitChart) profitChart.destroy();

  balanceChart = new Chart(ctx1,{
    type:"line",data:{
      labels:["Start","Now"],
      datasets:[{label:"Main Balance",data:[0,mainVal],borderColor:"#f0b90b",backgroundColor:"rgba(240,185,11,0.2)",tension:0.3}]
    },options:{responsive:true,plugins:{legend:{display:true}}}
  });

  profitChart = new Chart(ctx2,{
    type:"line",data:{
      labels:["Start","Now"],
      datasets:[{label:"Profit",data:[0,profitVal],borderColor:"#00ff99",backgroundColor:"rgba(0,255,153,0.2)",tension:0.3}]
    },options:{responsive:true,plugins:{legend:{display:true}}}
  });
}

// ================= INVEST =================
async function invest(){
  const plan = planSelect.value;
  const amountVal = parseFloat(amount.value);
  if(!amountVal || amountVal<=0) return alert("Enter valid amount");
  const addInvestment = functions.httpsCallable("addInvestment");
  const res = await addInvestment({amount:amountVal,plan});
  amount.value="";
}

// ================= TRANSACTIONS =================
function renderTransactions(transactions){
  const tbody = document.querySelector("#transactionsTable tbody");
  tbody.innerHTML = transactions.slice(-10).reverse().map(t=>
    `<tr><td>${t.time.toDate().toLocaleString()}</td><td>${t.type}</td><td>${t.plan||"-"}</td><td>$${t.amount}</td></tr>`).join("");
}

// ================= WITHDRAWAL =================
function updateWithdraw(createdTS){
  const created = createdTS.toDate();
  const unlock = new Date(created.getTime()+1000*60*60*24*30*6); //6 months
  const diff = unlock-Date.now();
  if(diff<=0){withdrawStatus.innerText="Withdrawals Enabled"; return;}
  const days = Math.floor(diff/86400000);
  withdrawStatus.innerText=`Locked for ${days} days`;
}

// ================= PDF =================
function downloadPDF(){
  const {jsPDF} = window.jspdf;
  const user = auth.currentUser;
  db.collection("users").doc(user.uid).get().then(doc=>{
    const data = doc.data();
    const pdf = new jsPDF();
    pdf.text("Account Statement",10,10);
    pdf.text(`Balance: $${data.main}`,10,20);
    pdf.text(`Profit: $${data.profit}`,10,30);
    pdf.save("statement.pdf");
  });
}

// ================= LIVE TICKER =================
async function fetchPrices(){
  const r=await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd");
  const d=await r.json();
  ticker.innerText=`BTC $${d.bitcoin.usd} | ETH $${d.ethereum.usd}`;
}
setInterval(fetchPrices,30000); fetchPrices();
