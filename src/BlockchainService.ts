import Fabric_Client from "fabric-client";
import Fabric_CA_Client from "fabric-ca-client";
import aes256 from "aes256";
import {ApiService} from "./ApiService";
import MessageHandler from "./MessageHandler";
import camelCase from 'camelcase';
import CDBKVS from 'fabric-client/lib/impl/CouchDBKeyValueStore';

interface Propuesta{
    chaincodeId: string,
    fcn: string,
    args: Array<any>
    chainId: string,
    txId:  Fabric_Client.TransactionId
}

export class BlockchainService {

    private data: ApiService;
    protected connectionProfile: any;
    protected fabric_client = new Fabric_Client();
    protected fabric_ca_client = null;
    protected admin_user = null;
    private _chaincode = "InTran";
    private _channelId = "default-pi";
    private channel = null;
    private credentials: Object;
    private _peersID = ["org3-peer2c3a"];
    private peers = [];
    private keyValue = "Aqui";

    constructor(connectionProfile: Object, credentials: Object) {
        this.connectionProfile = connectionProfile;
        this.credentials = credentials;
        this.channel = this.fabric_client.newChannel(this._channelId);
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        const mSpid = this.connectionProfile.certificateAuthorities[org]['x-mspid'];

        for (let i = 0; i < this._peersID.length; i++) {
            let peer = this._peersID[i];
            let p = this.fabric_client.newPeer(this.connectionProfile.peers[peer].url, {
                pem: this.connectionProfile.peers[peer].tlsCACerts.pem,
                'ssl-target-name-override': null
            });
            this.peers.push(p);
            this.channel.addPeer(p, mSpid);
        }

        const o = this.fabric_client.newOrderer(this.connectionProfile.orderers.orderer.url, {pem: this.connectionProfile.orderers.orderer.tlsCACerts.pem, 'ssl-target-name-override': null});
        this.channel.addOrderer(o);
    }


    get chaincode(): string {
        return this._chaincode;
    }

    set chaincode(value: string) {
        this._chaincode = value;
    }

    get channelId(): string {
        return this._channelId;
    }

    set channelId(value: string) {
        this._channelId = value;
    }

    get peersID(): string[] {
        return this._peersID;
    }

    set peersID(value: string[]) {
        this._peersID = value;
    }

    generateKeyStore() {
        // @ts-ignore
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        // @ts-ignore
        const url = this.connectionProfile.certificateAuthorities[org].url.substring(8, 1000);
        // @ts-ignore
        const id = this.connectionProfile.certificateAuthorities[org].registrar[0].enrollId;
        // @ts-ignore
        const secret = this.connectionProfile.certificateAuthorities[org].registrar[0].enrollSecret;
        // @ts-ignore
        const caName = this.connectionProfile.certificateAuthorities[org].caName;
        console.log(this.credentials);

        return new CDBKVS({url: `https://${this.credentials["user"]}:${this.credentials["password"]}@${this.credentials["host"]}`, name: this.credentials["database"]})
            .then((state_store) => {
                this.fabric_client.setStateStore(state_store);
                const crypto_suite = Fabric_Client.newCryptoSuite();
                //const crypto_store = Fabric_Client.newCryptoKeyStore({path: this.store_path});
                //crypto_suite.setCryptoKeyStore(crypto_store);
                this.fabric_client.setCryptoSuite(crypto_suite);
                const tlsOptions = {
                    trustedRoots: new Buffer([]),
                    verify: false
                };
                return new Fabric_CA_Client(`https://${id}:${secret}@${url}`, tlsOptions, caName, crypto_suite);
            }).then((fabric_ca_client) => {
                this.fabric_ca_client = fabric_ca_client;
                return fabric_ca_client;
            }).catch((err) => {
                console.log(err);
            })
    }

    async enrollAdmin() {
        // @ts-ignore
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        // @ts-ignore
        const id = this.connectionProfile.certificateAuthorities[org].registrar[0].enrollId;
        // @ts-ignore
        const secret = this.connectionProfile.certificateAuthorities[org].registrar[0].enrollSecret;
        // @ts-ignore
        const mSpid = this.connectionProfile.certificateAuthorities[org]['x-mspid'];

        return await this.generateKeyStore().then(() => {
            return this.fabric_client.getUserContext(id, false);
        }).then((user_from_store) => {
            if (user_from_store && user_from_store.isEnrolled()) {
                console.log('Logre cargar al administrador de persistencia');
                this.admin_user = user_from_store;
                return this.admin_user;
            }else {
                return this.fabric_ca_client.enroll({
                    enrollmentID: id,
                    enrollmentSecret: secret
                }).then((enrollment) => {
                    console.log('Logre enrolar al usuario "admin"');
                    // noinspection TypeScriptValidateJSTypes
                    return this.fabric_client.createUser(
                        {
                            username: id,
                            mspid: mSpid,
                            cryptoContent: {privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate},
                            skipPersistence: false
                        });
                }).then((user) => {
                    this.admin_user = user;
                    return this.fabric_client.setUserContext(this.admin_user, false);
                }).catch((err) => {
                    console.error('Falle en enrolar y persistir en usuario “admin”, Error: ' + err.stack ? err.stack : err);
                    throw new Error('La dirección es invalida');
                });
            }
        }).then(() => {
            console.log('Asigne a “admin” como un usuario de fabric-client');
            return this.admin_user;
        }).catch((err) => {
            console.error('Falle en enrolar a “admin”: ' + err);
        });
    }

    private userMatch=/^((?!org[0-9]|peer|admin|ibm).)*$/gm;

    public async getUsers() {
        return await this.enrollAdmin().then(() => {
        }).then(() => {
            return this.fabric_ca_client.newIdentityService().getAll(this.admin_user);
        }).then((users) => {
            return users.result.identities.filter((item) => {
                return item.id.toString().match(this.userMatch)
            });
        });
    }

    public async getRegisteredCompanies(){
        return await this.enrollAdmin().then(() => {
            return this.getOrganizations();
        }).then((users) => {
            return new MessageHandler(200, "Exito! Todo salio de forma correcta", users.payload);
        });
    }

    private async getNextUser(company: string) {
        return await this.enrollAdmin().then((user_from_store) => {
            return this.fabric_ca_client.newIdentityService().getAll(this.admin_user);
        }).then((users) => {
            const list = users.result.identities.filter((item) => {
                return item.id.toString().match(company)
            });
            const last = list.sort(function(a, b) {
                var nameA = a.id.toUpperCase(); // ignore upper and lowercase
                var nameB = b.id.toUpperCase(); // ignore upper and lowercase
                if (nameA < nameB) {
                    return -1;
                }
                if (nameA > nameB) {
                    return 1;
                }

                // names must be equal
                return 0;
            }).reverse()[0].id;
            if(last != null) {
                const num = parseInt(last.match(/[!=^0-9.]/g).join("")) + 1;
                return last.replace(/[!=^0-9.]/g, num);
            }else{
                throw new Error("Esa compañia no esta registrada");
            }
        });
    }

    public async deleteUser(compania: string) {
        let mensaje = {};
        return await this.enrollAdmin().then((usuario) =>{
            return this.queryOrganization(compania);
        }).then((message) => {
            mensaje = message.payload;
            if(message.status == 200) {
                return this.fabric_ca_client.revoke({enrollmentID: message.payload.user, serial: message.payload.signCert, reason: 'removefromcrl'}, this.admin_user);
            }else{
                let val = message.message;
                val = val.replace("2 UNKNOWN: error executing chaincode: transaction returned with failure: Error: ","");
                val = val.replace("transaction returned with failure: Error: ", "");
                throw new Error(val)
            }
        }).then((users) => {
            // @ts-ignore
            return new MessageHandler(200, "Exito! Todo salio de forma correcta", {user: mensaje.user, serial: mensaje.signCert})
        }).catch((err) =>{
            let sol = err.message;
            return new MessageHandler(400, sol);
        })
    }

    public async registerUser(affiliation: string, compania: string) {
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        const mSpid = this.connectionProfile.certificateAuthorities[org]['x-mspid'];
        const username = `user_${camelCase(compania)}_0`;
        let password = "";

        return await this.enrollAdmin().then(() => {
            return this.queryOrganization(compania);
        }).then((message) => {
            if(message.status != 200) {
                return this.fabric_ca_client.register({
                    enrollmentID: username,
                    affiliation: affiliation,
                    role: 'client',
                    attrs: [{
                        name: "organization",
                        value: compania,
                        ecert: true,
                    }]
                }, this.admin_user);
            }else{
                throw new Error("Esa compañia ya esta registrada");
            }
        }).then((secret) => {
            // next we need to enroll the user with CA server
            password = secret;
            return this.fabric_ca_client.enroll({
                enrollmentID: username,
                enrollmentSecret: secret,
                attr_reqs: [
                    {
                        name: "organization",
                        optional: false
                    }
                ]
            });
        }).then((enrollment) => {
            let save;
            return this.fabric_client.createUser(
                {
                    username: username,
                    mspid: mSpid,
                    cryptoContent: {privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate},
                    skipPersistence: true
                }).then((user) => {
                save =  {
                    "priv": Buffer.from(aes256.encrypt(this.keyValue, enrollment.key.toBytes()).toString()).toString("base64"),
                    "cert": Buffer.from(aes256.encrypt(this.keyValue, user.toString()).toString()).toString("base64")
                };
                return user;
            }).then((user) =>{
                return this.addOrganization(compania, JSON.stringify({user: username, password: password, signCert: JSON.parse(user.toString()).enrollment.signingIdentity, organization: affiliation}));
            }).then(() =>{
                return save;
            })
        }).then((user) => {
            console.log(`El usuario "${username}" se logró enrolar y está listo para interactuar con el Blockchain`);
            return user;
        }).catch((err) => {
            let sol = err.message;
            if(err.message.toString().includes("is already registered")){
                sol = `El usuario ${username} ya esta registrado`;
            }
            return new MessageHandler(400, sol);
        });
    }

    public async updateUser(compania: string) {
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        const mSpid = this.connectionProfile.certificateAuthorities[org]['x-mspid'];
        let username = "";
        let affiliation = "";
        let password = "";

        return await this.deleteUser(compania).then((e) =>{
            if(e.status == 200) {
                return this.getNextUser(camelCase(compania));
            }else{
                throw new Error(e.message);
            }
        }).then((usuario) =>{
            username = usuario;
            return this.queryOrganization(compania);
        }).then((message) => {
            if(message.status == 200) {
                affiliation = message.payload.organization;
                return this.fabric_ca_client.register({
                    enrollmentID: username,
                    affiliation: affiliation,
                    role: 'client',
                    attrs: [{
                        name: "organization",
                        value: compania,
                        ecert: true,
                    }]
                }, this.admin_user);
            }else{
                throw new Error("Esa compañia no esta registrada");
            }
        }).then((secret) => {
            password = secret;
            // next we need to enroll the user with CA server
            return this.fabric_ca_client.enroll({
                enrollmentID: username,
                enrollmentSecret: secret,
                attr_reqs: [
                    {
                        name: "organization",
                        optional: false
                    }
                ]
            });
        }).then((enrollment) => {
            let save;
            return this.fabric_client.createUser(
                {
                    username: username,
                    mspid: mSpid,
                    cryptoContent: {privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate},
                    skipPersistence: true
                }).then((user) => {
                save =  {
                    "priv": Buffer.from(aes256.encrypt(this.keyValue, enrollment.key.toBytes()).toString()).toString("base64"),
                    "cert": Buffer.from(aes256.encrypt(this.keyValue, user.toString()).toString()).toString("base64")
                };
                return user;
            }).then((user) =>{
                return this.addOrganization(compania, JSON.stringify({user: username, password: password, signCert: JSON.parse(user.toString()).enrollment.signingIdentity, organization: affiliation}));
            }).then(() =>{
                return save;
            })
        }).then((user) => {
            console.log(`El usuario "${username}" se logró enrolar y está listo para interactuar con el Blockchain`);
            return user;
        }).catch((err) => {
            let sol = err.message;
            if(err.message.toString().includes("is already registered")){
                sol = `El usuario ${username} ya esta registrado`;
            }
            return new MessageHandler(400, sol);
        });
    }

    private async sendProposal(propuesta: Propuesta){
        return await this.channel.sendTransactionProposal(propuesta).then((results) => {
            var proposalResponses = results[0];
            var proposal = results[1];
            let isProposalGood = false;
            if (proposalResponses && proposalResponses[0].response && proposalResponses[0].response.status === 200) {
                isProposalGood = true;
            }

            if (isProposalGood) {
                var request = {
                    proposalResponses: proposalResponses,
                    proposal: proposal
                };

                var transaction_id_string = propuesta.txId.getTransactionID(); //Get the transaction ID string to be used by the event processing
                var promises = [];

                var sendPromise = this.channel.sendTransaction(request);
                promises.push(sendPromise);

                let event_hub = this.channel.newChannelEventHub(this.peers[0]);

                let txPromise = new Promise((resolve, reject) => {
                    let handle = setTimeout(() => {
                        event_hub.unregisterTxEvent(transaction_id_string);
                        event_hub.disconnect();
                        resolve({ event_status: 'TIMEOUT' }); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
                    }, 50000);
                    event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                            clearTimeout(handle);
                            var return_status = { event_status: code, tx_id: transaction_id_string };
                            if (code !== 'VALID') {
                                resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                            } else {
                                resolve(return_status);
                            }
                        }, (err) => {
                            reject(new Error('Hay un problema con eventhub: ' + err));
                        },
                        { disconnect: true } //disconnect when complete
                    );
                    event_hub.connect();
                });
                promises.push(txPromise);
                return Promise.all(promises);
            } else {
                let val = proposalResponses[0].message.toString();
                val = val.replace("2 UNKNOWN: error executing chaincode: transaction returned with failure: Error: ","");
                val = val.replace("transaction returned with failure: Error: ", "");
                return Promise.reject(val);
            }
        }).then((results) => {
            if (!(results && results[0] && results[0].status === 'SUCCESS')) {
                return Promise.reject('Falle en enviar la transacción al orderer. Error: ' + results[0].status);
            }
            if (!(results && results[1] && results[1].event_status === 'VALID')) {
                return Promise.reject('La transacción fallo al anexarse al Blockchain de peer. Error: ' + results[1].event_status);
            }
            return new MessageHandler(200, `Realize la transacción exitosamente, tu transacción es la ${propuesta.txId.getTransactionID()}`);
        }).catch((err) => {
            return new MessageHandler(400, err);
        });
    }

    private async queryChaincode(propuesta: Propuesta){
        return this.channel.queryByChaincode(propuesta).then((query_responses) => {
            if (query_responses && query_responses.length == 1) {
                if (query_responses[0] instanceof Error) {
                    return Promise.reject(`${query_responses[0].toString().replace("Error: 2 UNKNOWN: error executing chaincode: transaction returned with failure: Error: ", "")}`);
                } else {
                    return new MessageHandler(200, "Exito! Todo salio de forma correcta", JSON.parse(query_responses[0].toString()));
                }
            } else {
                return new MessageHandler(404, "No hubo resultados...");
            }
        }).catch((err) => {
            console.info(err);
            return new MessageHandler(400, err);
        });
    }

    private async addOrganization(id: string, data: string){
        return await this.enrollAdmin().then(() => {
            let tx_id = this.fabric_client.newTransactionID();

            var request = {
                chaincodeId: this._chaincode,
                fcn: "addOrganization",
                args: [id, data],
                chainId: this.channel,
                txId: tx_id
            };

            return this.sendProposal(request)
        })
    }

    public async queryOrganization(id: string){
        let tx_id = this.fabric_client.newTransactionID();
        var request = {
            chaincodeId: this._chaincode,
            fcn: "queryOrganization",
            args: [id],
            chainId: this.channel,
            txId: tx_id
        };

        return this.queryChaincode(request)
    };

    public async getOrganizations(){
        let tx_id = this.fabric_client.newTransactionID();
        var request = {
            chaincodeId: this._chaincode,
            fcn: "queryCompanies",
            args: [],
            chainId: this.channel,
            txId: tx_id
        };

        return this.queryChaincode(request)
    };

    public async getOrganizationHistory(id: string){
        return await this.enrollAdmin().then(() => {
            let tx_id = this.fabric_client.newTransactionID();

            var request = {
                chaincodeId: this._chaincode,
                fcn: "getOrganizationHistory",
                args: [id],
                chainId: this.channel,
                txId: tx_id
            };

            return this.queryChaincode(request)
        })
    }

    public async revokeOrganizationCertificate(id: string){
        return await this.enrollAdmin().then(() => {
            let tx_id = this.fabric_client.newTransactionID();

            var request = {
                chaincodeId: this._chaincode,
                fcn: "revokeOrganizationCertificate",
                args: [id],
                chainId: this.channel,
                txId: tx_id
            };

            return this.sendProposal(request)
        })
    }

    public async updateOrganizationCertificate(id: string, data: string){
        return await this.enrollAdmin().then(() => {
            let tx_id = this.fabric_client.newTransactionID();

            var request = {
                chaincodeId: this._chaincode,
                fcn: "updateOrganizationCertificate",
                args: [id, data],
                chainId: this.channel,
                txId: tx_id
            };

            return this.sendProposal(request)
        })
    }
}
