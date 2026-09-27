import { inspect } from 'node:util'
import { InvalidArgumentError } from 'commander'

export function integer(value, name, min, max) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new InvalidArgumentError(`${name} must be an integer from ${min} to ${max}`)
  }
  return Number(value)
}
export const port = value => integer(value, 'port', 0, 65535)
export const timeout = value => integer(value, 'timeout', 1000, 2147483647)
export const binarySize = value => integer(value, 'size', 0, 1024 * 1024)
export const formatPayload = args => args.map(value => typeof value === 'string' ? value : inspect(value, { colors: false, depth: 6, breakLength: Infinity })).join(' ')
