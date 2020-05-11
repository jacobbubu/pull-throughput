import * as pull from 'pull-stream'
import { EventEmitter } from 'events'

export interface ThroughputOptions {
  interval: number
}

export interface ThroughputStat {
  startAt: number
  totalBytes: number
  maxBPS: number
  latestBPS: number
}

export interface Throughput<T> {
  addListener(event: 'stat', listener: (stats: ThroughputStat) => void): this
  on(event: 'stat', listener: (stats: ThroughputStat) => void): this
  once(event: 'stat', listener: (stats: ThroughputStat) => void): this
}

export class Throughput<T> extends EventEmitter {
  private _through: pull.Through<T, T> | null = null
  private _startAt = -1
  private _interval: number
  private _maxBPS = 0
  private _latestBPS = 0
  private _statAt = 0
  private _statBytes = 0
  private _totalBytes = 0
  private _timeoutId: NodeJS.Timeout | null = null
  private _ended = false

  constructor(opts: Partial<ThroughputOptions> = {}) {
    super()
    this._interval = opts.interval ?? 1e3
  }

  get through() {
    if (!this._through) {
      this._through = pull.through(
        (data: T) => {
          const len = (data as any).length ?? 1
          if (this._totalBytes + len >= Number.MAX_SAFE_INTEGER) {
            this._totalBytes = 0
          }
          this._totalBytes += len

          if (this._startAt === -1) {
            this._startAt = Date.now()
            this._statAt = this._startAt
            this.resume()
          } else {
            const now = Date.now()
            const timeDiff = now - this._statAt
            if (timeDiff >= 1e3) {
              this._statAt = now
              const deltaBytes = this._totalBytes - this._statBytes
              this._statBytes = this._totalBytes
              this._latestBPS = Math.floor((deltaBytes / timeDiff) * 1000)
              if (this._latestBPS > this._maxBPS) {
                this._maxBPS = this._latestBPS
              }
            }
          }
        },
        () => {
          this._ended = true
          this.stop()
        }
      )
    }
    return this._through
  }

  get startAt() {
    return this._startAt
  }

  get totalBytes() {
    return this._totalBytes
  }

  get maxBPS() {
    return this._maxBPS
  }

  get latestBPS() {
    return this._latestBPS
  }

  stop() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId)
      this._timeoutId = null
    }
  }

  resume() {
    if (this._timeoutId) return
    if (this._startAt === -1 || this._ended) return

    const self = this

    function loop() {
      self.emit('stat', {
        startAt: self._startAt,
        totalBytes: self._totalBytes,
        maxBPS: self._maxBPS,
        latestBPS: self._latestBPS,
      })

      self._timeoutId = setTimeout(loop, self._interval)
    }
    self._timeoutId = setTimeout(loop, self._interval)
  }
}
