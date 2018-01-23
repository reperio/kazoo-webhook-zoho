const request = require('request-promise-native');
const xml = require('camaro');
const phoneFormatter = require('phone-formatter');
const moment = require('moment');


class CrmApi {
    constructor(config, logger) {
        this._logger = logger;

        this.url = config.get('zoho:url');
        this.authToken = config.get('zoho:authToken');
    }

    async sendCall(callRecord) {
        this._logger.info('Forwarding call to zoho');

        try {
            const callParameters = await this.buildParameters(callRecord);
            this._logger.info(`Sending the following information to zoho: ${JSON.stringify(callParameters)}`);
            const xmlObject = this.buildXml(callParameters);
            const httpOptions = {
                uri: this.url + 'Calls/insertRecords',
                method: 'POST',
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                formData: {
                    xmlData: xmlObject,
                    scope: 'crmapi',
                    authtoken: this.authToken
                }
            };
            this._logger.info('Sending request');
            this._logger.info(xmlObject);
            const response = await request(httpOptions);
            const parsedResponse = JSON.parse(response).response;
            if (parsedResponse.result.message === 'Record(s) added successfully') {
                this._logger.info('Call successfully processed by zoho');
            } else {
                this._logger.warn('Zoho failed to process call');
            }            
        } catch (err) {
            this._logger.error('Post to zoho failed');
            this._logger.error(err);
            throw err;
        }
    }

    async buildParameters(callRecord) {
        let parameters = [];

        parameters.push({ name: 'Subject', value: `Call from ${callRecord.caller_id_name || 'Unknown Name'} ${callRecord.caller_id_number ? phoneFormatter.format(callRecord.caller_id_number, '(NNN)NNN-NNNN') : 'Unknown Number'}`});
        parameters.push({ name: 'Call Type', value: callRecord.call_direction});
        parameters.push({ name: 'Call Start Time', value: moment.unix(callRecord.timestamp - 62167219200).format('YYYY-MM-DD hh:mm:ss') });
        parameters.push({ name: 'Call Duration', value: `${callRecord.duration_seconds >= 60 ? Math.floor(callRecord.duration_seconds / 60) : '00'}:${callRecord.duration_seconds % 60 < 10 ? '0' + callRecord.duration_seconds % 60 : callRecord.duration_seconds % 60}`});

        try {
            let contactId = null;
            const fromNumber = callRecord.from.substr(1, 11);
            contactId = await this.searchForContact(fromNumber);

            if (contactId !== null) {
                parameters.push({name: 'CONTACTID', value: contactId});
            }
        } catch (err) {
            if (err === Error('To many results') || err === Error('No results returned')) {
                this._logger.info('Could not find a contact with the given number.');
            } else {
                this._logger.error('Failed to search for contact');
                //throw err;
            }
        }

        return parameters;
    }

    buildXml(parameters) {
        const xmlStart = '<Calls><row no="1">';
        const xmlEnd = '</row></Calls>';
        let flStrings = [];

        for (let i = 0; i < parameters.length; i++) {
            flStrings.push(`<FL val="${parameters[i].name}">${parameters[i].value}</FL>`);
        }

        return xmlStart + flStrings.join('') + xmlEnd;
    }

    async searchForContact(contactNumber) {
        const formattedNumber = phoneFormatter.format(contactNumber, 'NNN-NNN-NNNN'); //convert the phone number to the format used by zoho
        const criteria = `((Phone:${formattedNumber})OR(Other Phone:${formattedNumber})OR(Mobile:${formattedNumber}))`;

        const http_options = {
            uri: this.url + `Contacts/searchRecords?authtoken=${this.authToken}&scope=crmapi&criteria=${criteria}`,
            method: 'GET'
        };

        this._logger.info('Searching for contact');
        this._logger.info(http_options.uri);

        const response = await request(http_options);
        const parsedResponse = JSON.parse(response).response;

        this._logger.info('Zoho response');
        this._logger.info(parsedResponse);

        if (typeof parsedResponse.nodata !== 'undefined') {
            this._logger.warn('No contact returned');
            throw new Error('No result returned');
        } else if (parsedResponse.result.Contacts.row.length > 1) {
            this._logger.warn('Response included more than one contact');
            throw new Error('Too many results');
        } 

        const fields = parsedResponse.result.Contacts.row.FL;
        for(let i = 0; i < fields.length; i++) {
            if (fields[i].val === 'CONTACTID') {
                return fields[i].content;
            }
        }
        return null;
    }
}

module.exports = CrmApi;