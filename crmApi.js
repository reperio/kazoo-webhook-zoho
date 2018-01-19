const request = require('request-promise-native');
const xml = require('camaro');
const moment = require('moment');


class CrmApi {
    constructor(config, logger) {
        this._logger = logger;

        this.url = config.get('zoho:url');
        this.authToken = config.get('zoho:authToken');
        // this.xmlParser = new xml.Parser();
        // this.xmlBuilder = new xml.Builder();
    }

    async sendCall(callRecord) {
        this._logger.info('Forwarding call to zoho');

        try {
            const xmlObject = this.buildXml(callRecord);
            const httpOptions = {
                uri: this.url,
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
            const xmlResponse = await request(httpOptions);

            this._logger.debug(xmlResponse);
            const response = await this.parseXml(xmlResponse);
            if (response == 'Record(s) added successfully') {
                this._logger.info('Call successfully processed by zoho');
            } else {
                this._logger.info('Zoho failed to process call');
            }            
        } catch (err) {
            this._logger.error('Post to zoho failed');
            this._logger.error(err);
            throw err;
        }
    }

    buildXml(callRecord) {
        return `<Calls>
                    <row no="1">
                        <FL val="Subject">
                            ${callRecord.caller_id_name}
                        </FL>
                        <FL val="Call Type">
                            ${callRecord.call_direction}
                        </FL>
                        <FL val="Call Start Time">
                            ${moment.unix(callRecord.timestamp - 62167219200).format('YYYY-MM-DD hh:mm:ss')}
                        </FL>
                        <FL val="Call Duration">
                            ${callRecord.duration / 60}:${callRecord % 60}
                        </FL>
                    </row>
                </Calls>`;
    }
    
    async parseXml(xmlObject) {
        this._logger.debug(xmlObject);
        // return new Promise(resolve => {
        //     this.xmlParser.parseString(xmlObject, {ignoreAttrs : false, mergeAttrs : true},function (err, result) {
        //         if (err) {
        //             this._logger.error('Error parsing zoho response data');
        //             this._logger.error(err);
        //             throw err;
        //         }

        //         resolve(result);
        //     });
        // });

        return new Promise(resolve => {
            const temp = {
                message: 'response/result/message'
            };
            const json = xml(xmlObject, temp);
            resolve(json.message);
        })
    }
}

module.exports = CrmApi;