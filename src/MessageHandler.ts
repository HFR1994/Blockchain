interface Message{
    status: number,
    message: string,
    payload?: any
}

class MessageHandler implements Message{

    message: string;
    payload: any;
    status: number;

    constructor(status: number, message: string, payload?: any){
        this.message = message;
        this.status = status;
        if(payload) {
            this.payload = payload
        }else{
            this.payload = {}
        }
    }

    public toObject = () : Message => {
        return {message: this.message, status: this.status, payload: this.payload}
    };

    public toString = (): string => {
        return JSON.stringify({message: this.message, status: this.status, payload: this.payload})
    }
}

export default MessageHandler;