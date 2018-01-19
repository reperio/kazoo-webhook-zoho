const path = require('path');
const nconf = require('nconf');
const winston = require('winston');
require('winston-daily-rotate-file');

const CrmApi = require('./crmApi');


const env = process.env.NODE_ENV || 'development';
const configFilePath = path.join(__dirname, "config", env + ".json");
const userConfigFilePath = path.join(__dirname, "config", env + ".user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

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

crmApi = new CrmApi(nconf, app_logger);

const call = {
    call_direction: "outbound",
    timestamp: "63683271712",
    account_id: "d38abe802090d3216dff4993fd5ee186",
    request: "+15132882153@sevenhills.sip.reper.io",
    to: "+15136336533@sevenhills.sip.reper.io",
    from: "+15136336533@sevenhills.sip.reper.io",
    call_id: "e1a8fc9e-fa3c-11e7-afd5-cb4e0c859163",
    other_leg_call_id: "e1549bea-fa3c-11e7-afbd-cb4e0c859163",
    caller_id_name: "MEHL NOAH",
    caller_id_number: "+15136336533",
    callee_id_name: "5132882153",
    callee_id_number: "5132882153",
    reseller_id: "9f160666156d1803962bb7b5bd233b23",
    local_resource_used: "false",
    emergency_resource_used: "true",
    hook_event: "channel_destroy",
    hangup_cause: "ORIGINATOR_CANCEL",
    duration_seconds: "8",
    ringing_seconds: "0",
    billing_seconds: "0"
}

crmApi.sendCall(call);