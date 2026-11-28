import { inspect } from 'node:util'
import { InvalidArgumentError } from 'commander'

export function integer(value, name, min, max) {
  if (!/^\d+$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < min || Number(value) > max) {
    throw new InvalidArgumentError(`${name} must be an integer from ${min} to ${max}`)
  }
  return Number(value)
}
export const port = value => integer(value, 'port', 0, 65535)
export const heartbeatInterval = value => integer(value, 'heartbeat interval', 1000, 2147483647)
// 0 turns it off.
export const logStats = value => value === '0' ? 0 : integer(value, 'log stats interval', 1000, 2147483647)
export const binarySize = value => integer(value, 'size', 0, 1024 * 1024)
export const formatPayload = args => args.map(value => typeof value === 'string' ? value : inspect(value, { colors: false, depth: 6, breakLength: Infinity })).join(' ')

// --trust-proxy: when X-Forwarded-For / -Proto decide a client's address (and so its home channel).
export function trustProxy(value) {
  const modes = { private: 'private', always: true, never: false }
  if (Object.hasOwn(modes, value)) return modes[value]
  if (/^\d+$/.test(value) && Number(value) >= 1 && Number(value) <= 32) return Number(value)
  throw new InvalidArgumentError('use private, always, never or a number of proxy hops (1..32)')
}

export function dashboardPath(value) {
  if (!/^\/[A-Za-z0-9._~\-/]*$/.test(value) || value.length > 64) {
    throw new InvalidArgumentError("a path that starts with '/' and uses URL-safe characters (at most 64)")
  }
  return value
}

// --dashboard-access: open | admin | token | token:<value>. A bare 'token' reads IOSIGNAL_DASHBOARD_TOKEN,
// which keeps the token out of the process list and `docker inspect`.
export function dashboardAccess(value, env = process.env) {
  if (value === 'open') return 'open'
  if (value === 'admin') return { login: { roles: ['admin'] } }
  if (value === 'token' || value.startsWith('token:')) {
    const token = value === 'token' ? env.IOSIGNAL_DASHBOARD_TOKEN : value.slice('token:'.length)
    if (!token || token.length < 8) {
      throw new InvalidArgumentError(value === 'token'
        ? 'set IOSIGNAL_DASHBOARD_TOKEN to a token of at least 8 characters'
        : 'the token needs at least 8 characters')
    }
    return { token }
  }
  throw new InvalidArgumentError('use open, admin, token (IOSIGNAL_DASHBOARD_TOKEN) or token:<value>')
}

// key=value,key=value limits for --anonymous-quota and --connection-limits: positive integers,
// or null (unlimited). The server checks the names.
export function limitList(value) {
  const limits = {}
  for (const part of String(value).split(',').map(s => s.trim()).filter(Boolean)) {
    const [key, raw, ...rest] = part.split('=')
    if (!key || raw === undefined || rest.length) throw new InvalidArgumentError(`use name=value pairs separated by commas (got ${part})`)
    if (raw === 'null') { limits[key] = null; continue }
    const number = Number(raw)
    if (!Number.isSafeInteger(number) || number < 0) throw new InvalidArgumentError(`${key} must be an integer >= 0 or null`)
    limits[key] = number
  }
  if (!Object.keys(limits).length) throw new InvalidArgumentError('give at least one name=value')
  return limits
}

// --anonymous-quota: a profile name (from --quotas) or limits (name=value,...).
export function anonymousQuota(value) {
  return String(value).includes('=') ? limitList(value) : String(value)
}
