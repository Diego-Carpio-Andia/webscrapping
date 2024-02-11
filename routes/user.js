const express = require("express");
const router = express.Router();
const userController = require("../controllers/user");
/*importamos nuestro middelware de autenticacion*/
const check = require("../middlewares/auth");

//rutas
router.post("/register", userController.register);
router.post("/login", userController.login);
router.post("/saveWorldBank", check.auth , userController.saveWorldBank);
router.post("/saveOFAC", check.auth , userController.saveOFAC);
router.post("/saveOffshore", check.auth , userController.saveOffshore);
router.post("/listado", check.auth , userController.listado);
router.get("/profile/:id", check.auth , userController.profile);

//exportar router
module.exports = router;