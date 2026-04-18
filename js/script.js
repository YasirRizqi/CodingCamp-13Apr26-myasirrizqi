document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const form = document.getElementById('transaction-form');
    const itemNameInput = document.getElementById('item-name');
    const amountInput = document.getElementById('amount');
    const categoryInput = document.getElementById('category');
    const customCategoryGroup = document.getElementById('custom-category-group');
    const customCategoryInput = document.getElementById('custom-category');
    const transactionList = document.getElementById('transaction-list');
    const totalBalanceEl = document.getElementById('total-balance');
    const balanceCard = document.querySelector('.balance-card');
    const limitWarning = document.getElementById('limit-warning');
    const ctx = document.getElementById('expense-chart');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const themeIcon = document.getElementById('theme-icon');
    const spendingLimitInput = document.getElementById('spending-limit');
    const monthlySummaryContainer = document.getElementById('monthly-summary-container');

    // Chart Instance
    let expenseChart = null;

    // Default Colors mapping
    let categoryColors = {
        'Food': '#f43f5e',
        'Transport': '#eab308',
        'Fun': '#8b5cf6'
    };

    // Load Data from LocalStorage
    let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    let customCategories = JSON.parse(localStorage.getItem('customCategories')) || [];
    let spendingLimit = parseFloat(localStorage.getItem('spendingLimit')) || 0;
    let currentTheme = localStorage.getItem('theme') || 'dark';

    // Migrate old transactions to have dates
    transactions.forEach(t => {
        if (!t.date) {
            t.date = new Date().toISOString();
        }
    });
    localStorage.setItem('transactions', JSON.stringify(transactions));

    // Theme Setup
    const applyTheme = (theme) => {
        if (theme === 'light') {
            document.body.setAttribute('data-theme', 'light');
            themeIcon.innerText = '☀️';
            if (expenseChart) updateChart();
        } else {
            document.body.removeAttribute('data-theme');
            themeIcon.innerText = '🌙';
            if (expenseChart) updateChart();
        }
    };

    applyTheme(currentTheme);

    themeToggleBtn.addEventListener('click', () => {
        currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', currentTheme);
        applyTheme(currentTheme);
    });

    // Spending Limit Setup
    if (spendingLimit > 0) {
        spendingLimitInput.value = spendingLimit;
    }

    spendingLimitInput.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        spendingLimit = isNaN(val) ? 0 : val;
        localStorage.setItem('spendingLimit', spendingLimit);
        updateBalance(); // Recheck limit highlight
    });

    // Setup Custom Categories
    customCategories.forEach(cat => {
        categoryColors[cat.name] = cat.color;
    });

    const populateCategories = () => {
        // Clear existing custom options
        Array.from(categoryInput.options).forEach(opt => {
            if (opt.value !== '' && opt.value !== 'Food' && opt.value !== 'Transport' && opt.value !== 'Fun' && opt.value !== 'custom') {
                opt.remove();
            }
        });

        // Insert custom categories before "Add Custom Category"
        const customOption = Array.from(categoryInput.options).find(opt => opt.value === 'custom');
        customCategories.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.name;
            opt.innerText = cat.name;
            categoryInput.insertBefore(opt, customOption);
        });
    };

    populateCategories();

    categoryInput.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customCategoryGroup.classList.remove('hidden');
            customCategoryInput.required = true;
        } else {
            customCategoryGroup.classList.add('hidden');
            customCategoryInput.required = false;
        }
    });

    // Format currency
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    };

    // Update the DOM List
    const updateDOMList = () => {
        transactionList.innerHTML = '';

        if (transactions.length === 0) {
            transactionList.innerHTML = '<p class="empty-state">No transactions yet. Add one above!</p>';
            return;
        }

        transactions.forEach(transaction => {
            const li = document.createElement('li');
            li.classList.add('transaction-item');

            // Assign color based on category map
            const color = categoryColors[transaction.category] || '#94a3b8';
            li.style.borderLeftColor = color;

            li.innerHTML = `
                <div class="item-info">
                    <span class="item-name">${transaction.name}</span>
                    <span class="item-category">${transaction.category}</span>
                </div>
                <div class="item-amount-action">
                    <span class="item-amount">${formatCurrency(transaction.amount)}</span>
                    <button class="btn-delete" onclick="removeTransaction(${transaction.id})">&times;</button>
                </div>
            `;

            transactionList.appendChild(li);
        });
    };

    // Update Total Balance
    const updateBalance = () => {
        const total = transactions.reduce((acc, curr) => acc + curr.amount, 0);
        totalBalanceEl.innerText = formatCurrency(total);

        // Check against limit
        if (spendingLimit > 0 && total > spendingLimit) {
            balanceCard.classList.add('exceeded-limit');
            limitWarning.classList.remove('hidden');
        } else {
            balanceCard.classList.remove('exceeded-limit');
            limitWarning.classList.add('hidden');
        }
    };

    // Update Chart
    const updateChart = () => {
        const totals = {};
        transactions.forEach(t => {
            if (!totals[t.category]) totals[t.category] = 0;
            totals[t.category] += t.amount;
        });

        const labels = Object.keys(totals);
        const data = Object.values(totals);
        const bgColors = labels.map(label => categoryColors[label] || '#94a3b8');

        const hasData = data.some(val => val > 0);
        const textColor = currentTheme === 'light' ? '#0f172a' : '#f8fafc';

        const chartData = {
            labels: labels,
            datasets: [{
                data: hasData ? data : [1],
                backgroundColor: hasData ? bgColors : (currentTheme === 'light' ? ['#e2e8f0'] : ['#334155']),
                borderWidth: 0,
                hoverOffset: 4
            }]
        };

        const config = {
            type: 'doughnut',
            data: chartData,
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            color: textColor,
                            font: { family: "'Inter', sans-serif", size: 12 },
                            padding: 20
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                if (!hasData) return 'No data';
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== null) label += formatCurrency(context.parsed);
                                return label;
                            }
                        }
                    }
                }
            }
        };

        if (expenseChart) expenseChart.destroy();
        if (ctx) expenseChart = new Chart(ctx, config);
    };

    // Generate random distinct color
    const getRandomColor = () => {
        const h = Math.floor(Math.random() * 360);
        return `hsl(${h}, 70%, 60%)`;
    };

    // Add Transaction
    const addTransaction = (e) => {
        e.preventDefault();

        const name = itemNameInput.value.trim();
        const amount = parseFloat(amountInput.value);
        let category = categoryInput.value;

        if (category === 'custom') {
            category = customCategoryInput.value.trim();
            if (!category) {
                alert('Please enter a custom category name.');
                return;
            }

            // Check if already exists in defaults or custom
            if (!categoryColors[category]) {
                const newColor = getRandomColor();
                customCategories.push({ name: category, color: newColor });
                categoryColors[category] = newColor;
                localStorage.setItem('customCategories', JSON.stringify(customCategories));
                populateCategories();
            }
        }

        if (!name || isNaN(amount) || amount <= 0 || !category) {
            alert('Please provide valid details.');
            return;
        }

        const newTransaction = {
            id: generateID(),
            name,
            amount,
            category,
            date: new Date().toISOString()
        };

        transactions.unshift(newTransaction);
        updateLocalStorage();
        updateUI();

        // Reset form completely
        form.reset();
        customCategoryGroup.classList.add('hidden');
        customCategoryInput.required = false;
        // set select back to default
        categoryInput.value = '';
    };

    const updateMonthlySummary = () => {
        monthlySummaryContainer.innerHTML = '';
        if (transactions.length === 0) {
            monthlySummaryContainer.innerHTML = '<p class="empty-state">No data for summary.</p>';
            return;
        }

        // Group by YYYY-MM
        const grouped = {};
        transactions.forEach(t => {
            const dateObj = new Date(t.date);
            const monthKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
            const monthName = dateObj.toLocaleString('default', { month: 'long', year: 'numeric' });

            if (!grouped[monthKey]) {
                grouped[monthKey] = {
                    name: monthName,
                    total: 0,
                    count: 0
                };
            }
            grouped[monthKey].total += t.amount;
            grouped[monthKey].count += 1;
        });

        // Sort descending by monthKey
        const sortedKeys = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

        sortedKeys.forEach(key => {
            const data = grouped[key];
            const card = document.createElement('div');
            card.className = 'summary-card';
            card.innerHTML = `
                <div class="summary-month-title">${data.name}</div>
                <div class="summary-details">
                    <span>Total Spending:</span>
                    <strong>${formatCurrency(data.total)}</strong>
                </div>
                <div class="summary-details">
                    <span>Transactions:</span>
                    <span>${data.count}</span>
                </div>
            `;
            monthlySummaryContainer.appendChild(card);
        });
    };

    const generateID = () => Math.floor(Math.random() * 100000000);

    window.removeTransaction = (id) => {
        transactions = transactions.filter(t => t.id !== id);
        updateLocalStorage();
        updateUI();
    };

    const updateLocalStorage = () => {
        localStorage.setItem('transactions', JSON.stringify(transactions));
    };

    const updateUI = () => {
        updateDOMList();
        updateBalance();
        updateChart();
        updateMonthlySummary();
    };

    form.addEventListener('submit', addTransaction);
    updateUI();
});
