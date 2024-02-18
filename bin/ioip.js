#!/usr/bin/env node

import { getNetworkAddress } from './serverInfo.js'
let ip = getNetworkAddress()
console.log( ip )

