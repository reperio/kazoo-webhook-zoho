const dictionary = require('../dictionary');
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
    }};

const configFilePath = path.join(__dirname, "../config", "test.json");
const userConfigFilePath = path.join(__dirname, "../config", "test.user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

const dict = new dictionary(nconf, logger);

let result = null;
test('save key', ()=> {
    result = dict.save('TEST');
    expect(result).not.toBe(null);
});

test('get by key', ()=> {
    expect(dict.getByKey('TEST')).toBe(result);
});

test('has key', () => {
    expect(dict.hasKey('TEST')).toBe(true);
});

test('key cleanup', () => {
    dict.cleanKeys(true);
    expect(dict.hasKey('TEST')).toBe(false);
});