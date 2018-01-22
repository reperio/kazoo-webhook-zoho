const CrmApi = require('../crmApi');
const nconf = require('nconf');
const path = require('path');

const logging = false;
const logger = {
    error: (message) => {
        if (logging) {
            console.log(message || '');
        }
    }, info: (message) => {
        if (logging) {
            console.log(message || '');
        }
    }, debug: (message) => {
        if (logging) {
            console.log(message || '');
        }
    }, warn: (message) => {
        if (logging) {
            console.log(message || '');
        }
    }};

const configFilePath = path.join(__dirname, "../config", "test.json");
const userConfigFilePath = path.join(__dirname, "../config", "test.user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

const crmapi = new CrmApi(nconf, logger);

test('search for contact', async () => {
    expect(await crmapi.searchForContact('555-555-5556')).toBe('3008533000000139230');
});

test('contact search finds multiple contacts', async () => {
    try {
        await crmapi.searchForContact('555-555-5555');
        expect('Test').toEqual('Failed');
    } catch (err) {
        expect(err).toEqual(Error('Too many results'));
    }
});

test('Contact search returns no data', async () => {
    try {
        const result = await crmapi.searchForContact('333-333-3333');
        expect('Test').toEqual('Failed');
    } catch (err) {
        expect(err).toEqual(Error('No result returned'));
    }
});