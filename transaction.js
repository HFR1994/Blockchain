const connectionProfile = require("./connectionProfile");

export default {
    chaincodeID: "Fabcar",
    channelID: "defaultchannel",
    peers: [
        {url: connectionProfile.peers["org1-peer1"].url, certificadoPem: connectionProfile.peers["org1-peer1"].tlsCACerts.pem},
        {url: connectionProfile.peers["org2-peer1"].url, certificadoPem: connectionProfile.peers["org2-peer1"].tlsCACerts.pem},
    ],
    transaction: "initLedger",
    argumentos:[] // Se queda vacío
}