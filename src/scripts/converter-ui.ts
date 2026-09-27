import { convert, examples, type Direction, type Encoding, type TraceItem } from '../lib/conversion';

const byId = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const input = byId<HTMLTextAreaElement>('input');
const output = byId<HTMLTextAreaElement>('output');
const direction = byId<HTMLSelectElement>('direction');
const encoding = byId<HTMLSelectElement>('encoding');
const message = byId<HTMLElement>('message');
const trace = byId<HTMLElement>('trace');
const counter = byId<HTMLElement>('counter');
const status = byId<HTMLElement>('status');
const inputLabel = byId<HTMLLabelElement>('input-label');
const outputLabel = byId<HTMLLabelElement>('output-label');
const copyButton = byId<HTMLButtonElement>('copy');
const copyLabel = byId<HTMLElement>('copy-label');

type FeedbackKind = 'neutral' | 'success' | 'error';
let feedbackTimer: ReturnType<typeof window.setTimeout> | undefined;
let copyTimer: ReturnType<typeof window.setTimeout> | undefined;

function showFeedback(kind: FeedbackKind, text: string): void {
  if (feedbackTimer) window.clearTimeout(feedbackTimer);
  message.classList.remove('message--visible');
  void message.offsetWidth;
  message.dataset.state = kind;
  message.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  message.setAttribute('aria-live', kind === 'error' ? 'assertive' : 'polite');
  message.textContent = text;
  if (text) message.classList.add('message--visible');
  if (kind === 'success') feedbackTimer = window.setTimeout(() => {
    message.classList.remove('message--visible');
    window.setTimeout(() => {
      if (message.dataset.state === 'success') message.textContent = '';
    }, 160);
  }, 2600);
}

function setCopyState(copied: boolean): void {
  if (copyTimer) window.clearTimeout(copyTimer);
  copyButton.dataset.copied = String(copied);
  copyLabel.textContent = copied ? 'Copiado' : 'Copiar';
  if (copied) copyTimer = window.setTimeout(() => setCopyState(false), 1800);
}

function currentEncoding(): Encoding { return encoding.value as Encoding; }
function currentDirection(): Direction { return direction.value as Direction; }
function escapeHtml(value: string): string { const element = document.createElement('span'); element.textContent = value; return element.innerHTML; }
function visibleCharacter(value: string): string { return value ? escapeHtml(value === ' ' ? '␠' : value) : '—'; }

function renderTrace(items: TraceItem[]): void {
  if (!items.length) { trace.innerHTML = '<p class="surface rounded-2xl p-6 text-[var(--muted)]">Ingresá contenido para ver el desglose.</p>'; return; }
  trace.innerHTML = items.map((item) => `
    <article class="surface rounded-2xl p-5">
      <div class="flex items-start justify-between gap-4"><div><p class="mono text-xs font-bold text-[var(--accent)]">${escapeHtml(item.label)}</p><h3 class="mt-2 text-2xl font-black">${visibleCharacter(item.character)}</h3></div><span class="rounded-lg bg-[var(--surface-2)] px-3 py-2 mono text-sm">${item.decimal}</span></div>
      <p class="mono mt-5 break-all text-sm leading-7">${Array.from(item.binary, bit => `<span class="${bit === '1' ? 'bit-on' : 'bit-off'}">${bit}</span>`).join('')}</p>
      <div class="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3"><span class="text-[var(--muted)]">Posiciones</span><span class="text-[var(--muted)]">Pesos</span><span class="text-[var(--muted)]">Aportes</span>${item.positions.map((position, positionIndex) => `<span class="mono">${position}</span><span class="mono">${item.weights[positionIndex]}</span><span class="mono ${item.contributions[positionIndex] !== '0' ? 'text-[var(--accent)]' : ''}">${item.contributions[positionIndex]}</span>`).join('')}</div>
      <p class="mt-5 border-t border-[var(--line)] pt-4 text-sm font-bold">Suma final <span class="mono text-[var(--accent)]">= ${item.sum}</span></p>
    </article>`).join('');
}

function updateLabels(): void {
  const binaryInput = currentDirection() === 'binary-to-text';
  inputLabel.textContent = binaryInput ? 'Binario de entrada' : 'Texto de entrada';
  outputLabel.textContent = binaryInput ? 'Texto resultante' : 'Binario resultante';
  input.maxLength = binaryInput ? -1 : 100;
  input.placeholder = binaryInput ? (currentEncoding() === 'unicode' ? '0000000001000001' : '01001000 01101111') : 'Escribí algo, por ejemplo: Hola';
}

function runConversion(): void {
  const raw = input.value;
  const unitCount = currentDirection() === 'binary-to-text' ? (raw.trim() ? raw.trim().split(/\s+/).length : 0) : Array.from(raw).length;
  counter.textContent = `${unitCount} / 100`;
  if (unitCount > 100) { output.value = ''; copyButton.disabled = true; setCopyState(false); showFeedback('error', 'Superaste el límite de 100 caracteres o grupos.'); renderTrace([]); return; }
  const result = convert({ direction: currentDirection(), encoding: currentEncoding(), input: raw });
  if (!result.ok) { output.value = ''; copyButton.disabled = true; setCopyState(false); showFeedback('error', result.error); status.textContent = 'Revisá la entrada'; renderTrace([]); return; }
  output.value = result.output;
  copyButton.disabled = !output.value;
  setCopyState(false);
  showFeedback('neutral', raw ? 'Conversión actualizada en tiempo real.' : '');
  status.textContent = raw ? `${result.items.length} elemento(s)` : 'Listo'; renderTrace(result.items);
}

function loadExample(): void { const item = examples[currentEncoding()]; input.value = currentDirection() === 'text-to-binary' ? item.text : item.binary; runConversion(); }

input.addEventListener('input', runConversion);
direction.addEventListener('change', () => { input.value = ''; updateLabels(); runConversion(); });
encoding.addEventListener('change', () => { input.value = ''; updateLabels(); runConversion(); });
byId<HTMLButtonElement>('example').addEventListener('click', loadExample);
byId<HTMLButtonElement>('clear').addEventListener('click', () => { input.value = ''; runConversion(); input.focus(); });
copyButton.addEventListener('click', async () => { if (!output.value) return; try { await navigator.clipboard.writeText(output.value); setCopyState(true); showFeedback('success', 'Resultado copiado al portapapeles.'); } catch { setCopyState(false); showFeedback('error', 'No fue posible copiar automáticamente. Seleccioná el resultado para copiarlo.'); } });

const themeButton = byId<HTMLButtonElement>('theme-toggle');
function setTheme(theme: 'light' | 'dark'): void { document.documentElement.dataset.theme = theme; themeButton.lastElementChild!.textContent = theme === 'dark' ? 'Modo claro' : 'Modo oscuro'; }
const storedTheme = localStorage.getItem('binary-theme');
setTheme(storedTheme === 'light' ? 'light' : 'dark');
themeButton.addEventListener('click', () => { const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; localStorage.setItem('binary-theme', next); setTheme(next); });
updateLabels();
