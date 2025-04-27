import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

if (parentPort) {
    parentPort.postMessage(processAccounts(workerData));
} else {
    throw new Error('This module must be run as a worker thread');
}

function processAccounts({ tmpDir, outputFile }) {
    const accountBalances: Record<string, number> = {};

    const files = fs.readdirSync(tmpDir)
        .filter(file => file.endsWith('.csv'));

    const chunkSize = 5;
    for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);

        chunk.forEach(file => {
            const lines = fs.readFileSync(path.join(tmpDir, file), 'utf-8')
                .trim()
                .split('\n');

            for (const line of lines) {
                const [, account, , debit, credit] = line.split(',');
                if (!accountBalances[account]) {
                    accountBalances[account] = 0;
                }
                accountBalances[account] +=
                    parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
            }
        });
    }

    const output = ['Account,Balance'];
    for (const [account, balance] of Object.entries(accountBalances)) {
        output.push(`${account},${balance.toFixed(2)}`);
    }

    fs.writeFileSync(outputFile, output.join('\n'));
    return { success: true };
}