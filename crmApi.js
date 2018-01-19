const request = require('request-promise-native');
const xml = require('xml2js');


class CrmApi {
    constructor(config, logger) {
        this._logger = logger;

        this.url = config.get('zoho:url');
        this.authToken = config.get('zoho:authToken');
        this.xmlParser = new xml.Parser();
        this.xmlBuilder = new xml.Builder();
    }

    async sendCall(callRecord) {
        this._logger.info('Forwarding call to zoho');

        const xmlObject = await buildXml(callRecord);

        const payload = {
            xmlData: xmlObject,
            scope: 'crmapi',
            authtoken: this.authToken
        };

        const httpOptions = {
            uri: this.url,
            method: 'POST',
            headers: {
                'Content-Type': 'application/xml'
            },
            json: payload
        };

        try {
            const xmlResponse = await request(httpOptions);
            const response = await this.parseXml(xmlResponse);
            const message = response.result.message;
            

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
        return new Promise(resolve => {
            this.xmlParser.parseString(xmlObject, function (err, result) {
                if (err) {
                    this._logger.error('Error parsing zoho response data');
                    this._logger.error(err);
                    throw err;
                }

                resolve(result);
            });
        });
    }
}