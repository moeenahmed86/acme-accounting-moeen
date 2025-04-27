import { parentPort, workerData } from 'worker_threads';
import fs from 'fs';
import path from 'path';

if (parentPort) {
    parentPort.postMessage(processYearly(workerData));
} else {
    throw new Error('This module must be run as a worker thread');
}

function processYearly({ tmpDir, outputFile }) {
    const cashByYear: Record<string, number> = {};

    const files = fs.readdirSync(tmpDir)
        .filter(file => file.endsWith('.csv') && file !== 'yearly.csv');

    const chunkSize = 5;
    for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize);

        chunk.forEach(file => {
            const lines = fs.readFileSync(path.join(tmpDir, file), 'utf-8')
                .trim()
                .split('\n');

            for (const line of lines) {
                const [date, account, , debit, credit] = line.split(',');
                if (account === 'Cash') {
                    const year = new Date(date).getFullYear();
                    if (!cashByYear[year]) {
                        cashByYear[year] = 0;
                    }
                    cashByYear[year] +=
                        parseFloat(String(debit || 0)) - parseFloat(String(credit || 0));
                }
            }
        });
    }

    const output = ['Financial Year,Cash Balance'];
    Object.keys(cashByYear)
        .sort()
        .forEach((year) => {
            output.push(`${year},${cashByYear[year].toFixed(2)}`);
        });

    fs.writeFileSync(outputFile, output.join('\n'));
    return { success: true };
}