const connectionProfile = require("./connectionProfile");

module.exports = {
    chaincodeID: "deviceid",
    channelID: "scd-deviceid",
    peers: [
        {url: "grpcs://peer1:7051", certificadoPem: "-----BEGIN CERTIFICATE-----\n" +
                "MIICejCCAiCgAwIBAgIRAKVq2Bmi9xCuXOObXnRRfm8wCgYIKoZIzj0EAwIwgYYx\n" +
                "CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1TYW4g\n" +
                "RnJhbmNpc2NvMSEwHwYDVQQKExgwNDM5MTAwNy5oZXh0LnNjZC5vcmcuYnIxJzAl\n" +
                "BgNVBAMTHnRsc2NhLjA0MzkxMDA3LmhleHQuc2NkLm9yZy5icjAeFw0xOTA1MjAx\n" +
                "OTQ2MDBaFw0yOTA1MTcxOTQ2MDBaMIGGMQswCQYDVQQGEwJVUzETMBEGA1UECBMK\n" +
                "Q2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzEhMB8GA1UEChMYMDQz\n" +
                "OTEwMDcuaGV4dC5zY2Qub3JnLmJyMScwJQYDVQQDEx50bHNjYS4wNDM5MTAwNy5o\n" +
                "ZXh0LnNjZC5vcmcuYnIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAST4MDVvLPV\n" +
                "iFp9bdQBZwiKyHTviI6/d48Dm2/UPC7vOxPFsR/Ll98DAHxY2ET08PiwP0c5SD5W\n" +
                "UYaesdkryMgro20wazAOBgNVHQ8BAf8EBAMCAaYwHQYDVR0lBBYwFAYIKwYBBQUH\n" +
                "AwIGCCsGAQUFBwMBMA8GA1UdEwEB/wQFMAMBAf8wKQYDVR0OBCIEILDG9uilqE/f\n" +
                "VVrBUT46E4yNut5AmQkCVAzcQ49HXz1mMAoGCCqGSM49BAMCA0gAMEUCIQCyBSdu\n" +
                "MlNdxZvQSfdoBjUtkA0Xy3iQJErhhdJo1cDzAwIgHz4VhX8MOfRPz1FpROttKqqR\n" +
                "6IwjzVakqiRbqt9wzBg=\n" +
                "-----END CERTIFICATE-----"},
        {url: "grpcs://peer2:7051", certificadoPem: "-----BEGIN CERTIFICATE-----\n" +
                "MIICejCCAiCgAwIBAgIRAKVq2Bmi9xCuXOObXnRRfm8wCgYIKoZIzj0EAwIwgYYx\n" +
                "CzAJBgNVBAYTAlVTMRMwEQYDVQQIEwpDYWxpZm9ybmlhMRYwFAYDVQQHEw1TYW4g\n" +
                "RnJhbmNpc2NvMSEwHwYDVQQKExgwNDM5MTAwNy5oZXh0LnNjZC5vcmcuYnIxJzAl\n" +
                "BgNVBAMTHnRsc2NhLjA0MzkxMDA3LmhleHQuc2NkLm9yZy5icjAeFw0xOTA1MjAx\n" +
                "OTQ2MDBaFw0yOTA1MTcxOTQ2MDBaMIGGMQswCQYDVQQGEwJVUzETMBEGA1UECBMK\n" +
                "Q2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZyYW5jaXNjbzEhMB8GA1UEChMYMDQz\n" +
                "OTEwMDcuaGV4dC5zY2Qub3JnLmJyMScwJQYDVQQDEx50bHNjYS4wNDM5MTAwNy5o\n" +
                "ZXh0LnNjZC5vcmcuYnIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNCAAST4MDVvLPV\n" +
                "iFp9bdQBZwiKyHTviI6/d48Dm2/UPC7vOxPFsR/Ll98DAHxY2ET08PiwP0c5SD5W\n" +
                "UYaesdkryMgro20wazAOBgNVHQ8BAf8EBAMCAaYwHQYDVR0lBBYwFAYIKwYBBQUH\n" +
                "AwIGCCsGAQUFBwMBMA8GA1UdEwEB/wQFMAMBAf8wKQYDVR0OBCIEILDG9uilqE/f\n" +
                "VVrBUT46E4yNut5AmQkCVAzcQ49HXz1mMAoGCCqGSM49BAMCA0gAMEUCIQCyBSdu\n" +
                "MlNdxZvQSfdoBjUtkA0Xy3iQJErhhdJo1cDzAwIgHz4VhX8MOfRPz1FpROttKqqR\n" +
                "6IwjzVakqiRbqt9wzBg=\n" +
                "-----END CERTIFICATE-----\n"}
        ],
    transaction: "qualificaDispositivo",
    argumentos:["F93F54D9BF26556C995F8871B142D3376B33CB85825001D08A80891BE4CC338F", "65261DDEF1A6C13C6908C15F93E19B52E1B9A640D6F83302792E28B648B63167", "3EE4FAE0A963278D439B6AFDDEE1B0C258989683DCDC72D10B841D442A4999CB", "1", "", "", "xxxxxxxx", "assinatura", "idCertificado"]
};