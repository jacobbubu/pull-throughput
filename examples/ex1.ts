import * as crypto from 'crypto'
import * as pull from 'pull-stream'
import { Throughput, prettyBytes } from '../src'

const t = new Throughput({ interval: 2e3 })

t.on('stat', (stats) => {
  const readable = {
    startAt: new Date(stats.startAt),
    totalBytes: prettyBytes(stats.totalBytes),
    latestBPS: prettyBytes(stats.latestBPS),
    maxBPS: prettyBytes(stats.maxBPS),
  }
  console.log(readable)
})

const buf = crypto.randomBytes(1024 * 1024)

pull(
  pull.infinite(() => buf),
  pull.asyncMap((data, cb) => {
    setTimeout(() => {
      cb(null, data)
    }, Math.floor(Math.random() * 200))
  }),
  t.through,
  pull.drain()
)
