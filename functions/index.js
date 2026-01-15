const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

/**
 * DAILY INTEREST FUNCTION
 * Runs every day at 8 AM ET
 * Adds $65 to each user's main balance and profit
 * Logs activity in user's activity array
 */
exports.dailyInterest = functions.pubsub.schedule('0 8 * * *')
.timeZone('America/New_York')
.onRun(async (context) => {
    console.log("Running daily interest function...");

    try {
        const usersSnapshot = await db.collection('users').get();
        const batch = db.batch();

        usersSnapshot.forEach(doc => {
            const userRef = db.collection('users').doc(doc.id);
            const data = doc.data();

            const newMain = (data.main || 0) + 65;
            const newProfit = (data.profit || 0) + 65;

            const activityEntry = {
                msg: "+$65 Daily Interest",
                time: admin.firestore.Timestamp.now()
            };

            batch.update(userRef, {
                main: newMain,
                profit: newProfit,
                activity: admin.firestore.FieldValue.arrayUnion(activityEntry)
            });
        });

        await batch.commit();
        console.log("Daily interest successfully applied to all users.");
        return null;
    } catch (err) {
        console.error("Error applying daily interest:", err);
        return null;
    }
});


/**
 * ADMIN FUNCTION EXAMPLE
 * Optional: to fetch all users (restricted to admin)
 * Can be triggered via HTTPS request from your admin dashboard
 */
exports.getAllUsers = functions.https.onCall(async (data, context) => {
    // Check admin
    if (!context.auth || context.auth.token.email !== "joyreuben122@gmail.com") {
        throw new functions.https.HttpsError(
            'permission-denied',
            'Only admin can access this function'
        );
    }

    try {
        const usersSnapshot = await db.collection('users').get();
        let users = [];
        usersSnapshot.forEach(doc => {
            const u = doc.data();
            users.push({
                id: doc.id,
                name: u.fullName,
                email: u.email,
                main: u.main || 0,
                profit: u.profit || 0,
                created: u.created,
                transactions: u.transactions || [],
                activity: u.activity || []
            });
        });
        return users;
    } catch (err) {
        console.error("Error fetching users:", err);
        throw new functions.https.HttpsError('internal', err.message);
    }
});


/**
 * SAMPLE INVESTMENT FUNCTION
 * Adds an investment to user's main balance and logs transaction
 * Triggered from your client-side dashboard
 */
exports.addInvestment = functions.https.onCall(async (data, context) => {
    if (!context.auth) {
        throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
    }

    const { amount, plan } = data;
    if (!amount || amount <= 0) {
        throw new functions.https.HttpsError('invalid-argument', 'Investment amount must be positive.');
    }

    const userRef = db.collection('users').doc(context.auth.uid);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User not found.');
    }

    const investmentEntry = {
        plan,
        amount,
        time: admin.firestore.Timestamp.now(),
        type: "Investment"
    };

    await userRef.update({
        main: admin.firestore.FieldValue.increment(amount),
        transactions: admin.firestore.FieldValue.arrayUnion(investmentEntry),
        activity: admin.firestore.FieldValue.arrayUnion({msg:`Invested $${amount} in ${plan}`, time: admin.firestore.Timestamp.now()})
    });

    return { success: true, newBalance: (userDoc.data().main || 0) + amount };
});
