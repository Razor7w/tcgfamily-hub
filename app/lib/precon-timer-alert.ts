let lastAlertKey: string | null = null
let audio: AudioContext | null = null

function audioContext(): AudioContext | null {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!Ctx) return null
  audio ??= new Ctx()
  return audio
}

function beep() {
  const context = audioContext()
  if (!context) return
  void context.resume().then(() => {
    const tone = (frequency: number, at: number) => {
      const osc = context.createOscillator()
      const gain = context.createGain()
      osc.frequency.value = frequency
      const start = context.currentTime + at
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.35)
      osc.connect(gain)
      gain.connect(context.destination)
      osc.start(start)
      osc.stop(start + 0.36)
    }
    tone(880, 0)
    tone(1175, 0.22)
  })
}

/** Hay que llamarlo desde un clic: el navegador solo pide permiso con un gesto. */
export function armPreconTimerAlert(): void {
  if (typeof window === 'undefined') return
  const context = audioContext()
  if (context) void context.resume()
  if (!('Notification' in window) || Notification.permission !== 'default') {
    return
  }
  void Notification.requestPermission()
}

export function alertPreconTimerEnded(startedAt: number | null): void {
  if (typeof window === 'undefined') return
  const key = String(startedAt ?? 'end')
  if (lastAlertKey === key) return
  lastAlertKey = key
  document.title = 'Tiempo terminado | TCG Nexo'
  beep()
  if (!('Notification' in window) || Notification.permission !== 'granted')
    return
  try {
    new Notification('Tiempo terminado', {
      body: 'La ronda de precon llegó a cero.',
      tag: 'precon-timer'
    })
  } catch {
    // El aviso en pantalla y el sonido siguen aunque la notificación falle.
  }
}
