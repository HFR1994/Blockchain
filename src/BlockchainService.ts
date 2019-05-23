import Fabric_Client from "fabric-client";
import Fabric_CA_Client from "fabric-ca-client";
import {ApiService} from "./ApiService";
import MessageHandler from "./MessageHandler";
import CDBKVS from 'fabric-client/lib/impl/CouchDBKeyValueStore';
import chalk from "chalk";
import Logger from "./Logger";

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
    private channel = null;
    private credentials: Object;
    private _peersID: String[] = [];
    private peers = [];
    private keyValue = "Aqui";

    constructor(connectionProfile: Object, credentials: Object, peers: any) {
        this.connectionProfile = connectionProfile;
        this.credentials = credentials;
        this._peersID = peers;
    }

    public peersID(value: String[], channel:string) {
        this.channel = this.fabric_client.newChannel(channel);
        this._peersID = value;
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];

        for (let i = 0; i < this._peersID.length; i++) {
            let peer = this._peersID[i];
            let p = this.fabric_client.newPeer(this.connectionProfile.peers[peer.toString()].url, {
                pem: this.connectionProfile.peers[peer.toString()].tlsCACerts.pem,
                'ssl-target-name-override': null
            });
            this.peers.push(p);
            this.channel.addPeer(p);
        }


        const o = this.fabric_client.newOrderer(this.connectionProfile.orderers.orderer.url, {pem: this.connectionProfile.orderers.orderer.tlsCACerts.pem, 'ssl-target-name-override': null});
        this.channel.addOrderer(o);
        this._peersID = value;
    }

    generateKeyStore() {
        Fabric_Client.setConfigSetting("key-value-store", 'fabric-client/lib/impl/CouchDBKeyValueStore');
        Fabric_CA_Client.setConfigSetting("key-value-store", 'fabric-client/lib/impl/CouchDBKeyValueStore');

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

        return new CDBKVS({url: `https://${this.credentials["user"]}:${this.credentials["password"]}@${this.credentials["host"]}`, name: this.credentials["database"]})
            .then((state_store) => {
                this.fabric_client.setStateStore(state_store);
                const crypto_suite = Fabric_Client.newCryptoSuite();
                // @ts-ignore
                const crypto_store = Fabric_Client.newCryptoKeyStore({url: `https://${this.credentials["user"]}:${this.credentials["password"]}@${this.credentials["host"]}`, name: this.credentials["database"]});
                crypto_suite.setCryptoKeyStore(crypto_store);
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

        return this.generateKeyStore().then(() => {
            return this.fabric_client.getUserContext(id, true);
        }).then((user_from_store) => {
            if (user_from_store && user_from_store.isEnrolled()) {
                console.log('\n'+Logger.INFO( `Logre cargar al administrador de persistencia`));
                this.admin_user = user_from_store;
                return this.admin_user;
            }else {
                return this.fabric_ca_client.enroll({
                    enrollmentID: id,
                    enrollmentSecret: secret
                }).then((enrollment) => {
                    console.log('\n'+Logger.INFO( `Logre enrolar al usuario "admin"`));
                    // noinspection TypeScriptValidateJSTypes
                    return this.fabric_client.createUser(
                        // @ts-ignore
                        {
                            username: id,
                            mspid: mSpid,
                            cryptoContent: {privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate}
                        });
                }).then((user) => {
                    this.admin_user = user;
                    return this.fabric_client.setUserContext(this.admin_user);
                }).catch((err) => {
                    console.log('\n'+Logger.ERROR( `Falle en enrolar y persistir en usuario “admin”, Error: ${err.stack ? err.stack : err}`));
                    throw new Error('La dirección es invalida');
                });
            }
        }).then(() => {
            console.log('\n'+Logger.INFO( `Asigne a “admin” como un usuario de fabric-client\n`));
            return this.admin_user;
        }).catch((err) => {
            console.log('\n'+Logger.ERROR( `Falle en enrolar a “admin”: ${err}\n`));
        });
    }

    public async registerUser(affiliation: string, compania: string, username: string, password: string) {
        const org = Object.keys(this.connectionProfile.certificateAuthorities)[0];
        const mSpid = this.connectionProfile.certificateAuthorities[org]['x-mspid'];

        return this.fabric_ca_client.register({
            enrollmentID: username,
            affiliation: affiliation,
            role: 'client',
            attrs: [{
                name: "organization",
                value: compania,
                ecert: true,
            }]
        }, this.admin_user)
            .then((secret) => {
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
                return this.fabric_client.createUser(
                    {
                        username: username,
                        mspid: mSpid,
                        cryptoContent: {privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate},
                        skipPersistence: true
                    });
            }).then((user) => {
                console.log(`El usuario "${username}" se logró enrolar y está listo para interactuar con el Blockchain`);
                return this.fabric_client.setUserContext(user);
            }).catch((err) => {
                let sol = err.message;
                if(err.message.toString().includes("is already registered")){
                    sol = `El usuario ${username} ya esta registrado`;
                }
                return console.log(sol);
            });
    }

    private async sendProposal(propuesta: any, username: string){

        this.fabric_client.getUserContext(username, true);

        return this.channel.sendTransactionProposal(propuesta).then((results) => {
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

    public async addCar(chaincode: string, channel: string, data: string, username: string){
        let tx_id = this.fabric_client.newTransactionID();

        var request = {
            chaincodeId: chaincode,
            fcn: "createCar",
            // @ts-ignore
            args: Object.values(data),
            chainId: channel,
            txId: tx_id
        };

        return this.sendProposal(request, username)
    }

    public async queryCar(chaincode: string, channel: string, data: string, username: string){
        let tx_id = this.fabric_client.newTransactionID();
        var request = {
            chaincodeId: chaincode,
            fcn: "queryCar",
            // @ts-ignore
            args: Object.values(data),
            chainId: channel,
            txId: tx_id
        };

        return this.queryChaincode(request, username)
    };


    private async queryChaincode(propuesta: any, username: string){
        this.fabric_client.getUserContext(username, true);

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
}
