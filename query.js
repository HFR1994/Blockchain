'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Chaincode query
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

// setup the fabric network

const channel = fabric_client.newChannel(tran.channelID);

tran.peers.forEach(function (peer) {
    let p = fabric_client.newPeer(peer.url, {pem: peer.certificadoPem, 'ssl-target-name-override': null});
    peers.push(p);
    channel.addPeer(p);
});

const user = config.usuario;

//
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Voy a guardar todo en: '+store_path);
var tx_id = null;

// create the key value store as defined in the fabric-client/config/default.json 'key-value-store' setting
Fabric_Client.newDefaultKeyValueStore({ path: store_path
}).then((state_store) => {
	// assign the store to the fabric client
	fabric_client.setStateStore(state_store);
	var crypto_suite = Fabric_Client.newCryptoSuite();
	// use the same location for the state store (where the users' certificate are kept)
	// and the crypto store (where the users' keys are kept)
	var crypto_store = Fabric_Client.newCryptoKeyStore({path: store_path});
	crypto_suite.setCryptoKeyStore(crypto_store);
	fabric_client.setCryptoSuite(crypto_suite);

	// get the enrolled user from persistence, this user will sign all requests
	return fabric_client.getUserContext(user, true);
}).then((user_from_store) => {
	if (user_from_store && user_from_store.isEnrolled()) {
        console.log(`Logre cargar al usuario ${user} de persistencia`);
		member_user = user_from_store;
	} else {
        throw new Error(`Falle en enrolar a ${user} ... por favor corre “registerUser.js”`);
	}

	// queryCar chaincode function - requires 1 argument, ex: args: ['CAR4'],
	// queryAllCars chaincode function - requires no arguments , ex: args: [''],
	const request = {
		//targets : --- letting this default to the peers assigned to the channel
		chaincodeId: tran.chaincodeID,
		fcn: tran.transaction,
		args: tran.argumentos
	};

	// send the query proposal to the peer
	return channel.queryByChaincode(request);
}).then((query_responses) => {
	console.log("La consulta se completó exitosamente, checando resultados…");
	// query_responses could have more than one  results if there multiple peers were used as targets
	if (query_responses && query_responses.length == 1) {
		if (query_responses[0] instanceof Error) {
			console.error("Error en la consulta: ", query_responses[0]);
		} else {
			console.log("La respuesta es: ", query_responses[0].toString());
		}
	} else {
		console.log("La consulta se realizo exitosamente, pero no hubo resultados…");
	}
}).catch((err) => {
	console.error('Falle en hacer la consulta. Error: ' + err);
});
