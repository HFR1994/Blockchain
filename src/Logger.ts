import chalk from 'chalk';

const Logger = class Logger{

    static ERROR(msg: string) {
        return  "[" + chalk.red("ERROR") + "] => "+msg+"\n"
    }

    static DEBUG(msg: string) {
        return  "[" + chalk.white("DEBUG") + "] => "+msg+"\n"
    }

    static INFO(msg: string) {
        return  "[" + chalk.blue("INFO") + "] => "+msg
    }

    static PRINT(msg: string) {
        return  msg+"\n"
    }

    static WARN(msg: string) {
        return  "[" + chalk.yellow("WARN") + "] => "+msg+"\n"
    }

};

export default Logger;
