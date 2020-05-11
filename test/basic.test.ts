import * as pull from 'pull-stream'
import * as crypto from 'crypto'
import { Throughput, ThroughputStat } from '../src'

describe('basic', () => {
  it('simple', (done) => {
    const t = new Throughput({ interval: 1e3 })
    const buf = crypto.randomBytes(1e3)
    let prevTotalBytes = 0
    let startAt = Date.now()

    let count = 2

    const fired = jest.fn((stats: ThroughputStat) => {
      expect(stats.startAt).toBeGreaterThan(startAt)
      expect(stats.totalBytes).toBeGreaterThanOrEqual(prevTotalBytes)
      prevTotalBytes = stats.totalBytes
      if (--count === 0) done()
    })

    t.on('stat', fired)

    pull(
      pull.values([buf, buf, buf, buf]),
      pull.asyncMap((data, cb) => {
        setTimeout(() => {
          cb(null, data)
        }, 800)
      }),
      t.through,
      pull.drain()
    )
  })
})
