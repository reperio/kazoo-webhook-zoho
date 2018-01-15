const Hapi = require('hapi');
const moment = require('moment');

async function start() {
    const server = new Hapi.Server({
        port: 8080,
        host: '0.0.0.0'
    });

    server.route({
        method: ['POST', 'GET'],
        path: '/',
        handler: (request) => {
            console.log(`Recieved request from ${request.info.remoteAddress}, timestamp: ${moment()}`)
            console.log(JSON.stringify(request.payload));
            console.log('');
            console.log('');

            return 'test';
        }
    });

    await server.start();

    console.log(`Server running at: ${server.info.uri}, started at ${moment()}`);
}

start();