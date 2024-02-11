/* imports - dependencias */
const {connection} = require("./database/connection");
const express = require("express");
const cors = require("cors");
console.log("api corriendo");
//db - connection
connection();
//create a node server
const app = express();
const puerto = 3900;
//configurar cors
app.use(cors());
//body - object JS convert
app.use(express.json());
//decode to object js usable 
app.use(express.urlencoded({extended: true}));
//cargar conf rutas
const userRoutes = require("./routes/user");
app.use("/api/user",userRoutes);
//poner servidor a escuchar peticiones http - para escuchar peticiones http de las rutas
app.listen(puerto, ()=>{
    console.log("servidor de node corriendo en: ", puerto);
})