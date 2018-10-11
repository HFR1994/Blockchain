# Crea tu propio Blockchain ![CI status](https://img.shields.io/badge/build-passing-brightgreen.svg)

Este programa es un complemento a la siguiente [información](https://ibm-cloud-and-data-revolution-daring-dingo.mybluemix.net/)

## Installation

### Requirements
* Python 2.7
* Node 8.9.0
* npm 5.6.0

## Docker

En caso de contar con Docker, el ambiente se puede correr con los siguientes comandos

`$ docker pull frhec/ibmcloudandrev`

`$ docker run -it frhec/ibmcloudandrev bash`

## Configuración

Se tienen que hacer tres pasos.

Paso 1:

Agregar los parámetros de conexión

![](videos/connectionProfile.gif)

Paso 2:

Configurar tus credenciales a crear

![](videos/config.gif)

Paso 3:

Configurar la transacción a realizar

![](videos/trans.gif)

## Uso
```
$ git clone https://github.com/HFR1994/Blockchain.git
$ . foobar/bin/activate
$ pip install -e .
```

## Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

Please make sure to update tests as appropriate.

## License
[MIT](https://choosealicense.com/licenses/mit/)