import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

if (parentPort) {
    parentPort.postMessage(processFS(workerData));
} else {
    throw new Error('This module must be run as a worker thread');
}

function processFS({ tmpDir, outputFile }) {
    const categories = {
        'Income Statement': {
            Revenues: ['Sales Revenue'],
            Expenses: [
                'Cost of Goods Sold',
                'Salaries Expense',
                'Rent Expense',
                'Utilities Expense',
                'Interest Expense',
                'Tax Expense',
            ],
        },
        'Balance Sheet': {
            Assets: [
                'Cash',
                'Accounts Receivable',
                'Inventory',
                'Fixed Assets',
                'Prepaid Expenses',
            ],
            Liabilities: [
                'Accounts Payable',
                'Loan Payable',
                'Sales Tax Payable',
                'Accrued Liabilities',
                'Unearned Revenue',
                'Dividends Payable',
            ],
            Equity: ['Common Stock', 'Retained Earnings'],
        },
    };

    const balances: Record<string, number> = {};
    for (const section of Object.values(categories)) {
        for (const group of Object.values(section)) {
            for (const account of group) {
                balances[account] = 0;
            }
        }
    }

    const files = fs.readdirSync(tmpDir)
        .filter(file => file.endsWith('.csv') && file !== 'fs.csv');

    const chunkSize = 5;
    for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);

        chunk.forEach(file => {
            const lines = fs.readFileSync(path.join(tmpDir, file), 'utf-8')
                .trim()
                .split('\n');

            for (const line of lines) {
                const [, account, , debit, credit] = line.split(',');
                if (balances.hasOwnProperty(account)) {
                    balances[account] +=
                        parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
                }
            }
        });
    }

    const output = generateFSReport(categories, balances);
    fs.writeFileSync(outputFile, output.join('\n'));
    return { success: true };
}

function generateFSReport(categories, balances) {
    const output: string[] = [];
    output.push('Basic Financial Statement', '');

    output.push('Income Statement');
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of categories['Income Statement']['Revenues']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalRevenue += value;
    }

    for (const account of categories['Income Statement']['Expenses']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalExpenses += value;
    }

    const netIncome = totalRevenue - totalExpenses;
    output.push(`Net Income,${netIncome.toFixed(2)}`, '');

    output.push('Balance Sheet');
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;

    output.push('Assets');
    for (const account of categories['Balance Sheet']['Assets']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalAssets += value;
    }
    output.push(`Total Assets,${totalAssets.toFixed(2)}`, '');

    output.push('Liabilities');
    for (const account of categories['Balance Sheet']['Liabilities']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalLiabilities += value;
    }
    output.push(`Total Liabilities,${totalLiabilities.toFixed(2)}`, '');

    output.push('Equity');
    for (const account of categories['Balance Sheet']['Equity']) {
        const value = balances[account] || 0;
        output.push(`${account},${value.toFixed(2)}`);
        totalEquity += value;
    }

    output.push(`Retained Earnings (Net Income),${netIncome.toFixed(2)}`);
    totalEquity += netIncome;
    output.push(`Total Equity,${totalEquity.toFixed(2)}`, '');

    output.push(
        `Assets = Liabilities + Equity, ${totalAssets.toFixed(2)} = ${(
            totalLiabilities + totalEquity
        ).toFixed(2)}`,
    );

    return output;
}