// Equivalent to: node bin/io-server.js -l 7777 --auth-redis --show-message message
process.argv = [process.argv[0], process.argv[1], '-l', '7777', '--auth-redis', '--show-message', 'message', ...process.argv.slice(2)]
await import('../bin/io-server.js')
