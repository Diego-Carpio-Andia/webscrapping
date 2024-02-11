//importar modulos
const jwt = require("jwt-simple");
const moment = require("moment");

//importar clave secreta
const lib_jwt = require("../services/jwt");
const secret = lib_jwt.secret;

// middleware de  autenticacion
exports.auth = (req,res,next) => {
    if(!req.headers.authorization){
        return res.status(404).json({
            status: "error",
            message: "La peticion no tiene la cabecera de autenticacion"
        })
    }
    // decodificar el token 
    let token = req.headers.authorization.replace(/['"]+/g,'');
    try {
        //payload todos los datos que se cargaron
        let payload  = jwt.decode(token, secret);
        //comprobar expiracion del token
        if(payload.exp <= moment().unix()){
            return res.status(404).json({
                status: "error",
                message: "token expirado",
            })
        }
        // agregar datos de usuario a la request
        req.user = payload;      
    } catch (error) {
        return res.status(404).json({
            status: "error",
            message: "token invalido",
            error: error
        })
    }    
    //pasar a ejecucion de accion
    next();
}


