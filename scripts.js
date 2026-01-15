// Firebase Config
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Admin Credentials
const ADMIN_EMAIL = "joyreuben122@gmail.com";

// ---------- Auth Functions ----------
function showRegister() {
  document.getElementById("authModal").style.display = "none";
  document.getElementById("registerModal").style.display = "flex";
}

function registerUser() {
  const fullName = document.getElementById("fullName").value;
  const address = document.getElementById("address").value;
  const phone = document.getElementById("phone").value;
  const email = document.getElementById("email").value;
  const dob = document.getElementById("dob").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then(cred => {
      db.collection("users").doc(email).set({
        fullName, address, phone, dob,
        balance: 0, profit: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        transactions: [],
        log: ["Account created"]
      });
      alert("Account created! Please login.");
      document.getElementById("registerModal").style.display = "none";
      document.getElementById("authModal").style.display = "flex";
    })
    .catch(err => document.getElementById("regError").innerText = err.message);
}

function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPass").value;

  auth.signInWithEmailAndPassword(email, password)
    .then(cred => {
      if (email === ADMIN_EMAIL) document.getElementById("adminBtn").style.display = "inline";
      window.location.href = "dashboard.html";
    })
    .catch(err => document.getElementById("authError").innerText = err.message);
}

function logout() {
  auth.signOut().then(() => window.location.href = "index.html");
}

// ---------- Real-time Dashboard ----------
auth.onAuthStateChanged(user => {
  if (!user) return;
  const email = user.email;

  const userDoc = db.collection("users").doc(email);
  userDoc.onSnapshot(doc => {
    if (!doc.exists) return;
    const data = doc.data();
    document.getElementById("mainBalance").innerText = `$${data.balance.toFixed(2)}`;
    document.getElementById("profitBalance").innerText = `$${data.profit.toFixed(2)}`;
    document.getElementById("totalBalance").innerText = `$${(data.balance+data.profit).toFixed(2)}`;
    renderActivity(data.log);
    renderTransactions(data.transactions);
    updateWithdrawCountdown(data.createdAt.seconds*1000);
  });
});

// ---------- Investments ----------
function investFunds() {
  const plan = document.getElementById("investmentPlan").value;
  const amount = parseFloat(document.getElementById("investAmount").value);
  if (!amount) return alert("Enter a valid amount");

  const email = auth.currentUser.email;
  const userDoc = db.collection("users").doc(email);
  const returns = plan === "gold" ? 0.2 : plan === "platinum" ? 0.25 : 0.3;

  const profit = amount * returns;

  userDoc.update({
    balance: firebase.firestore.FieldValue.increment(amount),
    profit: firebase.firestore.FieldValue.increment(profit),
    transactions: firebase.firestore.FieldValue.arrayUnion({
      date: new Date().toLocaleString(),
      type: `Invest (${plan})`,
      amount,
      status: "Completed"
    }),
    log: firebase.firestore.FieldValue.arrayUnion(`Invested $${amount} in ${plan} plan`)
  });
}

// ---------- Activity Feed ----------
function renderActivity(log) {
  const container = document.getElementById("activityFeed");
  container.innerHTML = log.slice(-10).map(l => `<div>${l}</div>`).join("");
}

// ---------- Transaction Table ----------
function renderTransactions(transactions) {
  const tbody = document.querySelector("#transactionTable tbody");
  tbody.innerHTML = transactions.slice(-10).map(t =>
    `<tr><td>${t.date}</td><td>${t.type}</td><td>$${t.amount}</td><td>${t.status}</td></tr>`
  ).join("");
}

// ---------- Withdrawal Countdown ----------
function updateWithdrawCountdown(createdAt) {
  const unlockTime = createdAt + 1000*60*60*24*180;
  const diff = unlockTime - Date.now();
  const days = Math.floor(diff/86400000);
  document.getElementById("withdrawStatus").innerText = diff>0 ? `Locked: ${days} days remaining` : "Withdrawals Enabled";
}

// ---------- Crypto Prices ----------
async function loadPrices() {
  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,solana,binancecoin&vs_currencies=usd&include_24hr_change=true"
    );
    const d = await res.json();

    tickerContent.innerHTML = `
      BTC $${d.bitcoin.usd} <span style="color:${d.bitcoin.usd_24h_change>0?'#0f0':'#f00'}">
      (${d.bitcoin.usd_24h_change.toFixed(2)}%)</span>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      ETH $${d.ethereum.usd} <span style="color:${d.ethereum.usd_24h_change>0?'#0f0':'#f00'}">
      (${d.ethereum.usd_24h_change.toFixed(2)}%)</span>
      &nbsp;&nbsp;|&nbsp;&nbsp;
      SOL $${d.solana.usd}
      &nbsp;&nbsp;|&nbsp;&nbsp;
      BNB $${d.binancecoin.usd}
    `;
  } catch (e) {
    tickerContent.innerText = "Market data unavailable";
  }
}
setInterval(loadPrices, 30000);
loadPrices();

