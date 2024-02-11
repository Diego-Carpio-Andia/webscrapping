//incluimos el modelo
const User = require("../models/User");
//encriptacion bycript
const bcrypt = require("bcrypt");
//importar servicios de jwt para el token de autenticacion en la session del usuario
const jwt = require("../services/jwt");
//importamos el helper de validate
const validate = require("../helpers/validate");
//importamos pupperter
const puppeteer = require("puppeteer");
//importamos modelos de web scrapping
const WorldBank = require("../models/WorldBank");
const Offshore = require("../models/Offshore");
const OFAC =  require("../models/OFAC");

const register = (req,res) =>{
    //recoger datos de la peticion
    const params = req.body;
    //comprobar que me llegan 
    if(!params.name || !params.email || !params.password || !params.nick){
        return res.status(500).json({
            status: "error",
            message: "Faltan datos por enviar",
        });    

    }
    //validacion con validator 
    try {
        validate.validate(params);
    } catch (error) {
        return res.status(400).json({
            status: "error",
            message: "Validacion no superada",
        }); 
    }
    //crear objeto de usuario
    let user_to_save = new User(params);
    //control de usuarios duplicados
    User.find({
        $or:[
            {email: user_to_save.email.toLowerCase()},
            {nick: user_to_save.nick.toLowerCase()}
        ]
    }).exec((error,usuarios)=>{
        if(error){
            return res.status(500).json({
                status: "error",
                message: "Error en la consulta",
            });  
        }
        if(usuarios && usuarios.length >= 1){
            return res.status(200).json({
                status: "success",
                message: "El usuario ya existe",
            });
        }else{
            //cifrar la contraseña 
            //          cifrado           numero de veces    error y contraseña cifrada
            bcrypt.hash(user_to_save.password, 10, (error_hash, password_to_save)=> {
                user_to_save.password = password_to_save;   
                //guardar usuario en la ddbb
                user_to_save.save((error, userStored)=>{
                    if(error){
                        return res.status(500).json({
                            status: "error",
                            message: "error al guardar el usuario",
                            params
                        });
                    
                    }
                    if(userStored){
                        //devolver el resultado                    
                        return res.status(200).json({
                            status: "success",
                            message: "Se guardo el usuario correctamente",
                            user: userStored
                        });
                    }else{
                        return res.status(500).json({
                            status: "error",
                            message: "hubo error al guardar el usuario",
                            params
                        });
                    }
                });                           
            })        
        }
    })
}
const login = (req,res)=>{
    //recoger parametros body
    const params = req.body;
    if(!params.email || !params.password){
        return res.status(400).json({
            status: "error",
            message: "faltan datos"
        });
    }
    //buscar en la ddbb si existe un solo registro
    //select solo seleccionamos el parametro a buscar
    User.findOne({email: params.email})
        //.select({"password": 0})        
        .exec((error, user) =>{
        if(error || !user){
            return res.status(404).json({
                status: "error",
                message: "no existe el usuario"
            });
        }
        //comprobar su contraseña
        let pwd = bcrypt.compareSync(params.password, user.password)
        if(!pwd){
            return res.status(404).json({
                status: "error",
                message: "no te has identificado correctamente"
            });  
        }
        //devolver TOken de autenticacion para persistir la session
        //luego hacemos un middelware para verificar al usuario logeado
        const token = jwt.createToken(user);
        //devolver datos del usuario        
        return res.status(200).json({
            status: "success",
            message: "te has identificado correctamente",
            user: {
                id: user._id,
                name: user.name,
                nick: user.nick
            },
            token
        });
    });   
}
const saveWorldBank = async (req, res) => {
    //recoger datos del body
    let params = req.body;
    //validar que llegaron
    if (!params.search) {
        return res.status(404).send({
            status: "error",
            message: "debes completar la busqueda"
        })
    }
    if(params.search){
        try {
            const browser = await puppeteer.launch({
                headless: false,
                slowMo: 300,
                defaultViewport: null, // Establecer el tamaño de la ventana a null para que no se abra en blanco
                args: [
                    '--start-maximized', // Maximizar la ventana al abrirse
                    `--window-position=615,215`, // Centrar la ventana
                    '--window-size=750,650' // Tamaño de la ventana
                ]
            });
            const page = await browser.newPage();
            await page.goto('https://projects.worldbank.org/en/projects-operations/procurement/debarred-firms', { waitUntil: 'load' });
            //buscamos
            await page.waitForSelector('#category');
            await page.type('#category', params.search);
            //tabla
            await page.waitForSelector('table[role="grid"]');
            const tableRowCount = await page.evaluate(() => {
                // Seleccionar la tabla
                const table = document.querySelector('table[role="grid"]');            
                // Contar el número de filas en la tabla
                const rowCount = table ? document.querySelectorAll('tbody[role="rowgroup"] tr').length : 0;            
                return rowCount;
            });            
            if(tableRowCount === 0){
                return res.status(200).send({
                    status: "success",
                    descripcion: "No se encontro ningun elemento"
                });
            }else{
                const data = await page.evaluate(()=>{
                    const rows = document.querySelectorAll('tbody[role="rowgroup"] tr');
                    const rowData = [];
                    rows.forEach(row =>{
                        const columns = row.querySelectorAll('td');
                        const rowDataItem = {
                            FirmName: columns[0].textContent.trim(),
                            Address: columns[2].textContent.trim(),
                            Country: columns[3].textContent.trim(),
                            FromDate: columns[4].textContent.trim(),
                            ToDate: columns[5].textContent.trim(),
                            Grounds: columns[6].textContent.trim(),
                        };
                        rowData.push(rowDataItem)
                    })  
                    return rowData;                    
                })              
                // Cerrar navegador
                await browser.close();
                //creamos el objeto
                let newWorldBank = new WorldBank({
                    data:data
                });
                try {
                    //guardamos el objeto 
                    await newWorldBank.save((error, newWorldBankStored) => {
                        if (error || !newWorldBankStored) {
                            return res.status(404).send({
                                status: "error",
                                message: "no se ha guardardo"
                            })
                        }                
                        //respuesta
                        return res.status(200).send({
                            status: "success",
                            message: "Los documentos se han guardado correctamente",
                            datos: data,
                            pulsaciones: tableRowCount
                        });
                    });  
                } catch (error) {
                    console.error("Error al guardar los documentos:", error);
                    return res.status(500).send({
                        status: "error",
                        message: "Ocurrió un error al guardar los documentos en la base de datos",
                    });
                }   
            }  
        } catch (error) {
            console.error("Error en Puppeteer:", error);
            return res.status(500).send({
                status: "error",
                message: "Error en Puppeteer"
            });
        }
    }   
}
const saveOffshore = async (req, res) => {
    //recoger datos del body
    let params = req.body;
    //validar que llegaron
    if (!params.search) {
        return res.status(404).send({
            status: "error",
            message: "debes completar la busqueda"
        })
    }
    if(params.search){
        try {
            const browser = await puppeteer.launch({
                headless: false,
                slowMo: 50,
                defaultViewport: null, // Establecer el tamaño de la ventana a null para que no se abra en blanco
                args: [
                    '--start-maximized', // Maximizar la ventana al abrirse
                    `--window-position=640,240`, // Centrar la ventana
                    '--window-size=800,700' // Tamaño de la ventana
                ]
            });        
            const page = await browser.newPage();
            await page.goto('https://offshoreleaks.icij.org/', { waitUntil: 'load' });
            // Esperando - Click
            await page.waitForSelector('input[type="checkbox"][name="accept"]');
            await page.click('input[type="checkbox"][name="accept"]'); 
            // Esperando - Click
            await page.waitForSelector('button[type="submit"].btn-primary:not([disabled])');
            await page.click('button[type="submit"].btn-primary:not([disabled])');  
            // Insertando
            await page.waitForSelector("input[name='q']");
            await page.type('input[name="q"]', params.search);
            // Click
            await page.waitForSelector('button[type="submit"].btn-primary:not([disabled])');
            await page.click('button[type="submit"].btn-primary:not([disabled])');        
            const tableRowCount = await page.evaluate(() => {
                // Seleccionar la tabla
                const table = document.querySelector('.search__results__table');            
                // Contar el número de filas en la tabla
                const rowCount = table ? document.querySelectorAll('.search__results__table tbody tr').length : 0;            
                return rowCount;
            });
            if(tableRowCount === 0){
                return res.status(200).send({
                    status: "success",
                    descripcion: "No se encontro ningun elemento"
                });                
            }else{
                const data = await page.evaluate(()=>{
                    const rows = document.querySelectorAll('.search__results__table tbody tr');
                    const rowData = [];
                    rows.forEach(row =>{
                        const columns = row.querySelectorAll('td');
                        const rowDataItem = {
                            Entity: columns[0].textContent.trim(),
                            Jurisdiction: columns[1].textContent.trim(),
                            LinkedTo: columns[2].textContent.trim(),
                            DataFrom: columns[3].textContent.trim(),                            
                        };
                        rowData.push(rowDataItem)
                    })  
                    return rowData;                                       
                })                
                // Cerrar navegador
                await browser.close();
                //creamos el objeto
                let newOffShore = new Offshore({
                    data:data
                });
                try {
                    await newOffShore.save((error, newOffShoreStored) => {
                        if (error || !newOffShoreStored) {
                            return res.status(404).send({
                                status: "error",
                                message: "no se ha guardardo"
                            })
                        }                
                        //respuesta
                        return res.status(200).send({
                            status: "success",
                            message: "Los documentos se han guardado correctamente",
                            datos: data,
                            pulsaciones: tableRowCount
                        });
                    });                   
                } catch (error) {
                    console.error("Error al guardar los documentos:", error);
                    return res.status(500).send({
                        status: "error",
                        message: "Ocurrió un error al guardar los documentos en la base de datos",
                    });
                } 
            }
        } catch (error) {
            console.error("Error en Puppeteer:", error);
            return res.status(500).send({
                status: "error",
                message: "Error en Puppeteer"
            });
        }
    }
}
const saveOFAC = async (req, res) => {
    //recoger datos del body
    let params = req.body;
    //validar que llegaron
    if (!params.search) {
        return res.status(404).send({
            status: "error",
            message: "debes completar la busqueda"
        })
    }
    if(params.search){
        try {
            const browser = await puppeteer.launch({
                headless: false,
                slowMo: 100,
                defaultViewport: null, // Establecer el tamaño de la ventana a null para que no se abra en blanco
                args: [
                    '--start-maximized', // Maximizar la ventana al abrirse
                    `--window-position=640,240`, // Centrar la ventana
                    '--window-size=800,700' // Tamaño de la ventana
                ]
            });         
            const page = await browser.newPage();
            await page.goto('https://sanctionssearch.ofac.treas.gov/', { waitUntil: 'load' }); 
            // Insertando
            await page.waitForSelector("input[name='ctl00$MainContent$txtLastName']");
            await page.type('input[name="ctl00$MainContent$txtLastName"]', params.search);
            // Click
            await page.waitForSelector('input[name="ctl00$MainContent$btnSearch"]');
            await page.click('input[name="ctl00$MainContent$btnSearch"]');                                   
            try {
                await page.waitForFunction(() => {
                    const table = document.querySelector('#gvSearchResults');
                    return table;
                }, { timeout: 5000 }); 
                const tableRowCount = await page.evaluate(() => {
                    // Seleccionar la tabla
                    const table = document.querySelector('#gvSearchResults');                
                    // Contar el número de filas en la tabla
                    const rowCount = table ? document.querySelectorAll('#gvSearchResults tbody tr').length : 0;                
                    return rowCount;
                });   
                if(tableRowCount == 0){               
                    return res.status(200).send({
                        status: "success",
                        descripcion: "No se encontro ningun elemento"
                    });                
                }else{
                    const data = await page.evaluate(()=>{
                        const rows = document.querySelectorAll('#gvSearchResults tbody tr');
                        const rowData = [];
                        rows.forEach(row =>{
                            const columns = row.querySelectorAll('td');
                            const rowDataItem = {
                                FirmName: columns[0].textContent.trim(),
                                Address: columns[1].textContent.trim(),
                                Type: columns[2].textContent.trim(),
                                Program: columns[3].textContent.trim(),  
                                List: columns[4].textContent.trim(),  
                                Score: columns[5].textContent.trim(),                               
                            };
                            rowData.push(rowDataItem)
                        })  
                        return rowData;                                       
                    })                  
                    // Cerrar navegador
                    await browser.close();
                    //creamos el objeto
                    let newOFAC = new OFAC({
                        data:data
                    });
                    try {
                        await newOFAC.save((error, newOFACStored) => {
                            if (error || !newOFACStored) {
                                return res.status(404).send({
                                    status: "error",
                                    message: "no se ha guardardo"
                                })
                            }                    
                            //respuesta
                            return res.status(200).send({
                                status: "success",
                                message: "Los documentos se han guardado correctamente",
                                datos: data,
                                pulsaciones: tableRowCount
                            });
                        });                   
                    } catch (error) {
                        console.error("Error al guardar los documentos:", error);
                        return res.status(500).send({
                            status: "error",
                            message: "Ocurrió un error al guardar los documentos en la base de datos",
                        });
                    } 
                }               
            } catch (error) {
                await browser.close();
                return res.status(200).send({
                    status: "success",
                    descripcion: "No se encontro ningun elemento"
                });
            }           
        } catch (error) {
            console.error("Error en Puppeteer:", error);            
            return res.status(500).send({
                status: "error",
                message: "Error en Puppeteer"
            });            
        }
    }   
}
const listado = async (req, res) => {
    try {
        const ofacDocs = await OFAC.find();
        const offshoreDocs = await Offshore.find();
        const worldBankDocs = await WorldBank.find();
        return res.status(200).json({
            status: 'success',
            usuario: req.user,
            ofac: ofacDocs,
            offshore: offshoreDocs,
            worldBank: worldBankDocs
        });
    } catch (error) {
        console.error("Error al obtener los documentos:", error);
        return res.status(500).json({
            status: 'error',
            message: 'Ocurrió un error al obtener los documentos'
        });
    } 
}
//exportar acciones
module.exports = {
    register,
    login,
    saveWorldBank,
    saveOffshore,
    saveOFAC,
    listado
}