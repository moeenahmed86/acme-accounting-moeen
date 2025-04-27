import { Injectable } from '@nestjs/common';
import { Worker } from 'worker_threads';
import path from 'path';
import { performance } from 'perf_hooks';

@Injectable()
export class ReportsService {
  private states = {
    accounts: 'idle',
    yearly: 'idle',
    fs: 'idle',
  };

  private metrics = {
    accounts: { startTime: 0, endTime: 0, duration: 0 },
    yearly: { startTime: 0, endTime: 0, duration: 0 },
    fs: { startTime: 0, endTime: 0, duration: 0 },
  };

  state(scope: string) {
    const status = this.states[scope];
    if (status === 'finished') {
      return `finished in ${(this.metrics[scope].duration / 1000).toFixed(2)}s`;
    }
    return status;
  }

  getMetrics(scope: string) {
    return this.metrics[scope];
  }

  private async runWorker(workerData: any, workerPath: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const worker = new Worker(path.resolve(__dirname, workerPath), {
        workerData,
      });

      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) {
          reject(new Error(`Worker stopped with exit code ${code}`));
        }
      });
    });
  }

  async accounts() {
    this.states.accounts = 'starting';
    this.metrics.accounts.startTime = performance.now();

    this.runWorker(
      { tmpDir: 'tmp', outputFile: 'out/accounts.csv' },
      './workers/accounts.worker.js',
    )
      .then(() => {
        this.metrics.accounts.endTime = performance.now();
        this.metrics.accounts.duration =
          this.metrics.accounts.endTime - this.metrics.accounts.startTime;
        this.states.accounts = 'finished';
      })
      .catch((error) => {
        this.states.accounts = `error: ${error.message}`;
      });

    return { status: 'processing started', scope: 'accounts' };
  }

  async yearly() {
    this.states.yearly = 'starting';
    this.metrics.yearly.startTime = performance.now();

    this.runWorker(
      { tmpDir: 'tmp', outputFile: 'out/yearly.csv' },
      './workers/yearly.worker.js',
    )
      .then(() => {
        this.metrics.yearly.endTime = performance.now();
        this.metrics.yearly.duration =
          this.metrics.yearly.endTime - this.metrics.yearly.startTime;
        this.states.yearly = 'finished';
      })
      .catch((error) => {
        this.states.yearly = `error: ${error.message}`;
      });

    return { status: 'processing started', scope: 'yearly' };
  }

  async fs() {
    this.states.fs = 'starting';
    this.metrics.fs.startTime = performance.now();

    this.runWorker(
      { tmpDir: 'tmp', outputFile: 'out/fs.csv' },
      './workers/fs.worker.js',
    )
      .then(() => {
        this.metrics.fs.endTime = performance.now();
        this.metrics.fs.duration =
          this.metrics.fs.endTime - this.metrics.fs.startTime;
        this.states.fs = 'finished';
      })
      .catch((error) => {
        this.states.fs = `error: ${error.message}`;
      });

    return { status: 'processing started', scope: 'fs' };
  }
}
