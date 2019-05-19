'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode Invoke
 */

var Fabric_Client = require('fabric-client');
var path = require('path');
var util = require('util');
var os = require('os');

const connectionProfile = require("./connectionProfile");
const config = require("./config");
const tran = require("./transaction");

//
var fabric_client = new Fabric_Client();
let peers=[];

const user = config.usuario;

// setup the fabric network

const channel = fabric_client.newChannel(tran.channelID);

tran.peers.forEach(function (peer) {
    let p = fabric_client.newPeer(peer.url, {pem: peer.certificadoPem, 'ssl-target-name-override': null});
    peers.push(p);
    channel.addPeer(p);
});

const o = fabric_client.newOrderer(connectionProfile.orderers.orderer.url, {pem: connectionProfile.orderers.orderer.tlsCACerts.pem, 'ssl-target-name-override': null});
channel.addOrderer(o);

var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Voy a guardar todo en: '+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({
    path: store_path
}).then((state_store) => {
    // assign the store to the fabric client
    fabric_client.setStateStore(state_store);
    var crypto_suite = Fabric_Client.newCryptoSuite();
    // use the same location for the state store (where the users' certificate are kept)
    // and the crypto store (where the users' keys are kept)
    var crypto_store = Fabric_Client.newCryptoKeyStore({ path: store_path });
    crypto_suite.setCryptoKeyStore(crypto_store);
    fabric_client.setCryptoSuite(crypto_suite);

    // get the enrolled user from persistence, this user will sign all requests
    return fabric_client.getUserContext(user, true);
}).then((user_from_store) => {
    if (user_from_store && user_from_store.isEnrolled()) {
        console.log(`Logre cargar al usuario ${user}  de persistencia`);
        member_user = user_from_store;
    } else {
        throw new Error(`Falle en enrolar a ${user} ... por favor corre “registerUser.js”`);
    }

    // get a transaction id object based on the current user assigned to fabric client
    tx_id = fabric_client.newTransactionID();
    console.log('Asignando transaction_id: ', tx_id._transaction_id);

    // must send the proposal to endorsing peers
    var request = {
        chaincodeId: tran.chaincodeID,
        fcn: tran.transaction,
        args: tran.argumentos,
        chainId: tran.channelID,
        txId: tx_id
    };
    // send the transaction proposal to the peers
    return channel.sendTransactionProposal(request);
}).then((results) => {
    var proposalResponses = results[0];
    var proposal = results[1];
    let isProposalGood = false;
    if (proposalResponses && proposalResponses[0].response &&
        proposalResponses[0].response.status === 200) {
        isProposalGood = true;
        console.log('La propuesta de transacción fue exitosa');
    } else {
        console.error(results);
    }
    if (isProposalGood) {
        console.log(util.format(
            'Mandé exitosamente la propuesta y recibí la ProposalResponse con estatus %s, y mensaje "%s"',
            proposalResponses[0].response.status, proposalResponses[0].response.message));

        // build up the request for the orderer to have the transaction committed
        var request = {
            proposalResponses: proposalResponses,
            proposal: proposal
        };

        // set the transaction listener and set a timeout of 30 sec
        // if the transaction did not get committed within the timeout period,
        // report a TIMEOUT status
        var transaction_id_string = tx_id.getTransactionID(); //Get the transaction ID string to be used by the event processing
        var promises = [];

        var sendPromise = channel.sendTransaction(request);
        promises.push(sendPromise); //we want the send transaction first, so that we know where to check status

        // get an eventhub once the fabric client has a user assigned. The user
        // is required because the event registration must be signed
        let event_hub = channel.newChannelEventHub(peers[0]);

        // using resolve the promise so that result status may be processed
        // under the then clause rather than having the catch clause process
        // the status
        let txPromise = new Promise((resolve, reject) => {
            let handle = setTimeout(() => {
                event_hub.unregisterTxEvent(transaction_id_string);
                event_hub.disconnect();
                resolve({ event_status: 'TIMEOUT' }); //we could use reject(new Error('Trnasaction did not complete within 30 seconds'));
            }, 50000);
            event_hub.registerTxEvent(transaction_id_string, (tx, code) => {
                    // this is the callback for transaction event status
                    // first some clean up of event listener
                    clearTimeout(handle);

                    // now let the application know what happened
                    var return_status = { event_status: code, tx_id: transaction_id_string };
                    if (code !== 'VALID') {
                        console.error('La transacción es invalida, código: ' + code);
                        resolve(return_status); // we could use reject(new Error('Problem with the tranaction, event status ::'+code));
                    } else {
                        console.log('La transacción fue enviada al peer: ' + event_hub.getPeerAddr());
                        resolve(return_status);
                    }
                }, (err) => {
                    //this is the callback if something goes wrong with the event registration or processing
                    reject(new Error('Hay un problema con eventhub: ' + err));
                },
                { disconnect: true } //disconnect when complete
            );
            event_hub.connect();

        });
        promises.push(txPromise);

        return Promise.all(promises);
    } else {
        console.error('\n' +
            'Fallé en enviar mi propuesta, recibí una respuesta invalida. La respuesta fue nula o no tiene un estatus 200. Saliendo…');
        throw new Error('Fallé en enviar mi propuesta, recibí una respuesta invalida. La respuesta fue nula o no tiene un estatus 200. Saliendo…');
    }
}).then((results) => {
    console.log('El envió de la promesa de la transacción y el evento de callback se llamaron exitosamente');
    // check the results in the order the promises were added to the promise all list
    if (results && results[0] && results[0].status === 'SUCCESS') {
        console.log('La transacción fue enviada al orderer.');
    } else {
        console.error('Falle en enviar la transacción al orderer. Error: ' + results[0].status);
    }

    if (results && results[1] && results[1].event_status === 'VALID') {
        console.log('La transacción fue anexada al Blockchain de peer');
    } else {
        console.log('La transacción fallo al anexarse al Blockchain de peer. Error: ' + results[1].event_status);
    }
}).catch((err) => {
    console.error('Falle en invocar al Blockchain: ' + err);
});