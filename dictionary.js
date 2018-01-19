const moment = require('moment');

class Dictionary {
    constructor(config, logger) {
        this.retention = config.get('dictionary:retention');
        this.interval = config.get('dictionary:interval');
        this._logger = logger;

        this.dict = {};

        setInterval(() => this.cleanKeys(), this.interval);
        this._logger.info(`Dictionary cleanup task started`);
    }

    getByKey(key) {
        return this.dict[key];
    }

    hasKey(key) {
        return !(typeof this.dict[key] === 'undefined');
    }

    save(key) {
        this.dict[key] = moment();
        return this.dict[key];
    }

    cleanKeys(cleanAll) {
        cleanAll = cleanAll || false;
        if (cleanAll) {
            this.dict = {};
            return;
        }

        const keys = Object.keys(this.dict);
        keys.forEach( key => {
            const duration = moment.duration(moment().diff(this.dict[key]));
            if (duration.asMilliseconds() > this.retention) {
                this._logger.info(`Removed dictionary key - ${key}`);
                delete this.dict[key];
            }
        });
    }
}

module.exports = Dictionary;