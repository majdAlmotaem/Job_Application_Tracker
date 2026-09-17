import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const isWin = process.platform === 'win32';

// 1. Detect platform-specific virtualenv python binary
const venvBin = isWin
  ? path.join(process.cwd(), '.venv', 'Scripts', 'python.exe')
  : path.join(process.cwd(), '.venv', 'bin', 'python');

let pythonExecutable = 'python';

if (fs.existsSync(venvBin)) {
  pythonExecutable = venvBin;
} else {
  // Fallback to system python/python3
  pythonExecutable = isWin ? 'python' : 'python3';
  console.warn(
    '⚠️  Warnung: Virtuelle Umgebung (.venv) wurde nicht gefunden.\n' +
    '   Versuche System-Python (' + pythonExecutable + ').\n' +
    '   Falls Module fehlen, erstelle .venv mit: python -m venv .venv\n'
  );
}

const isProd = process.argv.includes('--prod');
const host = isProd ? '0.0.0.0' : '127.0.0.1';
const port = '8000';

const args = ['-m', 'uvicorn', 'backend.main:app', '--host', host, '--port', port];

if (!isProd) {
  args.push('--reload');
}

const child = spawn(pythonExecutable, args, {
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.error(`❌ Fehler beim Starten des Backends (${pythonExecutable}):`, err.message);
  if (!fs.existsSync(venvBin)) {
    console.error(
      '👉 Bitte richte die virtuelle Umgebung ein:\n' +
      (isWin 
        ? '   python -m venv .venv\n   .venv\\Scripts\\Activate.ps1\n   pip install -r backend\\requirements.txt'
        : '   python3 -m venv .venv\n   source .venv/bin/activate\n   pip install -r backend/requirements.txt')
    );
  }
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else if (code !== null) {
    process.exit(code);
  }
});

// Forward termination signals to child process
process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
