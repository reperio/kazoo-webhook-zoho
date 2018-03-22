const Hapi = require('hapi');
const moment = require('moment');
const nconf = require('nconf');
const path = require('path');
const winston = require('winston');
require('winston-daily-rotate-file');
const phoneFormatter = require('phone-formatter');

const Dictionary = require('./dictionary');
const CrmApi = require('./crmApi');

const env = process.env.NODE_ENV || 'development';
const configFilePath = path.join(__dirname, "config", env + ".json");
const userConfigFilePath = path.join(__dirname, "config", env + ".user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

const inBoundNumbers = nconf.get('kazoo:numbers');
const ignoredFromNumbers = nconf.get('kazoo:ignored_from_numbers');
console.log(`inBoundNumbers: ${JSON.stringify(inBoundNumbers)}`);
console.log(`ignoredFromNumbers: ${JSON.stringify(ignoredFromNumbers)}`);

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

function cleanNumber(phoneNumber) {
    const cleanedPhoneNumber = phoneNumber.replace('+', '');

    return cleanedPhoneNumber;
}

server.route({
    method: ['POST', 'GET'],
    path: '/',
    handler: (request) => {
        const callRecord = request.payload;

        request.server.app.logger.info();
        request.server.app.logger.info('POST Received');
        request.server.app.logger.info(JSON.stringify(callRecord));

        if (callRecord !== null) {
            const callTo = callRecord.to.split('@');
            const callFrom = callRecord.from.split('@');

            const callFromNumber = cleanNumber(callFrom[0]);
            const calledNumber = cleanNumber(callTo[0]);

            request.server.app.logger.info(`Checking ignored list for from number: ${callFromNumber}`);
            for (let i = 0 ; i < ignoredFromNumbers.length; ++i) {
                request.server.app.logger.info(`Checking ${ignoredFromNumbers[i]} against ${callFromNumber}`);
                if (ignoredFromNumbers[i] === callFromNumber) {
                    request.server.app.logger.info(`Ignoring call from: ${callFromNumber}`);
                    return '';
                }
            }
            request.server.app.logger.info('Ignored number checks passed.');

            request.server.app.logger.info(`Checking Number: ${calledNumber} in ${inBoundNumbers.length} numbers`);
            for(let i=0;i<inBoundNumbers.length;i++) {
                request.server.app.logger.info(`Comparing called number ${calledNumber} to configuration number ${inBoundNumbers[i]}`);
                if (inBoundNumbers[i] === calledNumber && callRecord.call_direction === 'inbound') {
                    request.server.app.logger.info(`Matched Number to inbound numbers`);
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
        request.server.app.logger.info('POST Finished');
        request.server.app.logger.info();
        return '';
    }
});

server.start().then(() => {
    server.app.logger.info(`Server running at: ${server.info.uri}`);
});



/*
    Example request payload:
{
        "call_direction": "inbound",
        "timestamp": "63683271712",
        "account_id": "d38abe802090d3216dff4993fd5ee186",
        "request": "+15138184651@64.62.138.142",
        "to": "+15138184651@64.62.138.142",
        "from": "+15136336533@67.231.9.166",
        "call_id": "459843351_117288744@67.231.9.166",
        "caller_id_name": "MEHL NOAH",
        "caller_id_number": "+15136336533",
        "reseller_id": "9f160666156d1803962bb7b5bd233b23",
        "authorizing_type": "resource",
        "local_resource_used": "false",
        "emergency_resource_used": "false",
        "hook_event": "channel_destroy",
        "hangup_cause": "ORIGINATOR_CANCEL",
        "hangup_code": "sip:487",
        "duration_seconds": "9",
        "ringing_seconds": "1",
        "billing_seconds": "0"
}
*/