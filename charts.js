// --------- BALANCE & PROFIT CHARTS ----------
const balanceCtx = document.getElementById('balanceChart').getContext('2d');
const profitCtx = document.getElementById('profitChart').getContext('2d');

let balanceChart = new Chart(balanceCtx, {
    type: 'line',
    data: {
        labels: [], // Dates will be populated from transactions
        datasets: [{
            label: 'Balance Growth',
            data: [],
            borderColor: '#f0b90b',
            backgroundColor: 'rgba(240, 185, 11,0.2)',
            tension: 0.3,
            fill: true
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: true, labels: { color: "#eaecef" } } },
        scales: {
            x: { ticks: { color: "#eaecef" } },
            y: { ticks: { color: "#eaecef" } }
        }
    }
});

let profitChart = new Chart(profitCtx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: 'Profit Growth',
            data: [],
            borderColor: '#0bcaf0',
            backgroundColor: 'rgba(11, 202, 240,0.2)',
            tension: 0.3,
            fill: true
        }]
    },
    options: {
        responsive: true,
        plugins: { legend: { display: true, labels: { color: "#eaecef" } } },
        scales: {
            x: { ticks: { color: "#eaecef" } },
            y: { ticks: { color: "#eaecef" } }
        }
    }
});

// ---------- Function to update charts dynamically ----------
function updateCharts(transactions) {
    const dates = transactions.map(t => t.date);
    const balances = [];
    const profits = [];
    let totalBalance = 0;
    let totalProfit = 0;

    transactions.forEach(t => {
        if(t.type.includes("Invest")) totalBalance += t.amount;
        if(t.type.includes("Invest")) totalProfit += t.amount * 0.2; // Example: 20% return plan
        balances.push(totalBalance);
        profits.push(totalProfit);
    });

    balanceChart.data.labels = dates;
    balanceChart.data.datasets[0].data = balances;
    balanceChart.update();

    profitChart.data.labels = dates;
    profitChart.data.datasets[0].data = profits;
    profitChart.update();
}
