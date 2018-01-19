const Hapi = require('hapi');
const moment = require('moment');
const nconf = require('nconf');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');

const Dictionary = require('./dictionary');
const CrmApi = require('./crmApi');

const env = process.env.NODE_ENV || 'development';
const configFilePath = path.join(__dirname, "config", env + ".json");
const userConfigFilePath = path.join(__dirname, "config", env + ".user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

const inBoundNumbers = nconf.get('kazoo:numbers');
console.log("inBoundNumbers: " + JSON.stringify(inBoundNumbers));
//create a server
const server = new Hapi.Server({
    port: nconf.get('server:port'),
    host: nconf.get('server:host')
});

//configure logging
const app_file_transport = new (winston.transports.DailyRotateFile)({
    name: 'file_transport',
    filename: nconf.get('logging:directory') + '/log',
    datePattern: 'controller-app-yyyy-MM-dd.',
    prepend: true,
    level: nconf.get('logging:level'),
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false
});

const app_json_transport = new (winston.transports.DailyRotateFile)({
    name: 'json_transport',
    filename: nconf.get('logging:directory') + '/log',
    datePattern: 'controller-json-yyyy-MM-dd.',
    prepend: true,
    level: nconf.get('logging:level'),
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: true
});

const trace_file_transport = new (winston.transports.DailyRotateFile)({
    filename: nconf.get('logging:directory') + '/log',
    datePattern: 'controller-trace-yyyy-MM-dd.',
    prepend: true,
    level: nconf.get('logging:level'),
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: true
});

const console_transport = new (winston.transports.Console)({
    prepend: true,
    level: nconf.get('logging:level'),
    humanReadableUnhandledException: true,
    handleExceptions: true,
    json: false,
    colorize: true
});

const app_logger = new (winston.Logger)({
    transports: [
        app_file_transport,
        app_json_transport,
        console_transport
    ]
});

const trace_logger = new (winston.Logger)({
    transports: [
        trace_file_transport,
        console_transport
    ]
});

server.app.logger = app_logger;
server.app.trace_logger = trace_logger;

const dict = new Dictionary(nconf, app_logger);
dict.cleanKeys(true);
const crmApi = new CrmApi(nconf, app_logger);

//make sure unhandled exceptions are logged
server.events.on({ name: 'request', channels: 'error' }, (request, event, tags) => {

    server.app.logger.error('An error happened... somewhere');
});

server.route({
    method: ['POST', 'GET'],
    path: '/',
    handler: (request) => {
        const callRecord = request.payload;

        if (callRecord !== null) {
            call_to = callRecord.to.substr(1, 11);

            for(let i=0;i<inBoundNumbers.length;i++) {
                if (inBoundNumbers[i] === call_to) {
                    //check the dictionary to see if the call has been processed already
                    if (!dict.hasKey(callRecord.call_id)) {
                        request.server.app.logger.info(`Recieved call - ${callRecord.call_id}`);

                        //add the call to the dictionary so we don't process it again
                        dict.save(callRecord.call_id, moment());
                        request.server.app.logger.info(`Added dictionary key - ${callRecord.call_id}`);

                        //forward the call record to zoho
                        crmApi.sendCall(callRecord);
                    } else {
                        //call was already proccessed, so ignore it 
                        request.server.app.logger.warn(`Recieved duplicate call - ${callRecord.call_id}`);
                    }
                }
            }
        }
        return '';
    }
});

server.start().then(() => {
    server.app.logger.info(`Server running at: ${server.info.uri}`);
});



/*
    Example request payload: 
    {
        "call_direction": "outbound",
        "timestamp": "63683271712",
        "account_id": "d38abe802090d3216dff4993fd5ee186",
        "request": "+15132882153@sevenhills.sip.reper.io",
        "to": "+15136336533@sevenhills.sip.reper.io",
        "from": "+15136336533@sevenhills.sip.reper.io",
        "call_id": "e1a8fc9e-fa3c-11e7-afd5-cb4e0c859163",
        "other_leg_call_id": "e1549bea-fa3c-11e7-afbd-cb4e0c859163",
        "caller_id_name": "MEHL NOAH",
        "caller_id_number": "+15136336533",
        "callee_id_name": "5132882153",
        "callee_id_number": "5132882153",
        "reseller_id": "9f160666156d1803962bb7b5bd233b23",
        "local_resource_used": "false",
        "emergency_resource_used": "true",
        "hook_event": "channel_destroy",
        "hangup_cause": "ORIGINATOR_CANCEL",
        "duration_seconds": "8",
        "ringing_seconds": "0",
        "billing_seconds": "0"
    }
*/