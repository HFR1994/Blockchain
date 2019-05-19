const connectionProfile = require("./connectionProfile");

module.exports = {
    chaincodeID: "deviceid",
    channelID: "scd-deviceid",
    peers: [
        {url: "grpcs://peer2:7051", certificadoPem: "-----BEGIN CERTIFICATE-----\n" +
                "MIICUjCCAfmgAwIBAgIQEb//gedPyqfbZdUsdtbKJDAKBggqhkjOPQQDAjB0MQsw\n" +
                "CQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMNU2FuIEZy\n" +
                "YW5jaXNjbzEYMBYGA1UEChMPaGV4dC5zY2Qub3JnLmJyMR4wHAYDVQQDExV0bHNj\n" +
                "YS5oZXh0LnNjZC5vcmcuYnIwHhcNMTkwNTE5MTgzNzAwWhcNMjkwNTE2MTgzNzAw\n" +
                "WjB0MQswCQYDVQQGEwJVUzETMBEGA1UECBMKQ2FsaWZvcm5pYTEWMBQGA1UEBxMN\n" +
                "U2FuIEZyYW5jaXNjbzEYMBYGA1UEChMPaGV4dC5zY2Qub3JnLmJyMR4wHAYDVQQD\n" +
                "ExV0bHNjYS5oZXh0LnNjZC5vcmcuYnIwWTATBgcqhkjOPQIBBggqhkjOPQMBBwNC\n" +
                "AAQC5bYs8zzRSRNLKaDdGrGZMGvGDWATnB3g9etcWF2AkaHubOMyAukqD5g390SU\n" +
                "LMvx9jO82GtbOq0J2AHlhel6o20wazAOBgNVHQ8BAf8EBAMCAaYwHQYDVR0lBBYw\n" +
                "FAYIKwYBBQUHAwIGCCsGAQUFBwMBMA8GA1UdEwEB/wQFMAMBAf8wKQYDVR0OBCIE\n" +
                "IASnuDit2VEVKTcHnHQoZ22y0Q8X/oIwBmNl+Idm4iWhMAoGCCqGSM49BAMCA0cA\n" +
                "MEQCIFYGtwRXfxdRVd+8SlMPOgU3ypOdjKFKZ5Y2cdbYrnANAiBagkx+apIfM6B6\n" +
                "TvR9c3L1PVNAMzYBzPOxek3eoDfV0Q==\n" +
                "-----END CERTIFICATE-----"}
    ],
    transaction: "qualificaDispositivo",
    argumentos:["F93F54D9BF26556C995F8871B142D3376B33CB85825001D08A80891BE4CC338F", "65261DDEF1A6C13C6908C15F93E19B52E1B9A640D6F83302792E28B648B63167", "3EE4FAE0A963278D439B6AFDDEE1B0C258989683DCDC72D10B841D442A4999CB", "1", "", "", "xxxxxxxx", "assinatura", "idCertificado"]
};