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

const env = process.env.NODE_ENV || 'development';
const configFilePath = path.join(__dirname, "../config", env + ".json");
const userConfigFilePath = path.join(__dirname, "../config", env + ".user.json");
nconf
    .file("user_overrides", userConfigFilePath)
    .file("defaults", configFilePath);

const config = nconf.get();
delete config.type;
delete config['$0'];
delete config['_'];

console.log(JSON.stringify(config));

test('can access config objects', () => {
    expect(config.dictionary).toBe(30000);
});

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

test('automatic key cleanup', () => {
    dict.save('TEST');
    setTimeout(() => {
        expect(dict.hasKey('TEST').toBe(false));
    }, 31000)
});