// Captura global dos últimos erros do console para o assistente IA poder analisar
const MAX_ERRORS = 20;
const captured: { ts: string; type: string; message: string }[] = [];

function add(type: string, message: string) {
  captured.push({ ts: new Date().toISOString(), type, message: message.slice(0, 800) });
  if (captured.length > MAX_ERRORS) captured.shift();
}

let installed = false;
export function installConsoleErrorCapture() {
  if (installed) return;
  installed = true;

  const origError = console.error;
  console.error = (...args: any[]) => {
    try {
      const msg = args.map(a => {
        if (a instanceof Error) return `${a.name}: ${a.message}`;
        if (typeof a === 'object') { try { return JSON.stringify(a); } catch { return String(a); } }
        return String(a);
      }).join(' ');
      add('error', msg);
    } catch {}
    origError.apply(console, args);
  };

  window.addEventListener('error', (e) => {
    add('window.error', `${e.message} @ ${e.filename}:${e.lineno}`);
  });

  window.addEventListener('unhandledrejection', (e: any) => {
    const reason = e?.reason;
    const msg = reason instanceof Error ? `${reason.name}: ${reason.message}` : String(reason);
    add('unhandledrejection', msg);
  });
}

export function getRecentErrors(): { ts: string; type: string; message: string }[] {
  return [...captured];
}

export function clearRecentErrors() {
  captured.length = 0;
}
