import chalk from 'chalk';
import * as chalkAnimation from 'chalk-animation'
import * as figlet from 'figlet';
import clear from 'clear';
import * as yargs from 'yargs';
import * as fs from 'fs';
import Logger from "./Logger";
import {ApiService} from "./ApiService";
import * as locale from "../locale/es_ES.json";
import * as inquirer from 'inquirer';
import {Checkbox} from './checkbox';
import {List} from './List';
import {HfcChainCode} from "hlf-utils";
import {BlockchainService} from "./BlockchainService";

const Main = class Main {

    private data: ApiService;
    private blockChainService: BlockchainService;
    private connectionProfile: Object;
    private NETWORK_ID: string;
    private URL_FILE: string;
    private peerList: Array<any>;
    private peers: Array<String>;
    private chaincode: string;
    private channelId: string;
    private cloudant: Object;
    private username: string;
    private user:boolean;
    private trans: boolean;

    constructor() {
        this.user=true;
        this.trans=true;
        this.username="";
        inquirer.registerPrompt("checkbox1", Checkbox);
        inquirer.registerPrompt("list1", List);
        this.showPeersList = this.showPeersList.bind(this);
        this.showMainMenu = this.showMainMenu.bind(this);
        this.askCredentials = this.askCredentials.bind(this);
        this.peers = [];
        this.cloudant = {
            user: null,
            password: null,
            host: null,
            database: null
        };
        this.printHeaders();
        if (!fs.existsSync("./resources")){
            fs.mkdirSync("./resources");
        }
        this.checkConnectionProfile();
    }

    printHeaders(){
        console.log(figlet.textSync('Blockchain Hands On', {
            font: 'Star Wars',
            horizontalLayout: 'default',
            verticalLayout: 'default'
        }));
        console.log(chalk.blue(`${locale["basic.version"]}: ` + chalk.whiteBright.bold("2.0")));
        console.log(chalk.blue("Hyperledger Fabric Version: " + chalk.whiteBright.bold("1.3\n")));
    }

    checkConnectionProfile() {
        let parent = this;
        const args = yargs.usage(locale["basic.usage"])
            .alias("f", "file")
            .alias("h", "host")
            .alias("u", "user")
            .alias("s", "secret")
            .alias("n", "network_id")
            .describe("help", locale["menu.detail.help"])
            .describe("version", locale["menu.detail.version"])
            .describe("f", locale["menu.detail.f"])
            .describe("h", locale["menu.detail.h"])
            .describe("u", locale["menu.detail.u"])
            .describe("s", locale["menu.detail.s"])
            .describe("n", locale["menu.detail.n"])
            .default("f", "./resources/connectionProfile.json")
            .check((argv, options) => {
                if (argv.u && argv.s && argv.n) {
                    this.data = new ApiService(argv.u, argv.s, argv.h);
                    this.NETWORK_ID = argv.n;
                    let str = locale["basic.loading"];
                    const rainbow = chalkAnimation.pulse(str, 1);
                    // Add a new dot every second
                    let father = this;
                    setInterval(function () {
                        if(str == "Listo"){
                            if(father.connectionProfile) {
                                rainbow.replace(chalk.green(str));
                            }else{
                                rainbow.replace(chalk.red(""));
                            }
                            // noinspection JSDeprecatedSymbols
                            clearInterval(this);
                            setTimeout(function(){ // noinspection JSDeprecatedSymbols
                                rainbow.stop();
                                if(father.connectionProfile) {
                                    fs.writeFile("./resources/connectionProfile.json", JSON.stringify(father.connectionProfile), function(err) {
                                        if(err) {
                                            console.log(`\n${Logger.ERROR(locale["messages.noSave"]+" "+chalk.yellow("./resources/connectionProfile.json"))}`);
                                            process.exit(1);
                                        }
                                        console.log(`\n${Logger.INFO(locale["messages.save"]+chalk.yellow("./resources/connectionProfile.json"))}`);
                                        console.log(Logger.INFO(locale["messages.nextTime"]+"\n"));
                                        parent.showMainMenu();
                                    });
                                }else{
                                    console.log(Logger.ERROR(locale["messages.timeout"]));
                                    process.exit(1);
                                }
                            }, 1000);
                        }else{
                            if(`${locale["basic.loading"]}....` !== str){
                                rainbow.replace(str += '.');
                            }else{
                                str = locale["basic.loading"];
                                rainbow.replace(str);
                            }
                        }
                    }, 1000);

                    return this.data.get(
                        {
                            url: `/api/v1/networks/${this.NETWORK_ID}/connection_profile`,
                        }
                    ).then((e) => {
                        this.connectionProfile = e;
                        return this.askCloudantredentials();
                    }).then((cred) => {
                        this.blockChainService = new BlockchainService(this.connectionProfile, cred, this.peers);
                        str = "Listo";
                        return true;
                    }).catch((err) => {
                        str = "Listo";
                        return true;
                    });
                } else if (!argv.f) {
                    throw(new Error(Logger.ERROR(locale["messages.generic"])))
                } else {
                    console.log(`\n${Logger.INFO(locale["messages.retrieve"]+chalk.yellow(" "+parent.URL_FILE))}`);
                    return this.askCloudantredentials().then((cred) => {
                        try {
                            this.connectionProfile = JSON.parse(argv.f);
                            this.cloudant = cred;
                            console.log(`\n${chalk.green("Listo")}\n`);
                            this.blockChainService = new BlockchainService(this.connectionProfile, cred, this.peers);
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                throw(new Error(Logger.ERROR(locale["messages.json.format"])))
                            }
                        }
                        this.showMainMenu();
                        return true;
                    });
                }
            }).coerce(['file'], function (arg) {
                parent.URL_FILE = arg;
                if (fs.existsSync(arg.trim())) {
                    try {
                        return fs.readFileSync(arg.trim(), 'utf8');
                    } catch (e) {
                        return null;
                    }
                } else {
                    return null
                }
            })
            .wrap(100)
            .argv;
    }

    async showPeersList(callback = null){

        // @ts-ignore
        this.peerList = Object.keys(this.connectionProfile.peers).reduce((accumulator, key) => {
            // @ts-ignore
            return [...accumulator, {name: key, checked: this.peers.includes(key)}];
        }, []);

        return inquirer.prompt([
            {
                type: 'checkbox1',
                message: locale["checkbox.list.select"],
                name: 'peers',
                pageSize: 20,
                choices: [
                    new inquirer.Separator(locale["checkbox.list.start"]),
                    ...this.peerList,
                    new inquirer.Separator(locale["checkbox.list.end"])
                ],
                validate: function(answer) {
                    if (answer.length < 1) {
                        return locale["checkbox.list.validate"];
                    }
                    return true;
                }
            }
        ])
            .then(answers => {
                this.peers = answers.peers;
                if(callback && typeof callback === "function"){
                    callback();
                }else if(callback && typeof callback === "boolean") {
                    return true;
                }else{
                    this.showMainMenu();
                }
            });
    }

    async askCloudantredentials(){

        if (fs.existsSync("./resources/cloudantProfile.json")) {
            try {
                this.cloudant = JSON.parse(fs.readFileSync("./resources/cloudantProfile.json", 'utf8'));
                return this.cloudant;
            } catch (e) {}
        } else {
            let questions = [
                {
                    type: 'input',
                    name: 'user',
                    message: locale["questions.cloudant.user"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'password',
                    message: locale["questions.cloudant.password"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'host',
                    message: locale["questions.cloudant.host"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'database',
                    message: locale["questions.cloudant.database"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                }
            ];
            return inquirer.prompt(questions).then(answers => {
                this.cloudant = answers;
                fs.writeFile("./resources/cloudantProfile.json", JSON.stringify(answers), function (err) {
                    if (err) {
                        console.log(`\n${Logger.ERROR(locale["messages.noSave"] + " " + chalk.yellow("./resources/cloudantProfile.json"))}`);
                        process.exit(1);
                    }
                    console.log(`\n${Logger.INFO(locale["messages.save"] + chalk.yellow("./resources/cloudantProfile.json"))}`);
                    console.log(Logger.INFO(locale["messages.nextTime"] + "\n"));
                });
                return answers;
            });
        }
    }

    askCredentials(){
        let parent = this;
        if(this.peers.length === 0){
            this.showPeersList(this.askCredentials);
        }else {
            let questions = [
                {
                    type: 'input',
                    name: 'chaincode',
                    message: locale["questions.chaincode"],
                    default: function () {
                        return parent.chaincode ? parent.chaincode:'fabcar';
                    }
                },
                {
                    type: 'input',
                    name: 'channelID',
                    message: locale["questions.channelID"],
                    default: function () {
                        return parent.channelId ? parent.channelId:'scd-deviceid';
                    }
                },
                {
                    type: 'confirm',
                    name: 'peers',
                    message: `${locale["questions.peers"]}: ${this.peers.join(",")}`
                }
            ];
            inquirer.prompt(questions).then(answers => {
                this.chaincode = answers.chaincode;
                this.channelId = answers.channelID;
                if (answers.peers !== true)
                    parent.showPeersList(false).then(() =>{
                        this.blockChainService.enrollAdmin().then(() =>{
                            this.user=false;
                            this.showMainMenu();
                        });
                    });
                else
                    this.blockChainService.enrollAdmin().then(() =>{
                        this.user=false;
                        this.showMainMenu();
                    });
            });
        }
    }

    getUser(){
        if (fs.existsSync("./resources/userProfile.json")) {
            try {
                this.username = JSON.parse(fs.readFileSync("./resources/userProfile.json", 'utf8')).username;
                console.log('\n'+Logger.INFO( `Se a cargado el usuario ${this.username} de persistencia\n`));
                this.trans=false;
                this.showMainMenu();
            } catch (e) {}
        } else {
            let questions = [
                {
                    type: 'input',
                    name: 'username',
                    message: locale["questions.user"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'password',
                    message: locale["questions.password"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'affiliation',
                    message: locale["questions.affiliation"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                },
                {
                    type: 'input',
                    name: 'company',
                    message: locale["questions.company"],
                    validate: function (answer) {
                        return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                    }
                }
            ];
            inquirer.prompt(questions).then(answers => {
                this.username = answers.username;
                fs.writeFile("./resources/userProfile.json", JSON.stringify(answers), function (err) {
                    if (err) {
                        console.log(`\n${Logger.ERROR(locale["messages.noSave"] + " " + chalk.yellow("./resources/userProfile.json"))}`);
                        process.exit(1);
                    }
                    console.log(`\n${Logger.INFO(locale["messages.save"] + chalk.yellow("./resources/userProfile.json"))}`);
                    console.log(Logger.INFO(locale["messages.nextTime"] + "\n"));
                });
                return answers
            }).then((answers) => {
                return this.blockChainService.registerUser(answers.affiliation, answers.company, answers.username, answers.password);
            }).then(()=>{
                this.trans=false;
                this.showMainMenu();
            })
        }
    }

    invokeTransaction(){

        let questions = [
            {
                type: 'input',
                name: 'vim',
                message: "¿Cúal es la vim del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            },
            {
                type: 'input',
                name: 'marca',
                message: "¿Cúal es la marca del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            },
            {
                type: 'input',
                name: 'modelo',
                message: "¿Cúal es la modelo del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            },
            {
                type: 'input',
                name: 'color',
                message: "¿Cúal es la color del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            },
            {
                type: 'input',
                name: 'dueno',
                message: "¿Quién es el dueño del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            }
        ];
        inquirer.prompt(questions).then((answers) => {
            this.blockChainService.peersID(this.peers, this.channelId);
            return this.blockChainService.addCar(this.chaincode, this.channelId, answers, this.username)
        }).then((data)=>{

            if(data.status === 200){
                console.log('\n'+Logger.INFO(chalk.green(data.message))+'\n');
            }else{
                console.log('\n'+Logger.ERROR(data.message)+'\n');
            }

            this.showMainMenu();
        })
    }

    queryTransaction(){

        let questions = [
            {
                type: 'input',
                name: 'vim',
                message: "¿Cúal es la vim del coche?",
                validate: function (answer) {
                    return answer && answer.length > 1 ? true : `${locale["messages.empty"]}`
                }
            }
        ];
        inquirer.prompt(questions).then((answers) => {
            this.blockChainService.peersID(this.peers, this.channelId);
            return this.blockChainService.queryCar(this.chaincode, this.channelId, answers, this.username)
        }).then((data)=>{

            if(data.status === 200){
                console.log('\n'+Logger.INFO(chalk.green(data.message)));
                console.log('\n'+Logger.INFO(chalk.green(JSON.stringify(data.payload)))+'\n');
            }else{
                console.log('\n'+Logger.ERROR(data.message)+'\n');
            }
            this.showMainMenu();
        })
    }


    showMainMenu(){
        inquirer.prompt([
            {
                type: 'list1',
                message: locale["list.mainMenu"],
                name: 'mainMenu',
                pageSize: 7,
                choices: [
                    {
                        name: "Seleccionar Peers",
                        key: 0
                    },
                    {
                        name: "Enrolar al Administrador",
                        key: 1
                    },
                    {
                        name: "Crear Usuario",
                        disabled: this.user,
                        value: "Primero hay que enrolar a un administrador",
                        key: 2
                    },
                    {
                        name: "Invovar una transacción",
                        disabled: this.trans,
                        value: "Se necesita tener un usuario registrado, y peers asignados",
                        key: 3
                    },
                    {
                        name: "Hacer un query",
                        disabled: this.trans,
                        value: "Se necesita tener un usuario registrado, y peers asignados",
                        key: 4
                    },
                    {
                        name: "Borrar Consola",
                        key: 5
                    },
                    {
                        name: "Salir",
                        key: 6
                    },
                ],
                validate: function(answer) {
                    if (answer.length < 1) {
                        return locale["list.validate"];
                    }
                    return true;
                }
            }
        ])
            .then(answer => {
                switch (answer.mainMenu) {
                    case 0:
                        this.showPeersList();
                        break;
                    case 1:
                        this.askCredentials();
                        break;
                    case 2:
                        this.getUser();
                        break;
                    case 3:
                        this.invokeTransaction();
                        break;
                    case 4:
                        this.queryTransaction();
                        break;
                    case 5:
                        clear();
                        this.printHeaders();
                        this.showMainMenu();
                }
            });
    }



};

new Main();


