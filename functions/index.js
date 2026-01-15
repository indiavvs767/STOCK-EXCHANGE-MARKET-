const functions = require("firebase-functions");
const admin = require("firebase-admin");
admin.initializeApp();
const db = admin.firestore();

// Scheduled daily interest at 8 AM ET
exports.dailyInterest = functions.pubsub.schedule('0 8 * * *')
  .timeZone('America/New_York')
  .onRun(async () => {
    const usersSnapshot = await db.collection("users").get();
    usersSnapshot.forEach(user => {
      const userRef = db.collection("users").doc(user.id);
      userRef.update({
        balance: admin.firestore.FieldValue.increment(65),
        profit: admin.firestore.FieldValue.increment(65),
        log: admin.firestore.FieldValue.arrayUnion("+$65 Daily Interest")
      });
    });
    console.log("Daily interest applied to all users.");
});
