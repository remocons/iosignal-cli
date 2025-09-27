import { networkInterfaces as getNetworkInterfaces } from 'node:os';
const networkInterfaces = getNetworkInterfaces();
import chalk from 'chalk';
import boxen from 'boxen';


export function getNetworkAddress (){
    for (const interfaceDetails of Object.values(networkInterfaces)) {
      if (!interfaceDetails) continue;
  
      for (const details of interfaceDetails) {
        const { address, family, internal } = details;
  
        if (family === 'IPv4' && !internal) return address;
      }
    }
  };


export function serverInfo ( server ){

    let ip = getNetworkAddress();
    let message
    
    if( server.port == 0 || server.port || server.congPort == 0 || server.congPort ){
      message = chalk.green('Serving');
    }else{
      message = chalk.green('please use -l and -L option to select port number.');
      message += chalk.yellow('\n\n $ io-server -l 7777');
      message += chalk.green('  // iosignal over websocket.');
      message += chalk.yellow('\n\n $ io-server -L 8888');
      message += chalk.green('  // iosignal over congsocket.');
      message += chalk.yellow('\n\n $ io-server -l 7777 -L 8888');
      message += chalk.green('  // suppport both.');
      message += chalk.yellow('\n\n $ io-server -h');
      message += chalk.green('  // display help');
    }

    const prefix = '- '
    const space = '    '

    if(server.port == 0 || server.port){
      message += `\n\n`;
      message += chalk.green('IOSignal Over WebSocket');
      message += chalk.yellow('\n\n Web Browser & Node.js');
      message += `\n ${chalk.bold(`${prefix}Local:`)}${space}ws://localhost:${server.port}`;
      message += `\n ${chalk.bold('- Network:')}  ws://${ip}:${server.port}`;
    }else{

    }

    if(server.congPort == 0 || server.congPort){
        message += `\n\n`;
        message += chalk.green('IOSignal Over CongSocket');
        message += chalk.yellow('\n\n Node.js');

        message += `\n ${chalk.bold(`${prefix}Local:`)}${space}cong://localhost:${server.congPort}`;
        message += `\n ${chalk.bold('- Network:')}  cong://${ip}:${server.congPort}`;
        
        message += chalk.yellow('\n\n Arduino');
        message += `\n ${chalk.bold(`${prefix}host:`)} ${ip}`;
        message += `\n ${chalk.bold('- port:')} ${server.congPort }`;

    }

    return boxen(message, { padding: 1, borderColor: 'green', margin: 1, })

}