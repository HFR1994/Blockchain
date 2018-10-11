'use strict';
/*
* Copyright IBM Corp All Rights Reserved
*
* SPDX-License-Identifier: Apache-2.0
*/
/*
 * Enroll the admin user
 */

var Fabric_Client = require('fabric-client');
var Fabric_CA_Client = require('fabric-ca-client');

var path = require('path');
var util = require('util');
var os = require('os');

const connectionProfile = require("./connectionProfile");
const org = Object.keys(connectionProfile.certificateAuthorities)[0];

const url = connectionProfile.certificateAuthorities[org].url.substring(8,1000);
const id = connectionProfile.certificateAuthorities[org].registrar[0].enrollId;
const secret = connectionProfile.certificateAuthorities[org].registrar[0].enrollSecret;
const caName = connectionProfile.certificateAuthorities[org].caName;
const mSpid = connectionProfile.certificateAuthorities[org]["x-mspid"];

//
var fabric_client = new Fabric_Client();
var fabric_ca_client = null;
var admin_user = null;
var member_user = null;
var store_path = path.join(__dirname, 'hfc-key-store');
console.log('Voy a guardar todo en: '+store_path);

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
    var	tlsOptions = {
    	trustedRoots: [],
    	verify: false
    };
    // be sure to change the http to https when the CA is running TLS enabled
    fabric_ca_client = new Fabric_CA_Client(`https://${id}:${secret}@${url}`, tlsOptions , caName, crypto_suite);

    // first check to see if the admin is already enrolled
    return fabric_client.getUserContext(id, true);
}).then((user_from_store) => {


    // at this point we should have the admin user
    // first need to register the user with the CA server

    if (user_from_store && user_from_store.isEnrolled()) {
        console.log('Logre cargar al administrador de persistencia');
        admin_user = user_from_store;
        return null;
    } else {
        // need to enroll it with CA server
        return fabric_ca_client.enroll({
          enrollmentID: id,
          enrollmentSecret: secret
        }).then((enrollment) => {
          console.log('Logre enrolar al usuario "admin"');
          return fabric_client.createUser(
              {
                  username: id,
                  mspid: mSpid,
                  cryptoContent: { privateKeyPEM: enrollment.key.toBytes(), signedCertPEM: enrollment.certificate }
              });
        }).then((user) => {
          admin_user = user;
          return fabric_client.setUserContext(admin_user);
        }).catch((err) => {
          console.error('Falle en enrolar y persistir en usuario “admin”, Error: ' + err.stack ? err.stack : err);
          throw new Error('La dirección es invalida');
        });
    }
}).then(() => {
    console.log('Asigne a “admin” como un usuario de fabric-client:: ' + admin_user.toString());
}).catch((err) => {
    console.error('Falle en enrolar a “admin”: ' + err);
});
