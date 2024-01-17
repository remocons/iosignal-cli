import { networkInterfaces as getNetworkInterfaces } from 'node:os';
const networkInterfaces = getNetworkInterfaces();
import chalk from 'chalk';
import boxen from 'boxen';


function getNetworkAddress (){
    for (const interfaceDetails of Object.values(networkInterfaces)) {
      if (!interfaceDetails) continue;
  
      for (const details of interfaceDetails) {
        const { address, family, internal } = details;
  
        if (family === 'IPv4' && !internal) return address;
      }
    }
  };


export function serverInfo ( wsPort, congPort ){
    let ip = getNetworkAddress();
    let message = chalk.green('WebSocket: Browser or nodejs client');

    const prefix = '- '
    const space = '    '

    message += `\n\n${chalk.bold(`${prefix}Local:`)}${space}ws://localhost:${wsPort}`;
    message += `\n${chalk.bold('- Network:')}  ws://${ip}:${wsPort}`;

    if(congPort){
        message += `\n\n`;
        message += chalk.green('CongSocket: nodejs client or CLI');
        message += `\n\n${chalk.bold(`${prefix}Local:`)}${space}cong://localhost:${congPort}`;
        message += `\n${chalk.bold('- Network:')}  cong://${ip}:${congPort}`;

        message += `\n\n`;
        message += chalk.green('CongSocket: Arduino client');
        message += `\n\n${chalk.bold(`${prefix}host:`)} ${ip}`;
        message += `\n${chalk.bold('- port:')} ${congPort }`;

    }

    return boxen(message, { padding: 1, borderColor: 'green', margin: 1, })

}



