const mongoose = require("mongoose");

const conexion = "mongodb://webscrappingnodejs:5OIV4PrawP7Al0PkVeo2fd6WNyPBm5AAjyk5Oaw4TylWZHw6lb25VzHHJTYlCWhbpEGTihdTLW0wACDbd4S7BA==@webscrappingnodejs.mongo.cosmos.azure.com:10255/?ssl=true&replicaSet=globaldb&retrywrites=false&maxIdleTimeMS=120000&appName=@webscrappingnodejs@"

const connection = async() => {
    try {
        mongoose.set('strictQuery', true);
        await mongoose.connect(conexion);
        console.log("nos conectamos a la base de datos WebScraping");        
    } catch (error) {
        console.log(error);
        throw new Error("no se conecto a la base de datos");
    }
}
module.exports = {
    connection
}